export interface User {
  id: number
  email: string
  full_name: string
  headline?: string
  bio?: string
  domain?: string
  linkedin_url?: string
  github_url?: string
  is_admin: boolean
}

export interface Experience {
  id: number
  title: string
  company: string
  location?: string | null
  start_month: string
  end_month?: string | null
  description?: string | null
}

export interface Education {
  id: number
  school: string
  degree?: string | null
  field_of_study?: string | null
  start_year?: string | null
  end_year?: string | null
  description?: string | null
}

export interface Skill {
  id: number
  name: string
  endorsement_count: number
  endorsed_by_me: boolean
}

export interface Resume {
  filename: string
  content_type: string
  uploaded_at: string
}

export type ConnectionStatus = 'self' | 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected'

export interface UserProfile extends User {
  experiences: Experience[]
  education: Education[]
  skills: Skill[]
  resume: Resume | null
  connection_count: number
  connection_status: ConnectionStatus
  connection_id: number | null
}

export interface ConnectionRequest {
  id: number
  user: User
  created_at: string
}

export interface ConnectionSummary {
  connection_id: number
  other_user_id: number
  status: 'pending' | 'accepted'
  is_requester: boolean
}

export interface Project {
  id: number
  title: string
  description: string
  domain: string
  created_by_id: number
  created_at: string
  creator: User
}

export interface ATSResponse {
  score: number
  suggestions: string[]
  feedback: string
}

export interface AnswerResponse {
  improved_answer: string
  feedback: string
}

export interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

export interface ChatReply {
  reply: string
}

export interface AdminUser extends User {
  created_at: string
  last_login_at: string | null
}

export interface DailyCount {
  date: string
  count: number
}

export interface AdminStats {
  total_users: number
  total_admins: number
  new_users_7d: number
  new_users_30d: number
  active_users_24h: number
  active_users_7d: number
  total_projects: number
  total_connections: number
  total_resumes: number
  total_test_attempts: number
  completed_test_attempts: number
  total_companies: number
  total_job_descriptions: number
  total_interview_questions: number
  signups_by_day: DailyCount[]
  recent_users: AdminUser[]
}

export interface Subject {
  id: number
  slug: string
  name: string
  topic_count: number
}

export interface TopicSummary {
  id: number
  slug: string
  title: string
  has_content: boolean
  has_questions: boolean
}

export interface SolvedExample {
  id: number
  difficulty: string
  question: string
  options: string[] | null
  correct_answer: string
  step_by_step: string
  shortcut: string | null
}

export interface TestSummary {
  id: number
  title: string
  test_type: string
  duration_minutes: number | null
  question_count: number
  negative_mark: number
  instructions: string[] | null
}

export interface RichContent {
  title?: string
  introduction?: string
  learning_objectives?: string[]
  concepts?: { heading: string; body: string }[]
  formulas?: unknown
  shortcut_methods?: unknown
  common_mistakes?: unknown
  summary?: string
  quick_revision_notes?: unknown
}

export interface TopicDetail {
  id: number
  slug: string
  title: string
  subject_slug: string
  subject_name: string
  theory: string | null
  rich: RichContent | null
  solved_examples: SolvedExample[]
  practice_question_count: number
  tests: TestSummary[]
}

export interface CompanySummary {
  id: number
  slug: string
  name: string
  jd_count: number
  question_count: number
  roles: string[]
}

export interface JDSummary {
  id: number
  slug: string
  role: string
  category: string
  company_slug: string
  company_name: string
  skills: string[]
}

export interface PrepTopic {
  slug: string
  title: string
  subject_name: string
  has_content: boolean
}

export interface InterviewQuestion {
  id: number
  company_slug: string
  company_name: string
  role: string
  round_name: string
  category: string
  text: string
  starred: boolean
  is_note: boolean
}

export interface JDDetail {
  id: number
  slug: string
  role: string
  category: string
  company_slug: string
  company_name: string
  skills: string[]
  sections: Record<string, string> | null
  full_text: string
  source_file: string | null
  prep_topics: PrepTopic[]
  interview_questions: InterviewQuestion[]
  related_roles: JDSummary[]
}

