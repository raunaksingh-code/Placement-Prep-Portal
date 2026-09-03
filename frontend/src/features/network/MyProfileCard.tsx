import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { UserProfile } from '../../lib/types'
import { li } from './linkedinTheme'

export function MyProfileCard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    api<UserProfile>('/api/auth/me').then(setProfile).catch(() => {})
  }, [])

  if (!profile) return null

  return (
    <div className={`${li.card} overflow-hidden`}>
      <div className="h-12 bg-gradient-to-r from-[#8FA8C7] to-[#6E93BE]" />
      <div className="px-4 pb-4 -mt-6">
        <Link to="/profile">
          <div className="w-14 h-14 rounded-full bg-white border-2 border-white shadow flex items-center justify-center text-xl font-bold text-[#0A66C2]">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
        </Link>
        <Link to="/profile" className="block mt-2 font-semibold text-black/90 hover:underline">
          {profile.full_name}
        </Link>
        {profile.headline && <p className="text-xs text-black/60 mt-0.5">{profile.headline}</p>}

        <div className="border-t border-black/10 mt-3 pt-3">
          <Link to="/profile" className="flex justify-between text-xs text-black/60 hover:underline">
            <span>Connections</span>
            <span className="text-[#0A66C2] font-semibold">{profile.connection_count}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
