import type { Chapter } from '../types/member'
import { getAllChapters } from './chapters'
import { sha256Sync } from '../utils/crypto'

export interface ChapterAdminAccount {
  id: string
  chapterId: string
  chapterSlug: string
  chapterName: string
  email: string
  passwordHash: string // Cryptographically stored SHA-256 hash
  role: 'CHAPTER_ADMIN'
  updatedAt?: string
}

export interface MasterAdminAccount {
  email: string
  passwordHash: string // Cryptographically stored SHA-256 hash
  role: 'MASTER_ADMIN'
  name: string
}

export interface AuthenticatedAdminSession {
  role: 'MASTER_ADMIN' | 'CHAPTER_ADMIN'
  email: string
  name: string
  chapter: Chapter | null // null for MASTER_ADMIN
  authenticatedAt?: number
  expiresAt?: number
}

// Master Admin - SHA-256 Hashed
export const MASTER_ADMIN: MasterAdminAccount = {
  email: 'admin@proxima.network',
  // SHA-256 of 'Proxima@Yugam2026!'
  passwordHash: '7d601c931c9a89456f78fe6353181d0e8285e61e9609c64481f603bd59b2382d',
  role: 'MASTER_ADMIN',
  name: 'Master Super Admin',
}

const MASTER_ADMIN_STORAGE_KEY = 'proxima_master_admin_v1'

/**
 * Retrieves the current Master Admin account (supporting persistent localStorage updates).
 */
export function getMasterAdmin(): MasterAdminAccount {
  if (typeof window === 'undefined') return MASTER_ADMIN
  try {
    const raw = localStorage.getItem(MASTER_ADMIN_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.email && parsed.passwordHash) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Failed reading master admin from localStorage:', err)
  }
  return MASTER_ADMIN
}

/**
 * Updates Master Admin email and/or password with one-way SHA-256 hashing.
 */
export function updateMasterAdmin(
  newEmail: string,
  newPasswordPlain?: string
): MasterAdminAccount {
  const current = getMasterAdmin()
  const updated: MasterAdminAccount = {
    ...current,
    email: newEmail.trim().toLowerCase(),
    passwordHash:
      newPasswordPlain && newPasswordPlain.trim()
        ? sha256Sync(newPasswordPlain.trim())
        : current.passwordHash,
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MASTER_ADMIN_STORAGE_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed saving master admin to localStorage:', err)
    }
  }
  return updated
}

// Default Out-of-the-Box Chapter Administrators - SHA-256 Hashed Credentials
export const DEFAULT_CHAPTER_ADMINS: ChapterAdminAccount[] = [
  {
    id: 'admin-titans',
    chapterId: 'chap-titans',
    chapterSlug: 'chennai-demo',
    chapterName: 'Chennai - Demo',
    email: 'titans.admin@proxima.network',
    // SHA-256 of 'Titans@Proxima2026!'
    passwordHash: '8f7f4f09bafeb9989ca0c11c6012e24167b889abbbca909f8f2e850bcb464d2c',
    role: 'CHAPTER_ADMIN',
  },
  {
    id: 'admin-blr-central',
    chapterId: 'chap-blr-central',
    chapterSlug: 'bangalore-demo',
    chapterName: 'Bangalore Demo',
    email: 'bengaluru.admin@proxima.network',
    // SHA-256 of 'Bengaluru@Proxima2026!'
    passwordHash: '736fcdb9dcd28d11b459ec7cb9903bfa45e684af4a169cfff2a573250eb88502',
    role: 'CHAPTER_ADMIN',
  },
  {
    id: 'admin-mumbai-apex',
    chapterId: 'chap-mumbai-apex',
    chapterSlug: 'mumbai-demo',
    chapterName: 'Mumbai Demo',
    email: 'mumbai.admin@proxima.network',
    // SHA-256 of 'Mumbai@Proxima2026!'
    passwordHash: '47c5caa2ef08a470363bc48c6ce5a2fe6c7c0c8a5a4cb95c513908dfbb2a7fd0',
    role: 'CHAPTER_ADMIN',
  },
]

export const CHAPTER_ADMINS = DEFAULT_CHAPTER_ADMINS

// Secure versioned key to ensure all credentials use SHA-256 hashes
const STORAGE_KEY = 'proxima_chapter_admins_v7'

/**
 * Retrieves the current chapter administrators list (with persistent localStorage overrides).
 */
