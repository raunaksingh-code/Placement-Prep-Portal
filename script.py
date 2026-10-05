with open('backend/app/api/admin.py', 'r') as f:
    content = f.read()

idx = content.find('@router.post("/tests/publish"')
if idx != -1:
    content = content[:idx]

new_endpoint = '''
class QuestionOptionCreate(BaseModel):
    text: str
    is_correct: bool

class QuestionCreate(BaseModel):
    text: str
    explanation: str | None = None
    options: list[QuestionOptionCreate]

class InteractiveTestCreate(BaseModel):
    title: str
    test_type: str
    track: str
    duration_minutes: int
    negative_mark: float
    questions: list[QuestionCreate]

@router.post("/tests/publish", status_code=status.HTTP_201_CREATED)
def publish_interactive_test(data: InteractiveTestCreate, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    from app.models.test import Test, TestType, Question, QuestionOption, TestQuestion, QuestionBank, Difficulty
    
    # 1. Create Test
    t_type = TestType.full_mock if data.test_type == 'mock' else TestType.sectional
    new_test = Test(
        title=data.title,
        test_type=t_type,
        duration_minutes=data.duration_minutes,
        negative_mark=data.negative_mark,
        description=data.track  # Store track in description or a new field, to filter by aptitude/domain
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)
    
    # 2. Create Questions and TestQuestions
    for order, q_data in enumerate(data.questions):
        new_q = Question(
            text=q_data.text,
            explanation=q_data.explanation,
            bank=QuestionBank.mock,
            difficulty=Difficulty.medium,
            topic_id=None
        )
        db.add(new_q)
        db.commit()
        db.refresh(new_q)
        
        # Options
        for opt in q_data.options:
            db.add(QuestionOption(question_id=new_q.id, text=opt.text, is_correct=opt.is_correct))
            
        # TestQuestion link
        db.add(TestQuestion(test_id=new_test.id, question_id=new_q.id, order=order))
        
    db.commit()
    return {"status": "success", "test_id": new_test.id}
'''

with open('backend/app/api/admin.py', 'w') as f:
    f.write(content + new_endpoint)
