import { formatMonthYear } from '../../lib/format'
import type { Education, Experience, Skill } from '../../lib/types'
import { li } from '../network/linkedinTheme'

export function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`${li.card} p-6 mb-4`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-black/90">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

export function ExperienceList({
  experiences,
  renderActions,
}: {
  experiences: Experience[]
  renderActions?: (exp: Experience) => React.ReactNode
}) {
  if (experiences.length === 0) return <p className="text-sm text-black/50">No experience added yet.</p>
  return (
    <div className="divide-y divide-black/10">
      {experiences.map((exp) => (
        <div key={exp.id} className="py-4 first:pt-0 last:pb-0 flex justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-black/90">{exp.title}</h3>
            <p className="text-sm text-black/70">
              {exp.company}
              {exp.location ? ` · ${exp.location}` : ''}
            </p>
            <p className="text-xs text-black/50 mb-1">
              {formatMonthYear(exp.start_month)} – {formatMonthYear(exp.end_month)}
            </p>
            {exp.description && <p className="text-sm text-black/70 whitespace-pre-wrap mt-1">{exp.description}</p>}
          </div>
          {renderActions && <div className="shrink-0 flex gap-3 text-sm">{renderActions(exp)}</div>}
        </div>
      ))}
    </div>
  )
}

export function EducationList({
  education,
  renderActions,
}: {
  education: Education[]
  renderActions?: (edu: Education) => React.ReactNode
}) {
  if (education.length === 0) return <p className="text-sm text-black/50">No education added yet.</p>
  return (
    <div className="divide-y divide-black/10">
      {education.map((edu) => (
        <div key={edu.id} className="py-4 first:pt-0 last:pb-0 flex justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-black/90">{edu.school}</h3>
            {(edu.degree || edu.field_of_study) && (
              <p className="text-sm text-black/70">
                {[edu.degree, edu.field_of_study].filter(Boolean).join(', ')}
              </p>
            )}
            {(edu.start_year || edu.end_year) && (
              <p className="text-xs text-black/50 mb-1">
                {edu.start_year || '—'} – {edu.end_year || 'Present'}
              </p>
            )}
            {edu.description && <p className="text-sm text-black/70 whitespace-pre-wrap mt-1">{edu.description}</p>}
          </div>
          {renderActions && <div className="shrink-0 flex gap-3 text-sm">{renderActions(edu)}</div>}
        </div>
      ))}
    </div>
  )
}

export function SkillChips({
  skills,
  onEndorse,
  onDelete,
  endorseBusyId,
}: {
  skills: Skill[]
  onEndorse?: (skill: Skill) => void
  onDelete?: (skill: Skill) => void
  endorseBusyId?: number | null
}) {
  if (skills.length === 0) return <p className="text-sm text-black/50">No skills added yet.</p>
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <div
          key={skill.id}
          className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border text-sm ${
            skill.endorsed_by_me ? 'border-[#0A66C2]' : 'bg-black/[0.03] border-black/15'
          }`}
          style={skill.endorsed_by_me ? { backgroundColor: li.blueTint, color: li.blue } : undefined}
        >
          <span className="font-medium">{skill.name}</span>
          {skill.endorsement_count > 0 && (
            <span className="text-xs text-black/50">
              {skill.endorsement_count} endorsement{skill.endorsement_count === 1 ? '' : 's'}
            </span>
          )}
          {onEndorse && (
            <button
              onClick={() => onEndorse(skill)}
              disabled={endorseBusyId === skill.id}
              title={skill.endorsed_by_me ? 'Remove endorsement' : 'Endorse this skill'}
              className="text-xs font-medium disabled:opacity-50 text-black/50 hover:text-[#0A66C2]"
            >
              👍
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(skill)}
              title="Remove skill"
              className="text-black/40 hover:text-red-600 text-xs leading-none"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
