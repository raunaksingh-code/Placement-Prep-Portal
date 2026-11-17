import hashlib
import logging
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

CATEGORY_RULES: dict[str, list[str]] = {
    "Indian Economy": [
        "rbi", "reserve bank of india", "monetary policy", "repo rate", "gdp", "inflation",
        "fiscal deficit", "cpi", "wpi", "rupee", "finance ministry", "nirmala sitharaman",
        "budget", "union budget", "tax collection", "gst", "economic growth", "indian economy",
        "macroeconomic", "retail inflation", "disinvestment", "central bank"
    ],
    "Banking & Finance": [
        "bank", "banking", "sbi", "hdfc", "icici", "axis bank", "kotak", "npa", "bad loans",
        "lending", "deposits", "credit card", "fintech", "payment", "upi", "paytm", "phonepe",
        "insurance", "lic", "mutual fund", "nbfc", "asset management", "yield", "bonds",
        "liquidity", "capital adequacy", "treasury", "credit growth"
    ],
    "Stock Market": [
        "sensex", "nifty", "bse", "nse", "dalal street", "bull run", "bear market", "shares",
        "stocks", "equities", "ipo", "listing", "dividend", "q1 results", "q2 results", "q3 results",
        "q4 results", "quarterly profit", "market cap", "rally", "wall street", "dow jones", "nasdaq",
        "market crash", "brokerage", "fii", "dii", "market breadth"
    ],
    "Corporate News": [
        "reliance", "tata", "adani", "infosys", "tcs", "wipro", "hcl", "mahindra", "itc",
        "board of directors", "ceo", "cfo", "managing director", "executive", "earnings call",
        "conglomerate", "corporate governance", "shareholders", "agm", "promoters", "annual report"
    ],
    "Startups & Venture Capital": [
        "startup", "startups", "venture capital", "vc", "seed round", "series a", "series b",
        "series c", "unicorn", "decacorn", "angel investor", "y combinator", "peak xv", "sequoia",
        "valuation", "fundraising", "incubator", "accelerator", "founder", "co-founder", "pitch"
    ],
    "Technology & AI": [
        "artificial intelligence", "ai", "generative ai", "llm", "chatgpt", "openai", "nvidia",
        "google", "microsoft", "semiconductor", "microchips", "cloud", "saas", "cybersecurity",
        "software", "data center", "computing", "deep learning", "machine learning", "hardware"
    ],
    "Mergers & Acquisitions": [
        "merger", "acquisition", "acquire", "acquires", "acquired", "acquiring", "takeover",
        "buyout", "m&a", "deal value", "joint venture", "consolidation", "stake purchase",
        "hostile takeover", "divestment", "antitrust", "strategic buyout"
    ],
    "Management & Strategy": [
        "strategy", "strategic", "leadership", "turnaround", "restructuring", "layoffs",
        "hiring", "talent", "human resources", "workplace", "supply chain", "operations",
        "digital transformation", "mckinsey", "boston consulting", "bain", "consulting",
        "governance", "org restructuring"
    ],
    "Industry & Manufacturing": [
        "manufacturing", "factory", "plant", "steel", "automotive", "ev", "electric vehicle",
        "automobile", "solar", "renewable energy", "green hydrogen", "infrastructure", "highway",
        "railway", "ports", "pharma", "pharmaceutical", "fmcg", "textile", "cement", "pli scheme"
    ],
    "International Trade": [
        "export", "exports", "import", "imports", "tariff", "tariffs", "trade deficit", "wto",
        "free trade agreement", "fta", "bilateral trade", "customs duty", "shipping", "freight",
        "supply chain disruption", "crude oil import", "trade war", "commerce ministry"
    ],
    "Global Business": [
        "fed", "federal reserve", "jerome powell", "us economy", "wall st", "europe", "china",
        "imf", "world bank", "geopolitical", "brent crude", "opec", "treasury", "interest rates",
        "global markets", "cross-border", "foreign exchange", "forex", "european central bank"
    ],
}


def normalize_url(url: str) -> str:
    """Normalize article URLs to prevent duplicates from tracking parameters or formatting."""
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlparse(url.strip())
        # Strip common tracking query params
        tracking_params = {
            "utm_source", "utm_medium", "utm_campaign", "utm_term",
            "utm_content", "ref", "fbclid", "gclid", "_ga", "partnerId"
        }
        query_pairs = urllib.parse.parse_qsl(parsed.query)
        cleaned_pairs = sorted([(k, v) for k, v in query_pairs if k not in tracking_params])
        cleaned_query = urllib.parse.urlencode(cleaned_pairs)
        # Normalize path by removing trailing slash (unless root)
        path = parsed.path.rstrip("/") if parsed.path != "/" else "/"
        return urllib.parse.urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            path,
            "",
            cleaned_query,
            ""
        ))
    except Exception:
        return url.strip().rstrip("/")


