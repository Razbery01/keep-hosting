export type Package = 'starter' | 'professional' | 'enterprise'

export type OrderStatus =
  | 'pending'
  | 'building'
  | 'preview_ready'
  | 'paid'
  | 'deployed'
  | 'live'
  | 'cancelled'

export type BuildStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'pushing_github'
  | 'deploying_netlify'
  | 'linking_domain'
  | 'live'
  | 'failed'

export interface SocialLinks {
  facebook?: string
  instagram?: string
  twitter?: string
  linkedin?: string
  tiktok?: string
  youtube?: string
}

export interface OnboardingData {
  package: Package
  domainName: string
  businessName: string
  industry: string
  tagline: string
  description: string
  goals: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  primaryColor: string
  secondaryColor: string
  fontPreference: string
  aboutText: string
  servicesText: string
  socialLinks: SocialLinks
  logoFile: File | null
  heroFile: File | null
  galleryFiles: File[]
}

export interface DomainSearchResult {
  domain: string
  available: boolean
  premium: boolean
  price?: number
}
