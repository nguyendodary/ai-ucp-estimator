import json
import logging
import re
from pathlib import Path
from typing import Any, Dict

from openai import AsyncOpenAI
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.core.cache import cache
from app.core.config import settings
from app.models.schemas import AIExtractionResult

logger = logging.getLogger(__name__)

SKILLS_FILE = Path(__file__).parent.parent.parent.parent / "skills.md"
SKILLS_CONTENT = SKILLS_FILE.read_text(encoding="utf-8") if SKILLS_FILE.exists() else ""

SYSTEM_PROMPT = f"""\
{SKILLS_CONTENT}

STRICT OUTPUT FORMAT - Return ONLY valid JSON matching this exact schema:
{{
  "reasoning_log": "Detailed explanation of transaction steps for each use case justifying complexity",
  "actors": [
    {{ "name": "string (actor name)", "type": "simple|average|complex (MUST use these exact lowercase values)" }}
  ],
  "use_cases": [
    {{ "name": "string (use case name)", "transactions": 5 (INTEGER NOT LIST), "complexity": "simple|average|complex" }}
  ]
}}

IMPORTANT RULES:
1. Actor type MUST be exactly: "simple", "average", or "complex" (lowercase, no other values)
2. Transactions MUST be an integer (number of steps), NOT a list of steps
3. Do NOT return weight fields. Backend will compute all weights.
4. Do NOT return metrics fields. Backend will compute all metrics.
5. Be "Underestimation-proof": Core business flows must have at least 5-8 transactions
6. Output ONLY the JSON object - no markdown, no explanation, no text before or after
"""

def _is_complete_ucp_payload(data: Any) -> bool:
    """Return True only when the object matches expected top-level UCP keys."""
    if not isinstance(data, dict):
        return False
    required_keys = {"reasoning_log", "actors", "use_cases"}
    return required_keys.issubset(data.keys())


def _extract_balanced_json_candidates(text: str) -> list[str]:
    """Extract balanced JSON object candidates from text."""
    candidates: list[str] = []
    start = -1
    depth = 0
    in_string = False
    escape = False

    for i, ch in enumerate(text):
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue

        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start != -1:
                    candidates.append(text[start : i + 1])
                    start = -1

    return candidates


def _parse_ai_response(raw: str) -> Dict[str, Any]:
    """Extract and parse a full UCP JSON payload from AI output."""
    if not raw or not raw.strip():
        raise ValueError("Received empty response from AI")

    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", raw).strip()
    if not cleaned:
        raise ValueError("Response was only thinking tags, no actual content")

    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, flags=re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    candidates = _extract_balanced_json_candidates(cleaned)
    if not candidates and cleaned.startswith("{") and cleaned.endswith("}"):
        candidates = [cleaned]

    for candidate in sorted(candidates, key=len, reverse=True):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if _is_complete_ucp_payload(parsed):
            return _normalize_ai_response(parsed)

    logger.error(
        "All JSON parsing attempts failed. Cleaned response (first 500 chars): %s",
        cleaned[:500],
    )
    raise ValueError("Failed to parse AI response as JSON")


def _normalize_ai_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize AI response data; backend calculator remains source of truth."""
    
    # Actor type normalization mapping
    actor_type_mapping = {
        "primary": "average",
        "internal": "average",
        "external": "simple",
        "third-party": "simple",
        "thirdparty": "simple",
        "admin": "complex",
        "system": "complex",
        "user": "average",
        "customer": "average",
        "guest": "simple",
    }
    
    # Normalize and validate actors (weight computed authoritatively in calculator.py)
    if "actors" in data and isinstance(data["actors"], list):
        for actor in data["actors"]:
            if "type" in actor and isinstance(actor["type"], str):
                actor_type = actor["type"].lower().strip()
                actor["type"] = actor_type_mapping.get(actor_type, actor_type)
                actor.pop("weight", None)
    
    # Normalize use cases - handle transactions as list
    if "use_cases" in data and isinstance(data["use_cases"], list):
        for uc in data["use_cases"]:
            # Handle transactions as list - count the steps
            if "transactions" in uc:
                if isinstance(uc["transactions"], list):
                    uc["transactions"] = len(uc["transactions"])
                elif isinstance(uc["transactions"], str):
                    try:
                        uc["transactions"] = int(uc["transactions"])
                    except ValueError:
                        uc["transactions"] = 1
            
            # Determine complexity based on transactions if missing/invalid
            transactions = uc.get("transactions", 1)
            complexity = uc.get("complexity", "simple").lower()

            if complexity not in {"simple", "average", "complex"}:
                if transactions <= 3:
                    complexity = "simple"
                elif transactions <= 7:
                    complexity = "average"
                else:
                    complexity = "complex"
                uc["complexity"] = complexity
            uc.pop("weight", None)

    # Metrics from AI are optional and ignored by backend calculator.
    if "metrics" not in data or not isinstance(data.get("metrics"), dict):
        data["metrics"] = {}

    return data


def _build_prompt(text: str) -> str:
    """Build the complete prompt with system instructions and user input."""
    return f"{SYSTEM_PROMPT}\n\nNow analyze the following requirements:\n\n{text}"


def _build_repair_prompt(text: str, broken_response: str) -> str:
    """Build a strict retry prompt that forces JSON-only output."""
    return (
        f"{SYSTEM_PROMPT}\n\n"
        "Your previous answer was NOT valid JSON and cannot be parsed.\n"
        "Return ONLY ONE valid JSON object with these top-level keys exactly:\n"
        '["reasoning_log","actors","use_cases"]\n'
        "No markdown, no <think> tags, no commentary.\n\n"
        "Original requirements:\n"
        f"{text}\n\n"
        "Invalid previous response (for correction):\n"
        f"{broken_response[:3000]}"
    )


class AIService:
    """Service for interacting with OpenAI API with caching and retry logic."""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=15),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    async def _call_openai(self, prompt: str) -> str:
        """Call OpenAI API with retry logic for maximum accuracy."""
        response = await self.client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_completion_tokens=4096,
        )
        content = response.choices[0].message.content
        if content is None or not content.strip():
            raise ValueError("OpenAI returned empty response")
        return content

    async def extract(self, text: str) -> AIExtractionResult:
        """
        Extract structured actors and use cases from requirement text.
        Uses cache to avoid duplicate API calls.
        """
        # Check cache first
        cached = cache.get(text)
        if cached is not None:
            logger.info("Returning cached AI extraction result")
            return AIExtractionResult(**cached)

        prompt = _build_prompt(text)
        logger.info("Calling OpenAI API for extraction")
        raw_response = await self._call_openai(prompt)

        try:
            data = _parse_ai_response(raw_response)
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(
                "First parse failed, retrying with strict JSON repair prompt: %s | Raw: %s",
                e,
                raw_response[:500],
            )
            repair_prompt = _build_repair_prompt(text, raw_response)
            repaired_raw_response = await self._call_openai(repair_prompt)
            try:
                data = _parse_ai_response(repaired_raw_response)
            except (json.JSONDecodeError, KeyError, ValueError) as repair_error:
                logger.error(
                    "Failed to parse AI response after repair retry: %s | Raw: %s",
                    repair_error,
                    repaired_raw_response[:500],
                )
                raise ValueError(f"AI returned malformed JSON: {repair_error}") from repair_error

        result = AIExtractionResult(**data)

        # Store in cache
        cache.set(text, data)

        logger.info(
            "Extracted %d actors and %d use cases",
            len(result.actors),
            len(result.use_cases),
        )
        return result


ai_service = AIService()
