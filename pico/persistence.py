"""Small, validated primitives for local JSON artifacts."""

import json
import os
import re
import tempfile
from pathlib import Path

SCHEMA_VERSION = 1
MAX_ID_LENGTH = 80
_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$")
_WINDOWS_RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"COM{index}" for index in range(1, 10)), *(f"LPT{index}" for index in range(1, 10))}
_SENSITIVE = ("API_KEY", "AUTHORIZATION", "COOKIE", "PASSWORD", "SECRET", "TOKEN")


class PersistenceError(ValueError):
    """Raised when local persistence data is unsafe or invalid."""


def validate_id(value, label="id"):
    identifier = str(value)
    if not _ID.fullmatch(identifier) or identifier.upper() in _WINDOWS_RESERVED:
        raise PersistenceError(f"invalid {label}")
    return identifier


def artifact_root(root, workspace_root=None):
    root = Path(root)
    if workspace_root is not None:
        workspace = Path(workspace_root).resolve()
        try:
            candidate = root.absolute()
            candidate.relative_to(workspace)
        except ValueError as error:
            raise PersistenceError("artifact root is outside the workspace") from error
        current = candidate
        while current != workspace:
            if current.is_symlink():
                raise PersistenceError("artifact root must not contain a symbolic link")
            current = current.parent
    elif root.is_symlink():
        raise PersistenceError("artifact root must not be a symbolic link")
    root.mkdir(parents=True, exist_ok=True)
    resolved = root.resolve()
    if workspace_root is not None:
        try:
            resolved.relative_to(Path(workspace_root).resolve())
        except ValueError as error:
            raise PersistenceError("artifact root resolves outside the workspace") from error
    return resolved


def artifact_path(root, identifier, suffix=".json"):
    return Path(root) / f"{validate_id(identifier)}{suffix}"


def write_json(path, payload):
    path = Path(path)
    temporary = None
    try:
        descriptor, name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
        temporary = Path(name)
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="") as handle:
            json.dump(redact(payload), handle, ensure_ascii=True, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    return path


def read_json(path, required=()):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise PersistenceError("artifact is unreadable") from error
    if not isinstance(data, dict) or any(key not in data for key in required):
        raise PersistenceError("artifact schema is invalid")
    return data


def redact(value, key=""):
    if any(marker in str(key).upper() for marker in _SENSITIVE):
        return "<redacted>"
    if isinstance(value, dict):
        return {str(name): redact(item, name) for name, item in value.items()}
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value
