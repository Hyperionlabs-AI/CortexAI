"""Auto-patch openai.OpenAI so every chat.completions.create call is logged."""
import time
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..client import AIOBSClient


def patch_openai(aiobs_client: "AIOBSClient", app_name: str = "openai-app") -> None:
    try:
        import openai
    except ImportError:
        raise ImportError("openai package is not installed.")

    original_create = openai.OpenAI.chat.completions.create  # type: ignore[attr-defined]

    def _patched_create(self, *args, **kwargs):  # type: ignore[no-untyped-def]
        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])
        input_text = " ".join(m.get("content", "") for m in messages if isinstance(m, dict))

        start = time.monotonic()
        response = original_create(self, *args, **kwargs)
        duration_ms = int((time.monotonic() - start) * 1000)

        try:
            output_text = response.choices[0].message.content or ""
            usage = response.usage
            aiobs_client.log_trace(
                model=model,
                provider="openai",
                input_text=input_text,
                output_text=output_text,
                prompt_tokens=usage.prompt_tokens if usage else 0,
                completion_tokens=usage.completion_tokens if usage else 0,
                duration_ms=duration_ms,
                app_name=app_name,
            )
        except Exception:
            pass

        return response

    openai.OpenAI.chat.completions.create = _patched_create  # type: ignore[assignment]
