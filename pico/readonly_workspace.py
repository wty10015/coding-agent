"""Bounded, read-only inspection helpers for a local workspace."""

from dataclasses import dataclass
from pathlib import Path, PureWindowsPath

MAX_LIST_ENTRIES = 500
MAX_SEARCH_FILES = 1_000
MAX_FILE_BYTES = 1_000_000
MAX_SEARCH_MATCHES = 200
IGNORED_PARTS = frozenset({".git", ".pico", "__pycache__", ".pytest_cache", ".ruff_cache", ".venv", "venv"})


class WorkspaceError(ValueError):
    """Raised when an inspection request is outside the safe workspace boundary."""


@dataclass(frozen=True)
class FileEntry:
    path: str
    kind: str


@dataclass(frozen=True)
class SearchMatch:
    path: str
    line: int
    text: str


class WorkspaceBoundary:
    """Resolves paths inside one workspace and filters local agent state."""

    def __init__(self, root):
        self.root = Path(root).resolve()
        if not self.root.is_dir():
            raise WorkspaceError(f"workspace is not a directory: {self.root}")

    def resolve(self, raw_path="."):
        candidate = Path(raw_path)
        if not candidate.is_absolute() and PureWindowsPath(str(raw_path)).is_absolute():
            raise WorkspaceError("path is outside the workspace")
        if not candidate.is_absolute():
            candidate = self.root / candidate
        resolved = candidate.resolve(strict=False)
        try:
            resolved.relative_to(self.root)
        except ValueError as error:
            raise WorkspaceError("path is outside the workspace") from error
        if self._is_ignored(resolved):
            raise WorkspaceError("path is not available to read-only inspection")
        return resolved

    def relative_path(self, path):
        return path.relative_to(self.root).as_posix() or "."

    def _is_ignored(self, path):
        relative = path.relative_to(self.root)
        return relative.name == ".env" or any(part in IGNORED_PARTS for part in relative.parts)

    def visible_children(self, directory):
        children = []
        for child in directory.iterdir():
            try:
                resolved = self.resolve(child)
            except WorkspaceError:
                continue
            children.append((child, resolved))
        return sorted(children, key=lambda item: item[0].name.casefold())


def list_files(root, path="."):
    """List visible files and directories below ``path`` without following directory links."""

    boundary = WorkspaceBoundary(root)
    start = boundary.resolve(path)
    if not start.is_dir():
        raise WorkspaceError("path is not a directory")

    entries = []
    pending = [start]
    while pending and len(entries) < MAX_LIST_ENTRIES:
        directory = pending.pop()
        for child, resolved in boundary.visible_children(directory):
            if len(entries) >= MAX_LIST_ENTRIES:
                break
            if child.is_dir():
                entries.append(FileEntry(boundary.relative_path(resolved), "directory"))
                if not child.is_symlink():
                    pending.append(resolved)
            elif child.is_file():
                entries.append(FileEntry(boundary.relative_path(resolved), "file"))
    return entries


def read_file(root, path, start=1, end=200):
    """Read a bounded line range from one UTF-8 text file."""

    boundary = WorkspaceBoundary(root)
    target = boundary.resolve(path)
    if not target.is_file():
        raise WorkspaceError("path is not a file")
    if start < 1 or end < start:
        raise WorkspaceError("invalid line range")

    content = _read_text(target)
    lines = content.splitlines()
    numbered_lines = [
        f"{number:>4}: {line}"
        for number, line in enumerate(lines[start - 1 : end], start=start)
    ]
    return boundary.relative_path(target), "\n".join(numbered_lines)


def search(root, pattern, path="."):
    """Case-insensitively search visible, bounded UTF-8 text files."""

    needle = str(pattern).casefold()
    if not needle:
        raise WorkspaceError("search pattern must not be empty")

    boundary = WorkspaceBoundary(root)
    start = boundary.resolve(path)
    if not start.exists():
        raise WorkspaceError("path does not exist")

    matches = []
    for target in _iter_files(boundary, start):
        try:
            content = _read_text(target)
        except WorkspaceError:
            continue
        for number, line in enumerate(content.splitlines(), start=1):
            if needle in line.casefold():
                matches.append(SearchMatch(boundary.relative_path(target), number, line))
                if len(matches) >= MAX_SEARCH_MATCHES:
                    return matches
    return matches


def _iter_files(boundary, start):
    if start.is_file():
        yield start
        return
    if not start.is_dir():
        raise WorkspaceError("path is neither a file nor a directory")

    seen = 0
    pending = [start]
    while pending and seen < MAX_SEARCH_FILES:
        directory = pending.pop()
        for child, resolved in boundary.visible_children(directory):
            if child.is_dir() and not child.is_symlink():
                pending.append(resolved)
            elif child.is_file():
                seen += 1
                yield resolved
                if seen >= MAX_SEARCH_FILES:
                    return


def _read_text(path):
    if path.stat().st_size > MAX_FILE_BYTES:
        raise WorkspaceError("file exceeds the read-only inspection size limit")
    data = path.read_bytes()
    if b"\x00" in data:
        raise WorkspaceError("binary files are not available to read-only inspection")
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError as error:
        raise WorkspaceError("file is not valid UTF-8 text") from error
