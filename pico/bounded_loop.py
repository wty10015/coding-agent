"""Dependency-injected, bounded model/tool execution loop."""

import json
import re
from dataclasses import dataclass


@dataclass(frozen=True)
class LoopResult:
    answer: str
    stop_reason: str
    attempts: int
    tool_steps: int
    history: tuple


class ContextBudget:
    def __init__(self, max_chars=12_000):
        if max_chars < 100:
            raise ValueError("max_chars must be at least 100")
        self.max_chars = int(max_chars)

    def build(self, prefix, history, request):
        request = f"User: {request}"
        history_text = "\n".join(str(item) for item in history)
        available = self.max_chars - len(request) - 2
        if available <= 0:
            return request[-self.max_chars :]
        prefix_budget = min(len(str(prefix)), available // 3)
        prefix_text = str(prefix)[:prefix_budget]
        history_budget = available - len(prefix_text) - 2
        history_text = history_text[-max(0, history_budget) :]
        return "\n\n".join(part for part in (prefix_text, history_text, request) if part)


def parse_output(raw):
    text = str(raw).strip()
    final = re.search(r"<final>(.*?)</final>", text, re.DOTALL)
    if final and final.group(1).strip():
        return "final", final.group(1).strip()
    tool = re.search(r"<tool>(.*?)</tool>", text, re.DOTALL)
    if tool:
        try:
            payload = json.loads(tool.group(1))
        except json.JSONDecodeError:
            return "invalid", "malformed tool JSON"
        if isinstance(payload, dict) and isinstance(payload.get("name"), str) and isinstance(payload.get("args", {}), dict):
            return "tool", {"name": payload["name"], "args": payload.get("args", {})}
    return "invalid", "model output must contain one final or tool response"


class BoundedExecutionLoop:
    def __init__(self, model, tools, prefix="", max_chars=12_000, max_steps=8, max_malformed_attempts=2):
        self.model = model
        self.tools = dict(tools)
        self.prefix = str(prefix)
        self.context = ContextBudget(max_chars)
        self.max_steps = int(max_steps)
        self.max_malformed_attempts = int(max_malformed_attempts)
        if self.max_steps < 1 or self.max_malformed_attempts < 1:
            raise ValueError("loop limits must be positive")

    def run(self, request):
        history = []
        attempts = 0
        tool_steps = 0
        malformed = 0
        while attempts < self.max_steps + self.max_malformed_attempts:
            if tool_steps >= self.max_steps:
                return LoopResult("tool step limit reached", "step_limit", attempts, tool_steps, tuple(history))
            attempts += 1
            prompt = self.context.build(self.prefix, history, request)
            try:
                raw = self.model(prompt)
            except Exception as error:  # noqa: BLE001 - injected model boundary
                return LoopResult(f"model error: {error}", "model_error", attempts, tool_steps, tuple(history))
            kind, payload = parse_output(raw)
            if kind == "invalid":
                malformed += 1
                history.append(f"Model output error: {payload}")
                if malformed >= self.max_malformed_attempts:
                    return LoopResult(payload, "malformed_output_limit", attempts, tool_steps, tuple(history))
                continue
            if kind == "final":
                return LoopResult(payload, "final_answer", attempts, tool_steps, tuple(history))
            if tool_steps >= self.max_steps:
                return LoopResult("tool step limit reached", "step_limit", attempts, tool_steps, tuple(history))
            name = payload["name"]
            tool = self.tools.get(name)
            if tool is None:
                result = f"unknown tool: {name}"
            else:
                try:
                    result = str(tool(payload["args"]))
                except Exception as error:  # noqa: BLE001 - injected tool boundary
                    result = f"tool error: {error}"
            tool_steps += 1
            history.append(f"Tool {name}: {result}")
        return LoopResult("step limit reached", "step_limit", attempts, tool_steps, tuple(history))
