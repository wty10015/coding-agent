"""Initial command-line entry point for Coding Agent."""

import argparse
import json
from pathlib import Path

from .config import load_project_env
from .providers.catalog import PROVIDER_CHOICES, resolve_provider_config


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
    parser.add_argument(
        "--show-config",
        action="store_true",
        help="Print the selected provider configuration without exposing credentials.",
    )
    return parser


def main(argv=None):
    args = build_arg_parser().parse_args(argv)
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