export interface CompanyDetail {
  id: number
  slug: string
  name: string
  job_descriptions: JDSummary[]
  question_count: number
  rounds: string[]
}

export interface QuestionBankPage {
  total: number
  items: InterviewQuestion[]
  companies: string[]
  rounds: string[]
  categories: string[]
}

export interface GuideSummary {
  id: number
  slug: string
  title: string
  category: string
  icon: string | null
  summary: string
  question_count: number
}

export interface GuideQuestion {
  id: number
  text: string
  company_name: string
  company_slug: string
  role: string
  round_name: string
  starred: boolean
}

export interface GuideSection {
  heading: string
  body: string
}

export interface GuideDetail {
  id: number
  slug: string
  title: string
  category: string
  icon: string | null
  summary: string
  introduction: string | null
  source: string | null
  sections: GuideSection[] | null
  checklist: string[] | null
  common_mistakes: string[] | null
  question_category: string | null
  question_count: number
  questions: GuideQuestion[]
  top_companies: string[]
}

export interface ProgressSummary {
  attempts: number
  tests_taken: number
  questions_answered: number
  questions_correct: number
  accuracy: number
  total_score: number
  topics_attempted: number
  topics_total: number
}

export interface AttemptSummary {
  attempt_id: number
  test_id: number
  test_title: string
  test_type: string
  score: number
  total: number
  correct: number
  incorrect: number
  unattempted: number
  accuracy: number
  submitted_at: string | null
  time_taken_sec: number | null
}

export interface TopicMastery {
  topic_slug: string
  topic_title: string
  subject_name: string
  attempted: number
  correct: number
  accuracy: number
}

export interface SectionPerformance {
  section: string
  attempted: number
  correct: number
  accuracy: number
}

export interface SubjectCoverage {
  subject_slug: string
  subject_name: string
  topics_total: number
  topics_attempted: number
}

export interface Progress {
  summary: ProgressSummary
  recent_attempts: AttemptSummary[]
  topic_mastery: TopicMastery[]
  weakest_topics: TopicMastery[]
  strongest_topics: TopicMastery[]
  section_performance: SectionPerformance[]
  subject_coverage: SubjectCoverage[]
  untouched_topics: TopicMastery[]
}

export interface PracticeQuestion {
  id: number
  text: string
  difficulty: string
  options: string[]
  correct_answer: string
  explanation: string | null
  estimated_time_sec: number | null
}

export interface TestQuestion {
  id: number
  text: string
  difficulty: string
  options: string[]
  estimated_time_sec: number | null
  section: string | null
}

export interface AttemptStart {
  attempt_id: number
  test_id: number
  title: string
  duration_minutes: number | null
  negative_mark: number
  instructions: string[] | null
  started_at: string
  questions: TestQuestion[]
  sections: string[] | null
}

export interface MockTest {
  id: number
  slug: string | null
  title: string
  test_type: string
  duration_minutes: number | null
  question_count: number
  negative_mark: number
  description: string | null
  sections: string[] | null
  attempt_count: number
  best_score: number | null
}

export interface SectionResult {
  section: string
  total: number
  correct: number
  incorrect: number
  unattempted: number
  score: number
}

export interface TopicBreakdown {
  topic_slug: string
  topic_title: string
  total: number
  correct: number
}

export interface QuestionResult {
  question_id: number
  text: string
  options: string[]
  selected: string | null
  correct_answer: string
  is_correct: boolean
  explanation: string | null
  section: string | null
  topic_slug: string | null
  topic_title: string | null
}

export interface AttemptResult {
  attempt_id: number
  test_title: string
  score: number
  total: number
  correct: number
  incorrect: number
  unattempted: number
  negative_mark: number
  submitted_at: string | null
  results: QuestionResult[]
  sections: SectionResult[]
  weakest_topics: TopicBreakdown[]
}
