import { describe, it, expect } from 'vitest'
import { validateFile, buildStoragePath, MAX_FILE_SIZE_BYTES } from '../uploadValidation'

function makeFile(name: string, type: string, sizeBytes: number): File {
  // Create a Blob of the required size, then wrap in a File
  const blob = new Blob([new Uint8Array(sizeBytes)], { type })
  return new File([blob], name, { type })
}

describe('validateFile', () => {
  it('accepts a 1 MB JPEG', () => {
    expect(validateFile(makeFile('photo.jpg', 'image/jpeg', 1024 * 1024))).toBeNull()
  })
  it('accepts a PNG under 5 MB', () => {
    expect(validateFile(makeFile('photo.png', 'image/png', 4 * 1024 * 1024))).toBeNull()
  })
  it('accepts a WebP under 5 MB', () => {
    expect(validateFile(makeFile('photo.webp', 'image/webp', 100 * 1024))).toBeNull()
  })
  it('rejects a PDF', () => {
    expect(validateFile(makeFile('file.pdf', 'application/pdf', 1024))).toMatch(/Only JPEG, PNG, and WebP/)
  })
  it('rejects a plain text file', () => {
    expect(validateFile(makeFile('notes.txt', 'text/plain', 1024))).toMatch(/Only JPEG, PNG, and WebP/)
  })
  it('rejects an unknown MIME type', () => {
    expect(validateFile(makeFile('mystery', '', 1024))).toMatch(/Only JPEG, PNG, and WebP/)
  })
  it('rejects a JPEG over 5 MB', () => {
    expect(validateFile(makeFile('big.jpg', 'image/jpeg', MAX_FILE_SIZE_BYTES + 1))).toMatch(/under 5 MB/)
  })
})

describe('buildStoragePath', () => {
  const userId = 'user-123'
  const siteId = 'site-abc'

  it('produces a UUID-based filename for a well-named file', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024)
    const path = buildStoragePath(userId, siteId, file, { prefix: 'logo' })
    expect(path).toMatch(/^user-123\/site-abc\/logo-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/)
  })

  it('does not include the original filename anywhere in the path', () => {
    const file = makeFile('my-secret-document.jpg', 'image/jpeg', 1024)
    const path = buildStoragePath(userId, siteId, file, { prefix: 'logo' })
    expect(path).not.toContain('my-secret-document')
  })

  it('neutralizes path traversal attempts in the filename', () => {
    const file = makeFile('../../etc/passwd.png', 'image/png', 1024)
    const path = buildStoragePath(userId, siteId, file, { prefix: 'logo' })
    expect(path).not.toContain('..')
    expect(path).not.toContain('passwd')
    expect(path).toMatch(/\.png$/)
  })

  it('falls back to .bin extension for unknown file extensions', () => {
    const file = makeFile('logo.exe', 'image/jpeg', 1024) // caller forgot to validate first
    const path = buildStoragePath(userId, siteId, file, { prefix: 'logo' })
    expect(path).toMatch(/\.bin$/)
  })

  it('sanitizes the prefix argument', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024)
    const path = buildStoragePath(userId, siteId, file, { prefix: '../danger' })
    expect(path).not.toContain('..')
    expect(path).toMatch(/\/danger-/)
  })
})
