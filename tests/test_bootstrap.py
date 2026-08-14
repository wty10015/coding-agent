import json
import subprocess
import sys

import pytest

from pico.providers import resolve_provider_config


def test_provider_defaults_are_available_without_credentials(monkeypatch):
    monkeypatch.delenv("PICO_PROVIDER", raising=False)
    config = resolve_provider_config()

    assert config.provider == "deepseek"
    assert config.model == "deepseek-v4-pro"
    assert config.api_key is None


def test_provider_configuration_hides_credentials(monkeypatch):
    monkeypatch.setenv("PICO_OPENAI_API_KEY", "example-secret")
    config = resolve_provider_config(provider="openai")

    assert config.public_dict()["credential_configured"] is True
    assert "example-secret" not in json.dumps(config.public_dict())


@pytest.mark.parametrize(
    ("provider", "model", "base_url"),
    [
        ("openai", "gpt-5.4", "https://www.right.codes/codex/v1"),
        ("anthropic", "claude-sonnet-4-6", "https://www.right.codes/claude/v1"),
        ("deepseek", "deepseek-v4-pro", "https://api.deepseek.com/anthropic"),
        ("ollama", "qwen3.5:4b", "http://127.0.0.1:11434"),
    ],
)
def test_each_provider_has_a_default_configuration(monkeypatch, provider, model, base_url):
    monkeypatch.delenv("PICO_PROVIDER", raising=False)
    config = resolve_provider_config(provider=provider)

    assert config.model == model
    assert config.base_url == base_url


def test_module_help_works():
    result = subprocess.run(
        [sys.executable, "-m", "pico", "--help"],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0
    assert "--provider" in result.stdout
