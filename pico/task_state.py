"""Bounded state snapshot for one task run."""

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from .persistence import PersistenceError, validate_id

STATUS_RUNNING = "running"
STATUS_COMPLETED = "completed"
STATUS_STOPPED = "stopped"
STOP_REASON_FINAL_ANSWER_RETURNED = "final_answer_returned"
STOP_REASON_STEP_LIMIT_REACHED = "step_limit_reached"
STOP_REASON_RETRY_LIMIT_REACHED = "retry_limit_reached"


@dataclass
class TaskState:
    run_id: str
    task_id: str
    user_request: str
    created_at: str
    status: str = STATUS_RUNNING
    tool_steps: int = 0
    attempts: int = 0
    last_tool: str = ""
    stop_reason: str = ""
    final_answer: str = ""

    @classmethod
    def create(cls, task_id, user_request, run_id=""):
        task_id = validate_id(task_id, "task id")
        run_id = validate_id(run_id or f"run-{uuid4().hex[:12]}", "run id")
        return cls(run_id, task_id, str(user_request), datetime.now(timezone.utc).isoformat())

    def record_attempt(self):
        self._require_running()
        self.attempts += 1
        return self

    def record_tool(self, name):
        self._require_running()
        self.tool_steps += 1
        self.last_tool = str(name)
        return self

    def finish_success(self, final_answer):
        self._require_running()
        self.status = STATUS_COMPLETED
        self.stop_reason = STOP_REASON_FINAL_ANSWER_RETURNED
        self.final_answer = str(final_answer)
        return self

    def stop(self, reason=STOP_REASON_STEP_LIMIT_REACHED):
        self._require_running()
        self.status = STATUS_STOPPED
        self.stop_reason = str(reason)
        return self

    def _require_running(self):
        if self.status != STATUS_RUNNING:
            raise PersistenceError("task state is already terminal")

    def to_dict(self):
        return {"schema_version": 1, "run_id": self.run_id, "task_id": self.task_id, "user_request": self.user_request, "created_at": self.created_at, "status": self.status, "tool_steps": self.tool_steps, "attempts": self.attempts, "last_tool": self.last_tool, "stop_reason": self.stop_reason, "final_answer": self.final_answer}
