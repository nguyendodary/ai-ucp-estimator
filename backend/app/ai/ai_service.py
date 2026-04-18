import asyncio
import json
import logging
import re
import time
from pathlib import Path
from typing import Any, Dict

from openai import AsyncOpenAI
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.cache import cache
from app.core.config import settings
from app.models.schemas import AIExtractionResult

logger = logging.getLogger(__name__)

SKILLS_FILE = Path(__file__).parent.parent.parent.parent / "skills.md"


def _load_skills_content() -> str:
    """Load skills.md fresh each time so Docker doesn't cache stale prompts."""
    if SKILLS_FILE.exists():
        return SKILLS_FILE.read_text(encoding="utf-8")
    return ""


SYSTEM_SUFFIX = """

---

## STRICT OUTPUT REQUIREMENT

Return ONLY one valid JSON object — no markdown, no code fences, no explanation before or after.
This JSON is machine-parsed; any extra text will cause a failure.

The very first character must be { and the very last must be }."""


def _remap_keys(data: Dict[str, Any]) -> Dict[str, Any]:
    """Remap common alternate key names to the expected schema keys."""
    top_level_remap = {
        "useCases": "use_cases",
        "use_cases": "use_cases",
        "UseCases": "use_cases",
        "reasoningLog": "reasoning_log",
        "reasoning_log": "reasoning_log",
        "ReasoningLog": "reasoning_log",
        "Actors": "actors",
        "actors": "actors",
    }
    remapped = {}
    for k, v in data.items():
        remapped_key = top_level_remap.get(k, k)
        remapped[remapped_key] = v
    return remapped


def _is_complete_ucp_payload(data: Any) -> bool:
    """Return True only when the object matches expected top-level UCP keys (after remapping)."""
    if not isinstance(data, dict):
        return False
    remapped = _remap_keys(data)
    required_keys = {"reasoning_log", "actors", "use_cases"}
    return required_keys.issubset(remapped.keys())


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

    fence_match = re.search(
        r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, flags=re.IGNORECASE
    )
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
            remapped = _remap_keys(parsed)
            return _normalize_ai_response(remapped)

    logger.error(
        "Failed to extract valid JSON from AI response after trying all candidates. "
        f"Cleaned response (first 500 chars): {cleaned[:500]}"
    )
    raise ValueError("AI response does not contain valid JSON with required fields")


def _validate_ai_response(data: Dict[str, Any]) -> None:
    """Validate AI response structure before normalization."""
    if not isinstance(data, dict):
        raise ValueError("AI response is not a dictionary")

    if "actors" not in data:
        raise ValueError("AI response missing 'actors' field")

    if "use_cases" not in data:
        raise ValueError("AI response missing 'use_cases' field")

    if not isinstance(data["actors"], list) or len(data["actors"]) == 0:
        raise ValueError("AI response must have at least one actor")

    if not isinstance(data["use_cases"], list) or len(data["use_cases"]) == 0:
        raise ValueError("AI response must have at least one use case")


