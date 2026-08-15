"""Initial command-line entry point for Coding Agent."""

import argparse
import json
from pathlib import Path

from .config import load_project_env
from .providers.catalog import PROVIDER_CHOICES, resolve_provider_config
from .readonly_workspace import WorkspaceError, list_files, read_file, search


def build_arg_parser():
    parser = argparse.ArgumentParser(
        description="Coding Agent command-line bootstrap.",
    )
    parser.add_argument("--cwd", default=".", help="Project directory used to load .env.")
    parser.add_argument(
        "--provider",
        choices=PROVIDER_CHOICES,
        default=None,
        help="Model provider. Defaults to PICO_PROVIDER or deepseek.",
    )
    parser.add_argument("--model", default=None, help="Override the provider model name.")
    parser.add_argument("--base-url", default=None, help="Override the provider API base URL.")
    parser.add_argument("--host", default=None, help="Override the Ollama host.")
    inspection_group = parser.add_mutually_exclusive_group()
    inspection_group.add_argument(
        "--list-files",
        action="store_true",
        help="List visible files below --path without modifying the workspace.",
    )
    inspection_group.add_argument(
        "--read-file",
        metavar="PATH",
        help="Read a UTF-8 file inside --cwd without modifying it.",
    )
    inspection_group.add_argument(
        "--search",
        metavar="TEXT",
        help="Search UTF-8 files inside --cwd without modifying them.",
    )
    parser.add_argument("--path", default=".", help="Relative directory or file used by --list-files or --search.")
    parser.add_argument("--start", type=int, default=1, help="First line for --read-file.")
    parser.add_argument("--end", type=int, default=200, help="Last line for --read-file.")
    parser.add_argument(
        "--show-config",
        action="store_true",
        help="Print the selected provider configuration without exposing credentials.",
    )
    return parser


def main(argv=None):
    args = build_arg_parser().parse_args(argv)
    if args.list_files or args.read_file or args.search:
        return run_readonly_inspection(args)

    load_project_env(Path(args.cwd))
    config = resolve_provider_config(
        provider=args.provider,
        model=args.model,
        base_url=args.base_url,
        host=args.host,
    )

    if args.show_config:
        print(json.dumps(config.public_dict(), ensure_ascii=False, indent=2))
        return 0

    print("Coding Agent command-line package is ready.")
    print(f"Provider: {config.provider}")
    print("Use --help to view options or --show-config to inspect the selected provider.")
    return 0


def run_readonly_inspection(args):
    try:
        if args.list_files:
            for entry in list_files(args.cwd, args.path):
                marker = "[D]" if entry.kind == "directory" else "[F]"
                print(f"{marker} {entry.path}")
            return 0

        if args.read_file:
            path, content = read_file(args.cwd, args.read_file, args.start, args.end)
            print(f"# {path}")
            print(content)
            return 0

        for match in search(args.cwd, args.search, args.path):
            print(f"{match.path}:{match.line}:{match.text}")
        return 0
    except WorkspaceError as error:
        print(f"error: {error}")
        return 2
