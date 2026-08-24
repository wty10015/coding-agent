"""Run mini-pico's self-contained tests and lint checks."""

from __future__ import annotations

import subprocess
import sys
from importlib.util import find_spec
from pathlib import Path


def _run(root: Path, label: str, command: list[str]) -> int:
    print(f"== {label} ==")
    result = subprocess.run(command, cwd=root, check=False)
    if result.returncode:
        print(f"{label} failed with exit code {result.returncode}.", file=sys.stderr)
    return result.returncode


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    if find_spec("pytest") is None or find_spec("ruff") is None:
        print("Install the example's dev group first: uv run --group dev python scripts/check_quality.py", file=sys.stderr)
        return 2

    basetemp = root / ".pytest-tmp" / "quality"
    basetemp.parent.mkdir(parents=True, exist_ok=True)
    tests = sorted((root / "tests").glob("test_*.py"))
    sources = sorted((root / "mini_pico").glob("*.py"))
    result = _run(
        root,
        "pytest",
        [sys.executable, "-m", "pytest", "-p", "no:cacheprovider", "--basetemp", str(basetemp), *map(str, tests), "-q"],
    )
    if result:
        return result
    return _run(root, "ruff", [sys.executable, "-m", "ruff", "check", *map(str, [*sources, *tests])])


if __name__ == "__main__":
    raise SystemExit(main())
