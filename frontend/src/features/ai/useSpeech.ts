// Thin wrappers around the browser's built-in speech APIs (SpeechSynthesis
// for the AI's voice, SpeechRecognition for the candidate's mic) - free,
// no account or API key, but Chrome/Edge only for recognition.

export interface VoiceProfile {
  pitch?: number
  rate?: number
  nameHint?: string // substring to look for in available voice names, e.g. "female"
}

let voicesCache: SpeechSynthesisVoice[] = []
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([])
  if (voicesCache.length) return Promise.resolve(voicesCache)
  if (voicesPromise) return voicesPromise
  voicesPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices()
    if (existing.length) {
      voicesCache = existing
      resolve(existing)
      return
    }
    window.speechSynthesis.onvoiceschanged = () => {
      voicesCache = window.speechSynthesis.getVoices()
      resolve(voicesCache)
    }
    // Some browsers never fire onvoiceschanged if voices were already
    // available synchronously moments later - poll briefly as a fallback.
    setTimeout(() => {
      if (!voicesCache.length) voicesCache = window.speechSynthesis.getVoices()
      resolve(voicesCache)
    }, 500)
  })
  return voicesPromise
}

export function isSpeechSynthesisSupported() {
  return 'speechSynthesis' in window
}

export async function speak(text: string, profile: VoiceProfile = {}): Promise<void> {
  if (!isSpeechSynthesisSupported() || !text.trim()) return
  const voices = await loadVoices()
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text)
    if (profile.nameHint) {
      const match = voices.find((v) => v.name.toLowerCase().includes(profile.nameHint!.toLowerCase()))
      if (match) utter.voice = match
    }
    utter.pitch = profile.pitch ?? 1
    utter.rate = profile.rate ?? 1
    utter.onend = () => resolve()
    utter.onerror = () => resolve()
    window.speechSynthesis.speak(utter)
  })
}

export function cancelSpeech() {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel()
}

// --- Speech recognition (mic -> text) ---

interface RecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: any) => void) | null
  onend: (() => void) | null
  onerror: ((event: any) => void) | null
  start: () => void
  stop: () => void
}

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported() {
  return getRecognitionCtor() !== null
}

export function createRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onEnd: () => void,
): RecognitionLike | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = 'en-US'
  rec.onresult = (event: any) => {
    let interim = ''
    let final = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) final += transcript
      else interim += transcript
    }
    onResult(final || interim, Boolean(final))
  }
  rec.onerror = () => onEnd()
  rec.onend = onEnd
  return rec
}