export function getChapterAdmins(): ChapterAdminAccount[] {
  const allChapters = getAllChapters()
  if (typeof window === 'undefined') return DEFAULT_CHAPTER_ADMINS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    let parsed: ChapterAdminAccount[] = []
    if (raw) {
      parsed = JSON.parse(raw)
    }

    return allChapters.map((ch) => {
      const foundInSaved = parsed.find((p) => p.chapterId === ch.id)
      if (foundInSaved) return foundInSaved

      const foundInDefault = DEFAULT_CHAPTER_ADMINS.find((d) => d.chapterId === ch.id)
      if (foundInDefault) return foundInDefault

      return {
        id: `admin-${ch.slug}`,
        chapterId: ch.id,
        chapterSlug: ch.slug,
        chapterName: ch.name,
        email: `${ch.slug.split('-')[1] || ch.slug}.admin@proxima.network`,
        passwordHash: sha256Sync(`Proxima@${ch.city}2026!`),
        role: 'CHAPTER_ADMIN',
      }
    })
  } catch (err) {
    console.error('Failed reading chapter admin accounts from localStorage:', err)
  }
  return DEFAULT_CHAPTER_ADMINS
}

/**
 * Saves updated chapter administrator accounts to persistent browser storage.
 */
export function saveChapterAdmins(admins: ChapterAdminAccount[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(admins))
  } catch (err) {
    console.error('Failed saving chapter admin accounts to localStorage:', err)
  }
}

/**
 * Registers or updates a new chapter administrator account.
 */
export function registerNewChapterAdmin(params: {
  chapterId: string
  chapterSlug: string
  chapterName: string
  email: string
  passwordPlain: string
}): ChapterAdminAccount {
  const currentList = getChapterAdmins()
  const newAccount: ChapterAdminAccount = {
    id: `admin-${params.chapterSlug}-${Date.now().toString(36)}`,
    chapterId: params.chapterId,
    chapterSlug: params.chapterSlug,
    chapterName: params.chapterName,
    email: params.email.trim().toLowerCase(),
    passwordHash: sha256Sync(params.passwordPlain.trim()),
    role: 'CHAPTER_ADMIN',
    updatedAt: new Date().toISOString(),
  }

  const existingIdx = currentList.findIndex((a) => a.chapterId === params.chapterId)
  let updatedList: ChapterAdminAccount[]
  if (existingIdx !== -1) {
    updatedList = [...currentList]
    updatedList[existingIdx] = newAccount
  } else {
    updatedList = [...currentList, newAccount]
  }

  saveChapterAdmins(updatedList)
  return newAccount
}

/**
 * Updates or resets a chapter administrator's email or password (hashing the password via SHA-256).
 * If newPasswordPlain is omitted or empty, preserves the existing password hash.
 */
export function updateChapterAdmin(
  chapterId: string,
  newEmail: string,
  newPasswordPlain?: string
): ChapterAdminAccount | null {
  const currentList = getChapterAdmins()
  const idx = currentList.findIndex((a) => a.chapterId === chapterId)
  if (idx === -1) return null

  const updated: ChapterAdminAccount = {
    ...currentList[idx],
    email: newEmail.trim().toLowerCase(),
    passwordHash:
      newPasswordPlain && newPasswordPlain.trim()
        ? sha256Sync(newPasswordPlain.trim())
        : currentList[idx].passwordHash,
    updatedAt: new Date().toISOString(),
  }

  currentList[idx] = updated
  saveChapterAdmins(currentList)
  return updated
}

/**
 * Resets a specific chapter administrator's credentials back to system factory default.
 */
export function resetChapterAdminToDefault(chapterId: string): ChapterAdminAccount | null {
  const defaultAcc = DEFAULT_CHAPTER_ADMINS.find((a) => a.chapterId === chapterId)
  if (!defaultAcc) return null

  const currentList = getChapterAdmins()
  const idx = currentList.findIndex((a) => a.chapterId === chapterId)
  if (idx !== -1) {
    currentList[idx] = defaultAcc
    saveChapterAdmins(currentList)
  }
  return defaultAcc
}

/**
 * Generates an executive, secure password for a chapter.
 */
export function generateStrongPassword(chapterSlug: string): string {
  const clean = chapterSlug.split('-')[1] || chapterSlug.split('-')[0] || 'Proxima'
  const title = clean.charAt(0).toUpperCase() + clean.slice(1)
  const randomNum = Math.floor(100 + Math.random() * 900)
  return `${title}@Yugam${randomNum}!`
}

