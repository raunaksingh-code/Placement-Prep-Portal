import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { api, apiUpload, ApiError, downloadFile, getUser } from '../../lib/api'
import type { Education, Experience, Resume, Skill, UserProfile } from '../../lib/types'
import { li } from '../network/linkedinTheme'
import { SuggestionsRail } from '../network/SuggestionsRail'
import { EducationList, ExperienceList, SectionCard, SkillChips } from './sections'

const inputCls = li.input
const primaryBtnCls = li.primaryBtn
const ghostBtnCls = li.ghostLink

type ExperienceForm = {
  title: string
  company: string
  location: string
  start_month: string
  end_month: string
  current: boolean
  description: string
}

const emptyExperienceForm: ExperienceForm = {
  title: '',
  company: '',
  location: '',
  start_month: '',
  end_month: '',
  current: true,
  description: '',
}

type EducationForm = {
  school: string
  degree: string
  field_of_study: string
  start_year: string
  end_year: string
  description: string
}

const emptyEducationForm: EducationForm = {
  school: '',
  degree: '',
  field_of_study: '',
  start_year: '',
  end_year: '',
  description: '',
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<UserProfile>('/api/auth/me').then(setProfile).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-black/50">Loading profile...</div>
  if (!profile) return <div className="p-8 text-center text-red-600">Failed to load profile.</div>

  return (
    <div className="max-w-5xl mx-auto py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="min-w-0">
        <IntroCard profile={profile} onUpdate={(patch) => setProfile((p) => (p ? { ...p, ...patch } : p))} />

        <ExperienceSection
          experiences={profile.experiences}
          onChange={(experiences) => setProfile((p) => (p ? { ...p, experiences } : p))}
        />

        <EducationSection
          education={profile.education}
          onChange={(education) => setProfile((p) => (p ? { ...p, education } : p))}
        />

        <SkillsSection skills={profile.skills} onChange={(skills) => setProfile((p) => (p ? { ...p, skills } : p))} />

        <ResumeSection resume={profile.resume} onChange={(resume) => setProfile((p) => (p ? { ...p, resume } : p))} />
      </div>

      <div className="hidden lg:block sticky top-20">
        <SuggestionsRail />
      </div>
    </div>
  )
}

