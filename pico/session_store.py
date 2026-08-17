"""Validated session persistence."""

from .persistence import (
    PersistenceError,
    artifact_path,
    artifact_root,
    read_json,
    validate_id,
    write_json,
)


class SessionStore:
    def __init__(self, root, workspace_root=None):
        self.root = artifact_root(root, workspace_root)

    def path(self, session_id):
        return artifact_path(self.root, session_id)

    def save(self, session):
        if not isinstance(session, dict) or "id" not in session:
            raise PersistenceError("session must contain an id")
        session_id = validate_id(session["id"], "session id")
        return write_json(self.path(session_id), {"schema_version": 1, "session": session})

    def load(self, session_id):
        data = read_json(self.path(session_id), required=("schema_version", "session"))
        if data["schema_version"] != 1 or not isinstance(data["session"], dict):
            raise PersistenceError("session schema is invalid")
        return data["session"]

    def latest(self):
        files = sorted(self.root.glob("*.json"), key=lambda path: path.stat().st_mtime_ns)
        return files[-1].stem if files else None