def compute_article_hash(url: str, title: str) -> str:
    """Generate a consistent unique SHA-256 hash for deduplication."""
    norm_url = normalize_url(url)
    if norm_url:
        return hashlib.sha256(norm_url.encode("utf-8")).hexdigest()
    # Fallback to normalized title hash if URL is absent
    norm_title = re.sub(r"\s+", " ", title.strip().lower())
    return hashlib.sha256(norm_title.encode("utf-8")).hexdigest()


def classify_category(title: str, description: str = "", provider_category: str = "") -> str:
    """Classifies an article into one of the 11 concrete business news categories."""
    text_to_search = f"{title.lower()} {title.lower()} {(description or '').lower()} {(provider_category or '').lower()}"

    scores: dict[str, int] = {cat: 0 for cat in CATEGORY_RULES}

    for cat, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            # Title matches have triple weight
            if kw in title.lower():
                scores[cat] += 3
            elif description and kw in description.lower():
                scores[cat] += 1
            if provider_category and kw in provider_category.lower():
                scores[cat] += 2

    # Find category with highest positive score
    best_category = max(scores, key=lambda k: scores[k])
    if scores[best_category] > 0:
        return best_category

    # Fallback heuristic
    if any(k in text_to_search for k in ["india", "indian", "delhi", "mumbai", "bengaluru", "rupee"]):
        return "Indian Economy"
    return "Corporate News"


