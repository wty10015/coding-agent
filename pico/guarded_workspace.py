"""Approved, bounded workspace mutations for the local Coding Agent."""

import os
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from .readonly_workspace import MAX_FILE_BYTES, WorkspaceBoundary, WorkspaceError

MAX_COMMAND_OUTPUT = 4_000
MAX_COMMAND_TIMEOUT = 60
SHELL_INTERPRETERS = frozenset({"bash", "cmd", "cmd.exe", "powershell", "powershell.exe", "pwsh", "sh", "zsh"})
DESTRUCTIVE_COMMANDS = frozenset({"del", "diskpart", "erase", "format", "mkfs", "reboot", "rm", "rmdir", "shutdown"})
SHELL_ENV_ALLOWLIST = ("COMSPEC", "PATH", "PATHEXT", "SYSTEMROOT", "TEMP", "TMP", "WINDIR")


class ApprovalDenied(PermissionError):
    """Raised when a mutation is not explicitly approved by local policy."""


class CommandBlocked(WorkspaceError):
    """Raised when a command is too dangerous to execute through this tool."""


@dataclass(frozen=True)
class CommandResult:
    exit_code: int
    stdout: str
    stderr: str


class ApprovalPolicy:
    """Local approval policy with an optional callback for interactive decisions."""

    def __init__(self, mode="ask", callback=None):
        if mode not in {"ask", "auto", "never"}:
            raise ValueError("approval mode must be ask, auto, or never")
        self.mode = mode
        self.callback = callback

    def require(self, action, details):
        if self.mode == "never":
            raise ApprovalDenied(f"approval denied for {action}")
        if action != "run_shell" and self.mode == "auto":
            return
        if self.callback is not None and self.callback(action, details):
            return
        raise ApprovalDenied(f"approval denied for {action}")


def write_file(root, path, content, approval):
    """Atomically write a UTF-8 text file after policy approval."""

    target = _mutation_target(root, path)
    text = _validate_text(content)
    approval.require("write_file", {"path": _relative_path(root, target), "bytes": len(text.encode("utf-8"))})
    target.parent.mkdir(parents=True, exist_ok=True)
    _ensure_no_symlink(target)
    _atomic_write(target, text)
    return _relative_path(root, target)


def patch_file(root, path, old_text, new_text, approval):
    """Replace exactly one text occurrence after policy approval."""

    target = _mutation_target(root, path)
    if not target.is_file():
        raise WorkspaceError("path is not a file")
    old_text = str(old_text)
    if not old_text:
        raise WorkspaceError("old_text must not be empty")
    new_text = _validate_text(new_text)
    source = _read_text(target)
    matches = source.count(old_text)
    if matches != 1:
        raise WorkspaceError(f"old_text must occur exactly once, found {matches}")

    replacement = source.replace(old_text, new_text, 1)
    _validate_text(replacement)
    approval.require("patch_file", {"path": _relative_path(root, target), "matches": matches})
    _ensure_no_symlink(target)
    _atomic_write(target, replacement)
    return _relative_path(root, target)


def run_shell(root, command, approval, path=".", timeout=20):
    """Run one approved argument-vector command with a constrained environment."""

    boundary = WorkspaceBoundary(root)
    cwd = boundary.resolve(path)
    if not cwd.is_dir():
        raise WorkspaceError("command path is not a directory")
    command = _validate_command(command)
    _reject_high_risk_command(command)
    if not 1 <= int(timeout) <= MAX_COMMAND_TIMEOUT:
        raise WorkspaceError(f"timeout must be in [1, {MAX_COMMAND_TIMEOUT}]")
    approval.require("run_shell", {"command": list(command), "path": boundary.relative_path(cwd)})

    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            errors="replace",
            timeout=int(timeout),
            env=_shell_environment(cwd),
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise WorkspaceError(f"command timed out after {timeout} seconds") from error
    return CommandResult(result.returncode, _clip(result.stdout), _clip(result.stderr))


def _mutation_target(root, raw_path):
    boundary = WorkspaceBoundary(root)
    candidate = _workspace_candidate(boundary, raw_path)
    _ensure_no_symlink(candidate)
    return boundary.resolve(candidate)


def _workspace_candidate(boundary, raw_path):
    raw = Path(str(raw_path))
    if raw.is_absolute():
        try:
            parts = raw.relative_to(boundary.root).parts
        except ValueError as error:
            raise WorkspaceError("path is outside the workspace") from error
    else:
        parts = raw.parts
    if ".." in parts:
        raise WorkspaceError("path is outside the workspace")
    if not parts or any(part in {"", "."} for part in parts):
        raise WorkspaceError("path must name a workspace file")
    return boundary.root.joinpath(*parts)


def _ensure_no_symlink(path):
    current = path.anchor and Path(path.anchor) or Path()
    for part in path.parts[1:]:
        current = current / part
        if current.is_symlink():
            raise WorkspaceError("symbolic links are not available for workspace mutations")


def _relative_path(root, path):
    return path.relative_to(Path(root).resolve()).as_posix()


def _validate_text(value):
    text = str(value)
    data = text.encode("utf-8")
    if "\x00" in text:
        raise WorkspaceError("text content must not contain NUL bytes")
    if len(data) > MAX_FILE_BYTES:
        raise WorkspaceError("text content exceeds the workspace size limit")
    return text


def _read_text(path):
    if path.stat().st_size > MAX_FILE_BYTES:
        raise WorkspaceError("file exceeds the workspace size limit")
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        raise WorkspaceError("file is not valid UTF-8 text") from error


def _atomic_write(path, text):
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent, text=True)
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def _validate_command(command):
    if isinstance(command, str) or not isinstance(command, (list, tuple)):
        raise WorkspaceError("command must be a non-empty argument list")
    values = tuple(str(item) for item in command)
    if not values or not values[0].strip() or any("\x00" in item for item in values):
        raise WorkspaceError("command must be a non-empty argument list")
    return values


def _reject_high_risk_command(command):
    executable = Path(command[0]).name.casefold()
    arguments = [item.casefold() for item in command[1:]]
    if executable in SHELL_INTERPRETERS or executable in DESTRUCTIVE_COMMANDS:
        raise CommandBlocked(f"blocked high-risk command: {executable}")
    if executable == "git" and (
        (arguments and arguments[0] == "reset" and "--hard" in arguments)
        or (arguments and arguments[0] == "clean" and any("f" in item.lstrip("-") for item in arguments[1:]))
    ):
        raise CommandBlocked("blocked high-risk git command")


def _shell_environment(root):
    environment = {name: os.environ[name] for name in SHELL_ENV_ALLOWLIST if name in os.environ}
    environment["PWD"] = str(root)
    return environment


def _clip(text):
    if len(text) <= MAX_COMMAND_OUTPUT:
        return text
    return text[:MAX_COMMAND_OUTPUT] + f"\n...[truncated {len(text) - MAX_COMMAND_OUTPUT} chars]"
