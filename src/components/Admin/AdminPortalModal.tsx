import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Upload,
  CheckCircle2,
  MapPin,
  AlertCircle,
  LogOut,
  Lock,
  Building,
  RefreshCw,
  Copy,
  ExternalLink,
  Check,
  Eye,
  EyeOff,
  Key,
  Compass,
  Sparkles,
  Send,
  Save,
  Users,
  EyeIcon,
  EyeOffIcon,
  CreditCard,
  Camera,
  Receipt,
  User,
  ArrowRight,
  ArrowLeft,
  Gift,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import type { Member, Chapter } from '../../types/member'
import { MOCK_CATEGORIES } from '../../data/mockMembers'
import { securityEngine, type RateLimitStatus } from '../../services/securityEngine'
import {
  DEFAULT_CHAPTERS,
  getAllChapters,
  saveChapters,
  createNewChapter,
  getChapterShareUrl,
  getProductionChapterShareUrl,
  PRODUCTION_DOMAIN,
} from '../../data/chapters'
import {
  authenticateAdminCredentials,
  getChapterAdmins,
  registerNewChapterAdmin,
  updateChapterAdmin,
  getMasterAdmin,
  updateMasterAdmin,
  generateStrongPassword,
  type ChapterAdminAccount,
  type AuthenticatedAdminSession,
} from '../../data/adminAccounts'
import {
  getChapterMembers,
  saveChapterMembers,
  toggleMemberRenewalStatus,
} from '../../data/chapterMembers'
import {
  getChapterLicense,
  renewChapterLicense,
  grantComplimentaryLicense,
  launchRazorpaySubscriptionCheckout,
  RENEWAL_PLANS,
  type RenewalPlanKey,
  getActiveRazorpayKeyId,
  setCustomRazorpayKeyId,
  isSandboxKey,
} from '../../data/chapterLicensing'
import {
  loginWithServer,
  syncMembersToServer,
  fetchVipPasses,
  createVipPassLink,
  grantFreeLicenseOnServer,
  getRazorpayServerConfig,
  saveRazorpayServerConfig,
  onboardChapterWithServer,
  fetchMembersFromServer,
  updateMemberOnServer,
  fetchLicenseFromServer,
  fetchChaptersFromServer,
  verifyCurrentSessionOnServer,
  updateAdminUserOnServer,
} from '../../services/proximaApi'
import type { ChapterLicense } from '../../types/member'
import { searchLocation, CHENNAI_HUBS } from '../../utils/geocoding'
import { parseGoogleMapsLocation } from '../../utils/googleMapsParser'
import { BulkMemberImporterModal } from './BulkMemberImporterModal'
import { downloadRosterTemplate } from '../../utils/csvTemplate'

