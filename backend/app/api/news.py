import xml.etree.ElementTree as ET
import urllib.request
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/news", tags=["news"])

class NewsItem(BaseModel):
    title: str
    link: str
    pub_date: str
    description: str

@router.get("", response_model=list[NewsItem])
def get_business_news():
    # CNBC Business News RSS Feed
    url = "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        items = []
        for item in root.findall('.//item')[:24]:  # Limit to 24 articles (good for grids)
            title = item.findtext('title', default='')
            link = item.findtext('link', default='')
            pub_date = item.findtext('pubDate', default='')
            description = item.findtext('description', default='')
            
            # Clean up description (sometimes contains HTML in RSS)
            import re
            clean_desc = re.sub(r'<[^>]+>', '', description).strip()
            
            items.append(NewsItem(
                title=title,
                link=link,
                pub_date=pub_date,
                description=clean_desc
            ))
            
        return items
    except Exception as e:
        print(f"Error fetching news: {e}")
        return []
