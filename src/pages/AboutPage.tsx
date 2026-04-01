import { motion } from 'framer-motion'
import { Zap, Heart, Users, TrendingUp } from 'lucide-react'

export default function AboutPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About Keep Hosting</h1>
            <p className="text-lg text-gray-300 max-w-2xl">
              We're on a mission to make professional web presence accessible to every South African business.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Keep Hosting was born from a simple observation: too many small businesses in South Africa
              are paying too much for basic web services, or going without a web presence entirely.
              We believe every business deserves a professional website, reliable hosting, and the tools
              to grow online — without breaking the bank.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              By leveraging modern development tools and cloud infrastructure, we've dramatically
              reduced the cost and time needed to deliver high-quality websites. What used to take weeks
              and cost tens of thousands now takes days at a fraction of the price.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: <Zap className="w-7 h-7" />, title: 'Speed', desc: 'We move fast and deliver results. Your time is valuable.' },
              { icon: <Heart className="w-7 h-7" />, title: 'Affordability', desc: 'Premium quality at marginal cost. No business left behind.' },
              { icon: <Users className="w-7 h-7" />, title: 'Partnership', desc: "We're not just a vendor — we're your digital growth partner." },
              { icon: <TrendingUp className="w-7 h-7" />, title: 'Growth', desc: 'Everything we build is designed to help your business grow.' },
            ].map((v) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
                  {v.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