def clean_html(text: str | None) -> str:
    """Strips HTML tags and normalizes whitespace."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


class NewsFetcher:
    """Fetches and normalizes news from CNBC RSS, NewsData.io, Marketaux, and Finnhub."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "PlacementMantra-NewsBot/2.0"})

    def fetch_all(self) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        """Fetch from all configured sources safely without letting one provider's error break others."""
        articles: list[dict[str, Any]] = []
        statuses: dict[str, Any] = {}

        # 1. Existing CNBC RSS Feed
        try:
            cnbc_articles = self.fetch_cnbc()
            articles.extend(cnbc_articles)
            statuses["cnbc"] = {"status": "ok", "count": len(cnbc_articles)}
        except Exception as e:
            logger.warning(f"CNBC fetch failed: {e}")
            statuses["cnbc"] = {"status": "error", "error": str(e)}

        # 2. NewsData.io
        if settings.NEWSDATA_API_KEY:
            try:
                newsdata_articles = self.fetch_newsdata()
                articles.extend(newsdata_articles)
                statuses["newsdata"] = {"status": "ok", "count": len(newsdata_articles)}
            except Exception as e:
                logger.warning(f"NewsData.io fetch failed: {e}")
                statuses["newsdata"] = {"status": "error", "error": str(e)}
        else:
            statuses["newsdata"] = {"status": "unconfigured", "note": "NEWSDATA_API_KEY not set"}

        # 3. Marketaux
        if settings.MARKETAUX_API_KEY:
            try:
                marketaux_articles = self.fetch_marketaux()
                articles.extend(marketaux_articles)
                statuses["marketaux"] = {"status": "ok", "count": len(marketaux_articles)}
            except Exception as e:
                logger.warning(f"Marketaux fetch failed: {e}")
                statuses["marketaux"] = {"status": "error", "error": str(e)}
        else:
            statuses["marketaux"] = {"status": "unconfigured", "note": "MARKETAUX_API_KEY not set"}

        # 4. Finnhub
        if settings.FINNHUB_API_KEY:
            try:
                finnhub_articles = self.fetch_finnhub()
                articles.extend(finnhub_articles)
                statuses["finnhub"] = {"status": "ok", "count": len(finnhub_articles)}
            except Exception as e:
                logger.warning(f"Finnhub fetch failed: {e}")
                statuses["finnhub"] = {"status": "error", "error": str(e)}
        else:
            statuses["finnhub"] = {"status": "unconfigured", "note": "FINNHUB_API_KEY not set"}

        return articles, statuses

    def fetch_cnbc(self) -> list[dict[str, Any]]:
        """Preserves the existing CNBC RSS feed integration while extracting richer metadata."""
        url = "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)
        items: list[dict[str, Any]] = []

        for item in root.findall(".//item"):
            title = clean_html(item.findtext("title", default=""))
            link = item.findtext("link", default="").strip()
            if not title or not link:
                continue

            pub_date_str = item.findtext("pubDate", default="")
            description = clean_html(item.findtext("description", default=""))

            # Parse publication date
            published_at = datetime.utcnow()
            if pub_date_str:
                try:
                    from email.utils import parsedate_to_datetime
                    published_at = parsedate_to_datetime(pub_date_str).astimezone(timezone.utc).replace(tzinfo=None)
                except Exception:
                    pass

            # Extract image if present in enclosure or media tags
            image_url = None
            enclosure = item.find("enclosure")
            if enclosure is not None and enclosure.get("url"):
                image_url = enclosure.get("url")

            category = classify_category(title, description, provider_category="Business")

            items.append({
                "title": title,
                "url": link,
                "description": description,
                "source": "CNBC",
                "provider": "cnbc",
                "category": category,
                "image_url": image_url,
                "published_at": published_at,
                "sentiment": None,
                "is_featured": any(w in title.lower() for w in ["fed", "rate", "inflation", "gdp", "q3", "rally", "record"])
            })

        return items

    def fetch_newsdata(self) -> list[dict[str, Any]]:
        """Fetches Indian and international business news from NewsData.io."""
        url = "https://newsdata.io/api/1/latest"
        params = {
            "apikey": settings.NEWSDATA_API_KEY,
            "category": "business",
            "language": "en",
        }
        res = self.session.get(url, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()

        results = data.get("results", [])
        items: list[dict[str, Any]] = []

        for item in results:
            title = clean_html(item.get("title", ""))
            link = item.get("link", "").strip()
            if not title or not link:
                continue

            description = clean_html(item.get("description") or item.get("content") or "")
            pub_date_str = item.get("pubDate", "")
            published_at = datetime.utcnow()
            if pub_date_str:
                try:
                    published_at = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
                except Exception:
                    pass

            source_name = item.get("source_name") or item.get("source_id") or "NewsData"
            raw_category = ", ".join(item.get("category", [])) if isinstance(item.get("category"), list) else str(item.get("category") or "")
            category = classify_category(title, description, provider_category=raw_category)

            items.append({
                "title": title,
                "url": link,
                "description": description,
                "source": source_name,
                "provider": "newsdata",
                "category": category,
                "image_url": item.get("image_url"),
                "published_at": published_at,
                "sentiment": None,
                "is_featured": False
            })

        return items

    def fetch_marketaux(self) -> list[dict[str, Any]]:
        """Fetches financial market developments and sentiment data from Marketaux."""
        url = "https://api.marketaux.com/v1/news/all"
        params = {
            "api_token": settings.MARKETAUX_API_KEY,
            "countries": "in,us",
            "filter_entities": "true",
            "limit": 15,
            "language": "en"
        }
        res = self.session.get(url, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()

        items: list[dict[str, Any]] = []
        for item in data.get("data", []):
            title = clean_html(item.get("title", ""))
            link = item.get("url", "").strip()
            if not title or not link:
                continue

            description = clean_html(item.get("description") or item.get("snippet") or "")
            pub_date_str = item.get("published_at", "")
            published_at = datetime.utcnow()
            if pub_date_str:
                try:
                    published_at = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
                except Exception:
                    pass

            # Extract sentiment label if available
            sentiment = None
            entities = item.get("entities", [])
            if entities and isinstance(entities, list):
                sentiment_scores = [e.get("sentiment_score") for e in entities if e.get("sentiment_score") is not None]
                if sentiment_scores:
                    avg_sentiment = sum(sentiment_scores) / len(sentiment_scores)
                    if avg_sentiment > 0.15:
                        sentiment = "Positive / Bullish"
                    elif avg_sentiment < -0.15:
                        sentiment = "Negative / Bearish"
                    else:
                        sentiment = "Neutral"

            source = item.get("source") or "Marketaux"
            category = classify_category(title, description, provider_category="Stock Market")

            items.append({
                "title": title,
                "url": link,
                "description": description,
                "source": source,
                "provider": "marketaux",
                "category": category,
                "image_url": item.get("image_url"),
                "published_at": published_at,
                "sentiment": sentiment,
                "is_featured": False
            })

        return items

    def fetch_finnhub(self) -> list[dict[str, Any]]:
        """Fetches general financial and market news from Finnhub."""
        url = "https://finnhub.io/api/v1/news"
        params = {
            "category": "general",
            "token": settings.FINNHUB_API_KEY
        }
        res = self.session.get(url, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()

        items: list[dict[str, Any]] = []
        if isinstance(data, list):
            for item in data:
                title = clean_html(item.get("headline", ""))
                link = item.get("url", "").strip()
                if not title or not link:
                    continue

                description = clean_html(item.get("summary", ""))
                ts = item.get("datetime")
                published_at = datetime.utcfromtimestamp(ts) if ts else datetime.utcnow()

                source = item.get("source") or "Finnhub"
                raw_cat = item.get("category", "")
                category = classify_category(title, description, provider_category=raw_cat)

                items.append({
                    "title": title,
                    "url": link,
                    "description": description,
                    "source": source,
                    "provider": "finnhub",
                    "category": category,
                    "image_url": item.get("image"),
                    "published_at": published_at,
                    "sentiment": None,
                    "is_featured": False
                })

        return items


news_fetcher = NewsFetcher()
