import json
import logging
import re
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_fallback_intelligence(title: str, description: str, category: str) -> dict[str, Any]:
    """Generates MBA-level business intelligence using structured analytical frameworks
    when Gemini API is not configured or unavailable. Completely free and zero-latency."""
    desc = description or title
    sentences = [s.strip() for s in re.split(r"[.!?]\s+", desc) if len(s.strip()) > 15]

    # Easy Explanation
    easy_explanation = (
        f"This development in {category} focuses on: \"{title}\". "
        f"In essence, {desc[:280].rstrip('.')}."
        if len(desc) > 30 else
        f"This update highlights a significant shift in {category}: \"{title}\", impacting corporate decision-making and market expectations."
    )

    # 3-5 Key Takeaways
    takeaways = []
    if sentences:
        for s in sentences[:3]:
            takeaways.append(s.rstrip(".") + ".")
    else:
        takeaways.append(f"Major strategic movement in {category}: {title}")
    
    takeaways.append(f"Market sentiment and stakeholder positioning are adjusting in response to this update.")
    if len(takeaways) < 4:
        takeaways.append(f"Management teams across competing firms are expected to evaluate their strategic posture.")

    # Why It Matters across 5 MBA dimensions
    why_it_matters = {
        "businesses": f"Forces leadership teams in {category.lower()} to re-evaluate their operating models, margins, and supply chain resilience.",
        "consumers": "Influences end-user pricing, credit terms, and product availability as market dynamics shift.",
        "investors": "Triggers portfolio rebalancing, risk assessment, and revised earnings projections for listed and private players.",
        "indian_economy": "Reflects broader macroeconomic liquidity trends, regulatory compliance, and fiscal momentum in India.",
        "industries": f"Sets a precedent for peer enterprises within {category.lower()} and ancillary value chains."
    }

    # Interview Questions
    interview_questions = [
        f"How would you evaluate the commercial and operational risks associated with this development in {category}?",
        f"If you were advising the C-suite on this situation, what strategic alternatives and mitigation measures would you recommend?"
    ]

    # GD Topic
    gd_topic = f"{category} in Transition: Balancing Growth, Capital Discipline, and Market Disruption"

    return {
        "ai_summary": easy_explanation,
        "ai_takeaways": takeaways[:5],
        "ai_why_it_matters": why_it_matters,
        "ai_interview_questions": interview_questions[:2],
        "ai_gd_topic": gd_topic
    }


def generate_news_intelligence(title: str, description: str, category: str, source: str = "") -> dict[str, Any]:
    """Generates structured MBA news intelligence (Easy Explanation, Key Takeaways,
    Why It Matters, Interview Prep, GD Prep). Uses Gemini if key is provided,
    otherwise uses MBA framework fallback."""
    if not settings.GEMINI_API_KEY:
        return generate_fallback_intelligence(title, description, category)

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = f"""
You are an expert MBA business faculty member and corporate placement coach at a top business school.
Analyze the following business news story for PGDM/MBA students preparing for management interviews and group discussions.

Article Details:
- Title: {title}
- Source: {source}
- Category: {category}
- Summary snippet: {description}

Return ONLY valid JSON matching this exact structure:
{{
  "ai_summary": "A 2-3 sentence easy explanation of the news in simple, clear business language suitable for MBA students.",
  "ai_takeaways": [
    "Takeaway 1 (concise)",
    "Takeaway 2",
    "Takeaway 3"
  ],
  "ai_why_it_matters": {{
    "businesses": "Implication for companies and strategy",
    "consumers": "Implication for end-consumers and retail markets",
    "investors": "Implication for capital markets and valuation",
    "indian_economy": "Implication for Indian macroeconomic health/growth",
    "industries": "Implication for sector-wide dynamics"
  }},
  "ai_interview_questions": [
    "Interview Question 1 for MBA students",
    "Interview Question 2 for MBA students"
  ],
  "ai_gd_topic": "One sharp Group Discussion (GD) topic derived from this news"
}}

IMPORTANT:
- Only base facts on the provided title and summary. Do not fabricate unmentioned facts.
- Output ONLY the JSON block. No markdown backticks or commentary.
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        raw_text = (response.text or "").strip()
        
        # Clean potential markdown wrapping
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        parsed = json.loads(raw_text)
        # Ensure all required keys exist
        if all(k in parsed for k in ["ai_summary", "ai_takeaways", "ai_why_it_matters", "ai_interview_questions", "ai_gd_topic"]):
            return parsed

    except Exception as e:
        logger.warning(f"Gemini intelligence generation failed ({e}), falling back to analytical engine.")

    return generate_fallback_intelligence(title, description, category)
