import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from io import BytesIO

from app.main import app
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_admin
from app.db.base import Base
from app.models.user import User

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_storage.db"
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
    
    user_a = User(id=10, email="storage_a@test.com", full_name="User A", is_admin=False)
    user_b = User(id=11, email="storage_b@test.com", full_name="User B", is_admin=False)
    admin_u = User(id=12, email="storage_admin@test.com", full_name="Admin", is_admin=True)
    db.add_all([user_a, user_b, admin_u])
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

    def override_admin():
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        return user
    app.dependency_overrides[get_current_admin] = override_admin

def test_resume_upload():
    _auth_as(10)
    file_content = b"PDF content"
    files = {"file": ("resume.pdf", BytesIO(file_content), "application/pdf")}
    response = client.post("/api/profile/resume", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "resume.pdf"

def test_resume_download_owner():
    _auth_as(10)
    response = client.get("/api/profile/resume/10")
    assert response.status_code == 200
    assert response.content == b"PDF content"

def test_resume_download_unauthorized():
    _auth_as(11)
    response = client.get("/api/profile/resume/10")
    assert response.status_code == 403

def test_resume_download_admin():
    _auth_as(12)
    response = client.get("/api/profile/resume/10")
    assert response.status_code == 200
    assert response.content == b"PDF content"
