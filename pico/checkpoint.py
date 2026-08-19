"""Standalone checkpoint creation and resume decision helpers."""

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from .persistence import (
    PersistenceError,
    artifact_root,
    read_json,
    validate_id,
    write_json,
)

CHECKPOINT_SCHEMA_VERSION = 1
RESUME_MISSING = "missing"
RESUME_FULL_VALID = "full-valid"
RESUME_FILE_STALE = "file-stale"
RESUME_WORKSPACE_MISMATCH = "workspace-mismatch"
RESUME_SCHEMA_MISMATCH = "schema-mismatch"


@dataclass(frozen=True)
class ResumeDecision:
    status: str
    checkpoint_id: str = ""
    stale_paths: tuple = ()
    mismatch_fields: tuple = ()


def file_freshness(root, relative_path):
    path = Path(root).resolve() / Path(relative_path)
    try:
        stat = path.stat()
    except OSError:
        return {"exists": False}
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return {"exists": True, "size": stat.st_size, "mtime_ns": stat.st_mtime_ns, "sha256": digest}


def workspace_fingerprint(root):
    root = Path(root).resolve()
    files = []
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if not path.is_file() or any(part in {".git", ".pico", "__pycache__", ".pytest_cache", ".ruff_cache"} for part in relative.parts):
            continue
        files.append((relative.as_posix(), file_freshness(root, relative)))
    return hashlib.sha256(json.dumps(files, sort_keys=True).encode("utf-8")).hexdigest()


class CheckpointStore:
    def __init__(self, root, workspace_root=None):
        self.root = artifact_root(root, workspace_root)

    def path(self, checkpoint_id):
        return self.root / f"{validate_id(checkpoint_id, 'checkpoint id')}.json"

    def save(self, checkpoint):
        checkpoint_id = validate_id(checkpoint["checkpoint_id"], "checkpoint id")
        return write_json(self.path(checkpoint_id), checkpoint)

    def load(self, checkpoint_id):
        checkpoint = read_json(self.path(checkpoint_id), required=("schema_version", "checkpoint_id", "task_id"))
        if checkpoint["schema_version"] != CHECKPOINT_SCHEMA_VERSION:
            raise PersistenceError("checkpoint schema is invalid")
        return checkpoint


def create_checkpoint(root, task_id, run_id, current_goal, next_step, key_files=(), workspace_id=""):
    task_id = validate_id(task_id, "task id")
    run_id = validate_id(run_id, "run id")
    root = Path(root).resolve()
    normalized_files = []
    for relative_path in key_files:
        relative = Path(relative_path)
        if relative.is_absolute() or ".." in relative.parts:
            raise PersistenceError("checkpoint key file is outside the workspace")
        normalized_files.append(
            {
                "path": relative.as_posix(),
                "freshness": file_freshness(root, relative),
            }
        )
    return {
        "schema_version": CHECKPOINT_SCHEMA_VERSION,
        "checkpoint_id": "ckpt-" + uuid4().hex[:12],
        "task_id": task_id,
        "run_id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "current_goal": str(current_goal),
        "next_step": str(next_step),
        "key_files": normalized_files,
        "workspace_fingerprint": str(workspace_id),
    }


def evaluate_resume(checkpoint, root, workspace_id=""):
    if checkpoint is None:
        return ResumeDecision(RESUME_MISSING)
    if checkpoint.get("schema_version") != CHECKPOINT_SCHEMA_VERSION:
        return ResumeDecision(RESUME_SCHEMA_MISMATCH, str(checkpoint.get("checkpoint_id", "")))
    stale = []
    for item in checkpoint.get("key_files", []):
        path = str(item.get("path", ""))
        if item.get("freshness") != file_freshness(root, path):
            stale.append(path)
    if stale:
        return ResumeDecision(RESUME_FILE_STALE, checkpoint["checkpoint_id"], tuple(sorted(stale)))
    if checkpoint.get("workspace_fingerprint") and checkpoint["workspace_fingerprint"] != workspace_id:
        return ResumeDecision(RESUME_WORKSPACE_MISMATCH, checkpoint["checkpoint_id"], mismatch_fields=("workspace_fingerprint",))
    return ResumeDecision(RESUME_FULL_VALID, checkpoint["checkpoint_id"])


def resume_task_state(task_state, checkpoint, decision):
    if decision.status not in {RESUME_FULL_VALID, RESUME_FILE_STALE, RESUME_WORKSPACE_MISMATCH}:
        raise PersistenceError(f"cannot resume from {decision.status}")
    if checkpoint.get("task_id") != task_state.task_id or checkpoint.get("run_id") != task_state.run_id:
        raise PersistenceError("checkpoint does not belong to task state")
    task_state.checkpoint_id = checkpoint["checkpoint_id"]
    task_state.resume_status = decision.status
    return task_state
