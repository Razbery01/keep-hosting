export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const SAFE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const

type AllowedMime = typeof ALLOWED_IMAGE_MIME_TYPES[number]

/**
 * Returns a user-friendly error string if the file is not acceptable, or null if OK.
 * Checks MIME type from File.type (defense-in-depth; the Supabase bucket is also configured).
 */
export function validateFile(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as AllowedMime)) {
    return `Only JPEG, PNG, and WebP images are allowed (got ${file.type || 'unknown'})`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `File must be under 5 MB (got ${mb} MB)`
  }
  return null
}

interface BuildPathOptions {
  /** short prefix for human-readable context, e.g. 'logo' or 'hero'. NOT security-sensitive. */
  prefix: string
}

/**
 * Build a storage path that CANNOT contain user-supplied filename content.
 * Uses crypto.randomUUID() + a safe extension whitelist.
 */
export function buildStoragePath(
  userId: string,
  siteId: string,
  file: File,
  { prefix }: BuildPathOptions
): string {
  const rawExt = (file.name.split('.').pop() ?? '').toLowerCase()
  const safeExt = (SAFE_EXTENSIONS as readonly string[]).includes(rawExt) ? rawExt : 'bin'
  const uuid = crypto.randomUUID()
  // Sanitize prefix too — no slashes or dots allowed
  const safePrefix = prefix.replace(/[^a-z0-9-]/gi, '')
  return `${userId}/${siteId}/${safePrefix}-${uuid}.${safeExt}`
}
