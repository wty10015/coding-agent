from pico.bounded_loop import BoundedExecutionLoop, ContextBudget, parse_output


def test_context_budget_preserves_request_and_caps_chars():
    prompt = ContextBudget(120).build("stable prefix" * 20, ["old" * 20, "new" * 20], "current request")

    assert len(prompt) <= 120
    assert "current request" in prompt


def test_output_parser_accepts_final_and_tool_and_rejects_invalid():
    assert parse_output("<final>done</final>") == ("final", "done")
    assert parse_output('<tool>{"name":"read","args":{"path":"a"}}</tool>')[0] == "tool"
    assert parse_output("plain text")[0] == "invalid"


def test_loop_dispatches_tool_then_returns_final():
    prompts = []
    outputs = iter(['<tool>{"name":"echo","args":{"value":"ok"}}</tool>', "<final>finished</final>"])
    loop = BoundedExecutionLoop(lambda prompt: prompts.append(prompt) or next(outputs), {"echo": lambda args: args["value"]})

    result = loop.run("inspect")

    assert result.answer == "finished"
    assert result.stop_reason == "final_answer"
    assert result.tool_steps == 1
    assert "Tool echo: ok" in result.history
    assert len(prompts) == 2


def test_loop_stops_after_malformed_outputs():
    loop = BoundedExecutionLoop(lambda prompt: "invalid", {}, max_malformed_attempts=2)

    result = loop.run("inspect")

    assert result.stop_reason == "malformed_output_limit"
    assert result.attempts == 2


def test_loop_stops_at_tool_step_limit_and_controls_unknown_tools():
    outputs = iter([
        '<tool>{"name":"missing","args":{}}</tool>',
        '<tool>{"name":"missing","args":{}}</tool>',
        '<final>stop</final>',
    ])
    loop = BoundedExecutionLoop(lambda prompt: next(outputs), {}, max_steps=2)

    result = loop.run("inspect")

    assert result.stop_reason == "step_limit"
    assert result.tool_steps == 2
    assert all("unknown tool" in item for item in result.history)
