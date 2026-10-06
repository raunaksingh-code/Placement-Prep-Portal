import os
import uuid
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.resume import Resume
from app.core.storage import storage

def migrate():
    db = SessionLocal()
    resumes = db.query(Resume).filter(Resume.data.isnot(None)).all()
    count = 0
    print(f"Found {len(resumes)} resumes to migrate.")
    
    for resume in resumes:
        if resume.data:
            storage_key = f"resumes/{uuid.uuid4()}"
            # Save to storage
            storage.save(resume.data, storage_key, resume.content_type)
            
            # Update DB
            resume.storage_key = storage_key
            resume.file_size = len(resume.data)
            resume.data = None # Remove blob
            count += 1
            
    db.commit()
    print(f"Successfully migrated {count} resumes to object storage.")

if __name__ == "__main__":
    migrate()
