import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

from app.main import app
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_admin
from app.db.base import Base
from app.models.user import User
from app.models.resume import Resume
from app.models.experience import Experience
from app.models.test import TestAttempt, Test
from app.models.company import Company, JobDescription, InterviewQuestion
from app.models.connection import Connection
from app.models.education import Education
from app.models.guide import InterviewGuide
from app.models.learning import Subject, Topic, TopicContent, SolvedExample
from app.models.project import Project
from app.models.skill import Skill, SkillEndorsement

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create Users
    user_a = User(id=1, email="a@test.com", full_name="User A", is_admin=False)
    user_b = User(id=2, email="b@test.com", full_name="User B", is_admin=False)
    admin_u = User(id=3, email="admin@test.com", full_name="Admin", is_admin=True)
    db.add_all([user_a, user_b, admin_u])
    
    # Create Resume for User B
    resume_b = Resume(id=1, user_id=2, filename="b_resume.pdf", content_type="application/pdf", data=b"fake")
    db.add(resume_b)
    
    # Create Experience for User B
    exp_b = Experience(id=1, user_id=2, title="Role", company="Comp", start_month="2020-01")
    db.add(exp_b)

    # Create Test and Attempt for User B
    test1 = Test(id=1, title="Test 1")
    attempt_b = TestAttempt(id=1, user_id=2, test_id=1, total=10, is_completed=True, submitted_at=datetime.now(timezone.utc))
    db.add(test1)
    db.add(attempt_b)
    
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def _auth_as(user_id: int):
    def override_get_user():
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        return user
    app.dependency_overrides[get_current_user] = override_get_user

    # If admin, also override get_current_admin
    def override_admin():
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        return user
    app.dependency_overrides[get_current_admin] = override_admin


def test_auth_user_a_accessing_user_b_profile_resume_hidden():
    _auth_as(1) # User A
    response = client.get("/api/auth/users/2")
    assert response.status_code == 200
    # The profile is public, but resume should be None due to IDOR fix
    data = response.json()
    assert data["id"] == 2
    assert data["resume"] is None

def test_auth_user_a_downloading_user_b_resume():
    _auth_as(1) # User A
    response = client.get("/api/profile/resume/2")
    # This was an IDOR before, should now be 403 Forbidden
    assert response.status_code == 403

def test_auth_user_a_accessing_user_b_progress():
    _auth_as(1) # User A
    # The progress endpoint does not take a user_id, it is inherently scoped
    response = client.get("/api/progress")
    assert response.status_code == 200
    data = response.json()
    # User A has 0 attempts
    assert data["summary"]["attempts"] == 0

def test_auth_user_a_accessing_user_b_test_attempt():
    _auth_as(1) # User A
    response = client.get("/api/attempts/1")
    # Attempt 1 belongs to User B. Should be 404 or 403.
    # In practice.py, it's scoped via query and raises 404
    assert response.status_code == 404

def test_auth_user_a_modifying_user_b_resource():
    _auth_as(1) # User A
    # Try modifying Experience 1 which belongs to User B
    response = client.put("/api/profile/experiences/1", json={"title": "Hacked", "company": "Comp", "start_month": "Jan", "start_year": 2020})
    # Scoped query, returns 404
    assert response.status_code == 404

def test_admin_accessing_permitted_resources():
    _auth_as(3) # Admin
    # Admin can download User B's resume
    response = client.get("/api/profile/resume/2")
    assert response.status_code == 200
    
    # Admin can view User B's profile and see the resume metadata
    response = client.get("/api/auth/users/2")
    assert response.status_code == 200
    assert response.json()["resume"] is not None

    # Admin can access User B's test attempt
    response = client.get("/api/attempts/1")
    assert response.status_code == 200
    assert response.json()["attempt_id"] == 1
