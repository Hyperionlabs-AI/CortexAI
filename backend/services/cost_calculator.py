MODEL_PRICING: dict[str, dict[str, float]] = {
    # OpenAI — price per 1M tokens (input / output)
    "gpt-4o":           {"input": 2.50,  "output": 10.00},
    "gpt-4o-mini":      {"input": 0.15,  "output": 0.60},
    "gpt-4-turbo":      {"input": 10.00, "output": 30.00},
    "gpt-3.5-turbo":    {"input": 0.50,  "output": 1.50},
    # Anthropic
    "claude-opus-4-8":  {"input": 15.00, "output": 75.00},
    "claude-sonnet-4-6":{"input": 3.00,  "output": 15.00},
    "claude-haiku-4-5": {"input": 0.80,  "output": 4.00},
    # Google
    "gemini-1.5-pro":   {"input": 3.50,  "output": 10.50},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    # Mistral
    "mistral-large":    {"input": 2.00,  "output": 6.00},
    "mistral-small":    {"input": 0.20,  "output": 0.60},
}


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        return 0.0
    cost = (prompt_tokens / 1_000_000) * pricing["input"] + \
           (completion_tokens / 1_000_000) * pricing["output"]
    return round(cost, 6)
