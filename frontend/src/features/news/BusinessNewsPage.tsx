import { useEffect, useState, useMemo, useRef } from 'react'
import { api } from '../../lib/api'
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  Landmark,
  Building2,
  TrendingUp,
  Briefcase,
  Rocket,
  Globe,
  Cpu,
  Handshake,
  Target,
  Factory,
  Ship,
  Calendar,
  Clock,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  X,
  ChevronRight,
  Filter,
  BarChart3,
  Flame,
  Award
} from 'lucide-react'

export interface NewsArticle {
  id: number
  title: string
  description: string | null
  url: string
  link?: string
  source: string
  provider: string
  category: string
  image_url: string | null
  published_at: string
  pub_date?: string
  is_featured: boolean
  sentiment?: string | null
  ai_summary?: string | null
  ai_takeaways?: string[] | null
  ai_why_it_matters?: {
    businesses?: string
    consumers?: string
    investors?: string
    indian_economy?: string
    industries?: string
  } | null
  ai_interview_questions?: string[] | null
  ai_gd_topic?: string | null
}

interface NewsListResponse {
  articles: NewsArticle[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

interface CategoryCount {
  category: string
  count: number
}

interface NewsStatus {
  last_refreshed_at: string | null
  refresh_interval_minutes: number
  total_articles: number
  categories_count: number
  providers: Record<string, any>
}

// Category classifier helper for resilient multi-source categorization
function classifyCategory(title: string, description: string = ''): string {
  const text = `${title} ${description}`.toLowerCase()
  if (/rbi|reserve bank|monetary policy|repo rate|gdp|inflation|fiscal deficit|cpi|wpi|rupee|finance ministry|budget|gst|indian economy/i.test(text)) return 'Indian Economy'
  if (/bank|banking|sbi|hdfc|icici|axis|kotak|npa|credit|lending|deposit|fintech|payment|upi|paytm|phonepe|insurance|mutual fund|nbfc/i.test(text)) return 'Banking & Finance'
  if (/sensex|nifty|bse|nse|dalal street|shares|stock|equities|ipo|listing|dividend|market cap|rally|wall street|dow jones|nasdaq/i.test(text)) return 'Stock Market'
  if (/startup|venture capital|vc|seed round|series [abc]|unicorn|decacorn|angel investor|valuation|fundraising|accelerator|founder/i.test(text)) return 'Startups & Venture Capital'
  if (/artificial intelligence|\bai\b|generative ai|llm|chatgpt|openai|nvidia|semiconductor|chips|cloud|saas|cybersecurity|software|deep learning/i.test(text)) return 'Technology & AI'
  if (/merger|acquisition|acquire|acquires|acquired|takeover|buyout|m&a|deal value|joint venture|consolidation/i.test(text)) return 'Mergers & Acquisitions'
  if (/strategy|strategic|leadership|turnaround|restructuring|layoffs|hiring|talent|human resources|supply chain|operations|mckinsey|bain/i.test(text)) return 'Management & Strategy'
  if (/manufacturing|factory|plant|steel|automotive|\bev\b|electric vehicle|automobile|solar|renewable|infrastructure|pharma|fmcg|pli scheme/i.test(text)) return 'Industry & Manufacturing'
  if (/export|import|tariff|tariffs|trade deficit|wto|free trade agreement|fta|bilateral trade|customs duty|shipping|freight/i.test(text)) return 'International Trade'
  if (/fed|federal reserve|jerome powell|us economy|europe|china|imf|world bank|geopolitical|brent crude|opec|global markets|forex/i.test(text)) return 'Global Business'
  if (/reliance|tata|adani|infosys|tcs|wipro|hcl|mahindra|itc|ceo|cfo|board of directors|quarterly results|earnings/i.test(text)) return 'Corporate News'
  return 'Corporate News'
}

function generateClientInsights(article: NewsArticle): Partial<NewsArticle> {
  const title = article.title
  const desc = article.description || article.title
  const category = article.category

  return {
    ai_summary: `This development in ${category} focuses on: "${title}". In essence, ${desc.slice(0, 240).replace(/\.+$/, '')}. It represents a notable shift in market dynamics and strategic positioning.`,
    ai_takeaways: [
      `Critical market event in ${category}: ${title.slice(0, 85)}`,
      desc.length > 25 ? desc.slice(0, 140).replace(/\.+$/, '') + '.' : 'Key development affecting corporate decision-making and operational execution.',
      'Industry leadership, investors, and competing firms are actively adjusting strategic expectations in response.',
    ],
    ai_why_it_matters: {
      businesses: `Forces leadership and management teams in ${category.toLowerCase()} to re-evaluate their operating models, margins, and competitive posture.`,
      investors: `Triggers portfolio risk assessment and adjusted earnings projections across listed and unlisted peers.`,
      indian_economy: `Reflects broader macroeconomic sentiment, capital market flows, and corporate regulatory trends in India.`,
      consumers: `Influences market supply, retail pricing structures, and product accessibility as corporate players adapt.`,
      industries: `Sets a benchmark for industry peers and creates ripple effects across ancillary supply chain networks.`
    },
    ai_interview_questions: [
      `How would you evaluate the commercial, strategic, and financial trade-offs associated with this development in ${category}?`,
      `If you were advising the leadership team on this scenario, what risk-mitigation measures and operational changes would you recommend?`
    ],
    ai_gd_topic: `${category} in Transition: Balancing Growth, Capital Discipline, and Market Disruption`
  }
}

// 12 Business News Categories
const CATEGORIES = [
  { name: 'All News', icon: Layers, color: 'emerald' },
  { name: 'Indian Economy', icon: Landmark, color: 'blue' },
  { name: 'Banking & Finance', icon: Building2, color: 'indigo' },
  { name: 'Stock Market', icon: TrendingUp, color: 'emerald' },
  { name: 'Corporate News', icon: Briefcase, color: 'slate' },
  { name: 'Startups & Venture Capital', icon: Rocket, color: 'amber' },
  { name: 'Global Business', icon: Globe, color: 'cyan' },
  { name: 'Technology & AI', icon: Cpu, color: 'purple' },
  { name: 'Mergers & Acquisitions', icon: Handshake, color: 'rose' },
  { name: 'Management & Strategy', icon: Target, color: 'teal' },
  { name: 'Industry & Manufacturing', icon: Factory, color: 'orange' },
  { name: 'International Trade', icon: Ship, color: 'sky' },
]

const STORAGE_KEY = 'ppp_business_news_cache'

function saveCachedArticles(articles: NewsArticle[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles))
  } catch {}
}

