import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react'

interface NewsItem {
  title: string
  link: string
  pub_date: string
  description: string
}

export default function BusinessNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function loadNews() {
    setLoading(true)
    setError('')
    api<NewsItem[]>('/api/news')
      .then(setNews)
      .catch(() => setError('Failed to load business news. Please try again later.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadNews()
  }, [])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-slate-900 flex items-center gap-2">
            <Newspaper className="text-indigo-600" />
            Daily Business News
          </h1>
          <p className="text-slate-500">
            Stay updated with the latest market trends, economic shifts, and corporate announcements for your interviews.
          </p>
        </div>
        <button
          onClick={loadNews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-48 animate-pulse flex flex-col justify-between">
              <div>
                <div className="h-5 bg-slate-200 rounded-md w-3/4 mb-3"></div>
                <div className="h-5 bg-slate-200 rounded-md w-full mb-4"></div>
                <div className="h-3 bg-slate-100 rounded-md w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item, i) => {
            const date = item.pub_date ? new Date(item.pub_date).toLocaleDateString(undefined, { 
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
            }) : 'Recent'
            
            return (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-300 transition"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition line-clamp-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-4 mb-4">
                    {item.description}
                  </p>
                </div>
                <div className="pt-4 mt-auto border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    {date}
                  </span>
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition transform translate-x-1 group-hover:translate-x-0">
                    <ExternalLink size={16} />
                  </span>
                </div>
              </a>
            )
          })}
          {news.length === 0 && !error && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No news articles found right now. Check back later.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
