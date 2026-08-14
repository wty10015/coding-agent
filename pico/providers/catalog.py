"""Provider defaults and environment-variable resolution."""

from dataclasses import dataclass

from ..config import provider_env

PROVIDER_CHOICES = ("ollama", "openai", "anthropic", "deepseek")
DEFAULT_PROVIDER = "deepseek"


@dataclass(frozen=True)
class ProviderConfig:
    provider: str
    model: str
    base_url: str
    api_key: str | None = None

    def public_dict(self):
        return {
            "provider": self.provider,
            "model": self.model,
            "base_url": self.base_url,
            "credential_configured": bool(self.api_key),
        }


def _resolve_openai(model, base_url):
    return ProviderConfig(
        provider="openai",
        model=model or provider_env("PICO_OPENAI_MODEL", ("OPENAI_MODEL",), "gpt-5.4"),
        base_url=base_url
        or provider_env(
            "PICO_OPENAI_API_BASE",
            ("OPENAI_API_BASE",),
            "https://www.right.codes/codex/v1",
        ),
        api_key=provider_env(
            "PICO_OPENAI_API_KEY",
            ("OPENAI_API_KEY", "PICO_RIGHT_CODES_API_KEY", "RIGHT_CODES_API_KEY"),
        )
        or None,
    )


def _resolve_anthropic(model, base_url):
    return ProviderConfig(
        provider="anthropic",
        model=model
        or provider_env("PICO_ANTHROPIC_MODEL", ("ANTHROPIC_MODEL",), "claude-sonnet-4-6"),
        base_url=base_url
        or provider_env(
            "PICO_ANTHROPIC_API_BASE",
            ("ANTHROPIC_API_BASE",),
            "https://www.right.codes/claude/v1",
        ),
        api_key=provider_env(
            "PICO_ANTHROPIC_API_KEY",
            ("ANTHROPIC_API_KEY", "PICO_RIGHT_CODES_API_KEY", "RIGHT_CODES_API_KEY"),
        )
        or None,
    )


def _resolve_deepseek(model, base_url):
    return ProviderConfig(
        provider="deepseek",
        model=model
        or provider_env("PICO_DEEPSEEK_MODEL", ("DEEPSEEK_MODEL",), "deepseek-v4-pro"),
        base_url=base_url
        or provider_env(
            "PICO_DEEPSEEK_API_BASE",
            ("DEEPSEEK_API_BASE",),
            "https://api.deepseek.com/anthropic",
        ),
        api_key=provider_env("PICO_DEEPSEEK_API_KEY", ("DEEPSEEK_API_KEY",)) or None,
    )


def _resolve_ollama(model, host):
    return ProviderConfig(
        provider="ollama",
        model=model or provider_env("PICO_OLLAMA_MODEL", ("OLLAMA_MODEL",), "qwen3.5:4b"),
        base_url=host
        or provider_env("PICO_OLLAMA_HOST", ("OLLAMA_HOST",), "http://127.0.0.1:11434"),
    )


def resolve_provider_config(provider=None, model=None, base_url=None, host=None):
    selected = provider or provider_env("PICO_PROVIDER", default=DEFAULT_PROVIDER)
    if selected not in PROVIDER_CHOICES:
        choices = ", ".join(PROVIDER_CHOICES)
        raise ValueError(f"unknown provider: {selected}. expected one of: {choices}")
    if selected == "openai":
        return _resolve_openai(model, base_url)
    if selected == "anthropic":
        return _resolve_anthropic(model, base_url)
    if selected == "deepseek":
        return _resolve_deepseek(model, base_url)
    return _resolve_ollama(model, host)
