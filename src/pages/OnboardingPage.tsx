import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ArrowLeft, Loader2, Upload, CheckCircle2, Globe,
  Utensils, ShoppingBag, Briefcase, Heart, Home, HardHat,
  GraduationCap, Cpu, Sparkles, Car, HandHeart, MoreHorizontal,
  ImageIcon, X, Search, LogIn
} from 'lucide-react'
import { toast } from 'sonner'
import { PACKAGES, FONT_OPTIONS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { validateFile, buildStoragePath } from '../lib/uploadValidation'
import { useAuth } from '../hooks/useAuth'
import { useDomainSearch } from '../hooks/useDomainSearch'
import type { OnboardingData, Package as PackageType } from '../types'

const INDUSTRY_TILES = [
  { value: 'Restaurant / Food', label: 'Food & Drink', icon: Utensils },
  { value: 'Retail / E-commerce', label: 'Retail', icon: ShoppingBag },
  { value: 'Professional Services', label: 'Services', icon: Briefcase },
  { value: 'Healthcare', label: 'Healthcare', icon: Heart },
  { value: 'Real Estate', label: 'Real Estate', icon: Home },
  { value: 'Construction', label: 'Construction', icon: HardHat },
  { value: 'Education', label: 'Education', icon: GraduationCap },
  { value: 'Technology', label: 'Tech', icon: Cpu },
  { value: 'Beauty / Wellness', label: 'Beauty', icon: Sparkles },
  { value: 'Automotive', label: 'Automotive', icon: Car },
  { value: 'Non-profit', label: 'Non-profit', icon: HandHeart },
  { value: 'Other', label: 'Other', icon: MoreHorizontal },
]

const COLOR_PRESETS = [
  { name: 'Ocean', primary: '#1E3A5F', secondary: '#5f7389' },
  { name: 'Forest', primary: '#1B4332', secondary: '#3d6b5c' },
  { name: 'Sunset', primary: '#7C2D12', secondary: '#b45309' },
  { name: 'Navy', primary: '#0f172a', secondary: '#64748b' },
  { name: 'Slate', primary: '#1E293B', secondary: '#64748B' },
  { name: 'Wine', primary: '#4c0519', secondary: '#9f1239' },
]

const STEP_LABELS = ['Your Business', 'Your Style', 'Final Details']

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
  secondaryColor: '#5f7389',
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
  const { user, signUp, signIn } = useAuth()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    ...initialData,
    package: (searchParams.get('package') as PackageType) || 'professional',
    domainName: searchParams.get('domain') || '',
  })
  const { results: domainResults, loading: domainLoading, searchDomain } = useDomainSearch()

  const logoPreview = useMemo(
    () => (data.logoFile ? URL.createObjectURL(data.logoFile) : null),
    [data.logoFile],
  )
  const heroPreview = useMemo(
    () => (data.heroFile ? URL.createObjectURL(data.heroFile) : null),
    [data.heroFile],
  )

  function update(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  function next() { setStep((s) => Math.min(s + 1, 2)) }
  function prev() { setStep((s) => Math.max(s - 1, 0)) }

  const canProceed = step === 0
    ? !!(data.businessName && data.industry && data.contactEmail)
    : true

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    try {
      if (authMode === 'signup') {
        const { error } = await signUp(authEmail, authPassword, authName)
        if (error) throw error
        toast.success('Account created! Submitting your order...')
      } else {
        const { error } = await signIn(authEmail, authPassword)
        if (error) throw error
      }
      setShowAuth(false)
      await handleSubmit()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  function trySubmit() {
    if (!user) {
      setAuthEmail(data.contactEmail)
      setShowAuth(true)
      return
    }
    handleSubmit()
  }

  async function handleSubmit() {
    const currentUser = (await supabase.auth.getUser()).data.user
    if (!currentUser) { toast.error('Please sign in first'); return }
    setSubmitting(true)
    try {
      const pkg = PACKAGES.find((p) => p.id === data.package)!
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: currentUser.id,
          package: data.package,
          status: 'payment_pending',
          amount_cents: pkg.price * 100,
          domain_name: data.domainName || null,
        })
        .select()
        .single()
      if (orderErr) throw orderErr

      const { data: site, error: siteErr } = await supabase
        .from('client_sites')
        .insert({
          order_id: order.id,
          user_id: currentUser.id,
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

      // Validate files before any async upload (SEC-03)
      if (data.logoFile) {
        const err = validateFile(data.logoFile)
        if (err) { toast.error(err); return }
      }
      if (data.heroFile) {
        const err = validateFile(data.heroFile)
        if (err) { toast.error(err); return }
      }

      if (data.logoFile) {
        const path = buildStoragePath(currentUser.id, site.id, data.logoFile, { prefix: 'logo' })
        await supabase.storage.from('client-assets').upload(path, data.logoFile)
        await supabase.from('file_uploads').insert({
          site_id: site.id, user_id: currentUser.id, file_type: 'logo',
          file_name: data.logoFile.name, file_path: path,
          file_size: data.logoFile.size, mime_type: data.logoFile.type,
        })
      }
      if (data.heroFile) {
        const path = buildStoragePath(currentUser.id, site.id, data.heroFile, { prefix: 'hero' })
        await supabase.storage.from('client-assets').upload(path, data.heroFile)
        await supabase.from('file_uploads').insert({
          site_id: site.id, user_id: currentUser.id, file_type: 'hero_image',
          file_name: data.heroFile.name, file_path: path,
          file_size: data.heroFile.size, mime_type: data.heroFile.type,
        })
      }

      // Invoke create-payfast-order Edge Function to generate signed checkout params server-side
      // (passphrase must never be on the client — server generates the signature)
      const { data: payfast, error: pfErr } = await supabase.functions.invoke('create-payfast-order', {
        body: {
          orderId: order.id,
          siteId: site.id,
          packageId: data.package,
          userEmail: currentUser.email,
          userFirstName: data.businessName.split(' ')[0] || data.businessName,
          userLastName: data.businessName.split(' ').slice(1).join(' ') || 'Customer',
        },
      })
      if (pfErr) throw pfErr

      // Auto-submit hidden form to redirect browser to PayFast checkout
      // PayFast return_url brings the customer back to /dashboard after payment
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = payfast.payfast_url
      for (const [key, value] of Object.entries(payfast.params)) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value as string
        form.appendChild(input)
      }
      document.body.appendChild(form)
      form.submit()
      // Note: form.submit() redirects — no navigate('/dashboard') needed here
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const input = 'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all bg-white'

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-white py-8 md:py-12">
      <div className="max-w-5xl mx-auto px-4">

        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            {STEP_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`text-sm font-semibold transition-colors ${
                  i === step ? 'text-accent' : i < step ? 'text-primary cursor-pointer' : 'text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
              animate={{ width: `${((step + 1) / 3) * 100}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Form area — 3 columns */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8"
              >
                {/* ─── Step 1: Your Business ─── */}
                {step === 0 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Tell us about your business</h2>
                      <p className="text-gray-500 mt-1">Just the basics — we'll handle the rest.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name *</label>
                      <input type="text" value={data.businessName} onChange={(e) => update({ businessName: e.target.value })}
                        className={input} placeholder="e.g. Cape Town Bakery" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">What industry are you in? *</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {INDUSTRY_TILES.map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => update({ industry: value })}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                              data.industry === value
                                ? 'border-accent bg-accent/5 text-accent'
                                : 'border-gray-100 hover:border-gray-300 text-gray-600'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                        <input type="email" value={data.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })}
                          className={input} placeholder="info@mybusiness.co.za" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400">(optional)</span></label>
                        <input type="tel" value={data.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })}
                          className={input} placeholder="+27 XX XXX XXXX" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Describe your business in a sentence or two *</label>
                      <textarea rows={3} value={data.description} onChange={(e) => update({ description: e.target.value })}
                        className={`${input} resize-none`} placeholder="We bake artisan sourdough bread and pastries in the heart of Cape Town..." />
                    </div>
                  </div>
                )}

                {/* ─── Step 2: Your Style ─── */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Choose your style</h2>
                      <p className="text-gray-500 mt-1">Pick a package and set the look and feel.</p>
                    </div>

                    {/* Package cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {PACKAGES.map((pkg) => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => update({ package: pkg.id as PackageType })}
                          className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                            data.package === pkg.id
                              ? 'border-accent bg-accent/5 shadow-md shadow-accent/10'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {data.package === pkg.id && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2">
                              <CheckCircle2 className="w-6 h-6 text-accent" />
                            </motion.div>
                          )}
                          {pkg.highlighted && (
                            <span className="inline-block bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wide">Popular</span>
                          )}
                          <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                          <p className="text-xl font-extrabold text-gray-900 mt-1">R{pkg.price.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 mt-1">{pkg.description}</p>
                          <ul className="mt-3 space-y-1">
                            {pkg.features.slice(0, 3).map((f) => (
                              <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" /> {f}
                              </li>
                            ))}
                          </ul>
                        </button>
                      ))}
                    </div>

                    {/* Color palette presets */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Color palette</label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => update({ primaryColor: preset.primary, secondaryColor: preset.secondary })}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                              data.primaryColor === preset.primary && data.secondaryColor === preset.secondary
                                ? 'border-accent shadow-sm'
                                : 'border-gray-100 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex w-full h-8 rounded-lg overflow-hidden">
                              <div className="flex-1" style={{ backgroundColor: preset.primary }} />
                              <div className="flex-1" style={{ backgroundColor: preset.secondary }} />
                            </div>
                            <span className="text-[10px] font-medium text-gray-600">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2 flex-1">
                          <input type="color" value={data.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer shrink-0" />
                          <input type="text" value={data.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-accent/40" />
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <input type="color" value={data.secondaryColor} onChange={(e) => update({ secondaryColor: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer shrink-0" />
                          <input type="text" value={data.secondaryColor} onChange={(e) => update({ secondaryColor: e.target.value })}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-accent/40" />
                        </div>
                      </div>
                    </div>

                    {/* Font */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Font style</label>
                      <div className="grid grid-cols-4 gap-2">
                        {FONT_OPTIONS.map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => update({ fontPreference: f })}
                            className={`py-2.5 rounded-xl border-2 text-sm transition-all ${
                              data.fontPreference === f
                                ? 'border-accent bg-accent/5 font-semibold text-accent'
                                : 'border-gray-100 hover:border-gray-300 text-gray-700'
                            }`}
                            style={{ fontFamily: f }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* File uploads */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FileUploadBox
                        label="Logo"
                        hint="optional"
                        preview={logoPreview}
                        fileName={data.logoFile?.name}
                        onFile={(f) => update({ logoFile: f })}
                        onClear={() => update({ logoFile: null })}
                      />
                      <FileUploadBox
                        label="Hero Image"
                        hint="optional"
                        preview={heroPreview}
                        fileName={data.heroFile?.name}
                        onFile={(f) => update({ heroFile: f })}
                        onClear={() => update({ heroFile: null })}
                      />
                    </div>
                  </div>
                )}

                {/* ─── Step 3: Final Details ─── */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Final details</h2>
                      <p className="text-gray-500 mt-1">Everything here is optional — add what you can, we'll fill in the gaps.</p>
                    </div>

                    {/* Domain search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Domain name <span className="text-gray-400">(optional)</span></label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={data.domainName}
                            onChange={(e) => update({ domainName: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && data.domainName && searchDomain(data.domainName)}
                            placeholder="mybusiness.co.za"
                            className={`${input} pl-10`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => data.domainName && searchDomain(data.domainName)}
                          disabled={domainLoading || !data.domainName}
                          className="bg-accent text-white px-5 rounded-xl font-medium hover:bg-accent-dark disabled:opacity-40 transition-colors shrink-0"
                        >
                          {domainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                        </button>
                      </div>
                      <AnimatePresence>
                        {domainResults.length > 0 && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-1.5 overflow-hidden">
                            {domainResults.map((r) => (
                              <button
                                key={r.domain}
                                type="button"
                                onClick={() => r.available && update({ domainName: r.domain })}
                                disabled={!r.available}
                                className={`flex items-center justify-between w-full p-3 rounded-xl border text-sm transition-all ${
                                  r.available
                                    ? data.domainName === r.domain
                                      ? 'border-accent bg-accent/5'
                                      : 'border-green-200 bg-green-50 hover:border-green-300'
                                    : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                }`}
                              >
                                <span className="font-medium">{r.domain}</span>
                                <span className={r.available ? 'text-green-600 font-medium' : 'text-red-500'}>
                                  {r.available ? 'Available' : 'Taken'}
                                </span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Tagline <span className="text-gray-400">(optional)</span></label>
                      <input type="text" value={data.tagline} onChange={(e) => update({ tagline: e.target.value })}
                        className={input} placeholder="A short catchy phrase for your business" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Your services or products <span className="text-gray-400">(optional)</span></label>
                      <textarea rows={3} value={data.servicesText} onChange={(e) => update({ servicesText: e.target.value })}
                        className={`${input} resize-none`} placeholder="List what you offer — we'll feature them on your site..." />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Social media <span className="text-gray-400">(optional)</span></label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(['facebook', 'instagram', 'linkedin', 'tiktok'] as const).map((platform) => (
                          <input
                            key={platform}
                            type="url"
                            placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                            value={(data.socialLinks as Record<string, string>)[platform] || ''}
                            onChange={(e) => update({ socialLinks: { ...data.socialLinks, [platform]: e.target.value } })}
                            className={`${input} text-sm`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Submission note */}
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-sm text-gray-700">
                      <strong className="text-accent">No payment required.</strong> We'll build a free preview of your site. You only pay once you're happy with it.
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={prev}
                    disabled={step === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-0 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  {step < 2 ? (
                    <button
                      type="button"
                      onClick={next}
                      disabled={!canProceed}
                      className="flex items-center gap-2 bg-accent text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-all"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={trySubmit}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-accent text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-accent-dark disabled:opacity-50 transition-all"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Build My Preview
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Live preview — 2 columns */}
          <div className="lg:col-span-2 hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Live Preview</p>
              <LivePreview data={data} logoPreview={logoPreview} heroPreview={heroPreview} />
            </div>
          </div>
        </div>
      </div>

      {/* Inline auth overlay */}
      <AnimatePresence>
        {showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
            >
              <button type="button" onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <LogIn className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {authMode === 'signup' ? 'Create your free account' : 'Welcome back'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {authMode === 'signup'
                    ? 'Quick sign-up to save your details and receive your preview.'
                    : 'Sign in to submit your website request.'}
                </p>
              </div>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                )}
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-accent text-white py-3 rounded-xl font-bold hover:bg-accent-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {authMode === 'signup' ? 'Create Account & Submit' : 'Sign In & Submit'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                {authMode === 'signup' ? (
                  <>Already have an account? <button type="button" onClick={() => setAuthMode('login')} className="text-accent font-medium hover:underline">Sign in</button></>
                ) : (
                  <>Need an account? <button type="button" onClick={() => setAuthMode('signup')} className="text-accent font-medium hover:underline">Sign up</button></>
                )}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


function FileUploadBox({ label, hint, preview, fileName, onFile, onClear }: {
  label: string; hint?: string; preview: string | null; fileName?: string
  onFile: (f: File) => void; onClear: () => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {hint && <span className="text-gray-400">({hint})</span>}
      </label>
      {preview ? (
        <div className="relative h-32 rounded-xl border border-gray-200 overflow-hidden group">
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <button type="button" onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-2">
            <span className="text-xs text-white truncate block">{fileName}</span>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-xl hover:border-accent hover:bg-accent/5 cursor-pointer transition-all">
          <div className="flex flex-col items-center gap-1.5 text-gray-400">
            {label === 'Logo' ? <Upload className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
            <span className="text-xs font-medium">Click to upload</span>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}
    </div>
  )
}


function LivePreview({ data, logoPreview, heroPreview }: {
  data: OnboardingData; logoPreview: string | null; heroPreview: string | null
}) {
  const name = data.businessName || 'Your Business'
  const tagline = data.tagline || data.description?.slice(0, 60) || 'Your tagline here'

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary/70" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-white border border-gray-200 rounded-md px-3 py-1 text-[10px] text-gray-400 flex items-center gap-1.5 truncate">
            <Globe className="w-2.5 h-2.5 shrink-0" />
            {data.domainName || 'yourbusiness.co.za'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: data.primaryColor }}>
        <div className="flex items-center gap-2">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-5 h-5 rounded object-cover" />
          ) : (
            <div className="w-5 h-5 rounded" style={{ backgroundColor: data.secondaryColor, opacity: 0.6 }} />
          )}
          <span className="text-white text-[11px] font-bold truncate max-w-[100px]" style={{ fontFamily: data.fontPreference }}>
            {name}
          </span>
        </div>
        <div className="flex gap-3">
          {['Home', 'About', 'Contact'].map((l) => (
            <span key={l} className="text-white/60 text-[9px]">{l}</span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div
        className="relative px-4 py-8 flex flex-col items-center text-center"
        style={{
          background: heroPreview
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${heroPreview}) center/cover`
            : `linear-gradient(135deg, ${data.primaryColor}, ${data.secondaryColor})`,
        }}
      >
        <motion.h3
          key={name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-sm font-bold leading-tight"
          style={{ fontFamily: data.fontPreference }}
        >
          {name}
        </motion.h3>
        <p className="text-white/70 text-[10px] mt-1 max-w-[160px] leading-snug truncate">
          {tagline}
        </p>
        <div className="mt-3 px-3 py-1 rounded text-[9px] font-bold text-white" style={{ backgroundColor: data.secondaryColor }}>
          Get Started
        </div>
      </div>

      {/* Content blocks */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 rounded-lg p-2 bg-gray-50 border border-gray-100">
              <div className="w-full h-1.5 rounded-full mb-1.5" style={{ backgroundColor: data.secondaryColor, opacity: 0.3 }} />
              <div className="w-3/4 h-1 bg-gray-200 rounded-full" />
              <div className="w-1/2 h-1 bg-gray-200 rounded-full mt-1" />
            </div>
          ))}
        </div>
        <div className="h-1.5 w-1/3 rounded-full mx-auto" style={{ backgroundColor: data.primaryColor, opacity: 0.15 }} />
        <div className="space-y-1">
          <div className="h-1 bg-gray-100 rounded-full w-full" />
          <div className="h-1 bg-gray-100 rounded-full w-5/6" />
          <div className="h-1 bg-gray-100 rounded-full w-4/6" />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 text-center border-t border-gray-100" style={{ backgroundColor: data.primaryColor }}>
        <span className="text-white/40 text-[8px]">&copy; {new Date().getFullYear()} {name}</span>
      </div>
    </motion.div>
  )
}
