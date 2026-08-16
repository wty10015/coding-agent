import sys

import pytest

from pico.guarded_workspace import (
    ApprovalDenied,
    ApprovalPolicy,
    CommandBlocked,
    WorkspaceError,
    patch_file,
    run_shell,
    write_file,
)


def test_auto_policy_allows_text_write_and_exact_patch(tmp_path):
    policy = ApprovalPolicy("auto")

    assert write_file(tmp_path, "notes.txt", "alpha\n", policy) == "notes.txt"
    assert patch_file(tmp_path, "notes.txt", "alpha", "beta", policy) == "notes.txt"
    assert (tmp_path / "notes.txt").read_text(encoding="utf-8") == "beta\n"


def test_ask_policy_denies_write_and_patch_without_callback(tmp_path):
    target = tmp_path / "notes.txt"
    target.write_text("alpha\n", encoding="utf-8")
    policy = ApprovalPolicy("ask")

    with pytest.raises(ApprovalDenied):
        write_file(tmp_path, "new.txt", "blocked", policy)
    with pytest.raises(ApprovalDenied):
        patch_file(tmp_path, "notes.txt", "alpha", "beta", policy)

    assert not (tmp_path / "new.txt").exists()
    assert target.read_text(encoding="utf-8") == "alpha\n"


def test_patch_mismatch_is_atomic(tmp_path):
    target = tmp_path / "notes.txt"
    target.write_text("alpha\nalpha\n", encoding="utf-8")

    with pytest.raises(WorkspaceError, match="exactly once"):
        patch_file(tmp_path, "notes.txt", "alpha", "beta", ApprovalPolicy("auto"))

    assert target.read_text(encoding="utf-8") == "alpha\nalpha\n"


def test_mutations_reject_path_and_parent_symlink_escape(tmp_path):
    outside = tmp_path.parent / f"{tmp_path.name}-outside"
    outside.mkdir()
    outside_file = outside / "private.txt"
    outside_file.write_text("private\n", encoding="utf-8")
    link = tmp_path / "linked"
    final_link = tmp_path / "final-link.txt"
    try:
        link.symlink_to(outside, target_is_directory=True)
        final_link.symlink_to(outside_file)
    except OSError:
        pytest.skip("symbolic links are not available in this environment")

    policy = ApprovalPolicy("auto")
    with pytest.raises(WorkspaceError, match="outside the workspace|symbolic links"):
        write_file(tmp_path, "../outside.txt", "blocked", policy)
    with pytest.raises(WorkspaceError, match="symbolic links"):
        write_file(tmp_path, "linked/escape.txt", "blocked", policy)
    with pytest.raises(WorkspaceError, match="symbolic links"):
        write_file(tmp_path, "final-link.txt", "blocked", policy)


def test_run_shell_requires_explicit_callback_even_in_auto_mode(tmp_path):
    with pytest.raises(ApprovalDenied):
        run_shell(tmp_path, [sys.executable, "-c", "print('safe')"], ApprovalPolicy("auto"))


def test_run_shell_hard_blocks_before_approval(tmp_path):
    policy = ApprovalPolicy("ask", callback=lambda action, details: True)

    with pytest.raises(CommandBlocked, match="high-risk"):
        run_shell(tmp_path, ["cmd", "/c", "echo safe"], policy)


def test_run_shell_honors_denial_and_runs_approved_argument_vector(tmp_path, monkeypatch):
    denied = ApprovalPolicy("ask", callback=lambda action, details: False)
    with pytest.raises(ApprovalDenied):
        run_shell(tmp_path, [sys.executable, "-c", "print('safe')"], denied)

    approved = ApprovalPolicy("ask", callback=lambda action, details: action == "run_shell")
    result = run_shell(tmp_path, [sys.executable, "-c", "print('safe')"], approved)

    assert result.exit_code == 0
    assert result.stdout.strip() == "safe"
    assert result.stderr == ""

    monkeypatch.setenv("PICO_TEST_SECRET", "not-for-child-process")
    secret_result = run_shell(
        tmp_path,
        [sys.executable, "-c", "import os; print(os.getenv('PICO_TEST_SECRET', 'missing'))"],
        approved,
    )
    assert secret_result.stdout.strip() == "missing"
