import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Project } from '../../lib/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', domain: 'Software Development' })
  const [submitting, setSubmitting] = useState(false)

  const fetchProjects = () => {
    setLoading(true)
    api<Project[]>('/api/projects')
      .then((data) => {
        setProjects(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      setShowModal(false)
      setFormData({ title: '', description: '', domain: 'Software Development' })
      fetchProjects()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && projects.length === 0) return <div className="p-8 text-center text-slate-500">Loading projects...</div>

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-slate-900">Domain Projects & Opportunities</h1>
          <p className="text-slate-500">Collaborate on live projects to build your resume.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          + Post a Project
        </button>
      </div>

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
              
              <button className="ml-auto text-indigo-600 text-sm font-medium hover:text-indigo-800 transition">
                I'm Interested
              </button>
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
