"""Auto-patch anthropic.Anthropic so every messages.create call is logged."""
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..client import AIOBSClient


def patch_anthropic(aiobs_client: "AIOBSClient", app_name: str = "anthropic-app") -> None:
    try:
        import anthropic
    except ImportError:
        raise ImportError("anthropic package is not installed.")

    original_create = anthropic.Anthropic.messages.create  # type: ignore[attr-defined]

    def _patched_create(self, *args, **kwargs):  # type: ignore[no-untyped-def]
        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])
        input_text = " ".join(
            (m.get("content", "") if isinstance(m.get("content"), str) else "")
            for m in messages if isinstance(m, dict)
        )

        start = time.monotonic()
        response = original_create(self, *args, **kwargs)
        duration_ms = int((time.monotonic() - start) * 1000)

        try:
            output_text = response.content[0].text if response.content else ""
            usage = response.usage
            aiobs_client.log_trace(
                model=model,
                provider="anthropic",
                input_text=input_text,
                output_text=output_text,
                prompt_tokens=usage.input_tokens if usage else 0,
                completion_tokens=usage.output_tokens if usage else 0,
                duration_ms=duration_ms,
                app_name=app_name,
            )
        except Exception:
            pass

        return response

    anthropic.Anthropic.messages.create = _patched_create  # type: ignore[assignment]
