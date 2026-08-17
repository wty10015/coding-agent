import json

import pytest

from pico.persistence import PersistenceError, validate_id
from pico.run_store import RunStore
from pico.session_store import SessionStore
from pico.task_state import TaskState


@pytest.mark.parametrize("value", ["", "..", "a/b", "a\\b", "C:temp", "CON", "name with spaces", "x" * 81])
def test_artifact_ids_reject_paths_and_reserved_names(value):
    with pytest.raises(PersistenceError):
        validate_id(value)


def test_session_store_is_atomic_schema_versioned_and_redacts(tmp_path):
    store = SessionStore(tmp_path / ".pico" / "sessions", workspace_root=tmp_path)
    session = {"id": "session-001", "history": [], "api_key": "not-for-disk", "nested": {"token": "also-hidden"}}

    path = store.save(session)
    raw = path.read_text(encoding="utf-8")

    assert "not-for-disk" not in raw
    assert "also-hidden" not in raw
    assert store.load("session-001")["api_key"] == "<redacted>"
    assert json.loads(raw)["schema_version"] == 1


def test_storage_root_rejects_external_symlink(tmp_path):
    outside = tmp_path.parent / f"{tmp_path.name}-outside"
    outside.mkdir()
    link = tmp_path / ".pico"
    try:
        link.symlink_to(outside, target_is_directory=True)
    except OSError:
        pytest.skip("symbolic links are not available in this environment")

    with pytest.raises(PersistenceError, match="symbolic link|resolves outside"):
        SessionStore(link / "sessions", workspace_root=tmp_path)


def test_task_state_allows_one_terminal_transition(tmp_path):
    state = TaskState.create("task-001", "inspect", run_id="run-001")
    state.record_attempt().record_tool("read_file").finish_success("done")

    assert state.to_dict()["schema_version"] == 1
    with pytest.raises(PersistenceError, match="terminal"):
        state.record_attempt()


def test_run_store_writes_redacted_trace_and_report(tmp_path):
    store = RunStore(tmp_path / ".pico" / "runs", workspace_root=tmp_path)
    state = TaskState.create("task-002", "record", run_id="run-002")
    store.start_run(state)
    store.append_trace(state, {"event": "started", "Authorization": "Bearer hidden", "values": [{"password": "hidden"}]})
    state.finish_success("done")
    store.write_task_state(state)
    store.write_report(state, {"token": "hidden", "summary": "done"})

    trace = store.run_dir(state) / "trace.jsonl"
    report = store.run_dir(state) / "report.json"
    assert "hidden" not in trace.read_text(encoding="utf-8")
    assert "hidden" not in report.read_text(encoding="utf-8")
    assert store.load_task_state(state.run_id)["status"] == "completed"
    assert store.load_report(state.run_id)["summary"] == "done"
