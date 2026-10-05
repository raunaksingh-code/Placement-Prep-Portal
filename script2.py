with open('frontend/src/features/admin/AdminPage.tsx', 'r') as f:
    content = f.read()

idx = content.find('function PublishTestTab() {')
if idx != -1:
    content = content[:idx]

new_tab = '''function PublishTestTab() {
  const [title, setTitle] = useState('')
  const [testType, setTestType] = useState('mock')
  const [track, setTrack] = useState('aptitude')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [negativeMark, setNegativeMark] = useState(0.25)
  
  const [questions, setQuestions] = useState([{
    text: '',
    explanation: '',
    options: [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ]
  }])
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function addQuestion() {
    setQuestions([...questions, {
      text: '',
      explanation: '',
      options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ]
    }])
  }

  function updateQuestion(qIndex: number, field: string, value: string) {
    const newQs = [...questions]
    newQs[qIndex] = { ...newQs[qIndex], [field]: value }
    setQuestions(newQs)
  }

  function updateOption(qIndex: number, optIndex: number, text: string) {
    const newQs = [...questions]
    newQs[qIndex].options[optIndex].text = text
    setQuestions(newQs)
  }

  function setCorrectOption(qIndex: number, optIndex: number) {
    const newQs = [...questions]
    newQs[qIndex].options.forEach((opt, idx) => {
      opt.is_correct = (idx === optIndex)
    })
    setQuestions(newQs)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (questions.length === 0) return setError('Please add at least one question.')
    
    // basic validation
    for (const q of questions) {
      if (!q.text.trim()) return setError('All questions must have text.')
      for (const opt of q.options) {
        if (!opt.text.trim()) return setError('All options must have text.')
      }
    }

    setError('')
    setSuccess('')
    setSubmitting(true)
    
    const payload = {
      title,
      test_type: testType,
      track,
      duration_minutes: durationMinutes,
      negative_mark: negativeMark,
      questions
    }

    try {
      await api('/api/admin/tests/publish', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setSuccess('Interactive test published successfully!')
      setTitle('')
      setQuestions([{
        text: '',
        explanation: '',
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false }
        ]
      }])
    } catch(err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-4xl">
      <h2 className="text-lg font-semibold mb-4">Publish Interactive Test</h2>
      <p className="text-sm text-slate-500 mb-6">
        Create a live test with questions and options. Students will take this test interactively.
      </p>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. TCS Ninja Mock Test 1" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duration (Minutes)</label>
            <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value))} required min="1" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Test Type</label>
            <select value={testType} onChange={(e) => setTestType(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="mock">Full Mock Test</option>
              <option value="sectional">Sectional Test</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Track</label>
            <select value={track} onChange={(e) => setTrack(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="aptitude">Aptitude (Default)</option>
              <option value="domain">Domain</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Negative Marking (e.g. 0.25)</label>
            <input type="number" step="0.01" value={negativeMark} onChange={(e) => setNegativeMark(parseFloat(e.target.value))} required min="0" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <hr className="my-6" />

        <div className="space-y-6">
          <h3 className="font-semibold text-lg">Questions</h3>
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="p-4 border rounded-xl bg-slate-50 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Question {qIndex + 1}</span>
                {questions.length > 1 && (
                  <button type="button" onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="text-red-600 text-sm hover:underline">Remove</button>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-500">Question Text</label>
                <textarea value={q.text} onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)} required rows={2} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${qIndex}`} checked={opt.is_correct} onChange={() => setCorrectOption(qIndex, optIndex)} className="w-4 h-4 text-indigo-600" />
                    <input type="text" value={opt.text} onChange={(e) => updateOption(qIndex, optIndex, e.target.value)} required placeholder={`Option ${String.fromCharCode(65 + optIndex)}`} className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-500">Explanation (Optional)</label>
                <textarea value={q.explanation} onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)} rows={1} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"></textarea>
              </div>
            </div>
          ))}
          
          <button type="button" onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-400 transition">
            + Add Another Question
          </button>
        </div>

        <div className="pt-4 border-t">
          <button type="submit" disabled={submitting} className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 w-full sm:w-auto">
            {submitting ? 'Publishing...' : 'Publish Test'}
          </button>
        </div>
      </form>
    </div>
  )
}
'''

with open('frontend/src/features/admin/AdminPage.tsx', 'w') as f:
    f.write(content + new_tab)