def _normalize_ai_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize AI response data; backend calculator remains source of truth."""
    # Validate response structure before normalization
    _validate_ai_response(data)

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
        normalized_actors = []
        for actor in data["actors"]:
            # Handle actors as plain strings (e.g., "Customer")
            if isinstance(actor, str):
                name = actor.strip()
                actor_type = "average"  # default for named human actors
                # Heuristic: guess type from name
                name_lower = name.lower()
                if any(
                    kw in name_lower
                    for kw in [
                        "api",
                        "gateway",
                        "system",
                        "service",
                        "smtp",
                        "sms",
                        "email",
                        "webhook",
                    ]
                ):
                    actor_type = "simple"
                elif any(kw in name_lower for kw in ["admin", "manager", "supervisor"]):
                    actor_type = "complex"
                normalized_actors.append({"name": name, "type": actor_type})
                continue

            if not isinstance(actor, dict):
                continue

            # Remap alternate actor keys
            if "type" not in actor and "actor_type" in actor:
                actor["type"] = actor.pop("actor_type")
            if "type" not in actor and "role" in actor:
                actor["type"] = actor.pop("role")
            if "type" not in actor and "classification" in actor:
                actor["type"] = actor.pop("classification")

            # Default type if still missing
            if "type" not in actor:
                actor["type"] = "average"

            if isinstance(actor["type"], str):
                actor_type = actor["type"].lower().strip()
                actor["type"] = actor_type_mapping.get(actor_type, actor_type)
            actor.pop("weight", None)
            actor.pop("actors", None)  # Remove stray nested actors
            normalized_actors.append(actor)
        data["actors"] = normalized_actors

    # Normalize use cases
    if "use_cases" in data and isinstance(data["use_cases"], list):
        normalized_ucs = []
        for uc in data["use_cases"]:
            if not isinstance(uc, dict):
                continue

            # Remap alternate field names
            if "transactions" not in uc and "transaction_count" in uc:
                uc["transactions"] = uc.pop("transaction_count")
            if "transactions" not in uc and "steps" in uc:
                uc["transactions"] = uc.pop("steps")
            if "transactions" not in uc and "transactionCount" in uc:
                uc["transactions"] = uc.pop("transactionCount")

            # Remap estimatedComplexity → complexity
            if "complexity" not in uc and "estimatedComplexity" in uc:
                val = uc.pop("estimatedComplexity")
                # If it's a weight number (5/10/15), map to complexity string
                if isinstance(val, (int, float)):
                    weight_to_complexity = {5: "simple", 10: "average", 15: "complex"}
                    uc["complexity"] = weight_to_complexity.get(val, "average")
                else:
                    uc["complexity"] = str(val).lower()

            if "complexity" not in uc and "complexity_level" in uc:
                uc["complexity"] = uc.pop("complexity_level")

            # Handle transactions as list - count the steps
            if "transactions" in uc:
                if isinstance(uc["transactions"], list):
                    uc["transactions"] = len(uc["transactions"])
                elif isinstance(uc["transactions"], str):
                    try:
                        uc["transactions"] = int(uc["transactions"])
                    except ValueError:
                        uc["transactions"] = 1

            # Default transactions if missing
            if "transactions" not in uc:
                # Infer from complexity if available
                complexity = uc.get("complexity", "average")
                if isinstance(complexity, str):
                    complexity = complexity.lower()
                default_transactions = {"simple": 3, "average": 5, "complex": 8}
                uc["transactions"] = default_transactions.get(complexity, 5)

            # Determine complexity based on transactions if missing/invalid
            transactions = uc.get("transactions", 1)
            complexity = uc.get("complexity", "average")
            if isinstance(complexity, str):
                complexity = complexity.lower().strip()
            else:
                complexity = "average"

            if complexity not in {"simple", "average", "complex"}:
                if transactions <= 3:
                    complexity = "simple"
                elif transactions <= 7:
                    complexity = "average"
                else:
                    complexity = "complex"
                uc["complexity"] = complexity
            uc.pop("weight", None)
            uc.pop("actors", None)  # Remove stray nested actors in use cases
            uc.pop("estimatedComplexity", None)  # Clean up if still present
            normalized_ucs.append(uc)
        data["use_cases"] = normalized_ucs

    # Ensure reasoning_log exists
    if "reasoning_log" not in data or not data["reasoning_log"]:
        data["reasoning_log"] = (
            "Auto-generated: reasoning log was missing from AI response."
        )

    # Metrics from AI are optional and ignored by backend calculator.
    if "metrics" not in data or not isinstance(data.get("metrics"), dict):
        data["metrics"] = {}

    return data


def _build_prompt(text: str) -> str:
    """Build the user message with explicit chain-of-thought scaffolding."""
    return (
        "Perform a Use Case Point (UCP) analysis on the software requirements below.\n\n"
        "Work through each step in order:\n"
        "  Step 1 — List every actor that crosses the system boundary and classify each "
        "(simple / average / complex) based on interaction complexity.\n"
        "  Step 2 — List every distinct user goal as a use case. Count atomic transactions "
        "for each use case, then map the count to complexity (1-3=simple, 4-7=average, ≥8=complex).\n"
        "  Step 3 — Apply the under-estimation guard: if real-time, blockchain, ML/AI, "
        "financial precision, or high-concurrency signals are present, raise minimum "
        "complexity to average (complex for directly-involved use cases).\n"
        "  Step 4 — Write a thorough reasoning_log that names every actor, every use case "
        "with its transaction count, and explicitly states every technical signal found "
        "using the exact keyword phrases from your instructions.\n\n"
        "SOFTWARE REQUIREMENTS:\n"
        "══════════════════════════════════════════════════════════\n"
        f"{text.strip()}\n"
        "══════════════════════════════════════════════════════════\n\n"
        "Return ONE valid JSON object only. No markdown fences. No text outside the JSON."
    )


def _build_repair_prompt(text: str, broken_response: str) -> str:
    """Build a strict retry prompt that forces JSON-only output."""
    return (
        "Your previous response could not be parsed as valid JSON. Correct it now.\n\n"
        "Return ONLY ONE valid JSON object with exactly these top-level keys:\n"
        '  "reasoning_log"  — string: your full analysis and all technical signals\n'
        '  "actors"         — array of {name, type} objects (type: simple|average|complex)\n'
        '  "use_cases"      — array of {name, transactions, complexity, description} objects\n\n'
        "Rules:\n"
        "  - First character must be {   Last character must be }\n"
        "  - No markdown code fences (no ```)\n"
        "  - No text, commentary, or explanation outside the JSON object\n\n"
        "Original requirements:\n"
        f"{text.strip()}\n\n"
        "Your previous (invalid) response for reference:\n"
        f"{broken_response[:3000]}"
    )


class AIService:
    """Service for interacting with OpenAI API with caching and retry logic."""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            max_retries=0,  # disable SDK retries — our fallback loop handles them
        )

    async def _call_openai(
        self, prompt: str, model: str | None = None, timeout: float = 65.0
    ) -> str:
        """Call OpenAI API with the specified model."""
        response = await self.client.chat.completions.create(
            model=model or settings.openai_model,
            messages=[
                {"role": "system", "content": _load_skills_content() + SYSTEM_SUFFIX},
                {"role": "user", "content": prompt},
            ],
            temperature=0.05,
            max_tokens=8192,  # max_tokens is supported by all providers; max_completion_tokens is not
            timeout=timeout,
        )
        content = response.choices[0].message.content
        if content is None or not content.strip():
            raise ValueError("OpenAI returned empty response")
        return content

    async def _call_openai_with_fallback(self, prompt: str) -> str:
        """Call OpenAI API with fallback model support.

        Enforces a 230 s total chain budget so the combined time across all
        model attempts never exceeds the 300 s axios frontend timeout.
        Each model call gets a dynamic per-call timeout = min(65s, remaining budget).
        """
        CHAIN_BUDGET_S = 230  # total seconds allowed for the entire fallback chain
        CALL_CAP_S = 65  # maximum seconds for any single model call
        RATE_LIMIT_WAIT_S = 2  # seconds to sleep after a 429 before next model

        models_to_try = [settings.openai_model] + settings.fallback_models
        last_error = None
        chain_start = time.monotonic()

        for idx, model in enumerate(models_to_try):
            elapsed = time.monotonic() - chain_start
            remaining = CHAIN_BUDGET_S - elapsed

            if remaining <= 5:
                logger.warning(
                    f"Chain budget exhausted after {elapsed:.1f}s — stopping after "
                    f"{idx} model attempt(s). Last error: {last_error}"
                )
                break

            per_call_timeout = min(CALL_CAP_S, remaining - 2)  # keep 2s buffer
            logger.info(
                f"Attempting model {idx + 1}/{len(models_to_try)}: {model} "
                f"(budget remaining: {remaining:.0f}s, call timeout: {per_call_timeout:.0f}s)"
            )

            try:
                return await self._call_openai(prompt, model, timeout=per_call_timeout)
            except Exception as e:
                last_error = e
                error_str = str(e)
                if (
                    "429" in error_str
                    or "rate_limit" in error_str.lower()
                    or "rate limit" in error_str.lower()
                ):
                    logger.warning(
                        f"Model {model} rate-limited (429), waiting {RATE_LIMIT_WAIT_S}s before next model..."
                    )
                    await asyncio.sleep(RATE_LIMIT_WAIT_S)
                elif (
                    "503" in error_str
                    or "no healthy upstream" in error_str.lower()
                    or "service unavailable" in error_str.lower()
                ):
                    # Provider down — skip immediately, no point waiting
                    logger.warning(
                        f"Model {model} provider unavailable (503), skipping to next model immediately..."
                    )
                else:
                    logger.warning(f"Model {model} failed: {e}")

                if idx < len(models_to_try) - 1:
                    logger.info("Falling back to next model...")
                else:
                    logger.error(f"All models failed. Last error: {e}")

        raise last_error or Exception("All models failed or chain budget exhausted")

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
        logger.info("Calling OpenAI API for extraction with fallback support")
        raw_response = await self._call_openai_with_fallback(prompt)

        try:
            data = _parse_ai_response(raw_response)
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(
                "First parse failed, retrying with strict JSON repair prompt: %s | Raw: %s",
                e,
                raw_response[:500],
            )
            repair_prompt = _build_repair_prompt(text, raw_response)
            repaired_raw_response = await self._call_openai_with_fallback(repair_prompt)
            try:
                data = _parse_ai_response(repaired_raw_response)
            except (json.JSONDecodeError, KeyError, ValueError) as repair_error:
                logger.error(
                    "Failed to parse AI response after repair retry: %s | Raw: %s",
                    repair_error,
                    repaired_raw_response[:500],
                )
                raise ValueError(
                    f"AI returned malformed JSON: {repair_error}"
                ) from repair_error

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
