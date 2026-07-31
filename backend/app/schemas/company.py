from pydantic import BaseModel


class CompanySummary(BaseModel):
    id: int
    slug: str
    name: str
    jd_count: int = 0
    question_count: int = 0
    roles: list[str] = []

    model_config = {"from_attributes": True}


class JDSummary(BaseModel):
    id: int
    slug: str
    role: str
    category: str
    company_slug: str
    company_name: str
    skills: list = []

    model_config = {"from_attributes": True}


class PrepTopic(BaseModel):
    slug: str
    title: str
    subject_name: str
    has_content: bool = True


class InterviewQuestionOut(BaseModel):
    id: int
    company_slug: str
    company_name: str
    role: str
    round_name: str
    category: str
    text: str
    starred: bool = False
    is_note: bool = False

    model_config = {"from_attributes": True}


class JDDetailOut(BaseModel):
    id: int
    slug: str
    role: str
    category: str
    company_slug: str
    company_name: str
    skills: list = []
    sections: dict | None = None
    full_text: str
    source_file: str | None = None
    # "Prepare according to JD"
    prep_topics: list[PrepTopic] = []
    interview_questions: list[InterviewQuestionOut] = []
    related_roles: list[JDSummary] = []


class CompanyDetailOut(BaseModel):
    id: int
    slug: str
    name: str
    job_descriptions: list[JDSummary] = []
    question_count: int = 0
    rounds: list[str] = []


class QuestionBankPage(BaseModel):
    total: int
    items: list[InterviewQuestionOut] = []
    companies: list[str] = []
    rounds: list[str] = []
    categories: list[str] = []
