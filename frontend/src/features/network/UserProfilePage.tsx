import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, downloadFile } from '../../lib/api'
import type { ConnectionStatus, Skill, UserProfile } from '../../lib/types'
import { EducationList, ExperienceList, SectionCard, SkillChips } from '../profile/sections'
import { ConnectButton } from './ConnectButton'
import { li } from './linkedinTheme'
import { SuggestionsRail } from './SuggestionsRail'

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [endorseBusyId, setEndorseBusyId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    api<UserProfile>(`/api/auth/users/${id}`)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load profile'))
      .finally(() => setLoading(false))
  }, [id])

  async function toggleEndorse(skill: Skill) {
    setEndorseBusyId(skill.id)
    try {
      const updated = await api<Skill>(`/api/profile/skills/${skill.id}/endorse`, { method: 'POST' })
      setProfile((p) => (p ? { ...p, skills: p.skills.map((s) => (s.id === updated.id ? updated : s)) } : p))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update endorsement')
    } finally {
      setEndorseBusyId(null)
    }
  }

  function handleConnectionChange(status: ConnectionStatus, connectionId: number | null) {
    setProfile((p) => (p ? { ...p, connection_status: status, connection_id: connectionId, connection_count: p.connection_count + (status === 'connected' ? 1 : 0) } : p))
  }

  async function downloadResume() {
    if (!profile?.resume) return
    try {
      await downloadFile(`/api/profile/resume/${profile.id}`, profile.resume.filename)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to download resume')
    }
  }

  if (loading) return <div className="p-8 text-center text-black/50">Loading profile...</div>

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <p className="text-black/50 mb-4">{error || 'User not found.'}</p>
        <Link to="/network" className={li.link}>Back to Network</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="min-w-0">
        <Link to="/network" className={`${li.link} text-sm mb-4 inline-block`}>← Back to Network</Link>
        <div className={`${li.card} overflow-hidden mb-4`}>
          <div className="h-32 bg-gradient-to-r from-[#8FA8C7] to-[#6E93BE] relative">
            <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl shadow-md border-4 border-white text-[#0A66C2] font-bold">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="pt-16 px-8 pb-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold mb-1 text-black/90">{profile.full_name}</h1>
                <p className="font-medium" style={{ color: li.blue }}>{profile.domain || 'Open to Opportunities'}</p>
                <p className="text-sm text-black/50 mt-1">
                  {profile.connection_count} connection{profile.connection_count === 1 ? '' : 's'}
                </p>
              </div>
              <ConnectButton
                userId={profile.id}
                status={profile.connection_status}
                connectionId={profile.connection_id}
                onChange={handleConnectionChange}
              />
            </div>

            {profile.headline && <p className="text-black/80 font-medium mt-4">{profile.headline}</p>}

            {profile.bio && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold text-black/50 uppercase tracking-wide mb-2">About</h2>
                <p className="text-black/70 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            {(profile.linkedin_url || profile.github_url) && (
              <div className="flex gap-4 pt-4 mt-4 border-t border-black/10">
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-black/50 hover:text-[#0A66C2] transition">
                    LinkedIn ↗
                  </a>
                )}
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-black/50 hover:text-black/90 transition">
                    GitHub ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <SectionCard title="Experience">
          <ExperienceList experiences={profile.experiences} />
        </SectionCard>

        <SectionCard title="Education">
          <EducationList education={profile.education} />
        </SectionCard>

        <SectionCard title="Skills">
          <SkillChips skills={profile.skills} onEndorse={toggleEndorse} endorseBusyId={endorseBusyId} />
        </SectionCard>

        <SectionCard title="Resume / CV">
          {profile.resume ? (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-black/90 truncate">{profile.resume.filename}</p>
                <p className="text-xs text-black/50">Uploaded {new Date(profile.resume.uploaded_at).toLocaleDateString()}</p>
              </div>
              <button onClick={downloadResume} className={li.primaryBtn}>Download</button>
            </div>
          ) : (
            <p className="text-sm text-black/50">No resume uploaded.</p>
          )}
        </SectionCard>
      </div>

      <div className="hidden lg:block sticky top-20">
        <SuggestionsRail title="People also viewed" excludeUserId={profile.id} />
      </div>
    </div>
  )
}
