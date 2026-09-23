import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Project } from '../../lib/types'
import { RefreshCw } from 'lucide-react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', domain: 'Software Development', external_link: '' })
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'mba'>('all')
  const [registered, setRegistered] = useState<number[]>(() => JSON.parse(localStorage.getItem('registered_projects') || '[]'))

  const fetchProjects = () => {
    setLoading(true)
    const url = filter === 'mba' ? '/api/projects?mba_only=true' : '/api/projects'
    api<Project[]>(url)
      .then((data) => {
        setProjects(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchProjects()
  }, [filter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      setShowModal(false)
      setFormData({ title: '', description: '', domain: 'Software Development', external_link: '' })
      fetchProjects()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-slate-900">Domain Projects & Internships</h1>
          <p className="text-slate-500">Collaborate on live projects to build your resume.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm whitespace-nowrap"
        >
          + Post a Project
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setFilter('mba')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'mba'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            MBA Related Only
          </button>
        </div>
        
        <button
          onClick={fetchProjects}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading projects...</div>
      ) : (

      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-slate-900">{p.title}</h2>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
                {p.domain}
              </span>
            </div>
            <p className="text-slate-600 mb-6 whitespace-pre-wrap">{p.description}</p>
            
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                {p.creator?.full_name?.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{p.creator?.full_name}</p>
                <p className="text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              
              {p.external_link ? (
                <a 
                  href={p.external_link.startsWith('http') ? p.external_link : `https://${p.external_link}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto text-emerald-600 text-sm font-medium hover:text-emerald-800 transition"
                >
                  Register External
                </a>
              ) : (
                <button 
                  onClick={() => {
                    if (registered.includes(p.id)) {
                      const newReg = registered.filter((id) => id !== p.id)
                      setRegistered(newReg)
                      localStorage.setItem('registered_projects', JSON.stringify(newReg))
                    } else {
                      const newReg = [...registered, p.id]
                      setRegistered(newReg)
                      localStorage.setItem('registered_projects', JSON.stringify(newReg))
                      alert("You have successfully registered for this project!")
                    }
                  }}
                  className={`ml-auto text-sm font-medium transition ${
                    registered.includes(p.id)
                      ? 'text-slate-500 hover:text-slate-700'
                      : 'text-emerald-600 hover:text-emerald-800'
                  }`}
                >
                  {registered.includes(p.id) ? 'Registered ✅' : 'I\'m Interested'}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {projects.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No projects found</h3>
            <p className="text-slate-500 mb-4">Be the first to post a live project opportunity!</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-indigo-600 font-medium hover:underline"
            >
              Post a Project
            </button>
          </div>
        )}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold">Post a New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Title</label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Build an AI Chatbot for e-commerce"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
                <select
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="Software Development">Software Development</option>
                  <option value="Data Science & Analytics">Data Science & Analytics</option>
                  <option value="Product Management">Product Management</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="HR">HR</option>
                  <option value="Sales">Sales</option>
                  <option value="Design">Design</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description & Requirements</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the project, what you're building, and who you need..."
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">External Registration Link (Optional)</label>
                <input
                  type="url"
                  value={formData.external_link}
                  onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-70 shadow-sm"
                >
                  {submitting ? 'Posting...' : 'Post Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
