import asyncio
import sys
sys.path.insert(0, '/app')

from app.ai.ai_service import ai_service

async def test():
    try:
        result = await ai_service.extract("The system allows users to login and manage their profile")
        print("Success:", result)
    except Exception as e:
        print("Error:", e)
        import traceback
        traceback.print_exc()

asyncio.run(test())
