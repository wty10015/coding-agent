"""Run deterministic, synthetic checks against the published read-only tools."""

from __future__ import annotations

import argparse
import json
from collections.abc import Callable
from pathlib import Path
from tempfile import TemporaryDirectory

from .readonly_workspace import WorkspaceError, list_files, read_file, search

SCHEMA_VERSION = "pico.public-evaluation.v1"
PROVENANCE = "synthetic fixtures constructed by pico.public_evaluation"


def _fixture(root: Path) -> None:
    (root / "docs").mkdir()
    (root / "docs" / "guide.md").write_text("Alpha guide\nRead-only tools\n", encoding="utf-8")
    (root / "notes.txt").write_text("alpha\nbeta\ngamma\n", encoding="utf-8")
    (root / ".env").write_text("LOCAL_ONLY=ignored\n", encoding="utf-8")
    (root / ".git").mkdir()
    (root / ".git" / "config").write_text("private\n", encoding="utf-8")
    (root / ".pico").mkdir()
    (root / ".pico" / "hidden.txt").write_text("Alpha\n", encoding="utf-8")
    (root / "binary.bin").write_bytes(b"Alpha\x00")


def _raises_workspace_error(action: Callable[[], object], message: str) -> bool:
    try:
        action()
    except WorkspaceError as error:
        return str(error) == message
    return False


def _case_results(root: Path) -> list[dict[str, str]]:
    entries = {(entry.path, entry.kind) for entry in list_files(root)}
    path, content = read_file(root, "notes.txt", start=2, end=3)
    matches = sorted((match.path, match.line, match.text) for match in search(root, "alpha"))
    checks = [
        (
            "list-visible-files",
            "list visible workspace files",
            entries == {
                ("binary.bin", "file"),
                ("docs", "directory"),
                ("docs/guide.md", "file"),
                ("notes.txt", "file"),
            },
        ),
        (
            "read-line-range",
            "read a requested line range",
            (path, content) == ("notes.txt", "   2: beta\n   3: gamma"),
        ),
        (
            "search-visible-text",
            "search visible UTF-8 text",
            matches == [("docs/guide.md", 1, "Alpha guide"), ("notes.txt", 1, "alpha")],
        ),
        (
            "reject-parent-escape",
            "reject a path outside the workspace",
            _raises_workspace_error(lambda: read_file(root, "../outside.txt"), "path is outside the workspace"),
        ),
        (
            "reject-windows-absolute-path",
            "reject a Windows absolute path",
            _raises_workspace_error(lambda: read_file(root, "C:/outside.txt"), "path is outside the workspace"),
        ),
        (
            "reject-binary-file",
            "reject binary file reads",
            _raises_workspace_error(lambda: read_file(root, "binary.bin"), "binary files are not available to read-only inspection"),
        ),
    ]
    return [
        {"capability": capability, "id": identifier, "status": "passed" if passed else "failed"}
        for identifier, capability, passed in checks
    ]


def evaluate() -> dict[str, object]:
    """Evaluate the published read-only workspace interface against synthetic fixtures."""

    with TemporaryDirectory(prefix="pico-public-evaluation-") as directory:
        root = Path(directory)
        _fixture(root)
        cases = _case_results(root)
    passed = sum(case["status"] == "passed" for case in cases)
    return {
        "cases": cases,
        "provenance": PROVENANCE,
        "schema_version": SCHEMA_VERSION,
        "scope": "readonly-workspace",
        "summary": {"failed": len(cases) - passed, "passed": passed, "total": len(cases)},
    }


def render_report() -> str:
    """Return the canonical JSON representation of the public evaluation suite."""

    return json.dumps(evaluate(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run deterministic public evaluation checks.")
    parser.add_argument("--output", required=True, type=Path, help="Path for the canonical JSON report.")
    parser.add_argument("--check", action="store_true", help="Verify that --output matches a fresh evaluation run.")
    arguments = parser.parse_args(argv)
    report = render_report()

    if arguments.check:
        if not arguments.output.is_file():
            print(f"Evaluation report is missing: {arguments.output}")
            return 2
        if arguments.output.read_text(encoding="utf-8") != report:
            print(f"Evaluation report is not reproducible: {arguments.output}")
            return 1
        print(f"Evaluation report is reproducible: {arguments.output}")
        return 0

    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(report, encoding="utf-8")
    print(f"Evaluation report written: {arguments.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
