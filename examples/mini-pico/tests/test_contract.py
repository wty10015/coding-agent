import subprocess
import sys
from pathlib import Path

import mini_pico


def test_mini_pico_module_and_public_exports():
    assert mini_pico.Pico is not None
    assert mini_pico.FakeModelClient is not None
    assert not hasattr(mini_pico, "MiniAgent")
    result = subprocess.run([sys.executable, "-m", "mini_pico", "--help"], capture_output=True, text=True, check=True)
    assert "Teaching-sized Pico agent harness" in result.stdout


def test_example_layout_points_to_its_own_files():
    example_root = Path(__file__).resolve().parents[1]
    main_files = [
        "mini_pico/cli.py",
        "mini_pico/runtime.py",
        "mini_pico/agent_loop.py",
        "mini_pico/context_manager.py",
        "mini_pico/providers.py",
        "mini_pico/tool_executor.py",
        "mini_pico/tools.py",
        "mini_pico/state.py",
        "mini_pico/workspace.py",
    ]
    for path in main_files:
        assert (example_root / path).exists()
