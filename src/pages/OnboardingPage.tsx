import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Globe, CreditCard, Building2, Palette, FileText,
  CheckCircle2, ArrowRight, ArrowLeft, Loader2, Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { PACKAGES, INDUSTRIES, FONT_OPTIONS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useDomainSearch } from '../hooks/useDomainSearch'
import type { OnboardingData, Package as PackageType } from '../types'

const STEPS = [
  { label: 'Package', icon: Package },
  { label: 'Domain', icon: Globe },
  { label: 'Payment', icon: CreditCard },
  { label: 'Business Info', icon: Building2 },
  { label: 'Brand', icon: Palette },
  { label: 'Content', icon: FileText },
  { label: 'Review', icon: CheckCircle2 },
]

const initialData: OnboardingData = {
  package: 'professional',
  domainName: '',
  businessName: '',
  industry: '',
  tagline: '',
  description: '',
  goals: '',
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  primaryColor: '#1E3A5F',
  secondaryColor: '#00D4FF',
  fontPreference: 'Inter',
  aboutText: '',
  servicesText: '',
  socialLinks: {},
  logoFile: null,
  heroFile: null,
  galleryFiles: [],
}

export default function OnboardingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    ...initialData,
    package: (searchParams.get('package') as PackageType) || 'professional',
  })
  const { results: domainResults, loading: domainLoading, searchDomain } = useDomainSearch()

  function update(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function prev() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit() {
    if (!user) { toast.error('Please sign in first'); return }
    setSubmitting(true)

    try {
      const pkg = PACKAGES.find((p) => p.id === data.package)!
      // Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          package: data.package,
          status: 'payment_pending',
          amount_cents: pkg.price * 100,
          domain_name: data.domainName || null,
        })
        .select()
        .single()
      if (orderErr) throw orderErr

      // Create client site
      const { data: site, error: siteErr } = await supabase
        .from('client_sites')
        .insert({
          order_id: order.id,
          user_id: user.id,
          business_name: data.businessName,
          industry: data.industry,
          tagline: data.tagline,
          description: data.description,
          goals: data.goals,
          contact_email: data.contactEmail,
          contact_phone: data.contactPhone,
          contact_address: data.contactAddress,
          primary_color: data.primaryColor,
          secondary_color: data.secondaryColor,
          font_preference: data.fontPreference,
          about_text: data.aboutText,
          services_text: data.servicesText,
          social_links: data.socialLinks,
        })
        .select()
        .single()
      if (siteErr) throw siteErr

      // Upload files
      if (data.logoFile) {
        const path = `${user.id}/${site.id}/logo-${data.logoFile.name}`
        await supabase.storage.from('client-assets').upload(path, data.logoFile)
        await supabase.from('file_uploads').insert({
          site_id: site.id,
          user_id: user.id,
          file_type: 'logo',
          file_name: data.logoFile.name,
          file_path: path,
          file_size: data.logoFile.size,
          mime_type: data.logoFile.type,
        })
      }
      if (data.heroFile) {
        const path = `${user.id}/${site.id}/hero-${data.heroFile.name}`
        await supabase.storage.from('client-assets').upload(path, data.heroFile)
        await supabase.from('file_uploads').insert({
          site_id: site.id,
          user_id: user.id,
          file_type: 'hero_image',
          file_name: data.heroFile.name,
          file_path: path,
          file_size: data.heroFile.size,
          mime_type: data.heroFile.type,
        })
      }

      toast.success('Order submitted successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-10 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="flex items-center">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    i === step ? 'bg-accent text-white' : i < step ? 'bg-accent/10 text-accent' : 'text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-4 sm:w-8 h-px bg-gray-300 mx-1" />}
              </div>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8"
          >
            {/* Step 0: Package */}
            {step === 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Package</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PACKAGES.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => update({ package: pkg.id as PackageType })}
                      className={`text-left p-5 rounded-xl border-2 transition-all ${
                        data.package === pkg.id
                          ? 'border-accent bg-accent/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                      <p className="text-2xl font-bold text-gray-900 my-2">R{pkg.price.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{pkg.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Domain */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Domain Name</h2>
                <p className="text-gray-500 mb-6">Search for and register a domain, or skip if you already have one.</p>
                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={data.domainName}
                    onChange={(e) => update({ domainName: e.target.value })}
                    placeholder="mybusiness.co.za"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    onClick={() => data.domainName && searchDomain(data.domainName)}
                    disabled={domainLoading}
                    className="bg-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-accent-dark disabled:opacity-50"
                  >
                    {domainLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Check'}
                  </button>
                </div>
                {domainResults.map((r) => (
                  <div
                    key={r.domain}
                    onClick={() => r.available && update({ domainName: r.domain })}
                    className={`flex items-center justify-between p-4 rounded-lg border mb-2 cursor-pointer ${
                      r.available ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    } ${data.domainName === r.domain ? 'ring-2 ring-accent' : ''}`}
                  >
                    <span className="font-medium">{r.domain}</span>
                    <span className={`text-sm font-medium ${r.available ? 'text-green-600' : 'text-red-500'}`}>
                      {r.available ? 'Available' : 'Taken'}
                    </span>
                  </div>
                ))}
                <p className="text-sm text-gray-400 mt-4">Leave blank to skip domain registration for now.</p>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="text-center py-10">
                <CreditCard className="w-16 h-16 text-accent mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment</h2>
                <p className="text-gray-500 mb-4 max-w-md mx-auto">
                  Payment integration (PayFast / Yoco) coming soon. For now, proceed to complete your order
                  and we'll invoice you separately.
                </p>
                <div className="bg-accent/10 rounded-xl p-6 inline-block">
                  <span className="text-sm text-gray-500">Package total</span>
                  <div className="text-3xl font-bold text-gray-900 mt-1">
                    R{PACKAGES.find((p) => p.id === data.package)?.price.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Business Info */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                      <input type="text" required value={data.businessName} onChange={(e) => update({ businessName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Your Business Name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                      <select value={data.industry} onChange={(e) => update({ industry: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-white">
                        <option value="">Select industry</option>
                        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                    <input type="text" value={data.tagline} onChange={(e) => update({ tagline: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" placeholder="A short catchy phrase for your business" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Description *</label>
                    <textarea rows={3} value={data.description} onChange={(e) => update({ description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none" placeholder="What does your business do?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Goals for Your Website</label>
                    <textarea rows={2} value={data.goals} onChange={(e) => update({ goals: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none" placeholder="What do you want your website to achieve?" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input type="email" required value={data.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" placeholder="info@business.co.za" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input type="tel" value={data.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" placeholder="+27 XX XXX XXXX" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input type="text" value={data.contactAddress} onChange={(e) => update({ contactAddress: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Business address" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Brand */}
            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Brand & Design</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl hover:border-accent cursor-pointer transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">
                          {data.logoFile ? data.logoFile.name : 'Upload logo'}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => update({ logoFile: e.target.files?.[0] || null })} />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image</label>
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl hover:border-accent cursor-pointer transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">
                          {data.heroFile ? data.heroFile.name : 'Upload hero image'}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => update({ heroFile: e.target.files?.[0] || null })} />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={data.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })}
                          className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer" />
                        <input type="text" value={data.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })}
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={data.secondaryColor} onChange={(e) => update({ secondaryColor: e.target.value })}
                          className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer" />
                        <input type="text" value={data.secondaryColor} onChange={(e) => update({ secondaryColor: e.target.value })}
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Font</label>
                      <select value={data.fontPreference} onChange={(e) => update({ fontPreference: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-white">
                        {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Content */}
            {step === 5 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Content & Social</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">About Your Business</label>
                    <textarea rows={4} value={data.aboutText} onChange={(e) => update({ aboutText: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                      placeholder="Tell visitors about your business story, team, and what makes you unique..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Services / Products</label>
                    <textarea rows={3} value={data.servicesText} onChange={(e) => update({ servicesText: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                      placeholder="List your main services or products..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Social Media Links</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'] as const).map((platform) => (
                        <input
                          key={platform}
                          type="url"
                          placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                          value={(data.socialLinks as Record<string, string>)[platform] || ''}
                          onChange={(e) => update({ socialLinks: { ...data.socialLinks, [platform]: e.target.value } })}
                          className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {step === 6 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Submit</h2>
                <div className="space-y-4">
                  {[
                    ['Package', PACKAGES.find((p) => p.id === data.package)?.name],
                    ['Price', `R${PACKAGES.find((p) => p.id === data.package)?.price.toLocaleString()}`],
                    ['Domain', data.domainName || 'None selected'],
                    ['Business', data.businessName],
                    ['Industry', data.industry],
                    ['Tagline', data.tagline || '—'],
                    ['Email', data.contactEmail],
                    ['Phone', data.contactPhone || '—'],
                    ['Primary Color', data.primaryColor],
                    ['Font', data.fontPreference],
                    ['Logo', data.logoFile?.name || 'Not uploaded'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 text-sm">{label}</span>
                      <span className="text-gray-900 text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={prev}
                disabled={step === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={next}
                  className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Submit Order
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
