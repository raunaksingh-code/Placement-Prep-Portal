from pydantic import BaseModel


class GuideSummary(BaseModel):
    id: int
    slug: str
    title: str
    category: str
    icon: str | None = None
    summary: str
    question_count: int = 0

    model_config = {"from_attributes": True}


class GuideQuestion(BaseModel):
    id: int
    text: str
    company_name: str
    company_slug: str
    role: str
    round_name: str
    starred: bool = False


class GuideDetail(BaseModel):
    id: int
    slug: str
    title: str
    category: str
    icon: str | None = None
    summary: str
    introduction: str | None = None
    source: str | None = None
    sections: list | None = None
    checklist: list | None = None
    common_mistakes: list | None = None
    question_category: str | None = None
    question_count: int = 0
    # A sample of the real questions this guide prepares you for
    questions: list[GuideQuestion] = []
    top_companies: list[str] = []
