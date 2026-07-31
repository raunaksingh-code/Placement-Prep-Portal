from pydantic import BaseModel


class SubjectOut(BaseModel):
    id: int
    slug: str
    name: str
    topic_count: int = 0

    model_config = {"from_attributes": True}


class TopicSummary(BaseModel):
    id: int
    slug: str
    title: str
    has_content: bool = False
    has_questions: bool = False

    model_config = {"from_attributes": True}


class SolvedExampleOut(BaseModel):
    id: int
    difficulty: str
    question: str
    options: list | None = None
    correct_answer: str
    step_by_step: str
    shortcut: str | None = None

    model_config = {"from_attributes": True}


class TestSummary(BaseModel):
    id: int
    title: str
    test_type: str
    duration_minutes: int | None = None
    question_count: int = 0
    negative_mark: float = 0.0
    instructions: list | None = None


class TopicDetailOut(BaseModel):
    id: int
    slug: str
    title: str
    subject_slug: str
    subject_name: str
    theory: str | None = None
    rich: dict | None = None
    solved_examples: list[SolvedExampleOut] = []
    practice_question_count: int = 0
    tests: list[TestSummary] = []
