import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import get_db
from app.api.deps import get_current_user
from app.db.base import Base
from app.models.user import User
from app.models.learning import Topic, Subject
from app.models.test import Question, QuestionOption, QuestionBank, Difficulty, Test, TestAttempt, TestQuestion, TestType

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_practice.db"
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
    
    user_a = User(id=20, email="practice_a@test.com", full_name="User A", is_admin=False)
    user_b = User(id=21, email="practice_b@test.com", full_name="User B", is_admin=False)
    db.add_all([user_a, user_b])
    
    subj = Subject(id=1, slug="subj", name="Subject", track="aptitude")
    topic = Topic(id=1, subject_id=1, slug="test-topic", title="Test Topic")
    db.add_all([subj, topic])

    # Practice question
    pq = Question(id=1, topic_id=1, bank=QuestionBank.practice, text="Q1", difficulty=Difficulty.easy, explanation="Expl 1")
    db.add(pq)
    db.flush()
    db.add_all([
        QuestionOption(question_id=1, text="A", is_correct=True),
        QuestionOption(question_id=1, text="B", is_correct=False)
    ])

    # Test question
    tq = Question(id=2, topic_id=1, bank=QuestionBank.topic_test, text="Q2", difficulty=Difficulty.medium)
    db.add(tq)
    db.flush()
    db.add_all([
        QuestionOption(question_id=2, text="C", is_correct=False),
        QuestionOption(question_id=2, text="D", is_correct=True)
    ])

    test = Test(id=1, topic_id=1, title="Test 1", test_type=TestType.topic_test)
    db.add(test)
    db.flush()
    db.add(TestQuestion(id=1, test_id=1, question_id=2, order=1))

    # Test attempt for user A
    attempt = TestAttempt(id=1, user_id=20, test_id=1, total=1)
    db.add(attempt)

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

def test_correct_answer_absent_before_submission():
    _auth_as(20)
    response = client.get("/api/topics/test-topic/practice")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    q = data[0]
    assert "correct_answer" not in q
    assert "explanation" not in q

def test_correct_answer_cannot_be_obtained_through_api():
    # Start test
    _auth_as(20)
    response = client.post("/api/tests/1/start")
    assert response.status_code == 200
    data = response.json()
    q = data["questions"][0]
    assert "correct_answer" not in q
    assert "explanation" not in q
    assert "options" in q

def test_client_cannot_submit_fake_correct_answer():
    _auth_as(20)
    # The client can only send the selected option, not whether it is correct.
    response = client.post("/api/questions/1/submit", json={"selected_option": "B"})
    assert response.status_code == 200
    data = response.json()
    assert data["is_correct"] is False
    assert data["correct_answer"] == "A"
    assert data["explanation"] == "Expl 1"

def test_user_a_cannot_submit_answers_to_user_b_attempt():
    _auth_as(21) # User B
    response = client.post("/api/attempts/1/submit", json={"answers": {"2": "D"}})
    # Attempt 1 belongs to User A, User B should get 404
    assert response.status_code == 404

def test_score_is_calculated_server_side():
    _auth_as(20) # User A
    response = client.post("/api/attempts/1/submit", json={"answers": {"2": "D"}})
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 1.0 # 1 out of 1 correct
    assert data["correct"] == 1
