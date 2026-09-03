from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _call_gemini(prompt: str, fallback: str) -> str:
    """Runs one Gemini turn; falls back to a fixed reply if no key is configured
    or the call fails, so the feature still demos without GEMINI_API_KEY set.

    The key is passed explicitly rather than left for the SDK to read from
    os.environ - locally it only lives in .env (read via pydantic-settings,
    which does not populate the process environment), though in production
    Render sets a real env var either way."""
    if not settings.GEMINI_API_KEY:
        return fallback
    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return (response.text or "").strip() or fallback
    except Exception:
        return fallback


class ChatMessage(BaseModel):
    role: str  # "user" or "ai"
    content: str


def _transcript(messages: list[ChatMessage], ai_label: str = "You") -> str:
    return "\n".join(f"{'Candidate' if m.role == 'user' else ai_label}: {m.content}" for m in messages)


class ATSRequest(BaseModel):
    resume_text: str
    job_description: str

class ATSResponse(BaseModel):
    score: int
    suggestions: list[str]
    feedback: str

class AnswerRequest(BaseModel):
    question: str
    draft_answer: str

class AnswerResponse(BaseModel):
    improved_answer: str
    feedback: str

@router.post("/ats-score", response_model=ATSResponse)
def get_ats_score(body: ATSRequest, current_user: User = Depends(get_current_user)):
    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = f"""
        You are an expert ATS (Applicant Tracking System) and Career Coach.
        Evaluate the following resume against the job description.

        Job Description:
        {body.job_description}

        Resume:
        {body.resume_text}

        Provide the response in the following strict format:
        Score: [0-100]
        Feedback: [A short paragraph of overall feedback]
        Suggestions:
        - [Suggestion 1]
        - [Suggestion 2]
        - [Suggestion 3]
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        text = response.text

        # Parse the response
        score = 70
        feedback = "Good, but could be better."
        suggestions = ["Add more metrics."]

        try:
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if line.startswith("Score:"):
                    score = int(line.replace("Score:", "").strip())
                elif line.startswith("Feedback:"):
                    feedback = line.replace("Feedback:", "").strip()
                elif line.startswith("Suggestions:"):
                    suggestions = [s.replace("-", "").strip() for s in lines[i+1:] if s.strip().startswith("-")]
        except Exception as e:
            pass # fallback to defaults

        return ATSResponse(score=score, feedback=feedback, suggestions=suggestions)
    except Exception as e:
        # Fallback if no API key or error
        return ATSResponse(
            score=75,
            suggestions=["Add more quantifiable achievements", "Include relevant keywords from the JD"],
            feedback="Your resume is decent but lacks specific metrics. (Note: AI service is currently unavailable or misconfigured)"
        )

@router.post("/frame-answer", response_model=AnswerResponse)
def frame_answer(body: AnswerRequest, current_user: User = Depends(get_current_user)):
    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = f"""
        You are an expert Interview Coach. The user is asked the following question:
        Question: {body.question}

        Their draft answer is:
        {body.draft_answer}

        Please provide:
        1. An improved, professional, and well-structured version of their answer.
        2. Brief feedback on what was missing or how they can improve their delivery.

        Format your response exactly like this:
        Improved Answer: [Your improved answer here]
        Feedback: [Your feedback here]
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        text = response.text

        improved = "Your answer here..."
        feedback = "Good draft."
        try:
            if "Improved Answer:" in text and "Feedback:" in text:
                parts = text.split("Feedback:")
                improved = parts[0].replace("Improved Answer:", "").strip()
                feedback = parts[1].strip()
        except:
            pass

        return AnswerResponse(improved_answer=improved, feedback=feedback)
    except Exception as e:
        return AnswerResponse(
            improved_answer="I would approach this by organizing my thoughts using the STAR method. (Mock response)",
            feedback="Consider using the STAR method to structure your answer better. (Note: AI service is currently unavailable or misconfigured)"
        )


# --- Placement chatbot: open-ended Q&A, like ChatGPT scoped to placements ---

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

class ChatResponse(BaseModel):
    reply: str

