"""Run artifacts: task state, JSONL trace, and final report."""

import json

from .persistence import (
    PersistenceError,
    artifact_root,
    read_json,
    redact,
    validate_id,
    write_json,
)


class RunStore:
    def __init__(self, root, workspace_root=None):
        self.root = artifact_root(root, workspace_root)

    def run_dir(self, run_id):
        return self.root / validate_id(getattr(run_id, "run_id", run_id), "run id")

    def start_run(self, task_state):
        directory = self.run_dir(task_state)
        directory.mkdir()
        self.write_task_state(task_state)
        return directory

    def write_task_state(self, task_state):
        return write_json(self.run_dir(task_state) / "task_state.json", task_state.to_dict())

    def append_trace(self, task_state, event):
        if not isinstance(event, dict):
            raise PersistenceError("trace event must be an object")
        path = self.run_dir(task_state) / "trace.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(redact(event), ensure_ascii=True, sort_keys=True)
        if len(line) > 16_000:
            raise PersistenceError("trace event exceeds size limit")
        with path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
        return path

    def write_report(self, task_state, report):
        return write_json(self.run_dir(task_state) / "report.json", {"schema_version": 1, "report": report})

    def load_task_state(self, run_id):
        return read_json(self.run_dir(run_id) / "task_state.json", required=("schema_version", "run_id", "task_id"))

    def load_report(self, run_id):
        return read_json(self.run_dir(run_id) / "report.json", required=("schema_version", "report"))["report"]
