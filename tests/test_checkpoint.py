import json

import pytest

from pico.checkpoint import (
    CHECKPOINT_SCHEMA_VERSION,
    RESUME_FILE_STALE,
    RESUME_FULL_VALID,
    RESUME_SCHEMA_MISMATCH,
    RESUME_WORKSPACE_MISMATCH,
    CheckpointStore,
    create_checkpoint,
    evaluate_resume,
    resume_task_state,
    workspace_fingerprint,
)
from pico.persistence import PersistenceError
from pico.task_state import TaskState


def test_checkpoint_round_trip_and_full_resume(tmp_path):
    (tmp_path / "README.md").write_text("stable\n", encoding="utf-8")
    state = TaskState.create("task-001", "inspect", run_id="run-001")
    checkpoint = create_checkpoint(tmp_path, state.task_id, state.run_id, "inspect", "read README", ["README.md"], workspace_fingerprint(tmp_path))
    store = CheckpointStore(tmp_path / ".pico" / "checkpoints", workspace_root=tmp_path)
    store.save(checkpoint)

    loaded = store.load(checkpoint["checkpoint_id"])
    decision = evaluate_resume(loaded, tmp_path, workspace_fingerprint(tmp_path))
    resumed = resume_task_state(state, loaded, decision)

    assert decision.status == RESUME_FULL_VALID
    assert resumed.checkpoint_id == checkpoint["checkpoint_id"]
    assert resumed.resume_status == RESUME_FULL_VALID


def test_resume_detects_stale_file_and_workspace_mismatch(tmp_path):
    target = tmp_path / "README.md"
    target.write_text("before\n", encoding="utf-8")
    checkpoint = create_checkpoint(tmp_path, "task-002", "run-002", "inspect", "continue", ["README.md"], "old-workspace")
    target.write_text("after\n", encoding="utf-8")

    decision = evaluate_resume(checkpoint, tmp_path, "new-workspace")

    assert decision.status == RESUME_FILE_STALE
    assert decision.stale_paths == ("README.md",)
    checkpoint["key_files"] = []
    assert evaluate_resume(checkpoint, tmp_path, "new-workspace").status == RESUME_WORKSPACE_MISMATCH


def test_checkpoint_schema_and_key_file_boundaries_are_checked(tmp_path):
    checkpoint = create_checkpoint(tmp_path, "task-003", "run-003", "inspect", "continue")
    checkpoint["schema_version"] = 999
    assert evaluate_resume(checkpoint, tmp_path).status == RESUME_SCHEMA_MISMATCH

    with pytest.raises(PersistenceError):
        create_checkpoint(tmp_path, "task-003", "run-003", "inspect", "continue", ["../outside.txt"])


def test_resume_rejects_unrelated_task_state(tmp_path):
    state = TaskState.create("task-004", "inspect", run_id="run-004")
    checkpoint = create_checkpoint(tmp_path, "task-other", "run-other", "inspect", "continue")
    decision = evaluate_resume(checkpoint, tmp_path)

    with pytest.raises(PersistenceError, match="belong"):
        resume_task_state(state, checkpoint, decision)


def test_checkpoint_json_is_versioned(tmp_path):
    checkpoint = create_checkpoint(tmp_path, "task-005", "run-005", "inspect", "continue")
    path = CheckpointStore(tmp_path / ".pico" / "checkpoints", workspace_root=tmp_path).save(checkpoint)

    assert json.loads(path.read_text(encoding="utf-8"))["schema_version"] == CHECKPOINT_SCHEMA_VERSION
