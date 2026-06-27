import time
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Optional

from .client import AIOBSClient


class _TraceContext:
    def __init__(self) -> None:
        self._output: Optional[str] = None
        self._prompt_tokens: int = 0
        self._completion_tokens: int = 0
        self._ttft_ms: Optional[int] = None
        self._status: str = "success"

    def set_output(self, text: str) -> None:
        self._output = text

    def set_tokens(self, prompt_tokens: int, completion_tokens: int) -> None:
        self._prompt_tokens = prompt_tokens
        self._completion_tokens = completion_tokens

    def set_ttft(self, ttft_ms: int) -> None:
        self._ttft_ms = ttft_ms

    def set_error(self) -> None:
        self._status = "error"


@contextmanager
def trace_llm(
    client: AIOBSClient,
    model: str,
    provider: str,
    input_text: str = "",
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    app_name: Optional[str] = None,
    environment: str = "production",
    tags: Optional[dict] = None,
):
    """
    Context manager that records an LLM call as a trace.

    Usage::

        with trace_llm(client, model="gpt-4o", provider="openai", input_text=prompt) as t:
            response = openai_client.chat.completions.create(...)
            t.set_output(response.choices[0].message.content)
            t.set_tokens(response.usage.prompt_tokens, response.usage.completion_tokens)
    """
    ctx = _TraceContext()
    start_ms = time.monotonic()
    start_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    try:
        yield ctx
    except Exception:
        ctx.set_error()
        raise
    finally:
        duration_ms = int((time.monotonic() - start_ms) * 1000)
        try:
            client.log_trace(
                model=model,
                provider=provider,
                input_text=input_text,
                output_text=ctx._output or "",
                prompt_tokens=ctx._prompt_tokens,
                completion_tokens=ctx._completion_tokens,
                duration_ms=duration_ms,
                status=ctx._status,
                user_id=user_id,
                session_id=session_id,
                app_name=app_name,
                environment=environment,
                tags=tags,
                ttft_ms=ctx._ttft_ms,
            )
        except Exception:
            pass  # never let observability break the application