@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""
    You are a friendly, knowledgeable placement preparation assistant for a college campus
    placement portal. You can answer ANY question a student might have related to placements -
    aptitude and coding topics, resumes, interviews (HR/technical/behavioral), group discussions,
    specific companies and roles, salary negotiation, career choices, or general study advice.
    Be clear, encouraging, and concrete. Keep answers focused - a few short paragraphs or a
    bullet list at most, unless the student asks for more depth.

    Conversation so far (Candidate is the student, You is you):
    {_transcript(body.messages)}

    Reply to the Candidate's latest message only, as "You". Do not repeat the "You:" prefix in
    your reply, just write the message itself.
    """
    reply = _call_gemini(
        prompt,
        "I'm here to help with anything placement-related! (Note: AI service is currently "
        "unavailable or misconfigured - ask an admin to set GEMINI_API_KEY.)",
    )
    return ChatResponse(reply=reply)


# --- Virtual mock interview: one question at a time, then a summary ---

class MockInterviewRequest(BaseModel):
    messages: list[ChatMessage]
    interview_type: str
    company: str | None = None

class MockInterviewResponse(BaseModel):
    reply: str

@router.post("/mock-interview", response_model=MockInterviewResponse)
def mock_interview(body: MockInterviewRequest, current_user: User = Depends(get_current_user)):
    company_line = f" at {body.company}" if body.company else ""
    candidate_turns = sum(1 for m in body.messages if m.role == "user")

    if not body.messages:
        prompt = f"""
        You are an experienced interviewer conducting a {body.interview_type} interview{company_line}
        for a college campus placement. Greet the candidate in one short sentence, then ask your
        first question. Ask exactly ONE question. Keep it realistic and concise, the way a real
        interviewer would open.
        """
    else:
        wrap_up = candidate_turns >= 6
        if wrap_up:
            instruction = (
                'The candidate has answered enough questions, or asked to stop. Do NOT ask '
                'another question - instead reply with a header "Interview Summary" followed by '
                'a short, structured review: Strengths (2-3 bullets), Areas to improve (2-3 '
                'bullets), and a Rating: X/10.'
            )
        else:
            instruction = (
                "Ask exactly ONE next question that follows naturally from the candidate's last "
                "answer (a related follow-up, a probe for more detail, or a new question of "
                "similar difficulty). Keep it concise and professional, like a real interviewer. "
                "Do not answer on the candidate's behalf."
            )
        prompt = f"""
        You are an experienced interviewer conducting a {body.interview_type} interview{company_line}
        for a college campus placement. Stay in character as the interviewer throughout.

        Transcript so far:
        {_transcript(body.messages, ai_label="Interviewer")}

        {instruction}
        """

    reply = _call_gemini(
        prompt,
        "Tell me about yourself. (Note: AI service is currently unavailable or misconfigured - "
        "ask an admin to set GEMINI_API_KEY.)",
    )
    return MockInterviewResponse(reply=reply)


# --- Virtual group discussion: AI plays two other participants ---

class MockGDRequest(BaseModel):
    messages: list[ChatMessage]
    topic: str

class MockGDResponse(BaseModel):
    reply: str

@router.post("/mock-gd", response_model=MockGDResponse)
def mock_gd(body: MockGDRequest, current_user: User = Depends(get_current_user)):
    candidate_turns = sum(1 for m in body.messages if m.role == "user")

    if not body.messages:
        prompt = f"""
        You are simulating a Group Discussion for campus placement practice on the topic:
        "{body.topic}". Two AI participants, Aisha and Rohan, are taking part along with the
        Candidate (a human). Have Aisha open the discussion with a short (2-3 sentence) opening
        point on the topic. Prefix her line with "Aisha:" on its own, nothing else before it.
        """
    else:
        wrap_up = candidate_turns >= 8
        if wrap_up:
            instruction = (
                'The discussion is wrapping up. Do NOT continue the discussion - instead reply '
                'with a header "GD Summary" followed by brief feedback on the Candidate\'s '
                'contribution: Strengths (2-3 bullets), Areas to improve (2-3 bullets), and a '
                'Rating: X/10.'
            )
        else:
            instruction = (
                "Continue the discussion naturally after the Candidate's latest point: have ONE "
                "or BOTH of Aisha/Rohan respond - agreeing, politely countering, or adding a new "
                'angle. Prefix every line with the speaker\'s name, e.g. "Aisha:" or "Rohan:" on '
                "its own line before their point. Keep each speaker's turn to 2-3 sentences total."
            )
        prompt = f"""
        You are simulating a Group Discussion for campus placement practice on the topic:
        "{body.topic}". Two AI participants, Aisha and Rohan, take part along with the Candidate
        (a human, marked "Candidate" below).

        Transcript so far:
        {_transcript(body.messages, ai_label="Group")}

        {instruction}
        """

    reply = _call_gemini(
        prompt,
        "Aisha: I think this topic has a lot of angles worth exploring - what's your take? "
        "(Note: AI service is currently unavailable or misconfigured - ask an admin to set "
        "GEMINI_API_KEY.)",
    )
    return MockGDResponse(reply=reply)
