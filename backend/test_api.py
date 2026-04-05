import asyncio
import os
from openai import AsyncOpenAI

async def test():
    client = AsyncOpenAI(
        api_key=os.environ["OPENAI_API_KEY"],
        base_url=os.environ.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
    )
    try:
        r = await client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "openrouter/free"),
            messages=[{"role": "user", "content": "Say hello in JSON: {\"msg\":\"hi\"}"}],
            temperature=0.1,
        )
        print("SUCCESS:", r.choices[0].message.content)
    except Exception as e:
        print("ERROR:", type(e).__name__, str(e)[:500])

asyncio.run(test())
