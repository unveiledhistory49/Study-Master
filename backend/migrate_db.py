import asyncio
from sqlalchemy import text
from app.database import engine, init_db

async def migrate():
    # Create the conversations table
    await init_db()
    
    async with engine.begin() as conn:
        try:
            # Add conversation_id to chat_messages if it doesn't exist
            await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE;"))
            print("Successfully added conversation_id to chat_messages")
        except Exception as e:
            print(f"Migration error (might already exist): {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
