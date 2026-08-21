"""Run the reproducible quality gates for the currently published tree."""

from __future__ import annotations

import subprocess
import sys
from importlib.util import find_spec
from pathlib import Path


def _repository_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _tracked_paths(root: Path, prefix: str, suffix: str) -> list[Path]:
    command = ["git", "-C", str(root), "ls-files"]
    if prefix:
        command.extend(["--", prefix])
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=True,
    )
    return [
        root / relative
        for relative in result.stdout.splitlines()
        if relative.endswith(suffix) and (root / relative).is_file()
    ]


def _run(root: Path, label: str, command: list[str]) -> int:
    print(f"== {label} ==")
    print("$ " + " ".join(command))
    try:
        result = subprocess.run(command, cwd=root, check=False)
    except FileNotFoundError as error:
        print(f"无法启动 {label}：{error}", file=sys.stderr)
        return 2
    if result.returncode:
        print(f"{label} 失败，退出码 {result.returncode}。", file=sys.stderr)
    return result.returncode


def _require_module(name: str) -> bool:
    if find_spec(name) is not None:
        return True
    print(f"当前解释器缺少 {name}，请先安装开发依赖：python -m pip install -e .[dev]", file=sys.stderr)
    return False


def main() -> int:
    root = _repository_root()
    tests = _tracked_paths(root, "tests/", ".py")
    python_files = _tracked_paths(root, "", ".py")
    if not tests:
        print("未找到已跟踪的 tests/*.py 文件。", file=sys.stderr)
        return 2
    if not python_files:
        print("未找到已跟踪的 Python 文件。", file=sys.stderr)
        return 2
    if not _require_module("pytest") or not _require_module("ruff"):
        return 2

    basetemp = root / ".pytest-tmp" / "quality"
    pytest_command = [
        sys.executable,
        "-m",
        "pytest",
        "-p",
        "no:cacheprovider",
        "--basetemp",
        str(basetemp),
        *[str(path) for path in tests],
        "-q",
    ]
    result = _run(root, "pytest", pytest_command)
    if result:
        return result

    ruff_command = [sys.executable, "-m", "ruff", "check", *[str(path) for path in python_files]]
    return _run(root, "ruff", ruff_command)


if __name__ == "__main__":
    raise SystemExit(main())
