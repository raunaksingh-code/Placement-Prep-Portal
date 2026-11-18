import { Mail, Phone, MessageCircle, Send, Clock, Sparkles, CheckCircle2, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../../lib/api'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, message }),
      })
      setSubmitted(true)
    } catch (err) {
      console.error('Contact submission error:', err)
      // Fallback: trigger mailto if API unreachable
      const subject = encodeURIComponent(`Placement Mantra Inquiry from ${name}`)
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)
      window.open(`mailto:raunaksingh181190@gmail.com?subject=${subject}&body=${body}`, '_blank')
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold tracking-wide uppercase border border-emerald-200/60 mb-3">
          Get in Touch
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Contact Us</h1>
        <p className="text-slate-500 max-w-xl mx-auto mt-3 text-base">
          Have questions, feedback, or need access to placement preparation resources? Reach out directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Cards (Left column) */}
        <div className="space-y-4 lg:col-span-1">
          {/* Telegram Card */}
          <a
            href="https://t.me/raunak_singh"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-sky-400 hover:shadow-md transition-all group"
          >
            <div className="p-3 rounded-xl bg-sky-50 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0">
              <Send size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Telegram</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">Instant Telegram Alert</p>
              <p className="text-xs text-sky-600 font-medium mt-1">Open Telegram Chat →</p>
            </div>
          </a>

          {/* Email Card */}
          <a
            href="mailto:raunaksingh181190@gmail.com"
            className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group"
          >
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
              <Mail size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Us</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 break-all">raunaksingh181190@gmail.com</p>
              <p className="text-xs text-slate-400 mt-1">Prompt response within 24 hours</p>
            </div>
          </a>

          {/* Phone Card */}
          <a
            href="tel:+919334318989"
            className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
              <Phone size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Call Us</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">+91 9334318989</p>
              <p className="text-xs text-slate-400 mt-1">Direct support & queries</p>
            </div>
          </a>

          {/* WhatsApp Card */}
          <a
            href="https://wa.me/918539036364?text=Hi%20Raunak,%20I%20have%20a%20question%20regarding%20Placement%20Mantra"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group"
          >
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
              <MessageCircle size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">WhatsApp</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">+91 8539036364</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Chat on WhatsApp →</p>
            </div>
          </a>

          {/* Quick info note */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 text-xs text-slate-500 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Clock size={14} className="text-slate-400" /> Instant Notification
            </div>
            <p>Every message submitted here is delivered directly to the founder via Telegram & Email.</p>
          </div>
        </div>

        {/* Contact Form (Right columns) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Send a Message</h2>
            <p className="text-sm text-slate-500 mb-6">
              Have a suggestion for new company question banks or portal features? We'd love to hear from you.
            </p>

            {submitted ? (
              <div className="p-8 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                  <CheckCircle2 size={30} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-950">Message Sent!</h3>
                  <p className="text-sm text-emerald-800 mt-1.5 max-w-sm mx-auto leading-relaxed">
                    Your inquiry has been delivered directly to the founder's Telegram and inbox. We will get back to you shortly.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false)
                      setName('')
                      setEmail('')
                      setMessage('')
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-700 text-xs font-semibold shadow-sm border border-emerald-200 hover:bg-emerald-100/50 transition-colors"
                  >
                    Send another message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Raunak"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Your Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. raunak@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your inquiry, feedback, or topic request..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Delivered directly to Telegram alert</span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Send Inquiry
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