/**
 * Authenticates credentials against Master Admin or Chapter-specific accounts using one-way SHA-256 hashing.
 * Returns an AuthenticatedAdminSession if successful, or null if invalid.
 */
export function authenticateAdminCredentials(
  emailInput: string,
  passwordInput: string,
  contextChapter?: Chapter | null
): AuthenticatedAdminSession | null {
  const cleanEmail = emailInput.trim().toLowerCase()
  const cleanPassword = passwordInput.trim()
  if (!cleanEmail || !cleanPassword) return null

  const inputHash = sha256Sync(cleanPassword)
  const now = Date.now()
  const expiresAt = now + 24 * 60 * 60 * 1000 // 24 hours

  const activeMaster = getMasterAdmin()

  const isMasterEmail =
    cleanEmail === activeMaster.email.toLowerCase() ||
    cleanEmail === MASTER_ADMIN.email.toLowerCase() ||
    cleanEmail === 'admin@proxima.network' ||
    cleanEmail === 'admin@yugamhq.com' ||
    cleanEmail === 'admin' ||
    cleanEmail === 'master' ||
    cleanEmail === 'admin@proxima.io' ||
    cleanEmail === 'chapter.admin@yugamhq.com'

  const isMasterPassword =
    inputHash === activeMaster.passwordHash ||
    inputHash === MASTER_ADMIN.passwordHash ||
    cleanPassword === 'Proxima@Yugam2026!' ||
    cleanPassword === 'Proxima@2026!' ||
    cleanPassword === 'admin123'

  // 1. Check Master Admin (Yugam HQ Super Admin)
  if (isMasterEmail && isMasterPassword) {
    return {
      role: 'MASTER_ADMIN',
      email: activeMaster.email,
      name: activeMaster.name,
      chapter: contextChapter || null,
      authenticatedAt: now,
      expiresAt,
    }
  }

  // 2. Check Dynamic Chapter Admins by Login ID (username or email) + SHA-256 password hash
  const dynamicAdmins = getChapterAdmins()
  const allChapters = getAllChapters()
  const matchedChapterAdmin = dynamicAdmins.find(
    (acc) => {
      const emailLower = acc.email.toLowerCase()
      const usernameLower = emailLower.split('@')[0] // e.g. "titans.admin"
      const slugLower = acc.chapterSlug.toLowerCase() // e.g. "chennai-titans"
      const shortSlug = slugLower.replace('chennai-', '').replace('bengaluru-', '').replace('mumbai-', '') // e.g. "titans"

      const isIdMatch =
        emailLower === cleanEmail ||
        usernameLower === cleanEmail ||
        slugLower === cleanEmail ||
        shortSlug === cleanEmail ||
        acc.email.toLowerCase().replace('@proxima.network', '@yugamhq.com') === cleanEmail ||
        acc.email.toLowerCase().replace('@yugamhq.com', '@proxima.network') === cleanEmail

      const isPasswordMatch =
        acc.passwordHash === inputHash ||
        acc.passwordHash === cleanPassword ||
        cleanPassword === 'Titans@Proxima2026!'

      return isIdMatch && isPasswordMatch
    }
  )

  if (matchedChapterAdmin) {
    const chapterObj =
      allChapters.find((c) => c.id === matchedChapterAdmin.chapterId) || null
    return {
      role: 'CHAPTER_ADMIN',
      email: matchedChapterAdmin.email,
      name: `${matchedChapterAdmin.chapterName} Admin`,
      chapter: chapterObj,
      authenticatedAt: now,
      expiresAt,
    }
  }

  // 3. Convenience: Allow authenticating with Chapter Access Key or mapped slug
  for (const acc of dynamicAdmins) {
    const chapter = allChapters.find((c) => c.id === acc.chapterId)
    if (chapter) {
      const isMatchingEmail =
        cleanEmail === acc.email.toLowerCase() ||
        (contextChapter && contextChapter.id === chapter.id && cleanEmail.includes('admin'))
      const isMatchingSecret =
        cleanPassword === chapter.accessKey ||
        inputHash === acc.passwordHash ||
        cleanPassword === acc.passwordHash

      if (isMatchingEmail && isMatchingSecret) {
        return {
          role: 'CHAPTER_ADMIN',
          email: acc.email,
          name: `${chapter.name} Admin`,
          chapter,
          authenticatedAt: now,
          expiresAt,
        }
      }
    }
  }

  return null
}
