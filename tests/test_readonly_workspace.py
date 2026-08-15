import pytest

from pico.bootstrap import main
from pico.readonly_workspace import WorkspaceError, list_files, read_file, search


def test_list_files_recurses_and_hides_local_state(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "app.py").write_text("print('ok')\n", encoding="utf-8")
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "config").write_text("private\n", encoding="utf-8")
    (tmp_path / ".env").write_text("TOKEN=private\n", encoding="utf-8")

    entries = list_files(tmp_path)

    assert ("src", "directory") in {(entry.path, entry.kind) for entry in entries}
    assert ("src/app.py", "file") in {(entry.path, entry.kind) for entry in entries}
    assert all(".git" not in entry.path and ".env" not in entry.path for entry in entries)


def test_read_file_returns_numbered_requested_lines(tmp_path):
    (tmp_path / "sample.txt").write_text("alpha\nbeta\ngamma\n", encoding="utf-8")

    path, content = read_file(tmp_path, "sample.txt", start=2, end=3)

    assert path == "sample.txt"
    assert content == "   2: beta\n   3: gamma"


@pytest.mark.parametrize("raw_path", ["../outside.txt", "C:/outside.txt"])
def test_read_file_rejects_paths_outside_workspace(tmp_path, raw_path):
    with pytest.raises(WorkspaceError, match="outside the workspace"):
        read_file(tmp_path, raw_path)


def test_read_file_rejects_binary_content(tmp_path):
    (tmp_path / "image.bin").write_bytes(b"\x00\x01")

    with pytest.raises(WorkspaceError, match="binary"):
        read_file(tmp_path, "image.bin")


def test_search_returns_only_visible_text_matches(tmp_path):
    (tmp_path / "notes.txt").write_text("Alpha\nbeta\n", encoding="utf-8")
    (tmp_path / "binary.bin").write_bytes(b"Alpha\x00")

    matches = search(tmp_path, "alpha")

    assert [(match.path, match.line, match.text) for match in matches] == [("notes.txt", 1, "Alpha")]


def test_symlink_to_outside_workspace_is_rejected(tmp_path):
    outside = tmp_path.parent / "outside.txt"
    outside.write_text("private\n", encoding="utf-8")
    link = tmp_path / "outside-link.txt"
    try:
        link.symlink_to(outside)
    except OSError:
        pytest.skip("symbolic links are not available in this environment")

    with pytest.raises(WorkspaceError, match="outside the workspace"):
        read_file(tmp_path, "outside-link.txt")


def test_cli_runs_readonly_commands(tmp_path, capsys):
    (tmp_path / "README.md").write_text("Coding Agent\n", encoding="utf-8")

    assert main(["--cwd", str(tmp_path), "--list-files"]) == 0
    assert "[F] README.md" in capsys.readouterr().out

    assert main(["--cwd", str(tmp_path), "--read-file", "README.md"]) == 0
    assert "1: Coding Agent" in capsys.readouterr().out

    assert main(["--cwd", str(tmp_path), "--search", "agent"]) == 0
    assert "README.md:1:Coding Agent" in capsys.readouterr().out
