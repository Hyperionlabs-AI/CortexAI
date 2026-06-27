import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx


class AIOBSClient:
    def __init__(self, host: str = "http://localhost:8002", api_key: Optional[str] = None) -> None:
        self._base = host.rstrip("/")
        self._headers = {"Content-Type": "application/json"}
        if api_key:
            self._headers["X-API-Key"] = api_key

    def log_trace(
        self,
        model: str,
        provider: str,
        input_text: str,
        output_text: str,
        prompt_tokens: int,
        completion_tokens: int,
        duration_ms: int,
        status: str = "success",
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        app_name: Optional[str] = None,
        environment: str = "production",
        tags: Optional[dict] = None,
        ttft_ms: Optional[int] = None,
    ) -> str:
        trace_id = str(uuid.uuid4())
        payload = {
            "id": trace_id,
            "model": model,
            "provider": provider,
            "status": status,
            "input_text": input_text,
            "output_text": output_text,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "duration_ms": duration_ms,
            "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        if user_id:    payload["user_id"] = user_id
        if session_id: payload["session_id"] = session_id
        if app_name:   payload["app_name"] = app_name
        if environment: payload["environment"] = environment
        if tags:        payload["tags"] = tags
        if ttft_ms is not None: payload["ttft_ms"] = ttft_ms

        with httpx.Client(timeout=10.0) as client:
            resp = client.post(f"{self._base}/api/ingest/trace", json=payload, headers=self._headers)
            resp.raise_for_status()

        return trace_id

    def log_span(
        self,
        trace_id: str,
        name: str,
        span_type: str,
        start_time: str,
        end_time: Optional[str] = None,
        parent_span_id: Optional[str] = None,
        input_text: Optional[str] = None,
        output_text: Optional[str] = None,
        model: Optional[str] = None,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        metadata: Optional[dict] = None,
    ) -> str:
        span_id = str(uuid.uuid4())
        payload = {
            "id": span_id, "trace_id": trace_id, "name": name,
            "span_type": span_type, "start_time": start_time,
        }
        if end_time:        payload["end_time"] = end_time
        if parent_span_id:  payload["parent_span_id"] = parent_span_id
        if input_text:      payload["input_text"] = input_text
        if output_text:     payload["output_text"] = output_text
        if model:           payload["model"] = model
        if prompt_tokens:   payload["prompt_tokens"] = prompt_tokens
        if completion_tokens: payload["completion_tokens"] = completion_tokens
        if metadata:        payload["metadata"] = metadata

        with httpx.Client(timeout=10.0) as client:
            resp = client.post(f"{self._base}/api/ingest/span", json=payload, headers=self._headers)
            resp.raise_for_status()

        return span_id

    def log_score(
        self,
        trace_id: str,
        name: str,
        value: float,
        span_id: Optional[str] = None,
        comment: Optional[str] = None,
        source: str = "auto",
    ) -> None:
        payload = {"trace_id": trace_id, "name": name, "value": value, "source": source}
        if span_id: payload["span_id"] = span_id
        if comment: payload["comment"] = comment

        with httpx.Client(timeout=10.0) as client:
            resp = client.post(f"{self._base}/api/ingest/score", json=payload, headers=self._headers)
            resp.raise_for_status()