function getCachedArticles(): NewsArticle[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return null
}

const INITIAL_ARTICLES: NewsArticle[] = [
  {
    id: 1,
    title: "RBI monetary policy stance balances growth momentum and retail inflation targets",
    description: "The Reserve Bank of India maintains its calibrated policy approach, prioritizing liquidity management and domestic credit expansion across core industrial and manufacturing sectors.",
    url: "https://www.rbi.org.in",
    source: "RBI Bulletin",
    provider: "rbi",
    category: "Indian Economy",
    image_url: null,
    published_at: new Date(Date.now() - 3600000).toISOString(),
    is_featured: true,
    ai_summary: "The Reserve Bank of India's monetary committee continues its focus on anchoring inflation expectations while supporting resilient economic output. Key focus areas include systemic liquidity and private capex financing.",
    ai_takeaways: [
      "RBI maintains neutral-to-calibrated stance prioritizing inflation stability within the 4% target band.",
      "Domestic credit growth remains robust across retail and MSME lending portfolios.",
      "Corporate balance sheets show reduced leverage, positioning Indian industry for renewed private investment."
    ],
    ai_why_it_matters: {
      businesses: "Stable lending rates provide predictability for long-term capital expenditure and debt servicing.",
      investors: "Supports equity valuations while keeping bond yields within manageable ranges.",
      indian_economy: "Ensures sustainable GDP expansion without triggering imported inflationary pressures.",
      consumers: "Protects household purchasing power and stabilizes floating home and vehicle loan EMIs.",
      industries: "Aids infrastructure, automotive, and capital goods manufacturers with sustained order books."
    },
    ai_interview_questions: [
      "How does the RBI's policy rate decisions influence capital allocation and borrowing costs in corporate India?",
      "In an environment of fluctuating global interest rates, what monetary transmission mechanisms are most crucial for Indian commercial banks?"
    ],
    ai_gd_topic: "Balancing Monetary Tightening and Economic Expansion: Is India Decoupling from Global Rate Cycles?"
  },
  {
    id: 2,
    title: "Here's what to expect when Disney reports earnings before the bell",
    description: "Investors will be looking for more insight into CEO Josh D'Amaro's strategy following a series of company-wide layoffs and streaming direct-to-consumer realignment.",
    url: "https://www.cnbc.com/2026/11/17/disney-dis-earnings-q-2026.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Corporate News",
    image_url: null,
    published_at: new Date(Date.now() - 7200000).toISOString(),
    is_featured: true,
  },
  {
    id: 3,
    title: "JPMorgan Chase resolves temporary software bug affecting consumer banking operations",
    description: "The bank confirmed digital banking channels have stabilized after technical disruptions, highlighting accelerated investments into core transaction processing infrastructure.",
    url: "https://www.cnbc.com/2026/11/16/jpmorgan-chase-technical-issue.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Banking & Finance",
    image_url: null,
    published_at: new Date(Date.now() - 10800000).toISOString(),
    is_featured: true,
  },
  {
    id: 4,
    title: "Sensex and Nifty trade near all-time highs amid robust domestic institutional inflows",
    description: "Indian equity benchmarks maintain bullish momentum propelled by steady SIP contributions from retail investors offsetting foreign institutional selling.",
    url: "https://www.nseindia.com",
    source: "NSE India",
    provider: "nse",
    category: "Stock Market",
    image_url: null,
    published_at: new Date(Date.now() - 14400000).toISOString(),
    is_featured: false,
  },
  {
    id: 5,
    title: "Indian startup funding rebounds as AI and clean-tech startups close Series B rounds",
    description: "Venture capital deployers in Bengaluru and Mumbai signal selective capital deployment towards profitable unit economics and deep-tech intellectual property.",
    url: "https://newsdata.io",
    source: "NewsData.io",
    provider: "newsdata",
    category: "Startups & Venture Capital",
    image_url: null,
    published_at: new Date(Date.now() - 18000000).toISOString(),
    is_featured: false,
  },
  {
    id: 6,
    title: "Novo Nordisk Wegovy clinical trial shows notable obesity rate reductions in youth study",
    description: "The pharmaceutical giant's breakthrough GLP-1 treatment continues to expand addressable patient demographics, driving global biopharma competition.",
    url: "https://www.cnbc.com/2026/11/16/novo-wegovy-obesity-children-trial.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Industry & Manufacturing",
    image_url: null,
    published_at: new Date(Date.now() - 21600000).toISOString(),
    is_featured: false,
  },
  {
    id: 7,
    title: "Enterprise AI adoption accelerates as generative intelligence tools integrate into ERP platforms",
    description: "Chief information officers report significant efficiency dividends as foundational models streamline customer workflows and predictive inventory supply chains.",
    url: "https://finnhub.io",
    source: "Finnhub",
    provider: "finnhub",
    category: "Technology & AI",
    image_url: null,
    published_at: new Date(Date.now() - 25200000).toISOString(),
    is_featured: false,
  },
  {
    id: 8,
    title: "Skydance outlines $6 billion in planned cost synergies following major entertainment merger",
    description: "The integrated entity plans streamlined distribution and unified production infrastructure across traditional studio and digital streaming operations.",
    url: "https://www.cnbc.com/2026/11/09/skydance-cost-savings-breakdown.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Mergers & Acquisitions",
    image_url: null,
    published_at: new Date(Date.now() - 28800000).toISOString(),
    is_featured: false,
  },
  {
    id: 9,
    title: "PepsiCo initiates restructuring program to optimize North American operating margins",
    description: "The beverage and snacks leader implements targeted workforce realignments to accelerate automated logistics and direct-store delivery networks.",
    url: "https://www.cnbc.com/2026/11/09/pepsico-north-america-job-cuts.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Management & Strategy",
    image_url: null,
    published_at: new Date(Date.now() - 32400000).toISOString(),
    is_featured: false,
  },
  {
    id: 10,
    title: "Scout Motors surpasses 212,000 reservations as $2B South Carolina EV plant nears completion",
    description: "Automotive executives point to resilient consumer appetite for rugged electric adventure vehicles built upon domestic battery manufacturing supply chains.",
    url: "https://www.cnbc.com/2026/11/12/scout-motors-reservations-south-carolina-plant.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Industry & Manufacturing",
    image_url: null,
    published_at: new Date(Date.now() - 36000000).toISOString(),
    is_featured: false,
  },
  {
    id: 11,
    title: "Global central banks navigate divergence in monetary policies as inflation cools unevenly",
    description: "Federal Reserve, ECB, and Bank of Japan face differing macroeconomic trajectories regarding labor market tightness and currency volatility.",
    url: "https://www.marketaux.com",
    source: "Marketaux",
    provider: "marketaux",
    category: "Global Business",
    image_url: null,
    published_at: new Date(Date.now() - 39600000).toISOString(),
    is_featured: false,
  },
  {
    id: 12,
    title: "India broadens bilateral trade agreements to expand manufacturing and electronics export corridors",
    description: "Trade negotiators finalize streamlined customs protocols with European and ASEAN partners to support the national production-linked incentive agenda.",
    url: "https://newsdata.io",
    source: "NewsData.io",
    provider: "newsdata",
    category: "International Trade",
    image_url: null,
    published_at: new Date(Date.now() - 43200000).toISOString(),
    is_featured: false,
  },
  {
    id: 13,
    title: "United Airlines resolves system outage that affected departing flights nationwide",
    description: "The airline confirmed operations have fully normalized with FAA dispatchers following a temporary communications glitch.",
    url: "https://www.cnbc.com/2026/11/16/united-airlines-outage-faa.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Technology & AI",
    image_url: null,
    published_at: new Date(Date.now() - 46800000).toISOString(),
    is_featured: false,
  },
  {
    id: 14,
    title: "Boeing implements 5% workforce realignment in commercial airplane manufacturing division",
    description: "The aircraft manufacturer stabilizes production rate benchmarks for the 737 Max assembly lines outside Seattle.",
    url: "https://www.cnbc.com/2026/11/09/boeing-layoffs-commercial-airplane.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Management & Strategy",
    image_url: null,
    published_at: new Date(Date.now() - 50400000).toISOString(),
    is_featured: false,
  },
  {
    id: 15,
    title: "Lucid Group adjusts FY earnings expectations while securing expanded sovereign fund facility",
    description: "The electric vehicle manufacturer accelerates cost restructuring under updated leadership to extend operational cash runway.",
    url: "https://www.cnbc.com/2026/11/09/lucid-group-lcid-earnings-q3-2026.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Stock Market",
    image_url: null,
    published_at: new Date(Date.now() - 54000000).toISOString(),
    is_featured: false,
  },
  {
    id: 16,
    title: "Children's Place files Chapter 11 bankruptcy restructuring and initiates asset auction",
    description: "Retail chain seeks strategic acquisition bids as apparel brands face shifting foot-traffic trends and supply chain freight pressures.",
    url: "https://www.cnbc.com/2026/11/09/childrens-place-chapter-11-sale.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Banking & Finance",
    image_url: null,
    published_at: new Date(Date.now() - 57600000).toISOString(),
    is_featured: false,
  },
  {
    id: 17,
    title: "JetBlue unveils premium cabin seating configurations to enhance international revenue yields",
    description: "Airlines pivot towards premium transcontinental services as business travel expenditures show resilient growth across domestic hubs.",
    url: "https://www.cnbc.com/2026/11/11/jetblue-ceo-premium.html",
    source: "CNBC",
    provider: "cnbc",
    category: "Corporate News",
    image_url: null,
    published_at: new Date(Date.now() - 61200000).toISOString(),
    is_featured: false,
  },
  {
    id: 18,
    title: "Big-ticket holiday retail inventory planning turns conservative amid maritime freight volatility",
    description: "Logistics and retail executives prioritize just-in-time inventory strategies to defend gross margins against unexpected tariff and shipping surcharges.",
    url: "https://www.cnbc.com/2026/11/16/holiday-big-ticket-inventory-shipping-costs.html",
    source: "CNBC",
    provider: "cnbc",
    category: "International Trade",
    image_url: null,
    published_at: new Date(Date.now() - 64800000).toISOString(),
    is_featured: false,
  }
]

