import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.news import NewsArticle, NewsRefreshMeta
from app.services.news_fetcher import (
    classify_category,
    clean_html,
    compute_article_hash,
    NewsFetcher,
    normalize_url,
)
from app.services.news_intelligence import (
    generate_fallback_intelligence,
    generate_news_intelligence,
)
from app.services.news_service import ALL_CATEGORIES, NewsService


class TestNewsModule(unittest.TestCase):
    def setUp(self):
        # In-memory SQLite for testing
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def test_url_normalization_and_hash(self):
        url1 = "https://example.com/news/reliance-q3?utm_source=twitter&utm_medium=social"
        url2 = "HTTPS://EXAMPLE.COM/news/reliance-q3/?utm_campaign=winter&ref=homepage"
        
        norm1 = normalize_url(url1)
        norm2 = normalize_url(url2)
        
        self.assertEqual(norm1, "https://example.com/news/reliance-q3")
        self.assertEqual(norm2, "https://example.com/news/reliance-q3")
        
        hash1 = compute_article_hash(url1, "Reliance Q3 profit jumps 15%")
        hash2 = compute_article_hash(url2, "Reliance Q3 profit jumps 15%")
        self.assertEqual(hash1, hash2)

    def test_category_classification(self):
        test_cases = [
            ("RBI maintains repo rate at 6.5%, GDP growth projected at 7%", "Monetary policy update", "Indian Economy"),
            ("HDFC Bank expands retail credit portfolio with new lending push", "Banking sector update", "Banking & Finance"),
            ("Sensex rallies 600 points, Nifty climbs above 24,000 on foreign inflows", "Dalal street", "Stock Market"),
            ("Tata Sons board of directors approves corporate restructuring", "Executive board update", "Corporate News"),
            ("Fintech unicorn raises $100M Series C led by venture capital funds", "Seed and VC", "Startups & Venture Capital"),
            ("Nvidia reveals next-gen artificial intelligence and semiconductor chips", "AI compute", "Technology & AI"),
            ("Adani Group signs $2 billion deal to acquire majority stake in logistics firm", "M&A agreement", "Mergers & Acquisitions"),
            ("McKinsey study highlights supply chain leadership and digital transformation", "Operations strategy", "Management & Strategy"),
            ("Tata Motors ramps up EV manufacturing plant under PLI scheme", "Automobile industry", "Industry & Manufacturing"),
            ("India's exports surge amid new bilateral free trade agreement with UK", "Customs duty and tariffs", "International Trade"),
            ("Federal Reserve chair Jerome Powell signals cautious stance on US interest rates", "Wall St global markets", "Global Business"),
        ]

        for title, desc, expected_cat in test_cases:
            cat = classify_category(title, desc)
            self.assertEqual(cat, expected_cat, f"Failed for '{title}' -> got '{cat}', expected '{expected_cat}'")

    def test_newsdata_parser(self):
        fetcher = NewsFetcher()
        mock_payload = {
            "status": "success",
            "results": [
                {
                    "title": "RBI monetary policy committee meets to decide repo rate",
                    "link": "https://newsdata.test/article-1?utm_source=feed",
                    "description": "<p>Reserve Bank of India starts three-day policy review meeting.</p>",
                    "pubDate": "2026-11-17 06:00:00",
                    "image_url": "https://newsdata.test/img1.jpg",
                    "source_name": "Livemint",
                    "category": ["business"],
                }
            ]
        }

        with patch.object(fetcher.session, "get") as mock_get:
            mock_res = MagicMock()
            mock_res.json.return_value = mock_payload
            mock_res.raise_for_status.return_value = None
            mock_get.return_value = mock_res

            with patch("app.services.news_fetcher.settings.NEWSDATA_API_KEY", "test_key"):
                articles = fetcher.fetch_newsdata()

        self.assertEqual(len(articles), 1)
        art = articles[0]
        self.assertEqual(art["source"], "Livemint")
        self.assertEqual(art["provider"], "newsdata")
        self.assertEqual(art["category"], "Indian Economy")
        self.assertEqual(art["description"], "Reserve Bank of India starts three-day policy review meeting.")
        self.assertEqual(art["image_url"], "https://newsdata.test/img1.jpg")

    def test_marketaux_parser(self):
        fetcher = NewsFetcher()
        mock_payload = {
            "data": [
                {
                    "title": "Sensex surges as IT and bank shares gain in broad market rally",
                    "url": "https://marketaux.test/story-123",
                    "description": "Stock market benchmarks Sensex and Nifty touched fresh peaks.",
                    "published_at": "2026-11-17T06:30:00.000000Z",
                    "source": "Financial Express",
                    "image_url": "https://marketaux.test/img.png",
                    "entities": [{"name": "Sensex", "sentiment_score": 0.45}]
                }
            ]
        }

        with patch.object(fetcher.session, "get") as mock_get:
            mock_res = MagicMock()
            mock_res.json.return_value = mock_payload
            mock_res.raise_for_status.return_value = None
            mock_get.return_value = mock_res

            with patch("app.services.news_fetcher.settings.MARKETAUX_API_KEY", "test_key"):
                articles = fetcher.fetch_marketaux()

        self.assertEqual(len(articles), 1)
        art = articles[0]
        self.assertEqual(art["source"], "Financial Express")
        self.assertEqual(art["provider"], "marketaux")
        self.assertEqual(art["category"], "Stock Market")
        self.assertEqual(art["sentiment"], "Positive / Bullish")

    def test_finnhub_parser(self):
        fetcher = NewsFetcher()
        mock_payload = [
            {
                "category": "general",
                "datetime": 1731800000,
                "headline": "Semiconductor giant unveils groundbreaking AI computing infrastructure",
                "id": 9999,
                "image": "https://finnhub.test/semi.jpg",
                "source": "Reuters",
                "summary": "The new architecture aims to cut artificial intelligence training power usage.",
                "url": "https://finnhub.test/article/9999"
            }
        ]

        with patch.object(fetcher.session, "get") as mock_get:
            mock_res = MagicMock()
            mock_res.json.return_value = mock_payload
            mock_res.raise_for_status.return_value = None
            mock_get.return_value = mock_res

            with patch("app.services.news_fetcher.settings.FINNHUB_API_KEY", "test_key"):
                articles = fetcher.fetch_finnhub()

        self.assertEqual(len(articles), 1)
        art = articles[0]
        self.assertEqual(art["source"], "Reuters")
        self.assertEqual(art["provider"], "finnhub")
        self.assertEqual(art["category"], "Technology & AI")
        self.assertEqual(art["image_url"], "https://finnhub.test/semi.jpg")

    def test_sync_deduplication(self):
        # Insert initial article
        h = compute_article_hash("https://example.com/deal", "Tata acquires stakes")
        art = NewsArticle(
            article_hash=h,
            title="Tata acquires stakes in energy company",
            description="Acquisition details",
            url="https://example.com/deal",
            source="Livemint",
            provider="newsdata",
            category="Mergers & Acquisitions",
            published_at=datetime.utcnow(),
            fetched_at=datetime.utcnow()
        )
        self.db.add(art)
        self.db.commit()

        # Mock fetch_all returning duplicate and new article
        mock_articles = [
            {
                "title": "Tata acquires stakes in energy company",
                "url": "https://example.com/deal?utm_source=rss",
                "description": "Acquisition details",
                "source": "Livemint",
                "provider": "newsdata",
                "category": "Mergers & Acquisitions",
                "published_at": datetime.utcnow()
            },
            {
                "title": "New Startup raises $10M seed funding",
                "url": "https://example.com/startup-seed",
                "description": "Venture capital investment",
                "source": "TechCrunch",
                "provider": "newsdata",
                "category": "Startups & Venture Capital",
                "published_at": datetime.utcnow()
            }
        ]

        with patch.object(NewsFetcher, "fetch_all", return_value=(mock_articles, {"newsdata": {"status": "ok"}})):
            added, _ = NewsService.sync_news(self.db, force=True)

        self.assertEqual(added, 1)
        self.assertEqual(self.db.query(NewsArticle).count(), 2)

    def test_search_and_filtering(self):
        items = [
            ("Reliance Industries launches green hydrogen facility", "Industry & Manufacturing", "Mint"),
            ("RBI discusses inflation and monetary policy", "Indian Economy", "Economic Times"),
            ("Tata Motors reports strong quarterly earnings", "Corporate News", "CNBC"),
            ("Artificial Intelligence transforms logistics", "Technology & AI", "Reuters"),
        ]

        for title, cat, src in items:
            h = compute_article_hash(f"https://example.com/{title}", title)
            self.db.add(NewsArticle(
                article_hash=h,
                title=title,
                description=f"Description for {title}",
                url=f"https://example.com/{title}",
                source=src,
                provider="test",
                category=cat,
                published_at=datetime.utcnow(),
                fetched_at=datetime.utcnow()
            ))
        self.db.commit()

        # Search by company name "Reliance"
        res, total = NewsService.get_articles(self.db, q="Reliance")
        self.assertEqual(total, 1)
        self.assertIn("Reliance", res[0].title)

        # Search by keyword "monetary policy"
        res, total = NewsService.get_articles(self.db, q="monetary policy")
        self.assertEqual(total, 1)
        self.assertIn("monetary policy", res[0].title)

        # Filter by category
        res, total = NewsService.get_articles(self.db, category="Technology & AI")
        self.assertEqual(total, 1)
        self.assertEqual(res[0].category, "Technology & AI")

        # Filter by source
        res, total = NewsService.get_articles(self.db, source="CNBC")
        self.assertEqual(total, 1)
        self.assertEqual(res[0].source, "CNBC")

        # Category counts
        counts = NewsService.get_category_counts(self.db)
        self.assertEqual(len(counts), len(ALL_CATEGORIES))

    def test_ai_intelligence_fallback(self):
        title = "RBI maintains repo rate at 6.5% amid steady inflation"
        desc = "The Reserve Bank of India decided to keep key benchmark policy rates unchanged."
        category = "Indian Economy"

        insights = generate_fallback_intelligence(title, desc, category)
        self.assertIn("ai_summary", insights)
        self.assertTrue(len(insights["ai_takeaways"]) >= 3)
        self.assertIn("businesses", insights["ai_why_it_matters"])
        self.assertIn("indian_economy", insights["ai_why_it_matters"])
        self.assertEqual(len(insights["ai_interview_questions"]), 2)
        self.assertTrue(len(insights["ai_gd_topic"]) > 10)


if __name__ == "__main__":
    unittest.main()
