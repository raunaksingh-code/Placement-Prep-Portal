import { Mail, Phone, MessageCircle, MapPin, Send, Clock, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Open email client with prefilled details
    const subject = encodeURIComponent(`Placement Mantra Inquiry from ${name}`)
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)
    window.open(`mailto:raunaksingh181190@gmail.com?subject=${subject}&body=${body}`, '_blank')
    setSubmitted(true)
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
              <Clock size={14} className="text-slate-400" /> Availability
            </div>
            <p>Mon - Sat: 9:00 AM – 8:00 PM IST. Feel free to leave a WhatsApp message anytime.</p>
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
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <Sparkles size={22} />
                </div>
                <h3 className="text-lg font-bold text-emerald-900">Message Draft Prepared!</h3>
                <p className="text-sm text-emerald-700 max-w-sm mx-auto">
                  Your mail client has been opened with your inquiry. We will get back to you as soon as possible.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-xs font-semibold text-emerald-800 underline underline-offset-2"
                >
                  Send another message
                </button>
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
                      placeholder="e.g. Rahul Sharma"
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
                      placeholder="e.g. rahul@example.com"
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
                  <span className="text-xs text-slate-400">Directly delivered to founder inbox</span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm shadow-emerald-600/20 transition-all"
                  >
                    <Send size={16} /> Send Inquiry
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
