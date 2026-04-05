import json
import logging
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

SYSTEM_PROMPT = """\
You are an expert software requirements analyst. Your job is to analyze software \
requirement documents and extract actors and use cases for Use Case Point (UCP) estimation.

RULES:
1. Identify ALL actors (users, systems, devices, external services) that interact with the system.
2. Classify each actor as "simple", "average", or "complex":
   - simple: External system with a well-defined API (e.g., payment gateway, email service)
   - average: External system with standard protocols (e.g., web browser, mobile app)
   - complex: Human actors interacting through a GUI with many interactions
3. Identify ALL use cases (functional requirements) the system must support.
4. Count the number of transactions (major steps/interactions) for each use case.
   - A transaction is a distinct user-system interaction (input, process, output cycle).
   - If unsure, estimate conservatively based on the description detail.

IMPORTANT:
- Return ONLY valid JSON. No markdown, no explanation, no code fences.
- The JSON must match this exact schema:
{"actors":[{"name":"string","type":"simple|average|complex"}],"use_cases":[{"name":"string","transactions":number}]}
- If the input is noisy or unclear, do your best to extract meaningful actors and use cases.
- Always return at least 1 actor and 1 use case if any system is described.
"""

FEW_SHOT_EXAMPLE = """\
Example input:
"The system shall allow customers to browse products, add items to cart, and checkout.
Customers must create an account before purchasing. An admin panel allows inventory management.
The system sends email confirmations via SendGrid API. A mobile app provides push notifications."

Example output:
{"actors":[{"name":"Customer","type":"complex"},{"name":"Admin","type":"complex"},{"name":"SendGrid API","type":"simple"},{"name":"Mobile App","type":"average"}],"use_cases":[{"name":"Browse Products","transactions":3},{"name":"Add to Cart","transactions":2},{"name":"Checkout","transactions":5},{"name":"Create Account","transactions":4},{"name":"Manage Inventory","transactions":6},{"name":"Send Email Confirmation","transactions":2},{"name":"Push Notifications","transactions":2}]}
"""


def _build_prompt(text: str) -> str:
    """Build the complete prompt with system instructions, few-shot, and user input."""
    return f"{SYSTEM_PROMPT}\n\n{FEW_SHOT_EXAMPLE}\n\n---\n\nNow analyze the following requirements:\n\n{text}"


def _parse_ai_response(raw: str) -> Dict[str, Any]:
    """Extract and parse JSON from the AI response, handling markdown fences."""
    cleaned = raw.strip()
    # Remove markdown code fences if present
    if cleaned.startswith("```"):
        # Remove opening fence
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1:]
        # Remove closing fence
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
    # Remove json tag if present
    if cleaned.startswith("json"):
        cleaned = cleaned[4:].strip()
    return json.loads(cleaned)


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
        """Call OpenAI API with retry logic."""
        response = await self.client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
        content = response.choices[0].message.content
        if content is None:
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
            logger.error("Failed to parse AI response: %s | Raw: %s", e, raw_response[:500])
            raise ValueError(f"AI returned malformed JSON: {e}") from e

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
