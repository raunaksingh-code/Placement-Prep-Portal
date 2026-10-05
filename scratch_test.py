import sys
import os
os.chdir('backend')
sys.path.append('.')

from app.db.session import SessionLocal
from app.models.user import User
from app.api.admin import list_test_attempts

def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == 'raunak.pgdm27g@greatlakes.edu.in').first()
        if not user:
            print("No admin user found.")
            return
        
        try:
            out = list_test_attempts(db, user)
            print("Success! Number of attempts:", len(out))
            print(out[0] if out else "No attempts")
        except Exception as e:
            import traceback
            traceback.print_exc()
    finally:
        db.close()

if __name__ == '__main__':
    main()
