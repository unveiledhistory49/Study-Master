import os
import re
import asyncio
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from app.database import async_session
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.concept import Concept
from sqlalchemy import select

def clean_markdown(text):
    # remove table formatting pipes
    lines = text.split('\n')
    cleaned_lines = []
    for line in lines:
        if line.strip().startswith('|') or line.strip().endswith('|'):
            # simple pipe removal
            line = line.replace('|', '')
            # collapse multiple spaces
            line = re.sub(r'\s{2,}', ' ', line)
        cleaned_lines.append(line.strip())
    return '\n'.join(cleaned_lines).strip()

async def main():
    directory = "/sdcard/Download/study-master/materials/markdown"
    biology_files = [f for f in os.listdir(directory) if 'BIOLOGY' in f.upper() and f.endswith('.md')]
    
    async with async_session() as session:
        # Get biology subject
        result = await session.execute(select(Subject).where(Subject.name == 'Biology'))
        subject = result.scalar_one_or_none()
        if not subject:
            print("Biology subject not found, creating...")
            subject = Subject(name="Biology", description="Study of living organisms", icon="🧬", color="#22C55E")
            session.add(subject)
            await session.commit()
            
        for file in biology_files:
            filepath = os.path.join(directory, file)
            with open(filepath, 'r') as f:
                content = f.read()
                
            # Naive split by TOPIC keyword
            # Since the text is table formatted sometimes, TOPIC might be in a row
            parts = re.split(r'TOPIC:\s*', content)
            if len(parts) > 1:
                topic_name = file.replace('.md', '').strip()
                
                # Find or create Topic
                result = await session.execute(select(Topic).where(Topic.name == topic_name, Topic.subject_id == subject.id))
                topic = result.scalar_one_or_none()
                if not topic:
                    topic = Topic(name=topic_name, description=f"Notes from {topic_name}", subject_id=subject.id, order_index=0)
                    session.add(topic)
                    await session.commit()
                
                for part in parts[1:]:
                    lines = part.split('\n')
                    topic_title_raw = lines[0]
                    # clean the title (remove pipes and spaces)
                    topic_title = topic_title_raw.replace('|', '').strip()
                    topic_title = re.sub(r'\s{2,}', ' ', topic_title)
                    
                    if not topic_title:
                        topic_title = "Untitled Concept"
                    
                    # Concept
                    concept_content = clean_markdown("\n".join(lines[1:]))
                    if not concept_content: continue
                    
                    print(f"Adding concept: {topic_title} to {topic_name}")
                    
                    # check if concept already exists
                    result = await session.execute(select(Concept).where(Concept.name == topic_title[:100], Concept.topic_id == topic.id))
                    concept = result.scalar_one_or_none()
                    if not concept:
                        concept = Concept(
                            topic_id=topic.id,
                            name=topic_title[:100], 
                            description=f"Study material for {topic_title[:50]}",
                            content=concept_content,
                            difficulty=2,
                            importance=3,
                            estimated_time_minutes=30,
                            order_index=0
                        )
                        session.add(concept)
                        await session.commit()
                    else:
                        concept.content = concept_content
                        await session.commit()
                    
    print("Biology parsing complete!")

if __name__ == "__main__":
    asyncio.run(main())
