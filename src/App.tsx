import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import { ErrorBoundary } from './components/Common/ErrorBoundary'
import { MapContainer } from './components/Map/MapContainer'
import { UnifiedCommandBar } from './components/Header/UnifiedCommandBar'
import { MemberSideDrawer } from './components/MemberList/MemberSideDrawer'
import { MemberBottomCard } from './components/MemberList/MemberBottomCard'
import { MemberProfileModal } from './components/MemberProfile/MemberProfileModal'
import type { LegalTab } from './components/Legal/LegalModal'
import { LandingPage } from './components/Landing/LandingPage'
import { InvalidChapterScreen } from './components/Gateway/InvalidChapterScreen'
import type { Member, DistanceRadius, Chapter } from './types/member'

// Lazy-loaded heavy modal chunks for instant first paint
const AdminPortalModal = lazy(() =>
  import('./components/Admin/AdminPortalModal').then((m) => ({ default: m.AdminPortalModal }))
)
const LegalModal = lazy(() =>
  import('./components/Legal/LegalModal').then((m) => ({ default: m.LegalModal }))
)
const BrandStoryModal = lazy(() =>
  import('./components/Brand/BrandStoryModal').then((m) => ({ default: m.BrandStoryModal }))
)
const NearMeRadarModal = lazy(() =>
  import('./components/NearMe/NearMeRadarModal').then((m) => ({ default: m.NearMeRadarModal }))
)
const CreateChapterModal = lazy(() =>
  import('./components/Onboarding/CreateChapterModal').then((m) => ({ default: m.CreateChapterModal }))
)
import { calculateHaversineDistance } from './utils/distance'
import {
  DEFAULT_CHAPTERS,
  getChapterByToken,
  getProductionChapterShareUrl,
  getChapterShareUrl,
  PRODUCTION_DOMAIN,
} from './data/chapters'
import {
  getChapterMembers,
  saveChapterMembers,
  getDemoIllustrationMembers,
} from './data/chapterMembers'
import { CHENNAI_HUBS } from './utils/geocoding'
import { Navigation, X } from 'lucide-react'
import {
  getStoredViewer,
  saveStoredViewer,
  clearStoredViewer,
  findNearbyTripOpportunities,
  logNavigationToMember,
  type ViewerIdentity,
} from './services/viewerIdentity'
import { ViewerIdentityModal } from './components/Viewer/ViewerIdentityModal'
import { TripMultiplierModal } from './components/Navigation/TripMultiplierModal'
import { openExternalNavigation } from './utils/navigation'
import {
  fetchMembersFromServer,
  fetchChapterByTokenFromServer,
} from './services/proximaApi'