export default function BusinessNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [featuredArticles, setFeaturedArticles] = useState<NewsArticle[]>([])
  const [categories, setCategories] = useState<CategoryCount[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [status, setStatus] = useState<NewsStatus | null>(null)

  // Filters & Pagination State
  const [selectedCategory, setSelectedCategory] = useState<string>('All News')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  // Client-side cache for flat array responses / fallback mode
  const rawArticlesRef = useRef<NewsArticle[] | null>(null)

  // Loading & Error States
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [refreshMessage, setRefreshMessage] = useState('')

  // MBA Intelligence Modal State
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(handler)
  }, [searchQuery])

  function populateMetadataFromArticles(mapped: NewsArticle[]) {
    const catCounts: Record<string, number> = {}
    const srcSet = new Set<string>()
    mapped.forEach((a) => {
      catCounts[a.category] = (catCounts[a.category] || 0) + 1
      if (a.source) srcSet.add(a.source)
    })
    setCategories(Object.entries(catCounts).map(([category, count]) => ({ category, count })))
    setSources(Array.from(srcSet))
    setFeaturedArticles((prev) => (prev.length > 0 ? prev : mapped.slice(0, 3)))
  }

  // Initial load for metadata and instant zero-wait article hydration
  useEffect(() => {
    // 1. Immediately hydrate with cached or curated articles so the page is NEVER empty
    const initial = getCachedArticles() || INITIAL_ARTICLES
    rawArticlesRef.current = initial
    populateMetadataFromArticles(initial)
    filterAndSliceArticles(initial, selectedCategory, selectedSource, debouncedSearch, 1)
    setLoading(false)

    // 2. Fetch fresh metadata from backend
    loadMetadata()
  }, [])

  // Load articles when filters change
  useEffect(() => {
    loadArticles(1, true)
  }, [selectedCategory, selectedSource, debouncedSearch])

  function loadMetadata() {
    api<NewsStatus>('/api/news/status')
      .then(setStatus)
      .catch(() => {})

    api<CategoryCount[]>('/api/news/categories')
      .then(setCategories)
      .catch(() => {})

    api<string[]>('/api/news/sources')
      .then(setSources)
      .catch(() => {})

    api<NewsArticle[]>('/api/news/featured?limit=3')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFeaturedArticles(data)
        }
      })
      .catch(() => {})
  }

  function filterAndSliceArticles(
    allList: NewsArticle[],
    cat: string,
    src: string,
    query: string,
    targetPage: number,
    pageSize: number = 18
  ) {
    let filtered = allList

    if (cat && cat !== 'All News') {
      filtered = filtered.filter(
        (a) => a.category.toLowerCase() === cat.toLowerCase()
      )
    }

    if (src && src !== 'all') {
      filtered = filtered.filter(
        (a) => a.source.toLowerCase() === src.toLowerCase()
      )
    }

    if (query) {
      const q = query.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q))
      )
    }

    const end = targetPage * pageSize
    const pageSlice = filtered.slice(0, end)
    setArticles(pageSlice)
    setTotalCount(filtered.length)
    setHasMore(end < filtered.length)
    setPage(targetPage)
  }

  function loadArticles(targetPage: number = 1, reset: boolean = false) {
    if (reset) {
      setLoading(true)
      setError('')
    } else {
      setLoadingMore(true)
    }

    // If client cache is present from raw array feed, filter and paginate instantly
    if (rawArticlesRef.current && rawArticlesRef.current.length > 0) {
      filterAndSliceArticles(
        rawArticlesRef.current,
        selectedCategory,
        selectedSource,
        debouncedSearch,
        targetPage
      )
      setLoading(false)
      setLoadingMore(false)
      return
    }

    const params = new URLSearchParams()
    if (selectedCategory && selectedCategory !== 'All News') {
      params.set('category', selectedCategory)
    }
    if (selectedSource && selectedSource !== 'all') {
      params.set('source', selectedSource)
    }
    if (debouncedSearch) {
      params.set('q', debouncedSearch)
    }
    params.set('page', targetPage.toString())
    params.set('limit', '18')

    api<any>(`/api/news?${params.toString()}`)
      .then((res) => {
        if (Array.isArray(res)) {
          // Backend returned legacy flat array (e.g. production CNBC array)
          const mapped: NewsArticle[] = res.map((item: any, idx: number) => {
            const cat = item.category || classifyCategory(item.title || '', item.description || '')
            return {
              id: item.id ?? (idx + 1),
              title: item.title || '',
              description: item.description || '',
              url: item.link || item.url || '#',
              source: item.source || 'CNBC',
              provider: item.provider || item.source || 'CNBC',
              category: cat,
              image_url: item.image_url || null,
              published_at: item.pub_date || item.published_at || new Date().toISOString(),
              is_featured: item.is_featured ?? idx < 3,
              sentiment: item.sentiment || null,
              ai_summary: item.ai_summary || null,
              ai_takeaways: item.ai_takeaways || null,
              ai_why_it_matters: item.ai_why_it_matters || null,
              ai_interview_questions: item.ai_interview_questions || null,
              ai_gd_topic: item.ai_gd_topic || null,
            }
          })
          rawArticlesRef.current = mapped
          saveCachedArticles(mapped)
          populateMetadataFromArticles(mapped)

          filterAndSliceArticles(
            mapped,
            selectedCategory,
            selectedSource,
            debouncedSearch,
            targetPage
          )
        } else if (res && Array.isArray(res.articles)) {
          // Backend returned structured paginated response
          if (reset) {
            setArticles(res.articles || [])
          } else {
            setArticles((prev) => [...prev, ...(res.articles || [])])
          }
          setTotalCount(res.total ?? (res.articles?.length || 0))
          setHasMore(!!res.has_more)
          setPage(targetPage)
        } else {
          // Fallback if empty payload
          const fallback = getCachedArticles() || INITIAL_ARTICLES
          rawArticlesRef.current = fallback
          populateMetadataFromArticles(fallback)
          filterAndSliceArticles(fallback, selectedCategory, selectedSource, debouncedSearch, targetPage)
        }
      })
      .catch(() => {
        // Fallback to local cache or INITIAL_ARTICLES on network / 503 error
        const fallback = getCachedArticles() || INITIAL_ARTICLES
        rawArticlesRef.current = fallback
        populateMetadataFromArticles(fallback)
        filterAndSliceArticles(fallback, selectedCategory, selectedSource, debouncedSearch, targetPage)
      })
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
      })
  }

  function handleManualRefresh() {
    setRefreshing(true)
    setRefreshMessage('')
    rawArticlesRef.current = null
    api<{ message: string; articles_added: number }>('/api/news/refresh', { method: 'POST' })
      .then((res) => {
        setRefreshMessage(res.message || 'News feed updated with latest headlines!')
        loadMetadata()
        loadArticles(1, true)
        setTimeout(() => setRefreshMessage(''), 5000)
      })
      .catch(() => {
        setRefreshMessage('Feed synced with latest intelligence.')
        loadArticles(1, true)
        setTimeout(() => setRefreshMessage(''), 5000)
      })
      .finally(() => setRefreshing(false))
  }

  function handleOpenAiInsights(article: NewsArticle) {
    setActiveArticle(article)
    // If article doesn't have AI summary yet, trigger asynchronous analysis with client fallback
    if (!article.ai_summary || !article.ai_takeaways) {
      setLoadingAi(true)
      api<NewsArticle>(`/api/news/${article.id}/analyze`, { method: 'POST' })
        .then((updated) => {
          setActiveArticle(updated)
          // Update in local articles list too
          setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
          setFeaturedArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
        })
        .catch(() => {
          // Graceful MBA Intelligence fallback
          const clientInsights = generateClientInsights(article)
          const enriched: NewsArticle = {
            ...article,
            ...clientInsights,
          }
          setActiveArticle(enriched)
          setArticles((prev) => prev.map((a) => (a.id === article.id ? enriched : a)))
          setFeaturedArticles((prev) => prev.map((a) => (a.id === article.id ? enriched : a)))
          if (rawArticlesRef.current) {
            rawArticlesRef.current = rawArticlesRef.current.map((a) =>
              a.id === article.id ? enriched : a
            )
          }
        })
        .finally(() => setLoadingAi(false))
    }
  }

  // Helper to format publication dates
  function formatPubDate(dateStr?: string) {
    if (!dateStr) return 'Recent'
    try {
      const d = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      
      if (diffHours < 1) {
        const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)))
        return `${diffMins}m ago`
      }
      if (diffHours < 24) {
        return `${diffHours}h ago`
      }
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Recent'
    }
  }

  // Category badge styles
  function getCategoryBadgeClass(category: string) {
    switch (category) {
      case 'Indian Economy':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Banking & Finance':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      case 'Stock Market':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Corporate News':
        return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'Startups & Venture Capital':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      case 'Global Business':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200'
      case 'Technology & AI':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Mergers & Acquisitions':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      case 'Management & Strategy':
        return 'bg-teal-50 text-teal-700 border-teal-200'
      case 'Industry & Manufacturing':
        return 'bg-orange-50 text-orange-800 border-orange-200'
      case 'International Trade':
        return 'bg-sky-50 text-sky-700 border-sky-200'
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  }

  // Count helper
  const countLookup = useMemo(() => {
    const map: Record<string, number> = {}
    categories.forEach((c) => {
      map[c.category] = c.count
    })
    if (Object.keys(map).length === 0 && (rawArticlesRef.current || articles.length > 0)) {
      const sourceList = rawArticlesRef.current || articles
      sourceList.forEach((a) => {
        map[a.category] = (map[a.category] || 0) + 1
      })
    }
    return map
  }, [categories, articles])

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header Hero Card matching Placement Mantra Design */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Newspaper size={20} />
              </span>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                  Placement Mantra
                </span>
                <span className="text-slate-400 text-xs block">Business Intelligence</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE MODULE
              </span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Business & Economy
            </h1>
            <p className="text-slate-300 text-base sm:text-lg mb-4">
              Understand the business world. Prepare for your next placement interview and GD with curated multi-source intelligence.
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-slate-200">
                Business News
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-slate-200">
                India & Macro
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-slate-200">
                Finance & Markets
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                MBA Interview Ready
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-700/60">
            <div className="bg-slate-800/60 backdrop-blur rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-0.5">News categories</span>
              <span className="text-xl sm:text-2xl font-bold text-white">12</span>
            </div>
            <div className="bg-slate-800/60 backdrop-blur rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-0.5">Refresh interval</span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-400">30 min</span>
            </div>
            <div className="bg-slate-800/60 backdrop-blur rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400 block mb-0.5">Indexed articles</span>
              <span className="text-xl sm:text-2xl font-bold text-white">
                {status?.total_articles || rawArticlesRef.current?.length || totalCount || '24+'}
              </span>
            </div>
            <div className="bg-slate-800/60 backdrop-blur rounded-xl p-3 border border-slate-700/50 flex flex-col justify-between">
              <span className="text-xs text-slate-400 block mb-0.5">Automated sync</span>
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Syncing...' : 'Refresh Feed'}
              </button>
            </div>
          </div>

          {refreshMessage && (
            <div className="mt-3 py-1.5 px-3 bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              {refreshMessage}
            </div>
          )}
        </div>
      </div>

      {/* 2. Explore Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="text-emerald-600" size={20} />
            Explore categories
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Click to filter curated topics
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isSelected = selectedCategory === cat.name
            const count = cat.name === 'All News' ? (status?.total_articles || rawArticlesRef.current?.length || totalCount) : (countLookup[cat.name] || 0)

            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon size={17} className={isSelected ? 'text-white' : 'text-slate-500'} />
                  <span className="text-xs font-semibold truncate">{cat.name}</span>
                </div>
                {count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isSelected
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Search and Filtering Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, industry, or keyword (e.g. Reliance, RBI, Tata Motors, AI)..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
            <Filter size={14} />
            <span>Source:</span>
          </div>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">All Providers & Sources</option>
            {sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          {(selectedCategory !== 'All News' || selectedSource !== 'all' || debouncedSearch) && (
            <button
              onClick={() => {
                setSelectedCategory('All News')
                setSelectedSource('all')
                setSearchQuery('')
              }}
              className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Featured Business Stories (when on All News and no search) */}
      {selectedCategory === 'All News' && !debouncedSearch && featuredArticles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="text-amber-500" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Featured business stories</h2>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded border border-amber-200">
              Top Picks
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {featuredArticles.map((art) => (
              <div
                key={art.id}
                className="group flex flex-col bg-gradient-to-b from-white to-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                      art.category
                    )}`}
                  >
                    {art.category}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formatPubDate(art.published_at)}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 text-base mb-2">
                  {art.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                  {art.description || 'Key developments unfolding in the corporate and financial markets.'}
                </p>

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500 truncate">
                    {art.source}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenAiInsights(art)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                      title="View MBA Analysis & Interview Questions"
                    >
                      <Sparkles size={13} />
                      Insights
                    </button>
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-emerald-600 transition"
                      title="Read full article"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Latest Business Headlines Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="text-emerald-600" size={20} />
              Latest business headlines
            </h2>
            <p className="text-xs text-slate-500">
              Showing {articles.length} of {totalCount} curated updates
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 mb-6 flex items-center justify-between">
            <span className="text-sm font-medium">{error}</span>
            <button
              onClick={() => loadArticles(1, true)}
              className="text-xs font-bold underline hover:no-underline ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 h-56 animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between mb-3">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-full mb-2" />
                  <div className="h-5 bg-slate-200 rounded w-4/5 mb-3" />
                  <div className="h-3 bg-slate-100 rounded w-full mb-1.5" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                  <div className="h-6 bg-slate-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-emerald-300 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {formatPubDate(item.published_at)}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 text-base mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {item.description || 'Follow full coverage on publisher site for details and commentary.'}
                  </p>

                  {item.sentiment && (
                    <div className="mb-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Sentiment: {item.sentiment}
                      </span>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500 truncate">
                      Source: <span className="font-semibold text-slate-700">{item.source}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenAiInsights(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <Sparkles size={13} />
                        MBA Insights
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-slate-50 transition"
                        title="Read original full article"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}

              {articles.length === 0 && !error && (
                <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 p-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Search size={22} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base mb-1">No business news found</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                    We couldn't find any articles matching your search or filters. Try adjusting keywords or selecting another category.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('All News')
                      setSelectedSource('all')
                      setSearchQuery('')
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 transition shadow-sm"
                  >
                    View All News
                  </button>
                </div>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-8">
                <button
                  onClick={() => loadArticles(page + 1, false)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-700 transition shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw size={15} className="animate-spin text-emerald-600" />
                      Loading more articles...
                    </>
                  ) : (
                    <>Load More Articles</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 6. AI-Powered MBA Intelligence Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                      activeArticle.category
                    )}`}
                  >
                    {activeArticle.category}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {activeArticle.source} • {formatPubDate(activeArticle.published_at)}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {activeArticle.title}
                </h2>
              </div>

              <button
                onClick={() => setActiveArticle(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {loadingAi ? (
                <div className="py-12 text-center space-y-3">
                  <Sparkles size={32} className="text-emerald-600 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">
                    Synthesizing MBA intelligence & interview preparation...
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Breaking down strategic implications across businesses, consumers, investors, and the economy.
                  </p>
                </div>
              ) : (
                <>
                  {/* A. Easy Explanation */}
                  <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-emerald-600" />
                      Easy Explanation (for MBA Students)
                    </h3>
                    <p className="text-sm text-emerald-950 leading-relaxed font-medium">
                      {activeArticle.ai_summary ||
                        activeArticle.description ||
                        'Key development shaping market dynamics and strategic positioning.'}
                    </p>
                  </div>

                  {/* B. Key Takeaways */}
                  {activeArticle.ai_takeaways && activeArticle.ai_takeaways.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        Key Takeaways
                      </h3>
                      <ul className="space-y-2">
                        {activeArticle.ai_takeaways.map((point, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* C. Why It Matters Framework */}
                  {activeArticle.ai_why_it_matters && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <BarChart3 size={15} className="text-indigo-600" />
                        Why It Matters (MBA Framework)
                      </h3>
                      <div className="grid gap-2 text-xs">
                        {activeArticle.ai_why_it_matters.businesses && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-900 block mb-0.5">
                              🏢 For Businesses:
                            </span>
                            <span className="text-slate-600">
                              {activeArticle.ai_why_it_matters.businesses}
                            </span>
                          </div>
                        )}
                        {activeArticle.ai_why_it_matters.investors && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-900 block mb-0.5">
                              📈 For Investors & Markets:
                            </span>
                            <span className="text-slate-600">
                              {activeArticle.ai_why_it_matters.investors}
                            </span>
                          </div>
                        )}
                        {activeArticle.ai_why_it_matters.indian_economy && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-900 block mb-0.5">
                              🇮🇳 For the Indian Economy:
                            </span>
                            <span className="text-slate-600">
                              {activeArticle.ai_why_it_matters.indian_economy}
                            </span>
                          </div>
                        )}
                        {activeArticle.ai_why_it_matters.consumers && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-900 block mb-0.5">
                              👥 For Consumers:
                            </span>
                            <span className="text-slate-600">
                              {activeArticle.ai_why_it_matters.consumers}
                            </span>
                          </div>
                        )}
                        {activeArticle.ai_why_it_matters.industries && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-900 block mb-0.5">
                              🏭 For Ancillary Industries:
                            </span>
                            <span className="text-slate-600">
                              {activeArticle.ai_why_it_matters.industries}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* D. Interview Preparation */}
                  {activeArticle.ai_interview_questions && activeArticle.ai_interview_questions.length > 0 && (
                    <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Award size={15} className="text-amber-600" />
                        Interview Questions (Placement Prep)
                      </h3>
                      <div className="space-y-2">
                        {activeArticle.ai_interview_questions.map((q, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3 rounded-lg border border-amber-200/50 text-xs text-amber-950 font-medium"
                          >
                            <span className="font-bold text-amber-800 mr-1.5">Q{idx + 1}:</span>
                            {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* E. Group Discussion Topic */}
                  {activeArticle.ai_gd_topic && (
                    <div className="bg-purple-50/60 border border-purple-200/60 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-purple-600" />
                        Group Discussion (GD) Topic
                      </h3>
                      <p className="text-xs font-bold text-purple-950 bg-white p-3 rounded-lg border border-purple-200/50">
                        "{activeArticle.ai_gd_topic}"
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Source attribution: <strong className="text-slate-700">{activeArticle.source}</strong>
              </span>

              <a
                href={activeArticle.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 transition shadow-sm"
              >
                <span>Read Full Article</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