function IntroCard({ profile, onUpdate }: { profile: UserProfile; onUpdate: (patch: Partial<UserProfile>) => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>(profile)
  const [successMsg, setSuccessMsg] = useState('')

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await api<UserProfile>('/api/auth/me', { method: 'PUT', body: JSON.stringify(formData) })
      onUpdate(updated)
      setEditing(false)
      setSuccessMsg('Profile updated successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`${li.card} overflow-hidden mb-4`}>
      <div className="h-32 bg-gradient-to-r from-[#8FA8C7] to-[#6E93BE] relative">
        <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl shadow-md border-4 border-white text-[#0A66C2] font-bold">
          {profile.full_name.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="pt-16 px-8 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-black/90">{profile.full_name}</h1>
            <p className="text-black/50">{profile.email}</p>
          </div>
          {!editing && (
            <button onClick={() => { setFormData(profile); setEditing(true) }} className={ghostBtnCls}>
              Edit
            </button>
          )}
        </div>

        <p className="text-sm text-black/50 mt-2">
          {profile.connection_count} connection{profile.connection_count === 1 ? '' : 's'}
        </p>

        {successMsg && (
          <div className="mt-4 p-3 rounded text-sm font-medium border" style={{ backgroundColor: li.blueTint, borderColor: li.blue, color: li.blue }}>
            {successMsg}
          </div>
        )}

        {!editing ? (
          <div className="mt-4 space-y-2">
            {profile.headline && <p className="text-black/80 font-medium">{profile.headline}</p>}
            {profile.domain && <p className="text-sm font-medium" style={{ color: li.blue }}>{profile.domain}</p>}
            {profile.bio && <p className="text-black/70 whitespace-pre-wrap text-sm mt-2">{profile.bio}</p>}
            {(profile.linkedin_url || profile.github_url) && (
              <div className="flex gap-4 pt-2">
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-black/50 hover:text-[#0A66C2]">
                    LinkedIn ↗
                  </a>
                )}
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-black/50 hover:text-black/90">
                    GitHub ↗
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5 mt-6">
            <div>
              <label className="block text-sm font-medium text-black/70 mb-1">Headline</label>
              <input
                name="headline"
                value={formData.headline || ''}
                onChange={handleChange}
                placeholder="e.g. SDE Intern at Amazon | B.Tech CS"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black/70 mb-1">Domain</label>
              <select name="domain" value={formData.domain || ''} onChange={handleChange} className={`${inputCls} bg-white`}>
                <option value="">Select a Domain</option>
                <option value="Software Development">Software Development</option>
                <option value="Data Science & Analytics">Data Science & Analytics</option>
                <option value="Product Management">Product Management</option>
                <option value="Marketing">Marketing</option>
                <option value="Consulting">Consulting</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">LinkedIn URL</label>
                <input name="linkedin_url" value={formData.linkedin_url || ''} onChange={handleChange} placeholder="https://linkedin.com/in/..." className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black/70 mb-1">GitHub URL</label>
                <input name="github_url" value={formData.github_url || ''} onChange={handleChange} placeholder="https://github.com/..." className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black/70 mb-1">Bio</label>
              <textarea
                name="bio"
                value={formData.bio || ''}
                onChange={handleChange}
                rows={4}
                placeholder="Tell us a little about yourself, your skills, and what you are looking for..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium text-black/60 hover:text-black/90">
                Cancel
              </button>
              <button type="submit" disabled={saving} className={primaryBtnCls}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function ExperienceSection({ experiences, onChange }: { experiences: Experience[]; onChange: (e: Experience[]) => void }) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<ExperienceForm>(emptyExperienceForm)
  const [saving, setSaving] = useState(false)

  function startAdd() {
    setForm(emptyExperienceForm)
    setEditingId('new')
  }

  function startEdit(exp: Experience) {
    setForm({
      title: exp.title,
      company: exp.company,
      location: exp.location || '',
      start_month: exp.start_month,
      end_month: exp.end_month || '',
      current: !exp.end_month,
      description: exp.description || '',
    })
    setEditingId(exp.id)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        title: form.title,
        company: form.company,
        location: form.location || null,
        start_month: form.start_month,
        end_month: form.current ? null : form.end_month || null,
        description: form.description || null,
      }
      if (editingId === 'new') {
        const created = await api<Experience>('/api/profile/experiences', { method: 'POST', body: JSON.stringify(body) })
        onChange([created, ...experiences])
      } else if (editingId !== null) {
        const updated = await api<Experience>(`/api/profile/experiences/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        onChange(experiences.map((x) => (x.id === updated.id ? updated : x)))
      }
      setEditingId(null)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to save experience')
    } finally {
      setSaving(false)
    }
  }

  async function remove(exp: Experience) {
    if (!confirm(`Remove "${exp.title}" at ${exp.company}?`)) return
    try {
      await api(`/api/profile/experiences/${exp.id}`, { method: 'DELETE' })
      onChange(experiences.filter((x) => x.id !== exp.id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete experience')
    }
  }

  return (
    <SectionCard
      title="Experience"
      action={editingId === null && <button onClick={startAdd} className={ghostBtnCls}>+ Add</button>}
    >
      {editingId !== null && (
        <form onSubmit={save} className="space-y-3 mb-5 pb-5 border-b border-black/10">
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
          <input required placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} />
          <input placeholder="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-black/50 mb-1">Start date</label>
              <input required type="month" value={form.start_month} onChange={(e) => setForm({ ...form, start_month: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-black/50 mb-1">End date</label>
              <input type="month" disabled={form.current} value={form.end_month} onChange={(e) => setForm({ ...form, end_month: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-black/70">
            <input type="checkbox" checked={form.current} onChange={(e) => setForm({ ...form, current: e.target.checked, end_month: '' })} />
            I currently work here
          </label>
          <textarea placeholder="Description (optional)" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-medium text-black/60 hover:text-black/90">Cancel</button>
            <button type="submit" disabled={saving} className={primaryBtnCls}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      )}

      <ExperienceList
        experiences={experiences}
        renderActions={(exp) => (
          <>
            <button onClick={() => startEdit(exp)} className="text-[#0A66C2] hover:underline">Edit</button>
            <button onClick={() => remove(exp)} className="text-red-600 hover:underline">Delete</button>
          </>
        )}
      />
    </SectionCard>
  )
}

function EducationSection({ education, onChange }: { education: Education[]; onChange: (e: Education[]) => void }) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<EducationForm>(emptyEducationForm)
  const [saving, setSaving] = useState(false)

  function startAdd() {
    setForm(emptyEducationForm)
    setEditingId('new')
  }

  function startEdit(edu: Education) {
    setForm({
      school: edu.school,
      degree: edu.degree || '',
      field_of_study: edu.field_of_study || '',
      start_year: edu.start_year || '',
      end_year: edu.end_year || '',
      description: edu.description || '',
    })
    setEditingId(edu.id)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        school: form.school,
        degree: form.degree || null,
        field_of_study: form.field_of_study || null,
        start_year: form.start_year || null,
        end_year: form.end_year || null,
        description: form.description || null,
      }
      if (editingId === 'new') {
        const created = await api<Education>('/api/profile/education', { method: 'POST', body: JSON.stringify(body) })
        onChange([created, ...education])
      } else if (editingId !== null) {
        const updated = await api<Education>(`/api/profile/education/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        onChange(education.map((x) => (x.id === updated.id ? updated : x)))
      }
      setEditingId(null)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to save education')
    } finally {
      setSaving(false)
    }
  }

  async function remove(edu: Education) {
    if (!confirm(`Remove "${edu.school}"?`)) return
    try {
      await api(`/api/profile/education/${edu.id}`, { method: 'DELETE' })
      onChange(education.filter((x) => x.id !== edu.id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete education')
    }
  }

  return (
    <SectionCard
      title="Education"
      action={editingId === null && <button onClick={startAdd} className={ghostBtnCls}>+ Add</button>}
    >
      {editingId !== null && (
        <form onSubmit={save} className="space-y-3 mb-5 pb-5 border-b border-black/10">
          <input required placeholder="School" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} className={inputCls} />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Degree (optional)" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} className={inputCls} />
            <input placeholder="Field of study (optional)" value={form.field_of_study} onChange={(e) => setForm({ ...form, field_of_study: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-black/50 mb-1">Start year</label>
              <input placeholder="e.g. 2022" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-black/50 mb-1">End year (or expected)</label>
              <input placeholder="e.g. 2026" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} className={inputCls} />
            </div>
          </div>
          <textarea placeholder="Description (optional)" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-medium text-black/60 hover:text-black/90">Cancel</button>
            <button type="submit" disabled={saving} className={primaryBtnCls}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      )}

      <EducationList
        education={education}
        renderActions={(edu) => (
          <>
            <button onClick={() => startEdit(edu)} className="text-[#0A66C2] hover:underline">Edit</button>
            <button onClick={() => remove(edu)} className="text-red-600 hover:underline">Delete</button>
          </>
        )}
      />
    </SectionCard>
  )
}

function SkillsSection({ skills, onChange }: { skills: Skill[]; onChange: (s: Skill[]) => void }) {
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  async function addSkill(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    try {
      const created = await api<Skill>('/api/profile/skills', { method: 'POST', body: JSON.stringify({ name: name.trim() }) })
      onChange([created, ...skills])
      setName('')
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to add skill')
    } finally {
      setAdding(false)
    }
  }

  async function removeSkill(skill: Skill) {
    try {
      await api(`/api/profile/skills/${skill.id}`, { method: 'DELETE' })
      onChange(skills.filter((s) => s.id !== skill.id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to remove skill')
    }
  }

  return (
    <SectionCard title="Skills">
      <form onSubmit={addSkill} className="flex gap-2 mb-4">
        <input
          placeholder="Add a skill, e.g. React, SQL, Data Structures"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
        <button type="submit" disabled={adding || !name.trim()} className={primaryBtnCls}>Add</button>
      </form>
      <SkillChips skills={skills} onDelete={removeSkill} />
    </SectionCard>
  )
}

function ResumeSection({ resume, onChange }: { resume: Resume | null; onChange: (r: Resume | null) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploaded = await apiUpload<Resume>('/api/profile/resume', formData)
      onChange(uploaded)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to upload resume')
    } finally {
      setBusy(false)
    }
  }

  async function removeResume() {
    if (!confirm('Remove your resume?')) return
    setBusy(true)
    try {
      await api('/api/profile/resume', { method: 'DELETE' })
      onChange(null)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to remove resume')
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    const me = getUser()
    if (!me || !resume) return
    try {
      await downloadFile(`/api/profile/resume/${me.id}`, resume.filename)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to download resume')
    }
  }

  return (
    <SectionCard
      title="Resume / CV"
      action={
        <>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
          <button onClick={() => fileInputRef.current?.click()} disabled={busy} className={ghostBtnCls}>
            {resume ? 'Replace' : '+ Upload'}
          </button>
        </>
      }
    >
      {resume ? (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-black/90 truncate">{resume.filename}</p>
            <p className="text-xs text-black/50">Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-3 shrink-0 text-sm">
            <button onClick={download} className="text-[#0A66C2] hover:underline">Download</button>
            <button onClick={removeResume} disabled={busy} className="text-red-600 hover:underline disabled:opacity-50">Remove</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-black/50">
          No resume uploaded yet. PDF or Word, up to 5MB — visible to anyone viewing your profile.
        </p>
      )}
    </SectionCard>
  )
}