interface AdminPortalModalProps {
  isOpen: boolean
  onClose: () => void
  members: Member[]
  onUpdateMembers: (newMembers: Member[], targetChapterId?: string) => void
  onSelectChapter?: (accessKeyOrSlug: string) => void
  contextChapter?: Chapter | null
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  members: _propMembers,
  onUpdateMembers,
  onSelectChapter,
  contextChapter,
}) => {
  // Session State: Load strictly from temporary sessionStorage if authenticated and not expired
  const [adminSession, setAdminSession] = useState<AuthenticatedAdminSession | null>(() => {
    try {
      const saved = sessionStorage.getItem('proxima_admin_session')
      if (saved) {
        const parsed: AuthenticatedAdminSession = JSON.parse(saved)
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          sessionStorage.removeItem('proxima_admin_session')
          localStorage.removeItem('proxima_admin_session')
          return null
        }
        return parsed
      }
    } catch {
      // fallback
    }
    return null
  })

  // Dynamic Chapter List
  const [allChaptersList, setAllChaptersList] = useState<Chapter[]>(() => getAllChapters())

  // Dynamic Chapter Admin Accounts
  const [chapterAdminsList, setChapterAdminsList] = useState<ChapterAdminAccount[]>(() =>
    getChapterAdmins()
  )

  // Login inputs (Username / ID and Password)
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Enterprise Rate Limiting & Lockout Status (Proxima Sovereign Security)
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>(() =>
    securityEngine.getRateLimitStatus('global_admin')
  )

  // Anti-shoulder surfing: auto-mask password after 5 seconds of visibility
  useEffect(() => {
    if (showPassword) {
      const timer = setTimeout(() => setShowPassword(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showPassword])

  // Sync rate limit status when input changes
  useEffect(() => {
    const status = securityEngine.getRateLimitStatus(emailInput || 'global_admin')
    setRateLimitStatus(status)
  }, [emailInput])

  // Active lockout countdown timer (updates live every second)
  useEffect(() => {
    if (rateLimitStatus.remainingSeconds > 0) {
      const timer = setInterval(() => {
        setRateLimitStatus((prev) => {
          if (prev.remainingSeconds <= 1) {
            clearInterval(timer)
            return { isLocked: false, failedAttempts: 0, remainingSeconds: 0 }
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 }
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [rateLimitStatus.remainingSeconds])

  // Primary portal tabs:
  // For Master Super Admin: 'CHAPTERS' | 'LICENSES' | 'DEMO_SANDBOX'
  // For Chapter Administrator: 'MEMBERS' | 'DEMO_PROFILES' | 'PROFILE'
  const [activeTab, setActiveTab] = useState<
    'CHAPTERS' | 'LICENSES' | 'DEMO_SANDBOX' | 'MEMBERS' | 'DEMO_PROFILES' | 'PROFILE'
  >(() => {
    try {
      const saved = sessionStorage.getItem('proxima_admin_session')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.role === 'MASTER_ADMIN') return 'CHAPTERS'
      }
    } catch {}
    return 'MEMBERS'
  })
  const [memberFilter, setMemberFilter] = useState<'ALL' | 'RENEWED' | 'NOT_RENEWED' | 'MISSING_PHOTO'>('ALL')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [isBulkImporterOpen, setIsBulkImporterOpen] = useState(false)
  const memberFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Helper to distinguish demo chapters vs live created chapters
  const isDemoChapter = (ch: Chapter): boolean => {
    if (ch.id === 'chap-titans' || ch.id === 'chap-blr-central' || ch.id === 'chap-mumbai-apex') {
      return true
    }
    if (ch.organizationType === 'Executive Demo') {
      return true
    }
    const slug = (ch.slug || '').toLowerCase()
    const name = (ch.name || '').toLowerCase()
    return slug.endsWith('-demo') || slug.includes('demo') || name.includes('demo')
  }

  const liveCreatedChapters = React.useMemo(() => {
    return allChaptersList.filter((ch) => !isDemoChapter(ch))
  }, [allChaptersList])

  const demoChapters = React.useMemo(() => {
    return allChaptersList.filter((ch) => isDemoChapter(ch))
  }, [allChaptersList])

  // Top level chapter scope: 'LIVE' (Created Chapters by Forum) | 'DEMO' (Sandbox Demos)
  const [, setChapterWorkspaceMode] = useState<'LIVE' | 'DEMO'>(() => {
    if (contextChapter) {
      return isDemoChapter(contextChapter) ? 'DEMO' : 'LIVE'
    }
    const live = getAllChapters().filter((ch) => !isDemoChapter(ch))
    return live.length > 0 ? 'LIVE' : 'LIVE'
  })

  // Master Admin Selected Chapter Drilldown (null = showing All Chapters Directory; string = viewing that specific Chapter's Screen)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(() => {
    try {
      const saved = sessionStorage.getItem('proxima_admin_session')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.role === 'CHAPTER_ADMIN' && parsed.chapter) {
          return parsed.chapter.id
        }
      }
    } catch {}
    return null
  })

  // Master Admin Directory filter & search state
  const [directoryFilter, setDirectoryFilter] = useState<'ALL' | 'LIVE' | 'DEMO' | 'LICENSES'>('ALL')
  const [directorySearchQuery, setDirectorySearchQuery] = useState('')

  const setMasterAdminSelectedChapterId = (id: string | null) => setSelectedChapterId(id)

  // Determine Effective Chapter
  const effectiveChapter: Chapter = (() => {
    if (adminSession?.role === 'CHAPTER_ADMIN' && adminSession.chapter) {
      return adminSession.chapter
    }
    if (selectedChapterId) {
      const found = allChaptersList.find((c) => c.id === selectedChapterId)
      if (found) return found
    }
    return contextChapter || liveCreatedChapters[0] || allChaptersList[0] || DEFAULT_CHAPTERS[0]
  })()

  // Filtered Chapters for Master Admin Directory (Screen 1)
  const filteredDirectoryChapters = React.useMemo(() => {
    return allChaptersList.filter((ch) => {
      if (directoryFilter === 'LIVE' && isDemoChapter(ch)) return false
      if (directoryFilter === 'DEMO' && !isDemoChapter(ch)) return false
      if (directorySearchQuery.trim()) {
        const q = directorySearchQuery.toLowerCase()
        const matchName = (ch.name || '').toLowerCase().includes(q)
        const matchCity = (ch.city || '').toLowerCase().includes(q)
        const matchOrg = (ch.organizationType || '').toLowerCase().includes(q)
        return matchName || matchCity || matchOrg
      }
      return true
    })
  }, [allChaptersList, directoryFilter, directorySearchQuery])

  // Real Chapter Members (Loaded strictly from chapterMembers storage, zero illustration clutter)
  const [chapterMembers, setChapterMembers] = useState<Member[]>(() =>
    getChapterMembers(effectiveChapter.id)
  )

  // Reload chapter members whenever effectiveChapter changes
  useEffect(() => {
    const loaded = getChapterMembers(effectiveChapter.id)
    setChapterMembers(loaded)
  }, [effectiveChapter.id])

  // Split Real Chapter Members from System Demo Sandbox Profiles
  const realChapterMembers = React.useMemo(() => {
    return chapterMembers.filter((m) => !m.id.startsWith('demo-') && !m.id.startsWith('seed-'))
  }, [chapterMembers])

  const demoSandboxMembers = React.useMemo(() => {
    return chapterMembers.filter((m) => m.id.startsWith('demo-') || m.id.startsWith('seed-'))
  }, [chapterMembers])

  // Feedback notifications
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPacket, setCopiedPacket] = useState(false)
  const [copiedVipToken, setCopiedVipToken] = useState<string | null>(null)

  // Member Modal (Add or Edit)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [memberFormData, setMemberFormData] = useState({
    name: '',
    company: '',
    category: 'HVAC',
    categoryId: 'hvac',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    shortBio: '',
    referralRequirements: '',
    address: '',
    area: '',
    city: effectiveChapter.city,
    pincode: '600001',
    latitude: effectiveChapter.centerCoordinates[1],
    longitude: effectiveChapter.centerCoordinates[0],
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    isVisible: true,
  })
  const [showManualCoords, setShowManualCoords] = useState(false)
  const [isCalibratingPin, setIsCalibratingPin] = useState(false)
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategoryText, setCustomCategoryText] = useState('')
  const [googleMapsUrlInput, setGoogleMapsUrlInput] = useState('')
  const [isParsingMapsUrl, setIsParsingMapsUrl] = useState(false)
  const [mapsParseSuccess, setMapsParseSuccess] = useState<string | null>(null)
  const [mapsParseError, setMapsParseError] = useState<string | null>(null)

  // Chapter Profile Editing State
  const [profileName, setProfileName] = useState(effectiveChapter.name)
  const [profileCity, setProfileCity] = useState(effectiveChapter.city)
  const [profileRegion, setProfileRegion] = useState(effectiveChapter.region)
  const [profileOrgType, setProfileOrgType] = useState(effectiveChapter.organizationType || 'BNI')
  const [profileHub, setProfileHub] = useState('')
  const [isGeocodingHub, setIsGeocodingHub] = useState(false)

  // Chapter Credentials Editing State
  const currentAdminAcc = chapterAdminsList.find((a) => a.chapterId === effectiveChapter.id)
  const [profileAdminEmail, setProfileAdminEmail] = useState(
    currentAdminAcc?.email || `${effectiveChapter.slug}.admin@proxima.network`
  )
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  // Master Admin Credentials State
  const [masterAdminEmail, setMasterAdminEmail] = useState(() => getMasterAdmin().email)
  const [newMasterAdminPassword, setNewMasterAdminPassword] = useState('')
  const [showMasterAdminPassword, setShowMasterAdminPassword] = useState(false)

  // Sync profile form when chapter changes
  useEffect(() => {
    setProfileName(effectiveChapter.name)
    setProfileCity(effectiveChapter.city)
    setProfileRegion(effectiveChapter.region)
    setProfileOrgType(effectiveChapter.organizationType || 'BNI')
    const adminAcc = chapterAdminsList.find((a) => a.chapterId === effectiveChapter.id)
    setProfileAdminEmail(adminAcc?.email || `${effectiveChapter.slug}.admin@proxima.network`)
    setNewAdminPassword('')
  }, [effectiveChapter.id, chapterAdminsList])

  // Chapter Licensing & Razorpay Subscription State
  const [chapterLicense, setChapterLicense] = useState<ChapterLicense>(() =>
    getChapterLicense(effectiveChapter.id)
  )
  const [selectedPlanKey, setSelectedPlanKey] = useState<RenewalPlanKey>('SEMI_ANNUAL')
  const [customRazorpayKey, setCustomRazorpayKey] = useState<string>(() => getActiveRazorpayKeyId())
  const [customRazorpaySecret, setCustomRazorpaySecret] = useState<string>('')
  const [showKeyConfig, setShowKeyConfig] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null)

  // Sync Razorpay config from server on mount
  useEffect(() => {
    getRazorpayServerConfig().then((cfg) => {
      if (cfg?.keyId && !cfg.keyId.includes('ProximaDemo')) {
        setCustomRazorpayKey(cfg.keyId)
      }
    })
  }, [])

  // Verify session on modal open against backend authority
  useEffect(() => {
    if (isOpen && adminSession) {
      verifyCurrentSessionOnServer().then((isValid) => {
        if (!isValid) {
          handleLogout()
        }
      })
    }
  }, [isOpen])

  // Listen for real-time session revocation events across all API operations
  useEffect(() => {
    const onAuthExpired = () => {
      setAdminSession(null)
      sessionStorage.removeItem('proxima_admin_session')
      localStorage.removeItem('proxima_admin_session')
      sessionStorage.removeItem('proxima_active_token')
      setEmailInput('')
      setPasswordInput('')
      setSelectedChapterId(null)
      setActiveTab('MEMBERS')
      setAuthError('Your session has been revoked or expired. Please log in again.')
    }
    window.addEventListener('proxima:auth-expired', onAuthExpired)
    return () => window.removeEventListener('proxima:auth-expired', onAuthExpired)
  }, [])

  // Sync registered chapters from PostgreSQL server
  useEffect(() => {
    if (isOpen) {
      fetchChaptersFromServer().then((serverChapters) => {
        if (serverChapters && serverChapters.length > 0) {
          setAllChaptersList(serverChapters)
        }
      })
    }
  }, [isOpen])

  // Sync license and members state when chapter changes
  useEffect(() => {
    setChapterLicense(getChapterLicense(effectiveChapter.id))
    fetchLicenseFromServer(effectiveChapter.id).then((lic) => {
      if (lic) setChapterLicense(lic)
    })
    fetchMembersFromServer(effectiveChapter.id).then((serverMembers) => {
      if (serverMembers && serverMembers.length > 0) {
        setChapterMembers(serverMembers)
      }
    })
  }, [effectiveChapter.id])

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
  ]

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) {
      alert('Selected photo is larger than 8MB. Please choose a smaller photo.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 240
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width)
            width = MAX_SIZE
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height)
            height = MAX_SIZE
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.85)
        setMemberFormData((prev) => ({ ...prev, photoUrl: compressed }))
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handlePayRazorpaySubscription = async () => {
    setIsProcessingPayment(true)
    setPaymentFeedback(null)
    const plan = RENEWAL_PLANS[selectedPlanKey]
    try {
      await launchRazorpaySubscriptionCheckout({
        chapter: effectiveChapter,
        adminEmail: profileAdminEmail,
        planKey: selectedPlanKey,
        keyId: customRazorpayKey,
        onSuccess: (paymentId, _signature, completedPlanKey) => {
          const usedPlan = completedPlanKey || selectedPlanKey
          const renewed = renewChapterLicense(effectiveChapter.id, paymentId, usedPlan)
          setChapterLicense(renewed)
          setIsProcessingPayment(false)
          setPaymentFeedback(
            `Payment of ₹${plan.priceInr.toLocaleString('en-IN')} verified! ${plan.name} active until ${new Date(
              renewed.validUntil
            ).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}. (Ref: ${paymentId})`
          )
          setTimeout(() => setPaymentFeedback(null), 8000)
        },
        onFailure: (err) => {
          setIsProcessingPayment(false)
          alert(`Payment process could not be completed: ${err.message}`)
        },
        onDismiss: () => {
          setIsProcessingPayment(false)
        },
      })
    } catch (err) {
      setIsProcessingPayment(false)
      console.error('Payment launch error:', err)
    }
  }

  // Master Admin: Provision New Chapter Form State
  const [showProvisionModal, setShowProvisionModal] = useState(false)
  const [newChapterName, setNewChapterName] = useState('')
  const [newChapterCity, setNewChapterCity] = useState('Chennai')
  const [newChapterRegion, setNewChapterRegion] = useState('Tamil Nadu')
  const [newChapterOrgType, setNewChapterOrgType] = useState('BNI')
  const [newChapterHubAddress, setNewChapterHubAddress] = useState('')
  const [newChapterAdminEmail, setNewChapterAdminEmail] = useState('')
  const [newChapterAdminPassword, setNewChapterAdminPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isGeocodingNew, setIsGeocodingNew] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)
  const [provisionAsFreePrototype, setProvisionAsFreePrototype] = useState(true)

  // VIP Free Chapter Creation Links / Passes State
  const [vipPassesList, setVipPassesList] = useState<any[]>([])
  const [isGeneratingVipPass, setIsGeneratingVipPass] = useState(false)
  const [newPassLabel, setNewPassLabel] = useState('Team Credit / Working Prototype Pass')
  const [newPassMaxUses, setNewPassMaxUses] = useState(2)

  useEffect(() => {
    if (isOpen) {
      fetchVipPasses().then((passes) => {
        if (passes && passes.length > 0) {
          setVipPassesList(passes)
        }
      })
    }
  }, [isOpen])

  const handleGenerateVipPass = async () => {
    setIsGeneratingVipPass(true)
    const result = await createVipPassLink(newPassLabel, newPassMaxUses, 365)
    if (result && result.pass) {
      setVipPassesList((prev) => [result.pass, ...prev])
      setFeedbackMessage('Generated Free Chapter Onboarding Link!')
      setTimeout(() => setFeedbackMessage(null), 3500)
    }
    setIsGeneratingVipPass(false)
  }

  const handleGrantComplimentaryCredit = async () => {
    if (confirm(`Grant 1-Year Complimentary License (100% Team Credit / ₹0) to ${effectiveChapter.name}?`)) {
      const updated = grantComplimentaryLicense(effectiveChapter.id, 'Team Credit / Working Prototype', 365)
      await grantFreeLicenseOnServer(effectiveChapter.id, 'Team Credit / Working Prototype', 365)
      setChapterLicense(updated)
      setPaymentFeedback(`Granted 1-Year Complimentary License to ${effectiveChapter.name}!`)
      setTimeout(() => setPaymentFeedback(null), 5000)
    }
  }

  // Handle Login Authentication with Enterprise Security Engine
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const sanitizedId = securityEngine.sanitizeInput(emailInput)
    const sanitizedPass = securityEngine.sanitizeInput(passwordInput)

    if (!sanitizedId || !sanitizedPass) {
      setAuthError('Please enter both Login ID and Password.')
      return
    }

    // 1. Mandatory Rate-Limit Lockout Check
    const currentRate = securityEngine.getRateLimitStatus(sanitizedId)
    if (currentRate.isLocked) {
      setAuthError(`Security lockout active. Please wait ${currentRate.remainingSeconds}s before retrying.`)
      return
    }

    setIsAuthenticating(true)
    setAuthError(null)

    try {
      // 2. Anti-timing latency defense (prevents timing-attack username enumeration)
      await securityEngine.simulateTimingDefense()

      // 1. Attempt server-side authentication first
      let session: AuthenticatedAdminSession | null = null
      let serverHandled = false

      try {
        const serverResult = await loginWithServer(sanitizedId, sanitizedPass)
        if (serverResult !== null) {
          serverHandled = true
          if (serverResult.success && serverResult.session) {
            session = serverResult.session as AuthenticatedAdminSession
          } else {
            // Server actively rejected the login (401 or 429) -> strictly block entry!
            setAuthError(serverResult.error || 'Invalid credentials. Access denied.')
            securityEngine.recordFailedAttempt(sanitizedId)
            const updatedRate = securityEngine.getRateLimitStatus(sanitizedId)
            setRateLimitStatus(updatedRate)
            setIsAuthenticating(false)
            return
          }
        }
      } catch (srvErr) {
        console.warn('Server login unreachable, falling back to local auth:', srvErr)
      }

      // 2. Only if server was completely unreachable / offline, fall back to client authentication
      if (!serverHandled) {
        session = authenticateAdminCredentials(sanitizedId, sanitizedPass, contextChapter)
      }

      if (session) {
        setAdminSession(session)
        sessionStorage.setItem('proxima_admin_session', JSON.stringify(session))
        localStorage.removeItem('proxima_admin_session')
        setAuthError(null)
        securityEngine.resetFailedAttempts(sanitizedId)
        setRateLimitStatus({ isLocked: false, failedAttempts: 0, remainingSeconds: 0 })
        if (session.role === 'MASTER_ADMIN') {
          setActiveTab('CHAPTERS')
        } else {
          setActiveTab('MEMBERS')
        }

        // Log successful login in cryptographic audit ledger
        try {
          await securityEngine.logSecurityEvent(
            'Admin Authentication Success',
            session.email,
            `Role: ${session.role} | Chapter: ${session.chapter?.name || 'All'}`,
            'Success'
          )
        } catch {}

        if (session.role === 'CHAPTER_ADMIN' && session.chapter && onSelectChapter) {
          onSelectChapter(session.chapter.accessKey)
        }
        return
      }

      // 3. Record failed attempt and update lockout status
      const newRate = securityEngine.recordFailedAttempt(sanitizedId)
      setRateLimitStatus(newRate)

      if (newRate.isLocked) {
        setAuthError('Too many failed attempts. Security quarantine active for 15 minutes under Enterprise Security Policy.')
      } else {
        const remaining = 5 - newRate.failedAttempts
        setAuthError(`Invalid administrative credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`)
      }
    } catch (err) {
      console.error('Authentication error:', err)
      setAuthError('An unexpected authentication error occurred. Please try again.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleResetSecurityLockout = () => {
    securityEngine.resetFailedAttempts(emailInput || 'global_admin')
    setRateLimitStatus({ isLocked: false, failedAttempts: 0, remainingSeconds: 0 })
    setAuthError(null)
  }

  const handleLogout = () => {
    setAdminSession(null)
    sessionStorage.removeItem('proxima_admin_session')
    localStorage.removeItem('proxima_admin_session')
    sessionStorage.removeItem('proxima_active_token')
    setEmailInput('')
    setPasswordInput('')
    setSelectedChapterId(null)
    setActiveTab('MEMBERS')
    setAuthError(null)
  }

  // Switch session from Master Admin to specific Chapter Admin workspace
  const handleSwitchToChapterAdmin = (targetChapter: Chapter) => {
    const adminAcc = chapterAdminsList.find((a) => a.chapterId === targetChapter.id)
    const session: AuthenticatedAdminSession = {
      role: 'CHAPTER_ADMIN',
      email: adminAcc?.email || `${targetChapter.slug}.admin@proxima.network`,
      name: `${targetChapter.name} Administrator`,
      chapter: targetChapter,
      authenticatedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }
    setAdminSession(session)
    sessionStorage.setItem('proxima_admin_session', JSON.stringify(session))
    localStorage.removeItem('proxima_admin_session')
    setMasterAdminSelectedChapterId(targetChapter.id)
    setActiveTab('MEMBERS')
    setFeedbackMessage(`Switched into ${targetChapter.name} as Chapter Administrator`)
    setTimeout(() => setFeedbackMessage(null), 3500)
    if (onSelectChapter) {
      onSelectChapter(targetChapter.accessKey)
    }
  }

  // Toggle Member Renewal / Visibility Status
  const handleToggleMemberVisibility = (memberId: string) => {
    if (isMasterAdmin) {
      setFeedbackMessage('Member renewal status can only be toggled inside each chapter\'s own admin login.')
      setTimeout(() => setFeedbackMessage(null), 3500)
      return
    }
    const { updatedMembers, updatedMember } = toggleMemberRenewalStatus(effectiveChapter.id, memberId)
    setChapterMembers(updatedMembers)
    onUpdateMembers(updatedMembers, effectiveChapter.id)
    syncMembersToServer(effectiveChapter.id, updatedMembers)
    if (updatedMember) {
      const isNowVisible = updatedMember.isVisible !== false
      updateMemberOnServer(memberId, {
        isVisible: isNowVisible,
        membershipStatus: isNowVisible ? 'RENEWED' : 'NOT_RENEWED',
      })
      setFeedbackMessage(
        `${updatedMember.name} is now ${isNowVisible ? 'Visible on Map (Renewed)' : 'Hidden from Map (Not Renewed)'}`
      )
      setTimeout(() => setFeedbackMessage(null), 3500)
    }
  }

  // Delete Member
  const handleDeleteMember = (memberId: string, memberName: string) => {
    if (isMasterAdmin) {
      setFeedbackMessage('Member profile deletion is restricted to Chapter Administrator logins.')
      setTimeout(() => setFeedbackMessage(null), 3500)
      return
    }
    if (confirm(`Remove ${memberName} from ${effectiveChapter.name}?`)) {
      const updated = chapterMembers.filter((m) => m.id !== memberId)
      setChapterMembers(updated)
      saveChapterMembers(effectiveChapter.id, updated)
      onUpdateMembers(updated, effectiveChapter.id)
      syncMembersToServer(effectiveChapter.id, updated)
      setFeedbackMessage(`Removed ${memberName} from chapter records.`)
      setTimeout(() => setFeedbackMessage(null), 3000)
    }
  }

  // Save Member (Add or Edit)
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isMasterAdmin) {
      alert('Member records can only be created or modified inside each chapter\'s own admin login.')
      return
    }
    if (!memberFormData.name.trim() || !memberFormData.company.trim()) {
      alert('Member name and company are required.')
      return
    }

    let lat = memberFormData.latitude
    let lng = memberFormData.longitude

    // Auto-resolve coordinates if coordinates match chapter center or are not yet customized
    const isAtChapterCenter =
      Math.abs(lat - effectiveChapter.centerCoordinates[1]) < 0.0001 &&
      Math.abs(lng - effectiveChapter.centerCoordinates[0]) < 0.0001

    if (isAtChapterCenter && (memberFormData.area || memberFormData.address)) {
      const queryArea = (memberFormData.area || '').toLowerCase().trim()
      const queryAddr = (memberFormData.address || '').toLowerCase().trim()

      const matchedHub = CHENNAI_HUBS.find(
        (h) =>
          (queryArea && h.areaName.toLowerCase().includes(queryArea)) ||
          (queryArea && queryArea.includes(h.areaName.toLowerCase())) ||
          (queryAddr && h.displayName.toLowerCase().includes(queryAddr))
      )

      if (matchedHub) {
        const jitterLat = (Math.random() - 0.5) * 0.003
        const jitterLng = (Math.random() - 0.5) * 0.003
        lat = matchedHub.latitude + jitterLat
        lng = matchedHub.longitude + jitterLng
      } else {
        try {
          const results = await searchLocation(`${memberFormData.area || ''} ${memberFormData.address || ''}`)
          if (results.length > 0) {
            const jitterLat = (Math.random() - 0.5) * 0.003
            const jitterLng = (Math.random() - 0.5) * 0.003
            lat = results[0].latitude + jitterLat
            lng = results[0].longitude + jitterLng
          }
        } catch {
          // fallback retains current center
        }
      }
    }

    let updated: Member[]
    if (editingMemberId) {
      updated = chapterMembers.map((m) => {
        if (m.id === editingMemberId) {
          return {
            ...m,
            ...memberFormData,
            location: {
              ...m.location,
              address: memberFormData.address || 'Commercial Hub',
              area: memberFormData.area || effectiveChapter.city,
              city: memberFormData.city || effectiveChapter.city,
              pincode: memberFormData.pincode,
              latitude: lat,
              longitude: lng,
            },
          }
        }
        return m
      })
      setFeedbackMessage(`Updated ${memberFormData.name} successfully!`)
    } else {
      const newMem: Member = {
        id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: memberFormData.name.trim(),
        company: memberFormData.company.trim(),
        category: memberFormData.category,
        categoryId: memberFormData.categoryId,
        categoryIcon: 'Building',
        shortBio: memberFormData.shortBio || `${memberFormData.category} specialist at ${memberFormData.company}`,
        phone: memberFormData.phone,
        whatsapp: memberFormData.whatsapp || memberFormData.phone,
        email: memberFormData.email,
        website: memberFormData.website,
        photoUrl: memberFormData.photoUrl,
        chapter: effectiveChapter.name,
        chapterId: effectiveChapter.id,
        chapterAccessKey: effectiveChapter.accessKey,
        oneToOneAvailability: 'AVAILABLE',
        referralRequirements: 'Looking for B2B cross-referrals and strategic partners',
        tags: [memberFormData.category, effectiveChapter.city],
        isVisible: memberFormData.isVisible,
        membershipStatus: memberFormData.isVisible ? 'RENEWED' : 'NOT_RENEWED',
        location: {
          address: memberFormData.address || 'Commercial Hub',
          area: memberFormData.area || effectiveChapter.city,
          city: memberFormData.city || effectiveChapter.city,
          pincode: memberFormData.pincode,
          latitude: lat,
          longitude: lng,
          locationStatus: 'VERIFIED',
          verifiedAt: new Date().toISOString(),
        },
      }
      updated = [newMem, ...chapterMembers]
      setFeedbackMessage(`Added ${newMem.name} to ${effectiveChapter.name}!`)
    }

    setChapterMembers(updated)
    saveChapterMembers(effectiveChapter.id, updated)
    onUpdateMembers(updated)
    syncMembersToServer(effectiveChapter.id, updated)
    setIsMemberModalOpen(false)
    setEditingMemberId(null)
    setTimeout(() => setFeedbackMessage(null), 3500)
  }

  // Calibrate map pin from typed address / area
  const handleCalibratePin = async () => {
    if (!memberFormData.area.trim() && !memberFormData.address.trim()) {
      alert('Please enter an area or address first to detect map pin coordinates.')
      return
    }
    setIsCalibratingPin(true)
    const query = `${memberFormData.area} ${memberFormData.address}`.trim()
    const matched = CHENNAI_HUBS.find(
      (h) =>
        query.toLowerCase().includes(h.areaName.toLowerCase()) ||
        h.areaName.toLowerCase().includes(memberFormData.area.toLowerCase())
    )
    if (matched) {
      setMemberFormData((prev) => ({
        ...prev,
        latitude: matched.latitude + (Math.random() - 0.5) * 0.002,
        longitude: matched.longitude + (Math.random() - 0.5) * 0.002,
      }))
      setIsCalibratingPin(false)
      setFeedbackMessage(`Calibrated map pin to ${matched.areaName}`)
      setTimeout(() => setFeedbackMessage(null), 3000)
      return
    }

    try {
      const results = await searchLocation(query)
      if (results && results.length > 0) {
        setMemberFormData((prev) => ({
          ...prev,
          latitude: results[0].latitude + (Math.random() - 0.5) * 0.002,
          longitude: results[0].longitude + (Math.random() - 0.5) * 0.002,
        }))
        setFeedbackMessage(`Located coordinates for ${results[0].areaName || query}`)
      } else {
        alert('Could not find specific GPS coordinates for this address. You can tap one of the business hubs below or enter coordinates manually.')
      }
    } catch {
      alert('Address lookup service unavailable. Please select a business hub or enter coordinates manually.')
    } finally {
      setIsCalibratingPin(false)
      setTimeout(() => setFeedbackMessage(null), 3000)
    }
  }

  // Read Google Maps Link & Auto-Pin Coordinates
  const handleReadGoogleMapsUrl = async (inputUrl?: string) => {
    const target = (inputUrl !== undefined ? inputUrl : googleMapsUrlInput).trim()
    if (!target) {
      setMapsParseError('Please paste a Google Maps location link or coordinates.')
      setTimeout(() => setMapsParseError(null), 4000)
      return
    }

    setIsParsingMapsUrl(true)
    setMapsParseError(null)
    setMapsParseSuccess(null)

    try {
      const result = await parseGoogleMapsLocation(target)
      if (result) {
        setMemberFormData((prev) => ({
          ...prev,
          latitude: result.latitude,
          longitude: result.longitude,
          area: result.suggestedArea || prev.area || '',
          city: result.suggestedCity || prev.city || effectiveChapter.city,
          address: prev.address.trim() ? prev.address : (result.extractedName || prev.address),
        }))
        setMapsParseSuccess(`Pinned: [${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}] • ${result.sourceDescription}`)
        setFeedbackMessage(`Coordinates pinned from Google Maps link!`)
        setTimeout(() => {
          setMapsParseSuccess(null)
          setFeedbackMessage(null)
        }, 5000)
      } else {
        setMapsParseError('Could not detect coordinates from this URL. If using a short link, open it in your browser and paste the full URL from the address bar, or enter the address directly.')
        setTimeout(() => setMapsParseError(null), 6000)
      }
    } catch {
      setMapsParseError('Failed to read Google Maps link. Please verify the URL.')
      setTimeout(() => setMapsParseError(null), 4000)
    } finally {
      setIsParsingMapsUrl(false)
    }
  }

  // Open Edit Member Modal
  const handleOpenEditMember = (mem: Member) => {
    if (isMasterAdmin) {
      setFeedbackMessage('Member profile edits are strictly restricted to Chapter Administrator logins.')
      setTimeout(() => setFeedbackMessage(null), 3500)
      return
    }
    setEditingMemberId(mem.id)
    const knownCat = MOCK_CATEGORIES.some((c) => c.name === mem.category)
    setIsCustomCategory(!knownCat)
    if (!knownCat) {
      setCustomCategoryText(mem.category || '')
    }
    setGoogleMapsUrlInput('')
    setMapsParseSuccess(null)
    setMapsParseError(null)
    setMemberFormData({
      name: mem.name,
      company: mem.company,
      category: mem.category || 'HVAC',
      categoryId: mem.categoryId || 'hvac',
      phone: mem.phone || '',
      whatsapp: mem.whatsapp || '',
      email: mem.email || '',
      website: mem.website || '',
      shortBio: mem.shortBio || '',
      referralRequirements: mem.referralRequirements || '',
      address: mem.location.address || '',
      area: mem.location.area || '',
      city: mem.location.city || effectiveChapter.city,
      pincode: mem.location.pincode || '',
      latitude: mem.location.latitude,
      longitude: mem.location.longitude,
      photoUrl: mem.photoUrl || '',
      isVisible: mem.isVisible !== false,
    })
    setShowManualCoords(false)
    setIsMemberModalOpen(true)
  }

  // Open Add Member Modal
  const handleOpenAddMember = () => {
    if (isMasterAdmin) {
      setFeedbackMessage('Member profile additions are strictly restricted to Chapter Administrator logins.')
      setTimeout(() => setFeedbackMessage(null), 3500)
      return
    }
    setEditingMemberId(null)
    setIsCustomCategory(false)
    setCustomCategoryText('')
    setShowManualCoords(false)
    setGoogleMapsUrlInput('')
    setMapsParseSuccess(null)
    setMapsParseError(null)
    setMemberFormData({
      name: '',
      company: '',
      category: 'HVAC',
      categoryId: 'hvac',
      phone: '',
      whatsapp: '',
      email: '',
      website: '',
      shortBio: '',
      referralRequirements: '',
      address: '',
      area: '',
      city: effectiveChapter.city,
      pincode: '',
      latitude: effectiveChapter.centerCoordinates[1],
      longitude: effectiveChapter.centerCoordinates[0],
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      isVisible: true,
    })
    setIsMemberModalOpen(true)
  }

  // Handle batch spreadsheet import complete
  const handleSpreadsheetImportComplete = (newMembers: Member[]) => {
    const updated = [...newMembers, ...chapterMembers]
    setChapterMembers(updated)
    saveChapterMembers(effectiveChapter.id, updated)
    onUpdateMembers(updated, effectiveChapter.id)
    syncMembersToServer(effectiveChapter.id, updated)
    setFeedbackMessage(`Successfully imported ${newMembers.length} members from spreadsheet into ${effectiveChapter.name}!`)
    setTimeout(() => setFeedbackMessage(null), 4500)
  }

  // Fast Member Photo Upload Handler (President Photo Studio)
  const handleFastMemberPhotoUpload = (memberId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 250
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.85)

        const updated = chapterMembers.map((m) =>
          m.id === memberId ? { ...m, photoUrl: compressed } : m
        )
        setChapterMembers(updated)
        saveChapterMembers(effectiveChapter.id, updated)
        onUpdateMembers(updated, effectiveChapter.id)
        syncMembersToServer(effectiveChapter.id, updated)

        const mem = chapterMembers.find((m) => m.id === memberId)
        setFeedbackMessage(`Photo updated for ${mem?.name || 'member'}!`)
        setTimeout(() => setFeedbackMessage(null), 3500)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Save Chapter Profile Changes
  const handleSaveChapterProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    let coords = effectiveChapter.centerCoordinates
    if (profileHub.trim()) {
      setIsGeocodingHub(true)
      const geo = await searchLocation(`${profileHub.trim()}, ${profileCity}`)
      setIsGeocodingHub(false)
      if (geo && geo.length > 0) {
        coords = [geo[0].longitude, geo[0].latitude]
      }
    }

    const updatedChapter: Chapter = {
      ...effectiveChapter,
      name: profileName.trim(),
      city: profileCity.trim(),
      region: profileRegion.trim(),
      organizationType: profileOrgType.trim(),
      centerCoordinates: coords,
    }

    const all = allChaptersList.map((c) => (c.id === updatedChapter.id ? updatedChapter : c))
    setAllChaptersList(all)
    saveChapters(all)

    setFeedbackMessage(`Updated Chapter Profile for ${updatedChapter.name}!`)
    setTimeout(() => setFeedbackMessage(null), 3500)
  }

  // Save Chapter Admin Credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileAdminEmail.trim()) {
      alert('Email cannot be empty.')
      return
    }

    const newPass = newAdminPassword.trim()
    const updatedAdmin = updateChapterAdmin(
      effectiveChapter.id,
      profileAdminEmail.trim(),
      newPass ? newPass : undefined
    )
    if (updatedAdmin) {
      setChapterAdminsList(getChapterAdmins())
      setNewAdminPassword('')

      // Sync to PostgreSQL backend
      try {
        await updateAdminUserOnServer(updatedAdmin.id || `admin-${effectiveChapter.id}`, {
          email: profileAdminEmail.trim(),
          password: newPass ? newPass : undefined,
        })
      } catch (err) {
        console.warn('Failed syncing chapter admin credentials to server:', err)
      }

      setFeedbackMessage(
        newPass
          ? `Credentials for ${effectiveChapter.name} updated & hashed in PostgreSQL!`
          : `Admin email for ${effectiveChapter.name} updated successfully!`
      )
      setTimeout(() => setFeedbackMessage(null), 3500)
    }
  }

  // Save Master Super Admin Credentials
  const handleSaveMasterCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!masterAdminEmail.trim()) {
      alert('Master admin email cannot be empty.')
      return
    }

    const newPass = newMasterAdminPassword.trim()
    const updated = updateMasterAdmin(
      masterAdminEmail.trim(),
      newPass ? newPass : undefined
    )
    setNewMasterAdminPassword('')

    // Sync to PostgreSQL backend via PATCH /api/users/admin-master
    try {
      await updateAdminUserOnServer('admin-master', {
        email: masterAdminEmail.trim(),
        password: newPass ? newPass : undefined,
      })
    } catch (err) {
      console.warn('Failed syncing master admin credentials to server:', err)
    }

    if (adminSession?.role === 'MASTER_ADMIN') {
      const updatedSession: AuthenticatedAdminSession = {
        ...adminSession,
        email: updated.email,
      }
      setAdminSession(updatedSession)
      sessionStorage.setItem('proxima_admin_session', JSON.stringify(updatedSession))
      localStorage.removeItem('proxima_admin_session')
    }

    setFeedbackMessage(
      newPass
        ? 'Master Super Admin credentials updated & hashed in PostgreSQL!'
        : 'Master Super Admin email updated successfully!'
    )
    setTimeout(() => setFeedbackMessage(null), 3500)
  }

  // Master Admin: Provision New Chapter Profile
  const handleProvisionNewChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    setProvisionError(null)

    if (!newChapterName.trim() || !newChapterCity.trim()) {
      setProvisionError('Chapter Name and City are required.')
      return
    }

    const cleanName = newChapterName.trim()
    const cleanCity = newChapterCity.trim()
    const cleanRegion = newChapterRegion.trim() || 'Tamil Nadu'
    const cleanEmail =
      newChapterAdminEmail.trim() ||
      `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}.admin@proxima.network`
    const cleanPassword =
      newChapterAdminPassword.trim() || generateStrongPassword(cleanName)

    let coords: [number, number] = [80.2155, 13.0878]
    setIsGeocodingNew(true)
    try {
      if (newChapterHubAddress.trim()) {
        const geo = await searchLocation(`${newChapterHubAddress.trim()}, ${cleanCity}`)
        if (geo && geo.length > 0) coords = [geo[0].longitude, geo[0].latitude]
      } else {
        const geoCity = await searchLocation(`${cleanCity}, ${cleanRegion}`)
        if (geoCity && geoCity.length > 0) coords = [geoCity[0].longitude, geoCity[0].latitude]
      }
    } catch {
      // fallback
    } finally {
      setIsGeocodingNew(false)
    }

    const newCh = createNewChapter({
      name: cleanName,
      city: cleanCity,
      region: cleanRegion,
      organizationType: newChapterOrgType,
      centerCoordinates: coords,
      defaultZoom: 12.5,
    })

    registerNewChapterAdmin({
      chapterId: newCh.id,
      chapterSlug: newCh.slug,
      chapterName: newCh.name,
      email: cleanEmail,
      passwordPlain: cleanPassword,
    })

    // Authoritative Server Provisioning
    try {
      await onboardChapterWithServer({
        chapterName: cleanName,
        city: cleanCity,
        adminLoginId: cleanEmail.split('@')[0],
        adminPassword: cleanPassword,
        organizationType: newChapterOrgType,
        planKey: 'ANNUAL',
        vipToken: 'free_pass_master_provision',
      })
    } catch {
      // Offline fallback maintained
    }

    if (provisionAsFreePrototype) {
      grantComplimentaryLicense(newCh.id, 'Team Credit / Working Prototype', 365)
      grantFreeLicenseOnServer(newCh.id, 'Team Credit / Working Prototype', 365)
    }

    const updatedList = getAllChapters()
    setAllChaptersList(updatedList)
    setChapterAdminsList(getChapterAdmins())
    setChapterWorkspaceMode('LIVE')
    setMasterAdminSelectedChapterId(newCh.id)
    setShowProvisionModal(false)
    setFeedbackMessage(`Created new chapter: ${newCh.name}!`)
    setTimeout(() => setFeedbackMessage(null), 4000)
  }

  // Copy Full Invitation Packet
  const handleCopyPacket = () => {
    const isProd = typeof window !== 'undefined' && window.location.hostname === PRODUCTION_DOMAIN
    const baseUrl = isProd ? `https://${PRODUCTION_DOMAIN}` : window.location.origin
    const loginUrl = `${baseUrl}/?login=portal`
    const memberMapUrl = getChapterShareUrl(effectiveChapter.accessKey)

    const packet = `PROXIMA by Yugam — ${effectiveChapter.name} Access
════════════════════════════════════════════════
Chapter: ${effectiveChapter.name} (${effectiveChapter.city})

Chapter Portal Login:
${loginUrl}

Login ID:
${profileAdminEmail}

Member Map Link (Share with Members):
${memberMapUrl}
════════════════════════════════════════════════
Note: Inactive members are automatically hidden from the map.`

    navigator.clipboard.writeText(packet)
    setCopiedPacket(true)
    setTimeout(() => setCopiedPacket(false), 2500)
  }

  // Open Live Chapter Map
  const handleOpenLiveMap = () => {
    if (onSelectChapter) {
      onSelectChapter(effectiveChapter.accessKey)
      onClose()
    } else {
      window.location.search = `?c=${effectiveChapter.accessKey}`
    }
  }

  const isMasterAdmin = adminSession?.role === 'MASTER_ADMIN'
  const shareableMapUrl = getChapterShareUrl(effectiveChapter.accessKey)
  const productionMapUrl = getProductionChapterShareUrl(effectiveChapter.accessKey)

  // Photo studio completion metrics (strictly on real chapter members)
  const membersWithPhotosCount = realChapterMembers.filter(
    (m) => m.photoUrl && !m.photoUrl.includes('unsplash.com') && m.photoUrl.trim() !== ''
  ).length
  const photoProgressPercent = realChapterMembers.length > 0 
    ? Math.round((membersWithPhotosCount / realChapterMembers.length) * 100) 
    : 0
  const missingPhotosCount = realChapterMembers.length - membersWithPhotosCount

  // Filtered Real Members list (Strictly excludes dummy demo profiles)
  const filteredRealMembers = realChapterMembers.filter((m) => {
    if (memberFilter === 'RENEWED' && m.isVisible === false) return false
    if (memberFilter === 'NOT_RENEWED' && m.isVisible !== false) return false
    if (memberFilter === 'MISSING_PHOTO') {
      const hasCustomPhoto = m.photoUrl && !m.photoUrl.includes('unsplash.com') && m.photoUrl.trim() !== ''
      if (hasCustomPhoto) return false
    }
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase()
      const matchName = m.name.toLowerCase().includes(q)
      const matchCompany = m.company.toLowerCase().includes(q)
      const matchCategory = m.category.toLowerCase().includes(q)
      const matchArea = m.location.area.toLowerCase().includes(q)
      return matchName || matchCompany || matchCategory || matchArea
    }
    return true
  })

  // Filtered Demo Sandbox Profiles (for the dedicated Locked Demo Profiles tab)
  const filteredDemoMembers = demoSandboxMembers.filter((m) => {
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase()
      const matchName = m.name.toLowerCase().includes(q)
      const matchCompany = m.company.toLowerCase().includes(q)
      const matchCategory = m.category.toLowerCase().includes(q)
      const matchArea = m.location.area.toLowerCase().includes(q)
      return matchName || matchCompany || matchCategory || matchArea
    }
    return true
  })

  const renewedCount = realChapterMembers.filter((m) => m.isVisible !== false).length
  const notRenewedCount = realChapterMembers.filter((m) => m.isVisible === false).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in select-none">
      {!adminSession ? (
        /* Pristine Apple-Grade Executive Login Card */
        <div className="bg-white w-full max-w-[420px] rounded-[32px] sm:rounded-[36px] shadow-[0_24px_70px_rgba(15,23,42,0.24)] border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
          {/* Top Right Close Button */}
          <button
            onClick={onClose}
            className="ios-press absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Clean Executive Content */}
          <div className="p-7 sm:p-8 space-y-5">
            {/* Emblem & Titles */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white p-1 ring-1 ring-black/5 shadow-[0_8px_20px_rgba(0,113,227,0.12)] flex items-center justify-center mx-auto relative group">
                <img
                  src="/proxima-icon.jpg"
                  alt="Proxima Logo"
                  className="w-full h-full rounded-[14px] object-cover"
                />
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                  Executive Portal
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Sign in with administrative credentials to manage chapter operations and licenses.
                </p>
              </div>

              {/* Context Chapter Indicator (if opened from a specific chapter) */}
              {contextChapter && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  <span>{contextChapter.name}</span>
                </div>
              )}
            </div>

            {/* Active Lockout Banner */}
            {rateLimitStatus.isLocked && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2.5 text-xs font-semibold text-amber-900 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
                  <span>
                    Lockout Active: <strong>{rateLimitStatus.remainingSeconds}s</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetSecurityLockout}
                  className="text-[10px] font-bold text-amber-800 bg-amber-200/70 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Authentication Error Feedback */}
            {authError && !rateLimitStatus.isLocked && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-2xl flex items-center justify-between gap-2 text-xs font-medium text-red-700 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="truncate">{authError}</span>
                </div>
                {rateLimitStatus.failedAttempts > 0 && (
                  <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex-shrink-0 font-mono-num">
                    {rateLimitStatus.failedAttempts}/5
                  </span>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Login ID
                </label>
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="e.g. admin or titans.admin"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/12 text-sm text-slate-800 transition-all font-medium placeholder:text-slate-400 disabled:opacity-50"
                  required
                  autoFocus
                  disabled={rateLimitStatus.isLocked || isAuthenticating}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="Enter security password"
                    className="w-full h-11 pl-3.5 pr-11 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/12 text-sm text-slate-800 transition-all font-medium placeholder:text-slate-400 disabled:opacity-50"
                    required
                    disabled={rateLimitStatus.isLocked || isAuthenticating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ios-press absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={rateLimitStatus.isLocked || isAuthenticating}
                className="btn-proxima-primary w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white/90" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Executive Portal</span>
                    <ArrowRight className="w-4 h-4 text-white/80" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credential Helper */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>
                Demo: <strong className="text-slate-600 font-mono">admin</strong> / <strong className="text-slate-600 font-mono">admin123</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmailInput('admin');
                  setPasswordInput('admin123');
                  if (authError) setAuthError(null);
                }}
                className="text-[#0071E3] hover:text-[#005bb5] font-semibold transition-colors cursor-pointer"
              >
                Auto-fill
              </button>
            </div>

            {/* Security Notice */}
            <div className="text-center pt-1">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Secure & Encrypted Session</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated Executive Management Portal */
        <div className="bg-[#F8F9FD] w-full max-w-4xl max-h-[92vh] rounded-[36px] shadow-[0_32px_90px_rgba(15,23,42,0.4)] border border-white/95 overflow-hidden flex flex-col transition-all duration-300">
          
          {/* Modal Top Header */}
          <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-[#1D1D1F]">
                    PROXIMA <span className="text-[10px] text-slate-400 font-medium">by Yugam</span>
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isMasterAdmin
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-[#0071E3] border-blue-200'
                  }`}>
                    {isMasterAdmin ? 'Master Admin' : `${effectiveChapter.name} Admin`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isMasterAdmin && !selectedChapterId
                    ? `Master Admin · ${allChaptersList.length} Chapters`
                    : `Active Chapter: ${effectiveChapter.name} (${effectiveChapter.city})`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="ios-press px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sign out of portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
              <button
                onClick={onClose}
                className="ios-press w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Close portal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
            
            {/* Feedback banner */}
            {feedbackMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {/* AUTHENTICATED STATE */}
            <div className="space-y-4">
              
              {/* SCREEN NAVIGATION ROUTER */}

              {/* Provision New Chapter Modal / Drawer (Master Admin) */}
              {showProvisionModal && (
                <form
                  onSubmit={handleProvisionNewChapter}
                  className="p-5 bg-white border border-[#0071E3]/20 rounded-[28px] space-y-4 shadow-sm animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-[#0071E3]" />
                      <h4 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                        Create New Chapter
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProvisionModal(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {provisionError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{provisionError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Chapter Name *
                      </label>
                      <input
                        type="text"
                        value={newChapterName}
                        onChange={(e) => {
                          const val = e.target.value
                          setNewChapterName(val)
                          const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '')
                          if (slug) {
                            setNewChapterAdminEmail(`${slug}.admin@proxima.network`)
                          }
                        }}
                        placeholder="e.g. Chennai Titans Chapter"
                        className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={newChapterCity}
                        onChange={(e) => setNewChapterCity(e.target.value)}
                        placeholder="e.g. Chennai, Coimbatore, Bengaluru"
                        className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        State / Region
                      </label>
                      <input
                        type="text"
                        value={newChapterRegion}
                        onChange={(e) => setNewChapterRegion(e.target.value)}
                        placeholder="e.g. Tamil Nadu, Karnataka"
                        className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Meeting Hub / Landmark
                      </label>
                      <input
                        type="text"
                        value={newChapterHubAddress}
                        onChange={(e) => setNewChapterHubAddress(e.target.value)}
                        placeholder="e.g. Anna Nagar, Guindy, or OMR"
                        className="w-full text-xs font-medium py-2.5 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Business Forum / Network
                      </label>
                      <select
                        value={newChapterOrgType}
                        onChange={(e) => setNewChapterOrgType(e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20 cursor-pointer"
                      >
                        <option value="BNI">BNI (Business Network International)</option>
                        <option value="CNI">CNI (Chamber / Christian Network)</option>
                        <option value="Rotary">Rotary International</option>
                        <option value="Lions Club">Lions Club International</option>
                        <option value="TiE">TiE (The Indus Entrepreneurs)</option>
                        <option value="Yi">Yi (Young Indians - CII)</option>
                        <option value="Round Table">Round Table India</option>
                        <option value="Independent">Independent Business Forum</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Chapter Login ID
                      </label>
                      <input
                        type="text"
                        autoCapitalize="none"
                        value={newChapterAdminEmail}
                        onChange={(e) => setNewChapterAdminEmail(e.target.value)}
                        placeholder="e.g. titans.admin"
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Password (SHA-256 Hashed on save)
                        </label>
                        <button
                          type="button"
                          onClick={() => setNewChapterAdminPassword(generateStrongPassword(newChapterName || 'Proxima'))}
                          className="text-[10px] font-bold text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generate Strong</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newChapterAdminPassword}
                          onChange={(e) => setNewChapterAdminPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full text-xs font-medium py-2.5 px-3 pr-10 rounded-xl border border-black/10 bg-[#F5F5F7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20 font-mono"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="ios-press absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Complimentary Prototype License Toggle */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provisionAsFreePrototype}
                      onChange={(e) => setProvisionAsFreePrototype(e.target.checked)}
                      className="rounded text-[#0071E3] focus:ring-[#0071E3] w-4 h-4 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span>Give 1-Year Free Access</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          Free (₹0)
                        </span>
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Free for 1 year with full map and member directory access.
                      </p>
                    </div>
                  </label>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.04]">
                    <button
                      type="button"
                      onClick={() => setShowProvisionModal(false)}
                      className="ios-press px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-black/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isGeocodingNew}
                      className="ios-press px-5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isGeocodingNew ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Finding address on map...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Chapter & Map</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TWO SCREEN CONDITIONAL ARCHITECTURE:
                  SCREEN 1: All Chapters Directory (When Master Admin has not selected a specific chapter)
                  SCREEN 2: Chapter Dashboard & Member Roster (When a chapter is selected, or for Chapter Admins) */}
              {isMasterAdmin && !selectedChapterId ? (
                /* ========================================================= */
                /* SCREEN 1: ALL CHAPTERS DIRECTORY                          */
                /* ========================================================= */
                <div className="space-y-4 animate-in fade-in">
                  {/* Directory Header Banner */}
                  <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 border border-blue-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5 sm:mt-0">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0F172A] text-sm">
                          All Chapters
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
                          Select any chapter below to view members, copy links, or open its live map.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProvisionModal(true)}
                      className="ios-press px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer flex-shrink-0 self-end sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Chapter</span>
                    </button>
                  </div>

                  {/* Filters & Search Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-black/[0.06] shadow-xs">
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
                      <button
                        type="button"
                        onClick={() => setDirectoryFilter('ALL')}
                        className={`ios-press px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          directoryFilter === 'ALL'
                            ? 'bg-white text-[#0F172A] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        All Chapters ({allChaptersList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirectoryFilter('LIVE')}
                        className={`ios-press px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          directoryFilter === 'LIVE'
                            ? 'bg-white text-[#0071E3] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Created Chapters ({liveCreatedChapters.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirectoryFilter('DEMO')}
                        className={`ios-press px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          directoryFilter === 'DEMO'
                            ? 'bg-white text-amber-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Sample Demos ({demoChapters.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirectoryFilter('LICENSES')}
                        className={`ios-press px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          directoryFilter === 'LICENSES'
                            ? 'bg-white text-emerald-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Licenses & Free Passes
                      </button>
                    </div>

                    {directoryFilter !== 'LICENSES' && (
                      <div className="w-full sm:w-72">
                        <input
                          type="text"
                          value={directorySearchQuery}
                          onChange={(e) => setDirectorySearchQuery(e.target.value)}
                          placeholder="Search chapters by name, city, forum..."
                          className="w-full text-xs font-medium py-1.5 px-3 rounded-xl border border-black/10 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>
                    )}
                  </div>

                  {/* If filter is LICENSES, render Licensing Section */}
                  {directoryFilter === 'LICENSES' ? (
                    <div className="space-y-4">
                      {/* Licensing Summary */}
                      <div className="p-4 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/50 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5 sm:mt-0">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                              Licenses & Free Passes
                            </h5>
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
                              View subscription plans, check payment records, and create free 1-year access links.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* VIP Free Pass Generator Card */}
                      <div className="p-5 bg-white rounded-2xl border border-black/[0.06] shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-purple-600" />
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Create Free 1-Year Pass (₹0)
                            </h4>
                          </div>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                            Free Pass
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Pass Label / Note
                            </label>
                            <input
                              type="text"
                              value={newPassLabel}
                              onChange={(e) => setNewPassLabel(e.target.value)}
                              placeholder="e.g. BNI Chennai Free Pass"
                              className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-black/10 bg-slate-50 focus:bg-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Max Chapters Allowed
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={newPassMaxUses}
                              onChange={(e) => setNewPassMaxUses(parseInt(e.target.value) || 1)}
                              className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-black/10 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={handleGenerateVipPass}
                              disabled={isGeneratingVipPass}
                              className="w-full ios-press py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Create Pass Link</span>
                            </button>
                          </div>
                        </div>

                        {vipPassesList.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Active Free Passes
                            </span>
                            {vipPassesList.slice(0, 3).map((pass, idx) => (
                              <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                                <span className="font-mono text-[11px] font-bold text-purple-800">{pass.token || pass.code}</span>
                                <span className="text-[11px] text-slate-500">{pass.label} ({pass.usedCount || 0}/{pass.maxUses || 1} used)</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/?vip=${pass.token || pass.code}`)
                                    setFeedbackMessage('Copied Free Pass Link!')
                                    setTimeout(() => setFeedbackMessage(null), 3000)
                                  }}
                                  className="text-[11px] font-bold text-[#0071E3] hover:underline"
                                >
                                  Copy Link
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Chapter Cards List */
                    <div className="space-y-3">
                      {filteredDirectoryChapters.length === 0 ? (
                        <div className="p-8 bg-white rounded-3xl border border-black/[0.06] text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <Building className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-[#1D1D1F]">No Chapters Found</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {directorySearchQuery ? `No chapters match "${directorySearchQuery}".` : 'No chapters found in this category.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowProvisionModal(true)}
                            className="ios-press px-4 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create New Chapter</span>
                          </button>
                        </div>
                      ) : (
                        filteredDirectoryChapters.map((ch) => {
                          const isDemo = isDemoChapter(ch)
                          const adminAcc = chapterAdminsList.find((a) => a.chapterId === ch.id)
                          const chMapUrl = getChapterShareUrl(ch.accessKey)
                          const chMembers = getChapterMembers(ch.id)
                          const realCount = chMembers.filter((m) => !m.id.startsWith('demo-') && !m.id.startsWith('seed-')).length
                          const demoCount = chMembers.filter((m) => m.id.startsWith('demo-') || m.id.startsWith('seed-')).length
                          const memberCountDisplay = isDemo ? `${demoCount} Demo Profiles` : `${realCount} Live Members`

                          return (
                            <div
                              key={ch.id}
                              className={`p-4 rounded-2xl border transition-all hover:shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5 ${
                                isDemo
                                  ? 'bg-amber-50/30 border-amber-200/70 hover:border-amber-300'
                                  : 'bg-white border-black/[0.06] hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    isDemo
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-blue-100 text-[#0071E3]'
                                  }`}>
                                    {isDemo ? 'Sample Demo' : ch.organizationType || 'Business Chapter'}
                                  </span>
                                  <h4 className="text-sm font-bold text-slate-900 truncate">
                                    {ch.name}
                                  </h4>
                                  <span className="text-xs text-slate-400">({ch.city}, {ch.region})</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                                  <span>
                                    Login ID: <strong className="font-mono text-slate-700">{adminAcc?.email || `${ch.slug}.admin@proxima.network`}</strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Roster: <strong className={isDemo ? 'text-amber-800' : 'text-slate-800'}>{memberCountDisplay}</strong>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(chMapUrl)
                                    setFeedbackMessage(`Copied map URL for ${ch.name}`)
                                    setTimeout(() => setFeedbackMessage(null), 3000)
                                  }}
                                  className="ios-press px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Copy Chapter Map URL"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="hidden sm:inline">Copy Link</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onSelectChapter) {
                                      onSelectChapter(ch.accessKey)
                                      onClose()
                                    }
                                  }}
                                  className="ios-press px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  title="Open Live Map"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View Map</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedChapterId(ch.id)
                                    setActiveTab('MEMBERS')
                                  }}
                                  className="ios-press px-3.5 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                                  title={`Open ${ch.name} Roster & Dashboard`}
                                >
                                  <span>Open Chapter Roster</span>
                                  <span className="text-blue-200 font-mono">→</span>
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* ========================================================= */
                /* SCREEN 2: CHAPTER DASHBOARD & MEMBER ROSTER               */
                /* ========================================================= */
                <div className="space-y-4">
                  {/* Master Admin Back to Directory Bar */}
                  {isMasterAdmin && (
                    <div className="p-3 bg-gradient-to-r from-slate-900 to-[#1D1D1F] text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedChapterId(null)}
                          className="ios-press px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>← Back to All Chapters</span>
                        </button>
                        <div className="h-4 w-px bg-white/20 hidden sm:block" />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Chapter:</span>
                          <span className="font-bold text-xs sm:text-sm text-white">{effectiveChapter.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold">
                            {effectiveChapter.city}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenLiveMap}
                          className="ios-press px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Map</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchToChapterAdmin(effectiveChapter)}
                          className="ios-press px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-white/15 cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Login as Chapter Admin</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chapter Navigation Tabs Header */}
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-2.5">
                    <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-full flex-wrap">
                      <button
                        data-tab="members"
                        onClick={() => setActiveTab('MEMBERS')}
                        className={`ios-press px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeTab === 'MEMBERS'
                            ? 'bg-white text-[#1D1D1F] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5 text-[#0071E3]" />
                        <span>Live Members ({realChapterMembers.length})</span>
                      </button>

                      <button
                        data-tab="demo-profiles"
                        onClick={() => setActiveTab('DEMO_PROFILES')}
                        className={`ios-press px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeTab === 'DEMO_PROFILES'
                            ? 'bg-white text-amber-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="System demo illustration profiles (Locked · Read-Only)"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Demo Profiles ({demoSandboxMembers.length})</span>
                      </button>

                      <button
                        data-tab="profile"
                        onClick={() => setActiveTab('PROFILE')}
                        className={`ios-press px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeTab === 'PROFILE'
                            ? 'bg-white text-[#1D1D1F] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Building className="w-3.5 h-3.5 text-purple-600" />
                        <span>Chapter Profile & Access</span>
                      </button>
                    </div>

                    {/* Quick Map Link Action */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(shareableMapUrl)
                          setCopiedLink(true)
                          setTimeout(() => setCopiedLink(false), 2000)
                        }}
                        className="ios-press px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-black/10 hover:bg-slate-50 text-slate-700 flex items-center gap-1 shadow-xs cursor-pointer"
                        title="Copy Public Chapter Map Link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        <span className="hidden sm:inline">{copiedLink ? 'Link Copied' : 'Copy Map Link'}</span>
                      </button>

                      <button
                        type="button"
                        data-action="view-map"
                        onClick={handleOpenLiveMap}
                        className="ios-press px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>View Map</span>
                      </button>
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* CHAPTER ADMIN TAB 1: LIVE CHAPTER MEMBERS (REAL MEMBERS)  */}
                  {/* ========================================================= */}
                  {activeTab === 'MEMBERS' && (
                <div className="space-y-4">
                  
                  {/* Master Admin Chapter Data Sovereignty Notice */}
                  {isMasterAdmin && (
                    <div className="p-4 bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5 sm:mt-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 text-xs sm:text-sm">
                            Member Editing Restricted to Chapter Admin
                          </h5>
                          <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
                            To add, edit, or remove members, log in with this chapter's admin account. Master Admin has view-only access.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            handleLogout()
                            const slugKey = effectiveChapter.slug.replace('chennai-', '').replace('bengaluru-', '').replace('mumbai-', '')
                            setEmailInput(`${slugKey}.admin`)
                          }}
                          className="ios-press px-3.5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                          title={`Switch to ${effectiveChapter.name} login`}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Login as {effectiveChapter.name} Admin</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Top Stats & Quick Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-black/[0.05] shadow-xs">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>{renewedCount} Live on Map</span>
                      </div>
                      <span className="text-slate-300">·</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                        <span>{notRenewedCount} Hidden</span>
                      </div>
                    </div>

                    {/* Member Addition Buttons: STRICTLY restricted to Chapter Admin Logins */}
                    {!isMasterAdmin ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => downloadRosterTemplate(effectiveChapter.name, effectiveChapter.city)}
                          className="ios-press px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer font-display"
                          title="Download Excel / CSV template with sample rows"
                        >
                          <Download className="w-3.5 h-3.5 text-[#0071E3]" />
                          <span>Download Template</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsBulkImporterOpen(true)}
                          className="ios-press px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 flex items-center gap-1.5 cursor-pointer font-display shadow-xs"
                          title="Upload spreadsheet or paste roster rows"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Import Spreadsheet</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenAddMember}
                          className="ios-press px-4 py-1.5 rounded-xl text-xs font-bold bg-[#1D1D1F] hover:bg-black text-white flex items-center gap-1.5 shadow-xs cursor-pointer font-display"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Add Member</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-black/[0.04]">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Member Additions: Chapter Admin Only</span>
                      </div>
                    )}
                  </div>

                  {/* President Photo Studio Queue Progress Bar */}
                  {realChapterMembers.length > 0 && (
                    <div className="p-3.5 bg-gradient-to-r from-blue-50/60 via-white to-indigo-50/40 rounded-2xl border border-black/[0.05] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0071E3] flex items-center justify-center flex-shrink-0 shadow-xs">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#0F172A]">
                              Member Photo Progress
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 font-mono-num bg-slate-100 px-2 py-0.5 rounded-full">
                              {membersWithPhotosCount} / {realChapterMembers.length} Uploaded ({photoProgressPercent}%)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Hover over any member avatar below to drop or change their photo.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-48 flex-shrink-0">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#0071E3] to-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${photoProgressPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono-num font-bold text-slate-700 flex-shrink-0">
                          {photoProgressPercent}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl flex-wrap">
                      <button
                        type="button"
                        onClick={() => setMemberFilter('ALL')}
                        className={`ios-press px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          memberFilter === 'ALL'
                            ? 'bg-white text-[#1D1D1F] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        All ({realChapterMembers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberFilter('RENEWED')}
                        className={`ios-press px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          memberFilter === 'RENEWED'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Visible on Map ({renewedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberFilter('NOT_RENEWED')}
                        className={`ios-press px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          memberFilter === 'NOT_RENEWED'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Hidden ({notRenewedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberFilter('MISSING_PHOTO')}
                        className={`ios-press px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          memberFilter === 'MISSING_PHOTO'
                            ? 'bg-[#0071E3] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Show members requiring photos"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Missing Photo ({missingPhotosCount})</span>
                      </button>
                    </div>

                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Search real chapter members..."
                        className="w-full text-xs font-medium py-1.5 px-3 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>
                  </div>

                  {/* Real Members List */}
                  {filteredRealMembers.length === 0 ? (
                    <div className="p-8 bg-white rounded-3xl border border-black/[0.06] text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0071E3] flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-[#1D1D1F]">
                        {realChapterMembers.length === 0
                          ? `No live members registered for ${effectiveChapter.name} yet.`
                          : 'No members match the current filter.'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        {realChapterMembers.length === 0
                          ? 'This live chapter roster is completely clean. System demo profiles from the sandbox are isolated in the "Demo Profiles" tab.'
                          : 'Try changing your search query or filter to see registered members.'}
                      </p>
                      {realChapterMembers.length === 0 && (
                        !isMasterAdmin ? (
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleOpenAddMember}
                              className="ios-press px-4 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add First Member</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsBulkImporterOpen(true)}
                              className="ios-press px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Import Spreadsheet</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Member additions are managed exclusively by {effectiveChapter.name}'s Chapter Admin</span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredRealMembers.map((mem) => {
                        const isVisible = mem.isVisible !== false

                        return (
                          <div
                            key={mem.id}
                            className={`ios-glass p-3.5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                              isVisible
                                ? 'bg-white border-black/[0.06]'
                                : 'bg-slate-50/80 border-slate-200/80 opacity-75'
                            }`}
                          >
                            {/* Member Details with 1-Click Fast Photo Upload */}
                            <div className="flex items-center gap-3">
                              <div className="relative group/avatar flex-shrink-0">
                                {mem.photoUrl && !mem.photoUrl.includes('unsplash.com') ? (
                                  <img
                                    src={mem.photoUrl}
                                    alt={mem.name}
                                    className="w-10 h-10 rounded-full object-cover border border-black/10 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0071E3] to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs border border-white">
                                    {mem.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                  </div>
                                )}

                                {!isMasterAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => memberFileInputRefs.current[mem.id]?.click()}
                                    className="absolute inset-0 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer shadow-xs"
                                    title={`Upload photo for ${mem.name}`}
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <input
                                  ref={(el) => { memberFileInputRefs.current[mem.id] = el }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFastMemberPhotoUpload(mem.id, e.target.files[0])
                                    }
                                  }}
                                />
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-xs font-bold text-[#1D1D1F]">{mem.name}</h5>
                                  <span className="text-[10px] font-semibold text-slate-500 bg-black/5 px-2 py-0.5 rounded-full">
                                    {mem.category}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 font-medium">
                                  {mem.company} · {mem.location.area || mem.location.city}
                                </p>
                              </div>
                            </div>

                            {/* Renewal / Visibility Toggle & Actions */}
                            {!isMasterAdmin ? (
                              <div className="flex items-center gap-2">
                                {/* Prominent Show/Hide Toggle Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleMemberVisibility(mem.id)}
                                  className={`ios-press px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                    isVisible
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 shadow-xs'
                                      : 'bg-slate-200/80 text-slate-600 border border-slate-300 hover:bg-slate-300/80'
                                  }`}
                                  title={
                                    isVisible
                                      ? 'Member renewed — Click to hide from chapter map'
                                      : 'Member not renewed — Click to make visible on chapter map'
                                  }
                                >
                                  {isVisible ? (
                                    <>
                                      <EyeIcon className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Visible on Map (Renewed)</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOffIcon className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Hidden (Not Renewed)</span>
                                    </>
                                  )}
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMember(mem)}
                                  className="ios-press p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors cursor-pointer"
                                  title="Edit Member details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(mem.id, mem.name)}
                                  className="ios-press p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Delete Member from chapter"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isVisible ? (
                                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                                    <EyeIcon className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Active (On Map)</span>
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1.5">
                                    <EyeOffIcon className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Hidden (Off Map)</span>
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                                  Chapter Admin Controlled
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: SYSTEM DEMO PROFILES (LOCKED · NON-EDITABLE)        */}
              {/* ========================================================= */}
              {activeTab === 'DEMO_PROFILES' && (
                <div className="space-y-4">
                  {/* Warning / Lock Isolation Banner */}
                  <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-amber-50/80 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5 sm:mt-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                          <span>Sample Demo Profiles (Read-Only)</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                            Demo Profiles
                          </span>
                        </h5>
                        <p className="text-[11px] text-amber-800 font-medium mt-0.5 leading-relaxed">
                          These are sample profiles used for testing and demonstrations. They cannot be edited. To manage real members, use the <strong>Live Members</strong> tab.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab('MEMBERS')}
                        className="ios-press px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5 text-[#0071E3]" />
                        <span>Go to Live Members ({realChapterMembers.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter & Search Bar for Demo Profiles */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        Demo Profiles ({demoSandboxMembers.length})
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        • Sample profiles for demonstration
                      </span>
                    </div>

                    <div className="w-full sm:w-64">
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Search demo profiles..."
                        className="w-full text-xs font-medium py-1.5 px-3 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      />
                    </div>
                  </div>

                  {/* Demo Members List */}
                  {filteredDemoMembers.length === 0 ? (
                    <div className="p-8 bg-white rounded-3xl border border-black/[0.06] text-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {demoSandboxMembers.length === 0
                          ? `No demo profiles exist in ${effectiveChapter.name}.`
                          : 'No demo profiles match your search.'}
                      </h4>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                        {demoSandboxMembers.length === 0
                          ? 'This is a dedicated live chapter. All registered offices are live chapter members.'
                          : 'Try clearing your search query to inspect the locked demo profiles.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredDemoMembers.map((mem) => {
                        return (
                          <div
                            key={mem.id}
                            className="ios-glass p-3.5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 bg-amber-50/20 border-amber-200/60"
                          >
                            {/* Member Details */}
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                {mem.photoUrl && !mem.photoUrl.includes('unsplash.com') ? (
                                  <img
                                    src={mem.photoUrl}
                                    alt={mem.name}
                                    className="w-10 h-10 rounded-full object-cover border border-amber-200 flex-shrink-0 grayscale-[25%]"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs border border-white">
                                    {mem.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                  </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                                  <Lock className="w-2.5 h-2.5" />
                                </div>
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-bold text-[#1D1D1F]">
                                    {mem.name}
                                  </h4>
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Demo Preset</span>
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 font-semibold truncate max-w-[280px]">
                                  {mem.company}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                                  <span className="font-semibold text-amber-800">{mem.category}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{mem.location.area || mem.location.city}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Locked Status & Non-Editable Badges */}
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/90 inline-flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Locked · Read-Only</span>
                              </span>

                              <div
                                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed select-none border border-slate-200"
                                title="System demo profiles cannot be edited or modified to preserve public showcase stability."
                              >
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>Non-Editable</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: CHAPTER PROFILE, CREDENTIALS & MAP URL LINK         */}
              {/* ========================================================= */}
              {activeTab === 'PROFILE' && (
                <div className="space-y-4">
                  
                  {/* Card 1: Public Chapter Map Shareable Link */}
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-[28px] border border-[#0071E3]/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#0071E3] text-white flex items-center justify-center">
                          <Compass className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
                            Public Chapter Map URL Link
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Private link for this chapter. Share this directly with your members.
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Private Link
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-black/[0.06] flex items-center justify-between gap-2 shadow-xs">
                      <span className="text-xs font-mono font-bold text-[#0071E3] truncate">
                        {shareableMapUrl}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(shareableMapUrl)
                            setCopiedLink(true)
                            setTimeout(() => setCopiedLink(false), 2000)
                          }}
                          className="ios-press px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(productionMapUrl)
                            setCopiedLink(true)
                            setTimeout(() => setCopiedLink(false), 2000)
                          }}
                          className="ios-press px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                          title={`Production Domain: ${productionMapUrl}`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Production Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenLiveMap}
                          className="ios-press px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Map</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] text-slate-600">
                        Members opening this link will only see active (renewed) members of this chapter.
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyPacket}
                        className="ios-press text-xs font-bold text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{copiedPacket ? 'Invitation Packet Copied!' : 'Copy WhatsApp Packet'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Chapter Licensing & Billing (Razorpay: 6 Months or Annual) */}
                  <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 to-[#0F172A] text-white rounded-[28px] border border-slate-800 shadow-xl space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071E3] to-[#00C6FF] text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold tracking-tight">
                              Chapter Licensing & Subscription
                            </h4>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono border border-blue-400/30">
                              Semi-Annual / Annual
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Powered by Razorpay · Auto-renewal, UPI Autopay, Cards & Netbanking
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {chapterLicense.status === 'ACTIVE' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active License</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span>Renewal Due</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {paymentFeedback && (
                      <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{paymentFeedback}</span>
                      </div>
                    )}

                    {/* Plan Selector: 6 Months vs 1 Year */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Select Renewal Duration (6 Months or Annual)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Option 1: Semi-Annual (6 Months) */}
                        <button
                          type="button"
                          data-plan="SEMI_ANNUAL"
                          onClick={() => setSelectedPlanKey('SEMI_ANNUAL')}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 relative text-left w-full ${
                            selectedPlanKey === 'SEMI_ANNUAL'
                              ? 'bg-blue-600/15 border-[#0071E3] ring-2 ring-[#0071E3]/40'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">6 Months Plan</span>
                                <span className="text-[10px] font-mono text-slate-400">Semi-Annual</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                ₹199 / mo × 6 months
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-extrabold text-white font-mono">₹1,194</span>
                              <span className="text-[10px] text-slate-400 block font-mono">/ 6 mo</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-blue-300 font-medium">
                            +183 Days (~6 Months) validity
                          </span>
                        </button>

                        {/* Option 2: Annual (1 Year) — Best Value */}
                        <button
                          type="button"
                          data-plan="ANNUAL"
                          onClick={() => setSelectedPlanKey('ANNUAL')}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 relative text-left w-full ${
                            selectedPlanKey === 'ANNUAL'
                              ? 'bg-blue-600/15 border-[#0071E3] ring-2 ring-[#0071E3]/40'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
                            Best Value · Save 16%
                          </span>
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">1 Year Annual Plan</span>
                              </div>
                              <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                                2 Months Free · Equiv. ₹166/mo
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-extrabold text-white font-mono">₹1,999</span>
                              <span className="text-[10px] line-through text-slate-500 block font-mono">₹2,388</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-300 font-medium">
                            +365 Days (1 Full Year) validity
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Current Validity & Gateway Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/10 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Current License
                        </span>
                        <span className="font-semibold text-slate-200">
                          {chapterLicense.status === 'ACTIVE' ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Valid Until
                        </span>
                        <span className="font-semibold text-slate-200 font-mono">
                          {new Date(chapterLicense.validUntil).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Razorpay Gateway
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isSandboxKey(customRazorpayKey) ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                          <span className="font-semibold text-slate-200 text-[11px]">
                            {isSandboxKey(customRazorpayKey) ? 'Sandbox Simulation' : 'Live Merchant Mode'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Razorpay Key Configuration Drawer (Optional toggle) */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowKeyConfig(!showKeyConfig)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
                      >
                        {showKeyConfig ? 'Hide Merchant Key Settings' : 'Configure Custom Razorpay Key ID (Optional)'}
                      </button>

                      {showKeyConfig && (
                        <div className="mt-2 p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-3 text-xs animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                              Razorpay Merchant Gateway Settings
                            </span>
                            <a
                              href="https://dashboard.razorpay.com/app/keys"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#0071E3] hover:underline font-semibold"
                            >
                              Get Razorpay Keys ↗
                            </a>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Razorpay Key ID (rzp_live_... or rzp_test_...)
                            </label>
                            <input
                              type="text"
                              value={customRazorpayKey}
                              onChange={(e) => setCustomRazorpayKey(e.target.value)}
                              placeholder="e.g. rzp_test_xxxxxxxxxxxxxx or rzp_live_xxxxxxxxxxxxxx"
                              className="w-full text-xs font-mono p-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Razorpay Key Secret (Server-side HMAC SHA-256 verification)
                            </label>
                            <input
                              type="password"
                              value={customRazorpaySecret}
                              onChange={(e) => setCustomRazorpaySecret(e.target.value)}
                              placeholder="e.g. your_razorpay_secret_key"
                              className="w-full text-xs font-mono p-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-400">
                              {isSandboxKey(customRazorpayKey)
                                ? '• Sandbox Developer Mode active (Simulated payment verification)'
                                : customRazorpayKey.startsWith('rzp_live_')
                                ? '• Razorpay Production Live Gateway configured'
                                : '• Razorpay Test Mode Gateway configured'}
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                setCustomRazorpayKeyId(customRazorpayKey)
                                await saveRazorpayServerConfig({
                                  keyId: customRazorpayKey,
                                  keySecret: customRazorpaySecret || undefined,
                                })
                                setPaymentFeedback(`Saved Razorpay Gateway! (${isSandboxKey(customRazorpayKey) ? 'Sandbox Mode' : 'Connected to Gateway'})`)
                                setTimeout(() => setPaymentFeedback(null), 4000)
                              }}
                              className="ios-press px-3.5 py-1.5 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold cursor-pointer flex-shrink-0 transition-colors"
                            >
                              Save &amp; Sync
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-blue-400" />
                        <span>Last payment ref: <strong className="font-mono text-slate-300">{chapterLicense.lastPaymentId || 'N/A'}</strong></span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        {isMasterAdmin && (
                          <button
                            type="button"
                            onClick={handleGrantComplimentaryCredit}
                            className="w-full sm:w-auto ios-press px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/25 cursor-pointer transition-all font-display"
                            title="Grant complimentary zero-charge 1-year license to this chapter"
                          >
                            <Gift className="w-4 h-4" />
                            <span>Grant 1-Yr Team Credit (₹0)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handlePayRazorpaySubscription}
                          disabled={isProcessingPayment}
                          className="w-full sm:w-auto ios-press px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0071E3] to-[#0077ED] hover:from-[#0077ED] hover:to-[#0088FF] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer disabled:opacity-60 transition-all font-display"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>
                            {isProcessingPayment
                              ? 'Connecting to Razorpay...'
                              : selectedPlanKey === 'ANNUAL'
                              ? 'Pay ₹1,999 for 1 Year (Razorpay)'
                              : 'Pay ₹1,194 for 6 Months (Razorpay)'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Invoice History Drawer */}
                    {chapterLicense.invoices && chapterLicense.invoices.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Recent Invoice History ({chapterLicense.invoices.length})
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                          {chapterLicense.invoices.slice(0, 4).map((inv) => (
                            <div
                              key={inv.id}
                              className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-blue-300 font-bold">{inv.id}</span>
                                <span className="text-slate-400">· {inv.plan || 'License Payment'}</span>
                                <span className="text-slate-500">· {inv.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white">₹{inv.amount.toLocaleString('en-IN')}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  {inv.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 2.5: VIP Free Prototype Chapter Passes & Team Credit (Master Admin Only) */}
                  {isMasterAdmin && (
                    <div className="p-5 sm:p-6 bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] text-white rounded-[28px] border border-white/10 shadow-xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 flex-shrink-0">
                            <Gift className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold tracking-tight">
                                Team Credit & Free Prototype Chapter Passes
                              </h4>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-400/30">
                                100% Free Pass
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Create free invite links that let new chapters get 1 year of access at no cost.
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-purple-200 bg-purple-900/50 px-3 py-1 rounded-full border border-purple-500/30">
                          Master Admin Console
                        </span>
                      </div>

                      {/* Generator Form */}
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-purple-400" />
                          <span>Create New Free Pass Link</span>
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          <div className="sm:col-span-7">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Pass Note / Chapter Name
                            </label>
                            <input
                              type="text"
                              value={newPassLabel}
                              onChange={(e) => setNewPassLabel(e.target.value)}
                              placeholder="e.g. Coimbatore Tech Chapter"
                              className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Max Chapters
                            </label>
                            <select
                              value={newPassMaxUses}
                              onChange={(e) => setNewPassMaxUses(Number(e.target.value))}
                              className="w-full text-xs font-bold py-2 px-3 rounded-xl border border-white/10 bg-black/40 text-white focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                            >
                              <option value={1} className="bg-slate-900 text-white">1 Chapter</option>
                              <option value={2} className="bg-slate-900 text-white">2 Chapters</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2 flex items-end">
                            <button
                              type="button"
                              onClick={handleGenerateVipPass}
                              disabled={isGeneratingVipPass}
                              className="w-full ios-press py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50 transition-all font-display"
                            >
                              {isGeneratingVipPass ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Gift className="w-3.5 h-3.5" />
                                  <span>Generate</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Active Passes List */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Active Free Chapter Passes ({vipPassesList.length})
                        </span>

                        {vipPassesList.length === 0 ? (
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center text-xs text-slate-400">
                            No complimentary passes generated yet. Click &quot;Generate&quot; above to create a secret invite link for team credit or prototype chapters.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                            {vipPassesList.map((pass: any) => {
                              const passUrl = `${window.location.origin}/?createChapter=${pass.token}`
                              const isExhausted = (pass.usedCount || 0) >= (pass.maxUses || 1)
                              const isCopied = copiedVipToken === pass.token

                              return (
                                <div
                                  key={pass.id || pass.token}
                                  className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                                >
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white truncate">{pass.label}</span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                          isExhausted
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        }`}
                                      >
                                        {pass.usedCount || 0} / {pass.maxUses || 1} Used
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-purple-300 truncate">
                                      Token: {pass.token}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(passUrl)
                                        setCopiedVipToken(pass.token)
                                        setTimeout(() => setCopiedVipToken(null), 2500)
                                      }}
                                      className="ios-press px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/30 flex items-center gap-1.5 cursor-pointer"
                                      title="Copy shareable link for free onboarding"
                                    >
                                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                      <span>{isCopied ? 'Link Copied!' : 'Copy Free Link'}</span>
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Two Columns: Chapter Profile + Login Credentials */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Chapter Profile Details */}
                    <form onSubmit={handleSaveChapterProfile} className="p-5 bg-white rounded-[28px] border border-black/[0.06] space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                        <h4 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-[#0071E3]" />
                          <span>Chapter Profile Details</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {effectiveChapter.slug}</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Chapter Name
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={profileCity}
                            onChange={(e) => setProfileCity(e.target.value)}
                            className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Region / State
                          </label>
                          <input
                            type="text"
                            value={profileRegion}
                            onChange={(e) => setProfileRegion(e.target.value)}
                            className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Business Forum / Organization
                        </label>
                        <select
                          value={profileOrgType}
                          onChange={(e) => setProfileOrgType(e.target.value)}
                          className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 cursor-pointer"
                        >
                          <option value="BNI">BNI (Business Network International)</option>
                          <option value="CNI">CNI (Chamber / Christian Network)</option>
                          <option value="Rotary">Rotary International</option>
                          <option value="Lions Club">Lions Club International</option>
                          <option value="TiE">TiE (The Indus Entrepreneurs)</option>
                          <option value="Yi">Yi (Young Indians - CII)</option>
                          <option value="Round Table">Round Table India</option>
                          <option value="Executive Demo">Executive Demo</option>
                          <option value="Independent">Independent Business Forum</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Meeting Hub / Landmark
                          </label>
                          <span className="text-[10px] text-slate-400">
                            [{effectiveChapter.centerCoordinates[1].toFixed(3)}, {effectiveChapter.centerCoordinates[0].toFixed(3)}]
                          </span>
                        </div>
                        <input
                          type="text"
                          value={profileHub}
                          onChange={(e) => setProfileHub(e.target.value)}
                          placeholder="e.g. Anna Nagar, Guindy, or OMR"
                          className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>

                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={isGeocodingHub}
                          className="ios-press px-4 py-2 rounded-xl bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isGeocodingHub ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Calibrating...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Save Profile</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Chapter Admin Login Credentials */}
                    <form onSubmit={handleSaveCredentials} className="p-5 bg-white rounded-[28px] border border-black/[0.06] space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                        <h4 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          <span>Administrative Credentials</span>
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          SHA-256 Protected
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Chapter Admin Login ID
                        </label>
                        <input
                          type="text"
                          autoCapitalize="none"
                          value={profileAdminEmail}
                          onChange={(e) => setProfileAdminEmail(e.target.value)}
                          className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            New Password
                          </label>
                          <button
                            type="button"
                            onClick={() => setNewAdminPassword(generateStrongPassword(effectiveChapter.slug))}
                            className="text-[10px] font-bold text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Generate Strong</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showAdminPassword ? 'text' : 'password'}
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            placeholder="Leave blank to keep existing password"
                            className="w-full text-xs font-medium py-2 px-3 pr-10 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="ios-press absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            tabIndex={-1}
                          >
                            {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-black/[0.04] text-[11px] text-slate-500">
                        Passwords are encrypted and securely stored. We never store passwords in plain text.
                      </div>

                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="submit"
                          className="ios-press px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Credentials</span>
                        </button>
                      </div>
                    </form>

                    {/* Master Super Admin Global Credentials (Only visible to Master Admin) */}
                    {adminSession?.role === 'MASTER_ADMIN' && (
                      <form onSubmit={handleSaveMasterCredentials} className="p-5 bg-white rounded-[28px] border border-blue-200/60 shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                          <h4 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#0071E3]" />
                            <span>Master Admin Credentials</span>
                          </h4>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Master Admin
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Master Admin Login ID
                          </label>
                          <input
                            type="text"
                            autoCapitalize="none"
                            value={masterAdminEmail}
                            onChange={(e) => setMasterAdminEmail(e.target.value)}
                            className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                            required
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              New Master Password
                            </label>
                            <button
                              type="button"
                              onClick={() => setNewMasterAdminPassword(generateStrongPassword('MasterAdmin'))}
                              className="text-[10px] font-bold text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Generate Strong</span>
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showMasterAdminPassword ? 'text' : 'password'}
                              value={newMasterAdminPassword}
                              onChange={(e) => setNewMasterAdminPassword(e.target.value)}
                              placeholder="Leave blank to keep existing master password"
                              className="w-full text-xs font-medium py-2 px-3 pr-10 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowMasterAdminPassword(!showMasterAdminPassword)}
                              className="ios-press absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                              tabIndex={-1}
                            >
                              {showMasterAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-slate-500">
                          Changes the Master Admin password for all chapters.
                        </div>

                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="submit"
                            className="ios-press px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5 text-blue-400" />
                            <span>Update Master Credentials</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  
                </div>
              )}
            </div>
          )}
        </div>
      </div>

        {/* Member Add/Edit Modal (Strictly Restricted to Chapter Admins) */}
        {isMemberModalOpen && !isMasterAdmin && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[32px] p-6 shadow-2xl border border-black/10 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                <h4 className="text-sm font-bold text-[#1D1D1F]">
                  {editingMemberId ? 'Edit Chapter Member' : `Add Member to ${effectiveChapter.name}`}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMember} className="space-y-4">
                {/* 0. Executive Photo / Avatar Picker & Upload */}
                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-black/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>Member Profile Photo</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Renders on Map Pin</span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Live Avatar Preview */}
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 border-2 border-white shadow-md flex-shrink-0 group">
                      <img
                        src={memberFormData.photoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 text-white text-[10px] font-bold flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Camera className="w-4 h-4 mb-0.5" />
                        <span>Change</span>
                      </button>
                    </div>

                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="ios-press px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-black/10 flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#0071E3]" />
                          <span>Upload from Device</span>
                        </button>
                        <span className="text-[10px] text-slate-400">or paste URL below</span>
                      </div>

                      <input
                        type="url"
                        value={memberFormData.photoUrl}
                        onChange={(e) => setMemberFormData({ ...memberFormData, photoUrl: e.target.value })}
                        placeholder="https://... photo URL"
                        className="w-full text-xs font-mono py-1.5 px-2.5 rounded-lg border border-black/10 bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Avatar Presets */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1.5 font-medium">
                      Or pick an executive avatar:
                    </span>
                    <div className="flex items-center gap-2">
                      {PRESET_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMemberFormData({ ...memberFormData, photoUrl: url })}
                          className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                            memberFormData.photoUrl === url
                              ? 'border-[#0071E3] scale-110 shadow-xs'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 1. Basic Identity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Member Name *
                    </label>
                    <input
                      type="text"
                      name="memberName"
                      value={memberFormData.name}
                      onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                      placeholder="e.g. Karthik Swaminathan"
                      className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      name="memberCompany"
                      value={memberFormData.company}
                      onChange={(e) => setMemberFormData({ ...memberFormData, company: e.target.value })}
                      placeholder="e.g. BlueFreeze HVAC Systems"
                      className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* 2. Business Category Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Business Category *
                    </label>
                    {isCustomCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false)
                          setMemberFormData({ ...memberFormData, category: 'HVAC', categoryId: 'hvac' })
                        }}
                        className="text-[10px] text-[#0071E3] font-semibold hover:underline cursor-pointer"
                      >
                        Choose from list
                      </button>
                    )}
                  </div>

                  

                  {!isCustomCategory ? (
                    <select
                      value={memberFormData.category}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '__custom__') {
                          setIsCustomCategory(true)
                          setCustomCategoryText('')
                          setMemberFormData({ ...memberFormData, category: '', categoryId: 'business' })
                        } else {
                          const cat = MOCK_CATEGORIES.find((c) => c.name === val)
                          setMemberFormData({
                            ...memberFormData,
                            category: val,
                            categoryId: cat?.id || val.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                          })
                        }
                      }}
                      className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none"
                    >
                      {MOCK_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="__custom__">+ Custom Category / Other...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customCategoryText}
                      onChange={(e) => {
                        setCustomCategoryText(e.target.value)
                        setMemberFormData({
                          ...memberFormData,
                          category: e.target.value,
                          categoryId: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'business',
                        })
                      }}
                      placeholder="Type custom category name (e.g. Solar Energy, Interior Design)"
                      className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-blue-300 bg-blue-50/50 focus:bg-white focus:outline-none"
                      autoFocus
                    />
                  )}
                </div>

                {/* 3. Dedicated Business Location & Map Pin Calibration */}
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <MapPin className="w-4 h-4 text-[#0071E3]" />
                      <span>Physical Business Location & Map Pin</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#0071E3] bg-white px-2.5 py-0.5 rounded-full border border-blue-200/70 shadow-xs">
                      📍 [{memberFormData.latitude.toFixed(4)}, {memberFormData.longitude.toFixed(4)}]
                    </span>
                  </div>

                  {/* Google Maps Location Link Reader (High Comfort - Zero Manual Lat/Lng Required) */}
                  <div className="p-3 bg-white rounded-xl border border-blue-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[#0071E3]" />
                        <span>Google Maps Location Link Reader</span>
                        <span className="text-[9px] font-bold text-[#0071E3] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Auto-Pin
                        </span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Auto-pins GPS & fills address</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={googleMapsUrlInput}
                          onChange={(e) => {
                            const val = e.target.value
                            setGoogleMapsUrlInput(val)
                            // Auto-trigger if valid Google Maps URL or coordinate format
                            if (val.includes('maps') || val.includes('goo.gl') || /^-?\d{1,3}\.\d+/.test(val.trim())) {
                              handleReadGoogleMapsUrl(val)
                            }
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text')
                            if (pasted) {
                              setGoogleMapsUrlInput(pasted)
                              handleReadGoogleMapsUrl(pasted)
                            }
                          }}
                          placeholder="Paste Google Maps URL (e.g. https://maps.google.com/... or @lat,lng)"
                          className="w-full text-xs font-semibold py-2 pl-3 pr-8 rounded-xl border border-blue-200/70 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 placeholder:text-slate-400 placeholder:font-normal"
                        />
                        {googleMapsUrlInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setGoogleMapsUrlInput('')
                              setMapsParseSuccess(null)
                              setMapsParseError(null)
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isParsingMapsUrl || !googleMapsUrlInput.trim()}
                        onClick={() => handleReadGoogleMapsUrl()}
                        className="ios-press px-3.5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all flex-shrink-0"
                      >
                        {isParsingMapsUrl ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Reading...</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Read & Pin</span>
                          </>
                        )}
                      </button>
                    </div>

                    {mapsParseSuccess && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 animate-in fade-in">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{mapsParseSuccess}</span>
                      </div>
                    )}

                    {mapsParseError && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="text-[11px] leading-tight">{mapsParseError}</span>
                      </div>
                    )}
                  </div>

                  

                  {/* Office Address Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Office Address / Building / Suite
                    </label>
                    <input
                      type="text"
                      value={memberFormData.address}
                      onChange={(e) => setMemberFormData({ ...memberFormData, address: e.target.value })}
                      placeholder="e.g. Suite 402, 2nd Avenue, Near Kathipara Junction"
                      className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Locality / Area *
                      </label>
                      <input
                        type="text"
                        name="memberArea"
                        value={memberFormData.area}
                        onChange={(e) => setMemberFormData({ ...memberFormData, area: e.target.value })}
                        placeholder="e.g. Guindy, Anna Nagar"
                        className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={memberFormData.city}
                        onChange={(e) => setMemberFormData({ ...memberFormData, city: e.target.value })}
                        placeholder="Chennai"
                        className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        value={memberFormData.pincode}
                        onChange={(e) => setMemberFormData({ ...memberFormData, pincode: e.target.value })}
                        placeholder="600032"
                        className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* One-Tap Quick Hub Pin Placement */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Quick Pin to Business Hub:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {CHENNAI_HUBS.slice(0, 8).map((hub) => (
                        <button
                          key={hub.areaName}
                          type="button"
                          onClick={() => {
                            setMemberFormData({
                              ...memberFormData,
                              area: hub.areaName,
                              latitude: hub.latitude + (Math.random() - 0.5) * 0.003,
                              longitude: hub.longitude + (Math.random() - 0.5) * 0.003,
                            })
                          }}
                          className={`ios-press px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                            memberFormData.area.toLowerCase() === hub.areaName.toLowerCase()
                              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                              : 'bg-white text-slate-700 border-black/10 hover:border-[#0071E3]/40'
                          }`}
                        >
                          {hub.areaName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Geocode Button & GPS Override Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={isCalibratingPin}
                      onClick={handleCalibratePin}
                      className="ios-press text-xs font-bold text-[#0071E3] hover:text-[#0077ED] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isCalibratingPin ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Detecting Coordinates...</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-3.5 h-3.5" />
                          <span>Detect Map Pin from Address</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowManualCoords(!showManualCoords)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                    >
                      {showManualCoords ? 'Hide GPS Inputs' : 'Edit Exact GPS Lat/Lng'}
                    </button>
                  </div>

                  {/* Manual Coordinates Input */}
                  {showManualCoords && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/50">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={memberFormData.latitude}
                          onChange={(e) => setMemberFormData({ ...memberFormData, latitude: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs font-mono py-1 px-2 rounded-lg border border-black/10 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={memberFormData.longitude}
                          onChange={(e) => setMemberFormData({ ...memberFormData, longitude: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs font-mono py-1 px-2 rounded-lg border border-black/10 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Contact Details (Phone, Email, Website) */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={memberFormData.phone}
                      onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value, whatsapp: e.target.value })}
                      placeholder="+91 98400 12345"
                      className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={memberFormData.email}
                      onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                      placeholder="karthik@bluefreeze.co.in"
                      className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Website URL
                    </label>
                    <input
                      type="text"
                      value={memberFormData.website}
                      onChange={(e) => setMemberFormData({ ...memberFormData, website: e.target.value })}
                      placeholder="https://bluefreeze.co.in"
                      className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* 5. Business Overview / Bio */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    About the Business / Executive Bio
                  </label>
                  <textarea
                    rows={2}
                    value={memberFormData.shortBio}
                    onChange={(e) => setMemberFormData({ ...memberFormData, shortBio: e.target.value })}
                    placeholder="Brief description of specialized services, experience, and core business offerings..."
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none leading-relaxed"
                  />
                </div>

                {/* 6. Referral Requirements */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Ideal Referral Introductions
                  </label>
                  <input
                    type="text"
                    value={memberFormData.referralRequirements}
                    onChange={(e) => setMemberFormData({ ...memberFormData, referralRequirements: e.target.value })}
                    placeholder="e.g. Commercial builders, diagnostic centers, and industrial facilities needing central cooling."
                    className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-black/10 bg-[#F5F5F7] focus:bg-white focus:outline-none"
                  />
                </div>

                {/* 7. Renewal Status Toggle */}
                <div className="p-3 bg-slate-50 rounded-xl border border-black/[0.04] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Renewal / Map Visibility Status</span>
                    <span className="text-[10px] text-slate-500">
                      {memberFormData.isVisible
                        ? 'Member is renewed and will show on public chapter map'
                        : 'Member has not renewed and will be hidden from map'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMemberFormData({ ...memberFormData, isVisible: !memberFormData.isVisible })}
                    className={`ios-press px-3.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                      memberFormData.isVisible
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {memberFormData.isVisible ? 'Visible (Renewed)' : 'Hidden (Not Renewed)'}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsMemberModalOpen(false)}
                    className="ios-press px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-black/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-action="save-member"
                    className="ios-press px-5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Save Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Member Spreadsheet Importer Modal */}
        <BulkMemberImporterModal
          isOpen={isBulkImporterOpen}
          onClose={() => setIsBulkImporterOpen(false)}
          chapter={effectiveChapter}
          onImportComplete={handleSpreadsheetImportComplete}
        />

        </div>
      )}
    </div>
  )
}