export function App() {
  // Parse URL query parameter: ?c=token (high-entropy unpredictable cryptographic access key)
  const initialUrlInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return { chapter: null, isInvalid: false, attemptedToken: '' }
    }
    const params = new URLSearchParams(window.location.search)
    const token = params.get('c') || params.get('chapter') || params.get('key') || params.get('token')
    if (token) {
      const found = getChapterByToken(token)
      if (found) {
        return { chapter: found, isInvalid: false, attemptedToken: '' }
      } else {
        // If someone changes or tampers with the URL, strictly reject navigation
        return { chapter: null, isInvalid: true, attemptedToken: token }
      }
    }
    // Check if user has an unlocked chapter session
    const stored = sessionStorage.getItem('proxima_active_token')
    if (stored) {
      const found = getChapterByToken(stored)
      if (found) {
        return { chapter: found, isInvalid: false, attemptedToken: '' }
      }
    }
    return { chapter: null, isInvalid: false, attemptedToken: '' }
  }, [])

  const [activeChapter, setActiveChapter] = useState<Chapter | null>(initialUrlInfo.chapter)
  const [invalidTokenAttempt, setInvalidTokenAttempt] = useState<string | null>(
    initialUrlInfo.isInvalid ? initialUrlInfo.attemptedToken : null
  )

  // Synchronize chapter and token from server if quarantined or URL token changed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('c') || params.get('chapter') || params.get('key') || params.get('token')
    if (token && (!activeChapter || activeChapter.accessKey !== token)) {
      fetchChapterByTokenFromServer(token).then((ch) => {
        if (ch) {
          setActiveChapter(ch)
          setInvalidTokenAttempt(null)
        }
      })
    }
  }, [activeChapter?.accessKey])

  // Animated flight trigger from full country of India to city
  const [triggerFlightAnimation, setTriggerFlightAnimation] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('demo') === 'true'
    }
    return false
  })

  // Modal States
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('admin') === 'portal' || params.get('admin') === 'true'
    }
    return false
  })
  const [legalModalState, setLegalModalState] = useState<{
    isOpen: boolean
    tab: LegalTab
  }>({
    isOpen: false,
    tab: 'privacy',
  })

  const openSecurityModal = () => setLegalModalState({ isOpen: true, tab: 'security' })
  const openPrivacyModal = () => setLegalModalState({ isOpen: true, tab: 'privacy' })
  const openTermsModal = () => setLegalModalState({ isOpen: true, tab: 'terms' })
  const closeLegalModal = () => setLegalModalState((prev) => ({ ...prev, isOpen: false }))

  const [isBrandStoryOpen, setIsBrandStoryOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [profileModalMember, setProfileModalMember] = useState<Member | null>(null)
  const [copiedChapterLink, setCopiedChapterLink] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return true
    }
    return false
  })
  const [isNearMeModalOpen, setIsNearMeModalOpen] = useState(false)
  const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return Boolean(params.get('createChapter') || params.get('onboard') || params.get('pass'))
    }
    return false
  })
  const [initialVipToken, setInitialVipToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('createChapter') || params.get('pass') || ''
    }
    return ''
  })

  // Persistent Member Identity (Zero login required, device remembers forever)
  const [viewerIdentity, setViewerIdentity] = useState<ViewerIdentity | null>(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const urlViewer = params.get('viewer') || params.get('v') || params.get('member')
    if (urlViewer && initialUrlInfo.chapter) {
      const v: ViewerIdentity = {
        name: urlViewer.trim(),
        isSelfExcluded: true,
        setAt: new Date().toISOString(),
      }
      saveStoredViewer(initialUrlInfo.chapter.id, v)
      return v
    }
    if (initialUrlInfo.chapter) {
      return getStoredViewer(initialUrlInfo.chapter.id)
    }
    return null
  })
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false)
  const [tripMultiplierMember, setTripMultiplierMember] = useState<Member | null>(null)

  // Chapter Members State: Isolated per chapter; dummy data is only for the landing page illustration demo
  const [membersList, setMembersList] = useState<Member[]>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true') {
      const cityParam = new URLSearchParams(window.location.search).get('city')
      const tokenParam = new URLSearchParams(window.location.search).get('c')
      return getDemoIllustrationMembers(cityParam || tokenParam || initialUrlInfo.chapter?.accessKey || undefined)
    }
    if (initialUrlInfo.chapter) {
      return getChapterMembers(initialUrlInfo.chapter.id)
    }
    return []
  })

  // Synchronize members whenever activeChapter changes
  useEffect(() => {
    if (activeChapter) {
      const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true'
      if (isDemo) {
        setMembersList(
          getDemoIllustrationMembers(
            activeChapter.city || activeChapter.slug || activeChapter.accessKey
          )
        )
      } else {
        const isDemoChapter =
          activeChapter.id === 'chap-titans' ||
          activeChapter.id === 'chap-blr-central' ||
          activeChapter.id === 'chap-mumbai-apex' ||
          activeChapter.organizationType === 'Executive Demo' ||
          (activeChapter.slug && activeChapter.slug.includes('demo'))

        if (isDemoChapter) {
          setMembersList(getChapterMembers(activeChapter.id))
        } else {
          setMembersList([])
        }

        fetchMembersFromServer(activeChapter.id).then((serverMembers) => {
          if (Array.isArray(serverMembers)) {
            setMembersList(serverMembers)
          }
        })
      }

      // Check URL or local storage for viewer identity on active chapter
      const params = new URLSearchParams(window.location.search)
      const urlViewer = params.get('viewer') || params.get('v') || params.get('member')
      if (urlViewer) {
        const v: ViewerIdentity = {
          name: urlViewer.trim(),
          isSelfExcluded: true,
          setAt: new Date().toISOString(),
        }
        saveStoredViewer(activeChapter.id, v)
        setViewerIdentity(v)
      } else {
        const stored = getStoredViewer(activeChapter.id)
        setViewerIdentity(stored)
      }
    } else {
      setViewerIdentity(null)
    }
  }, [activeChapter?.id, activeChapter?.city, activeChapter?.slug, activeChapter?.accessKey])

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRadius, setSelectedRadius] = useState<DistanceRadius>('ALL')

  // Geographic Anchor State (User GPS vs Destination Travel)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [destinationLocation, setDestinationLocation] = useState<{
    name: string
    latitude: number
    longitude: number
  } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Sync state with browser navigation history (back / forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('c') || params.get('chapter') || params.get('key') || params.get('token')
      if (token) {
        const ch = getChapterByToken(token)
        if (ch) {
          setActiveChapter(ch)
          setInvalidTokenAttempt(null)
        } else {
          setActiveChapter(null)
          setInvalidTokenAttempt(token)
        }
      } else {
        setActiveChapter(null)
        setInvalidTokenAttempt(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Secret Admin Portal shortcut: Ctrl + Shift + A / Cmd + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setIsAdminModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Select chapter using unguessable token and update browser URL (?c=<token>)
  const handleSelectChapter = (tokenOrSlug: string) => {
    const ch = getChapterByToken(tokenOrSlug)
    if (ch) {
      setActiveChapter(ch)
      setInvalidTokenAttempt(null)
      sessionStorage.setItem('proxima_active_token', ch.accessKey)
      const url = new URL(window.location.href)
      url.searchParams.delete('chapter')
      url.searchParams.delete('token')
      url.searchParams.delete('key')
      url.searchParams.set('c', ch.accessKey)
      window.history.pushState({}, '', url.toString())
    } else {
      setInvalidTokenAttempt(tokenOrSlug)
    }
  }

  // Reset from invalid token error back to clean Chapter Access Gateway
  const handleResetToGateway = () => {
    setInvalidTokenAttempt(null)
    setActiveChapter(null)
    sessionStorage.removeItem('proxima_active_token')
    const url = new URL(window.location.href)
    url.searchParams.delete('c')
    url.searchParams.delete('chapter')
    url.searchParams.delete('key')
    url.searchParams.delete('token')
    url.searchParams.delete('demo')
    window.history.pushState({}, '', url.pathname)
  }

  // Copy unique, unpredictable chapter URL for member distribution
  const handleCopyChapterLink = () => {
    if (!activeChapter) return
    const isProd = window.location.hostname === PRODUCTION_DOMAIN
    const url = isProd
      ? getProductionChapterShareUrl(activeChapter.accessKey)
      : getChapterShareUrl(activeChapter.accessKey)
    navigator.clipboard.writeText(url)
    setCopiedChapterLink(true)
    setTimeout(() => setCopiedChapterLink(false), 2500)
  }

  // 1. Strict Chapter Data Isolation & Renewal Filter:
  // On public map: ONLY display members who are active/renewed (isVisible !== false)
  const chapterMembers = useMemo(() => {
    if (!activeChapter) return []
    return membersList
      .filter((m) => m.isVisible !== false) // Non-renewed members are hidden from public chapter map
      .filter((member) => {
        // Direct chapter ID or cryptographic access key match
        if (member.chapterId && member.chapterId === activeChapter.id) return true
        if (member.chapterAccessKey && member.chapterAccessKey.toLowerCase() === activeChapter.accessKey.toLowerCase()) return true

        // Fallback string matching on chapter name / slug
        if (!member.chapter) return false
        const mChap = member.chapter.toLowerCase().trim()
        const chName = activeChapter.name.toLowerCase().trim()
        const chSlug = activeChapter.slug.toLowerCase().trim()
        const chKey = activeChapter.accessKey.toLowerCase().trim()

        return (
          mChap === chName ||
          mChap === chSlug ||
          mChap === chKey ||
          mChap.includes(chSlug)
        )
      })
  }, [membersList, activeChapter])

  // Reference Anchor Point for distance computations
  const anchorPoint = useMemo(() => {
    if (destinationLocation) {
      return {
        name: destinationLocation.name,
        latitude: destinationLocation.latitude,
        longitude: destinationLocation.longitude,
      }
    }
    if (userLocation) {
      return {
        name: 'My Current Location',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      }
    }
    // If viewer has a registered office in chapter roster, prioritize measuring from their office
    if (viewerIdentity && selectedRadius !== 'ALL') {
      const viewerMember = chapterMembers.find(
        (m) =>
          (viewerIdentity.memberId && m.id === viewerIdentity.memberId) ||
          m.name.toLowerCase().trim() === viewerIdentity.name.toLowerCase().trim()
      )
      if (viewerMember) {
        return {
          name: `${viewerIdentity.name}'s Office (${viewerMember.location.area || viewerMember.location.city})`,
          latitude: viewerMember.location.latitude,
          longitude: viewerMember.location.longitude,
        }
      }
    }
    // Default to active chapter's geographic center if radius is selected
    if (activeChapter && selectedRadius !== 'ALL') {
      return {
        name: `${activeChapter.name} Hub`,
        latitude: activeChapter.centerCoordinates[1],
        longitude: activeChapter.centerCoordinates[0],
      }
    }
    return null
  }, [userLocation, destinationLocation, selectedRadius, activeChapter, viewerIdentity, chapterMembers])

  // Intelligent Trip Multiplier Navigation
  const handleNavigateMember = (member: Member) => {
    if (!activeChapter) {
      openExternalNavigation(
        member.location.latitude,
        member.location.longitude,
        `${member.company} (${member.location.area})`
      )
      return
    }

    const opps = findNearbyTripOpportunities(
      member,
      chapterMembers,
      activeChapter.id,
      viewerIdentity?.name || 'Fellow Member',
      2.0
    )

    if (opps.length > 0) {
      // Trigger Trip Multiplier Radar
      setTripMultiplierMember(member)
    } else {
      logNavigationToMember(
        activeChapter.id,
        viewerIdentity?.name || 'Fellow Member',
        member
      )
      openExternalNavigation(
        member.location.latitude,
        member.location.longitude,
        `${member.company} (${member.location.area})`
      )
    }
  }

  // Save updated members to persistent storage with chapter isolation
  const handleUpdateMembers = (newMembers: Member[], targetChapterId?: string) => {
    const chapterId = targetChapterId || activeChapter?.id
    if (chapterId) {
      saveChapterMembers(chapterId, newMembers)
      // Only update active map view if currently viewing this chapter
      if (!activeChapter || activeChapter.id === chapterId) {
        setMembersList(newMembers)
      }
    } else {
      setMembersList(newMembers)
    }
  }

  // HTML5 Geolocation Trigger & Near Me Radar Popup
  const handleTriggerNearMe = () => {
    // 1. Close chapter directory drawer to eliminate screen clutter as requested
    setIsDrawerOpen(false)
    // 2. Open dedicated Near Me Proximity Radar popup
    setIsNearMeModalOpen(true)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false)
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setUserLocation(coords)
        setDestinationLocation(null)

        // Dynamically size radius to encompass nearest member
        if (chapterMembers.length > 0) {
          const minDistance = chapterMembers.reduce((min, m) => {
            const d = calculateHaversineDistance(
              coords.latitude,
              coords.longitude,
              m.location.latitude,
              m.location.longitude
            )
            return Math.min(min, d)
          }, Infinity)

          if (minDistance > 25) {
            setSelectedRadius('ALL')
          } else if (minDistance > 10) {
            setSelectedRadius(25)
          } else if (minDistance > 5) {
            setSelectedRadius(10)
          } else {
            setSelectedRadius(5)
          }
        } else {
          setSelectedRadius(10)
        }
      },
      (error) => {
        setIsLocating(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission was denied. You can search by destination area instead.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is currently unavailable.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.')
            break
          default:
            setLocationError('Unable to retrieve location.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }

  // Select Destination Area (e.g. "Anna Nagar")
  const handleSelectDestination = (
    dest: { name: string; latitude: number; longitude: number } | null
  ) => {
    setDestinationLocation(dest)
    if (dest) {
      setUserLocation(null)
      setSelectedRadius(5)
    }
  }

  // 2. Filter by Search Query, Category, and Distance Radius
  const processedMembers = useMemo(() => {
    return chapterMembers
      .map((member) => {
        let distanceKm: number | undefined

        if (anchorPoint) {
          distanceKm = calculateHaversineDistance(
            anchorPoint.latitude,
            anchorPoint.longitude,
            member.location.latitude,
            member.location.longitude
          )
        }

        return {
          ...member,
          distanceKm,
        }
      })
      .filter((member) => {
        // 1. Text Search Filter (Name, Company, Category, Area)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matches =
            member.name.toLowerCase().includes(q) ||
            member.company.toLowerCase().includes(q) ||
            member.category.toLowerCase().includes(q) ||
            member.location.area.toLowerCase().includes(q)
          if (!matches) return false
        }

        // 2. Distance Radius Filter
        if (anchorPoint && member.distanceKm !== undefined && selectedRadius !== 'ALL') {
          if (member.distanceKm > selectedRadius) {
            return false
          }
        }

        // 3. Smart Self-Exclusion (avoid showing my own name on the map)
        if (viewerIdentity?.isSelfExcluded && viewerIdentity.name) {
          const vName = viewerIdentity.name.toLowerCase().trim()
          const isSelf =
            (viewerIdentity.memberId && member.id === viewerIdentity.memberId) ||
            member.name.toLowerCase().trim() === vName ||
            member.name.toLowerCase().includes(vName)
          if (isSelf) return false
        }

        return true
      })
      .sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm
        }
        return a.name.localeCompare(b.name)
      })
  }, [chapterMembers, searchQuery, selectedRadius, anchorPoint, viewerIdentity])

  // Proximity Radar: Identify user's location & closest chapter member
  const nearestMemberAnalysis = useMemo(() => {
    if (!userLocation || chapterMembers.length === 0) return null

    let minDistance = Infinity
    let closestMember: Member | null = null

    for (const mem of chapterMembers) {
      const dist = calculateHaversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        mem.location.latitude,
        mem.location.longitude
      )
      if (dist < minDistance) {
        minDistance = dist
        closestMember = mem
      }
    }

    if (!closestMember) return null

    // Determine nearest known locality from hubs
    let nearestLocality: string | null = null
    let minHubDist = Infinity
    for (const hub of CHENNAI_HUBS) {
      const hd = calculateHaversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        hub.latitude,
        hub.longitude
      )
      if (hd < minHubDist) {
        minHubDist = hd
        nearestLocality = hub.areaName
      }
    }

    return {
      nearestMember: closestMember,
      distanceKm: minDistance,
      localityName: minHubDist <= 15 ? nearestLocality : null,
      isOutsideRadius:
        selectedRadius !== 'ALL' &&
        minDistance > (typeof selectedRadius === 'number' ? selectedRadius : Infinity),
    }
  }, [userLocation, chapterMembers, selectedRadius])

  // Case 1: Tampered or invalid URL token -> STRICT REJECTION
  if (invalidTokenAttempt) {
    return (
      <>
        <InvalidChapterScreen
          attemptedToken={invalidTokenAttempt}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
          onReset={handleResetToGateway}
        />

        {/* Admin Portal Modal (Lazy) */}
        <Suspense fallback={null}>
          <ErrorBoundary fallbackTitle="Portal Security Session" onReset={() => setIsAdminModalOpen(false)}>
            <AdminPortalModal
              isOpen={isAdminModalOpen}
              onClose={() => setIsAdminModalOpen(false)}
              members={membersList}
              onUpdateMembers={handleUpdateMembers}
              onSelectChapter={handleSelectChapter}
            />
          </ErrorBoundary>
        </Suspense>
      </>
    )
  }

  // Case 2: Clean root URL -> Crisp Public Landing Page
  if (!activeChapter) {
    return (
      <>
        <LandingPage
          onLaunchDemo={(accessKey?: string, cityName?: string) => {
            const chosenKey = accessKey || DEFAULT_CHAPTERS[0].accessKey
            const ch = getChapterByToken(chosenKey)
            const targetCity = cityName || ch?.city || chosenKey
            const demoMembers = getDemoIllustrationMembers(targetCity)
            setMembersList(demoMembers)
            setTriggerFlightAnimation(true)
            handleSelectChapter(chosenKey)
            const url = new URL(window.location.href)
            url.searchParams.set('c', chosenKey)
            url.searchParams.set('demo', 'true')
            if (targetCity) {
              url.searchParams.set('city', targetCity.toLowerCase())
            }
            window.history.pushState({}, '', url.toString())
          }}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
          onOpenBrandStory={() => setIsBrandStoryOpen(true)}
          onOpenCreateChapter={() => {
            setInitialVipToken('')
            setIsCreateChapterOpen(true)
          }}
          onOpenSecurity={openSecurityModal}
          onOpenPrivacy={openPrivacyModal}
          onOpenTerms={openTermsModal}
        />

        <Suspense fallback={null}>
          {/* Create Chapter Onboarding Modal (Self-serve or Free VIP Token) */}
          <CreateChapterModal
            isOpen={isCreateChapterOpen}
            onClose={() => setIsCreateChapterOpen(false)}
            initialVipToken={initialVipToken}
            onChapterCreated={(chapter) => {
              setActiveChapter(chapter)
              setIsCreateChapterOpen(false)
            }}
            onOpenAdminLogin={() => {
              setIsCreateChapterOpen(false)
              setIsAdminModalOpen(true)
            }}
          />

          {/* Admin Portal Modal */}
          <ErrorBoundary fallbackTitle="Portal Security Session" onReset={() => setIsAdminModalOpen(false)}>
            <AdminPortalModal
              isOpen={isAdminModalOpen}
              onClose={() => setIsAdminModalOpen(false)}
              members={membersList}
              onUpdateMembers={handleUpdateMembers}
              onSelectChapter={handleSelectChapter}
            />
          </ErrorBoundary>

          {/* Brand Story Modal */}
          <BrandStoryModal
            isOpen={isBrandStoryOpen}
            onClose={() => setIsBrandStoryOpen(false)}
          />

          {/* Legal Modal (Privacy Policy & Terms) */}
          <LegalModal
            isOpen={legalModalState.isOpen}
            onClose={closeLegalModal}
            initialTab={legalModalState.tab}
            chapterName="Yugam National Network"
          />
        </Suspense>
      </>
    )
  }

  // Case 3: Validated & Authorized Chapter Session
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden flex flex-col bg-[#F5F5F7] select-none">
      {/* Top Floating Master Dynamic Island Console */}
      <div className="absolute top-0 left-0 right-0 z-30 p-2.5 sm:p-4 flex flex-col gap-2 pointer-events-none max-w-3xl mx-auto w-full pt-safe">
        <UnifiedCommandBar
          onResetToGateway={handleResetToGateway}
          onShareMap={handleCopyChapterLink}
          copiedShareLink={copiedChapterLink}
          onOpenLegal={openPrivacyModal}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
          isDemo={
            (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true') ||
            Boolean(activeChapter.slug?.includes('demo')) ||
            Boolean(activeChapter.name?.toLowerCase().includes('demo'))
          }
          chapterName={activeChapter.name}
          viewerName={viewerIdentity?.name}
          onOpenViewerModal={() => setIsViewerModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectDestination={handleSelectDestination}
          onTriggerNearMe={handleTriggerNearMe}
          isLocating={isLocating}
          activeDestinationName={anchorPoint?.name || null}
          locationError={locationError}
          onClearLocationError={() => setLocationError(null)}
          selectedRadius={selectedRadius}
          onSelectRadius={setSelectedRadius}
          hasAnchorPoint={!!anchorPoint}
          matchCount={processedMembers.length}
          onToggleDirectory={() => setIsDrawerOpen((prev) => !prev)}
          isDirectoryOpen={isDrawerOpen}
        />

        {/* Live Proximity Radar Card (Informs user of detected position & nearest member distance) */}
        {userLocation && nearestMemberAnalysis && (
          <div className="pointer-events-auto ios-glass p-3 sm:px-4 sm:py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,113,227,0.12)] border border-blue-200/80 bg-white/95 animate-in fade-in slide-in-from-top-2 duration-300 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-[#0071E3] ring-1 ring-blue-500/20">
                <Navigation className="w-4 h-4 text-[#0071E3]" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Your Location: <strong className="text-slate-800">{nearestMemberAnalysis.localityName ? `Near ${nearestMemberAnalysis.localityName}` : 'GPS Position'}</strong>
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">
                  Nearest Member: <span className="text-[#0071E3] font-extrabold">{nearestMemberAnalysis.nearestMember.name}</span>{' '}
                  <span className="text-slate-500 font-normal">({nearestMemberAnalysis.nearestMember.company})</span> —{' '}
                  <span className="font-mono text-emerald-600 font-extrabold">
                    {nearestMemberAnalysis.distanceKm < 1
                      ? `${Math.round(nearestMemberAnalysis.distanceKm * 1000)} m`
                      : `${nearestMemberAnalysis.distanceKm.toFixed(1)} km`}
                  </span>{' '}
                  away in {nearestMemberAnalysis.nearestMember.location.area}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false)
                  setIsNearMeModalOpen(true)
                }}
                className="ios-press px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-[11px] font-bold rounded-full shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Radar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserLocation(null)
                  setSelectedRadius('ALL')
                }}
                className="p-1 hover:bg-black/5 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Dismiss Location Detection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive MapLibre Fullscreen Canvas */}
      <div className="absolute inset-0 w-full h-full">
        <MapContainer
          members={processedMembers}
          selectedMemberId={selectedMember?.id || null}
          onSelectMember={(member) => {
            setSelectedMember(member)
          }}
          onOpenProfile={(member) => {
            setProfileModalMember(member)
          }}
          userLocation={userLocation}
          destinationLocation={destinationLocation}
          radiusFilter={selectedRadius}
          anchorPoint={anchorPoint}
          activeChapter={activeChapter}
          triggerFlightAnimation={triggerFlightAnimation}
          onFlightComplete={() => setTriggerFlightAnimation(false)}
          onNavigateMember={handleNavigateMember}
        />
      </div>

      {/* Google Maps Style Collapsible Left Side Drawer */}
      <MemberSideDrawer
        members={processedMembers}
        selectedMemberId={selectedMember?.id || null}
        onSelectMember={(member) => {
          setSelectedMember(member)
        }}
        onOpenProfile={(member) => {
          setProfileModalMember(member)
        }}
        hasAnchorPoint={!!anchorPoint}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onResetToGateway={handleResetToGateway}
        isFlightActive={triggerFlightAnimation}
        onOpenSecurity={openSecurityModal}
        onOpenPrivacy={openPrivacyModal}
        onOpenTerms={openTermsModal}
        isOpen={isDrawerOpen && !isNearMeModalOpen}
        onToggleOpen={setIsDrawerOpen}
        hideFloatingPrompt={isNearMeModalOpen}
        onClearFilters={() => {
          setSearchQuery('')
          setSelectedRadius('ALL')
        }}
        onNavigateMember={handleNavigateMember}
      />

      {/* Sleek Floating Member Detail Card (Apple Maps Style) */}
      {selectedMember && (
        <MemberBottomCard
          member={selectedMember}
          membersList={processedMembers}
          onSelectMember={(m) => setSelectedMember(m)}
          onOpenProfile={(m) => setProfileModalMember(m)}
          onOpenDirectory={() => setIsDrawerOpen(true)}
          onNavigateMember={handleNavigateMember}
        />
      )}

      {/* Executive Profile Modal Dossier */}
      {profileModalMember && (
        <MemberProfileModal
          member={profileModalMember}
          onClose={() => setProfileModalMember(null)}
          onNavigateMember={handleNavigateMember}
        />
      )}

      {/* Lazy Modals Wrapped in Suspense */}
      <Suspense fallback={null}>
        {/* Near Me Proximity Radar Modal Popup */}
        <NearMeRadarModal
          isOpen={isNearMeModalOpen}
          onClose={() => setIsNearMeModalOpen(false)}
          userLocation={userLocation}
          isLocating={isLocating}
          locationError={locationError}
          onRetryLocation={handleTriggerNearMe}
          members={processedMembers}
          allChapterMembers={chapterMembers}
          selectedRadius={selectedRadius}
          onSelectRadius={setSelectedRadius}
          onSelectMember={(m) => {
            setSelectedMember(m)
            setIsNearMeModalOpen(false)
          }}
          onOpenProfile={(m) => setProfileModalMember(m)}
          onOpenDirectory={() => {
            setIsNearMeModalOpen(false)
            setIsDrawerOpen(true)
          }}
          activeChapter={activeChapter}
        />

        {/* Create Chapter Onboarding Modal */}
        <CreateChapterModal
          isOpen={isCreateChapterOpen}
          onClose={() => setIsCreateChapterOpen(false)}
          initialVipToken={initialVipToken}
          onChapterCreated={(chapter) => {
            setActiveChapter(chapter)
            setIsCreateChapterOpen(false)
          }}
          onOpenAdminLogin={() => {
            setIsCreateChapterOpen(false)
            setIsAdminModalOpen(true)
          }}
        />

        {/* Admin Portal Modal */}
        <ErrorBoundary fallbackTitle="Portal Security Session" onReset={() => setIsAdminModalOpen(false)}>
          <AdminPortalModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            members={membersList}
            onUpdateMembers={handleUpdateMembers}
            onSelectChapter={handleSelectChapter}
            contextChapter={activeChapter}
          />
        </ErrorBoundary>

        {/* Legal Modal: Enterprise Security Policy, Privacy Policy & Terms and Conditions */}
        <LegalModal
          isOpen={legalModalState.isOpen}
          onClose={closeLegalModal}
          initialTab={legalModalState.tab}
          chapterName={activeChapter.name}
        />

        {/* Brand Story Modal */}
        <BrandStoryModal
          isOpen={isBrandStoryOpen}
          onClose={() => setIsBrandStoryOpen(false)}
        />

        {/* Personalized Viewer Identity Modal (No password, remembers member identity) */}
        {activeChapter && (
          <ViewerIdentityModal
            isOpen={isViewerModalOpen}
            onClose={() => setIsViewerModalOpen(false)}
            chapterName={activeChapter.name}
            chapterMembers={chapterMembers}
            initialViewerName={viewerIdentity?.name || ''}
            onSaveViewer={(info) => {
              const v: ViewerIdentity = {
                name: info.name,
                memberId: info.memberId,
                isSelfExcluded: info.isSelfExcluded,
                setAt: new Date().toISOString(),
              }
              saveStoredViewer(activeChapter.id, v)
              setViewerIdentity(v)
            }}
            onBrowseAsGuest={() => {
              clearStoredViewer(activeChapter.id)
              setViewerIdentity(null)
            }}
          />
        )}

        {/* Trip Multiplier Radar Modal (Alerts nearby unmet & overdue members) */}
        {tripMultiplierMember && activeChapter && (
          <TripMultiplierModal
            isOpen={!!tripMultiplierMember}
            onClose={() => setTripMultiplierMember(null)}
            primaryMember={tripMultiplierMember}
            allChapterMembers={chapterMembers}
            chapterId={activeChapter.id}
            chapterName={activeChapter.name}
            viewerName={viewerIdentity?.name || 'Fellow Member'}
            onLaunchGoogleMaps={(target) => {
              openExternalNavigation(
                target.location.latitude,
                target.location.longitude,
                `${target.company} (${target.location.area})`
              )
            }}
          />
        )}
      </Suspense>
    </div>
  )
}

export default App
