import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SITE_PHONE_DISPLAY, SITE_TEL_HREF, SITE_WHATSAPP_URL } from '../lib/constants'

export default function ContactPage() {
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)
    await new Promise((r) => setTimeout(r, 1000))
    setSending(false)
    toast.success('Message sent! We\'ll get back to you shortly.')
    ;(e.target as HTMLFormElement).reset()
  }

  return (
    <>
      <section className="relative overflow-hidden bg-dark pt-32 pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-dark" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.07] rounded-full blur-[200px] -translate-y-1/4 translate-x-1/4" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-12 bg-accent" />
              <span className="text-accent text-sm font-semibold uppercase tracking-wider">Contact</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl">
              Have a question or ready to get started? We'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-8 tracking-tight">Contact Info</h2>
              <div className="space-y-6">
                {[
                  { icon: <Mail className="w-5 h-5" />, label: 'Email', value: 'hello@keephosting.co.za', href: 'mailto:hello@keephosting.co.za' },
                  { icon: <Phone className="w-5 h-5" />, label: 'Phone', value: SITE_PHONE_DISPLAY, href: SITE_TEL_HREF },
                  { icon: <MapPin className="w-5 h-5" />, label: 'Location', value: 'Durban, South Africa' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4 group">
                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-accent shrink-0 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{item.label}</h4>
                      {'href' in item ? (
                        <p className="text-gray-500">
                          <a href={item.href} className="hover:text-accent transition-colors">
                            {item.value}
                          </a>
                          {item.label === 'Phone' && (
                            <a
                              href={SITE_WHATSAPP_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-accent font-medium mt-1 hover:underline"
                            >
                              Message on WhatsApp
                            </a>
                          )}
                        </p>
                      ) : (
                        <p className="text-gray-500">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="lg:col-span-3 bg-gray-50 rounded-2xl p-8 border border-gray-100 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                  <input type="text" required placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" required placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                <input type="text" required placeholder="What's this about?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                <textarea required rows={5} placeholder="Tell us how we can help..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all resize-none" />
              </div>
              <button type="submit" disabled={sending}
                className="inline-flex items-center gap-2 bg-accent text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50">
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Send Message
              </button>
            </motion.form>
          </div>
        </div>
      </section>
    </>
  )
}
