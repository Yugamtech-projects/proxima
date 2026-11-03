import React, { useState, useEffect } from 'react'
import {
  X,
  Compass,
  Gift,
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  launchRazorpaySubscriptionCheckout,
  type RenewalPlanKey,
} from '../../data/chapterLicensing'
import { onboardChapterWithServer } from '../../services/proximaApi'
import { createNewChapter } from '../../data/chapters'
import { registerNewChapterAdmin } from '../../data/adminAccounts'

interface CreateChapterModalProps {
  isOpen: boolean
  onClose: () => void
  initialVipToken?: string
  onChapterCreated?: (chapter: any) => void
  onOpenAdminLogin?: (adminEmail?: string) => void
}

export const CreateChapterModal: React.FC<CreateChapterModalProps> = ({
  isOpen,
  onClose,
  initialVipToken,
  onChapterCreated,
  onOpenAdminLogin,
}) => {
  const [chapterName, setChapterName] = useState('')
  const [city, setCity] = useState('Chennai')
  const [organizationType, setOrganizationType] = useState('BNI')
  const [customOrganization, setCustomOrganization] = useState('')
  const [adminLoginId, setAdminLoginId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [selectedPlanKey, setSelectedPlanKey] = useState<RenewalPlanKey>('ANNUAL')
  const [vipToken, setVipToken] = useState(initialVipToken || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createdResult, setCreatedResult] = useState<any | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (initialVipToken) {
      setVipToken(initialVipToken)
    }
  }, [initialVipToken])

  // Automatically suggest a clean admin login ID based on typed chapter name
  const handleChapterNameChange = (val: string) => {
    setChapterName(val)
    if (!adminLoginId || adminLoginId.endsWith('.admin')) {
      const slug = val
        .toLowerCase()
        .replace(/chapter/gi, '')
        .replace(/[^a-z0-9]/g, '')
      if (slug) {
        setAdminLoginId(`${slug}.admin`)
      }
    }
  }

  const isVipApplied = Boolean(
    vipToken && vipToken.trim().startsWith('free_pass_')
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!chapterName.trim() || !city.trim() || !adminLoginId.trim() || !adminPassword.trim()) {
      setErrorMessage('Please fill in Chapter Name, City, and Admin Credentials.')
      return
    }

    setIsSubmitting(true)

    const effectiveOrgType =
      organizationType === 'Other'
        ? (customOrganization.trim() || 'Independent Forum')
        : organizationType

    // CASE 1: 100% Free VIP Onboarding Token / Team Credit Pass
    if (isVipApplied) {
      try {
        const result = await onboardChapterWithServer({
          chapterName: chapterName.trim(),
          city: city.trim(),
          organizationType: effectiveOrgType,
          adminLoginId: adminLoginId.trim(),
          adminPassword: adminPassword.trim(),
          vipToken: vipToken.trim(),
        })

        if (result.success && result.chapter) {
          // Sync with local client storage as well
          const localChapter = createNewChapter({
            name: result.chapter.name,
            city: result.chapter.city,
            region: 'India',
            organizationType: effectiveOrgType,
            centerCoordinates: [80.2155, 13.0878],
            defaultZoom: 12.5,
          })
          registerNewChapterAdmin({
            chapterId: localChapter.id,
            chapterSlug: localChapter.slug,
            chapterName: localChapter.name,
            email: result.admin.email,
            passwordPlain: adminPassword.trim(),
          })

          setCreatedResult({
            ...result,
            shareUrl: `${window.location.origin}/?c=${result.chapter.accessKey}`,
          })
          if (onChapterCreated) onChapterCreated(result.chapter)
        } else {
          setErrorMessage(result.error || 'Failed to activate VIP chapter pass.')
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error creating chapter.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // CASE 2: Commercial Razorpay Payment (6-Month or Annual Plan)
    try {
      await launchRazorpaySubscriptionCheckout({
        chapter: {
          id: `chap-${Date.now().toString(36)}`,
          slug: chapterName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: chapterName.trim(),
          city: city.trim(),
          region: 'India',
          organizationType: effectiveOrgType,
          accessKey: `px_${Date.now().toString(36)}`,
          centerCoordinates: [80.2155, 13.0878],
          defaultZoom: 12.5,
        },
        adminEmail: adminLoginId.includes('@') ? adminLoginId : `${adminLoginId}@proxima.network`,
        planKey: selectedPlanKey,
        onSuccess: async (paymentId, signature) => {
          const onboardRes = await onboardChapterWithServer({
            chapterName: chapterName.trim(),
            city: city.trim(),
            organizationType: effectiveOrgType,
            adminLoginId: adminLoginId.trim(),
            adminPassword: adminPassword.trim(),
            planKey: selectedPlanKey,
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
          })

          if (onboardRes.success && onboardRes.chapter) {
            setCreatedResult({
              ...onboardRes,
              shareUrl: `${window.location.origin}/?c=${onboardRes.chapter.accessKey}`,
            })
            if (onChapterCreated) onChapterCreated(onboardRes.chapter)
          } else {
            setErrorMessage(onboardRes.error || 'Payment recorded but chapter registration failed.')
          }
          setIsSubmitting(false)
        },
        onDismiss: () => {
          setIsSubmitting(false)
        },
        onFailure: (err) => {
          setIsSubmitting(false)
          setErrorMessage(err.message || 'Payment was cancelled or could not be processed.')
        },
      })
    } catch (err: any) {
      setIsSubmitting(false)
      setErrorMessage(err.message || 'Failed connecting to Razorpay.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white w-full max-w-lg rounded-[32px] p-6 shadow-2xl border border-black/10 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0071E3] flex items-center justify-center border border-blue-100">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F] font-display">
                {createdResult
                  ? 'Chapter Map Activated!'
                  : isVipApplied
                  ? 'Launch Free Prototype Chapter'
                  : 'Launch Your Chapter Map'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isVipApplied
                  ? 'Free 1-Year Pass Active'
                  : 'Create Your Chapter Map'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* State 1: Successfully Created */}
        {createdResult ? (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <h4 className="text-sm font-bold">
                  {createdResult.chapter.name} is Live!
                </h4>
              </div>
              <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                Your chapter map has been created with private access protection.
                {createdResult.isComplimentary && ' Free 1-year access has been activated.'}
              </p>
            </div>

            {/* Public Map Link */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Member Map Link (Share with Members)
              </label>
              <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-black/10 font-mono text-xs">
                <span className="text-[#0071E3] font-bold truncate">
                  {createdResult.shareUrl}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdResult.shareUrl)
                    setCopiedLink(true)
                    setTimeout(() => setCopiedLink(false), 2000)
                  }}
                  className="ios-press px-3 py-1.5 rounded-lg bg-[#0071E3] text-white text-xs font-bold flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Login Credentials Box */}
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/60 space-y-2 text-xs">
              <span className="font-bold text-slate-800 uppercase tracking-wider block text-[10px]">
                Chapter Administrator Credentials
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">Login ID:</span>
                  <span className="font-bold font-mono text-slate-900">{createdResult.admin.loginId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Password:</span>
                  <span className="font-bold font-mono text-slate-900">{adminPassword}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  if (onOpenAdminLogin) onOpenAdminLogin(createdResult.admin.loginId)
                }}
                className="w-full ios-press py-3 px-4 rounded-xl btn-proxima-primary text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Login to Chapter Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Creation Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                {errorMessage}
              </div>
            )}

            {/* VIP Pass Banner if token active */}
            {isVipApplied && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5">
                <Gift className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-emerald-900">
                    VIP Free Chapter Pass Applied (100% Team Credit)
                  </h5>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Razorpay commercial subscription fee is waived. You will receive an active 1-Year prototype license.
                  </p>
                </div>
              </div>
            )}

            {/* Chapter Details */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Chapter Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={chapterName}
                    onChange={(e) => handleChapterNameChange(e.target.value)}
                    placeholder="e.g. Coimbatore Pioneers"
                    className="w-full text-xs font-semibold py-2.5 px-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Chennai, Coimbatore, Bengaluru"
                    className="w-full text-xs font-semibold py-2.5 px-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                  />
                </div>
              </div>

              {/* Business Forum / Network Organization */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Business Forum / Organization *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'BNI', label: 'BNI' },
                    { key: 'CNI', label: 'CNI' },
                    { key: 'Rotary', label: 'Rotary' },
                    { key: 'Lions Club', label: 'Lions Club' },
                    { key: 'TiE', label: 'TiE' },
                    { key: 'Yi', label: 'Yi (CII)' },
                    { key: 'Round Table', label: 'Round Table' },
                    { key: 'Other', label: 'Other' },
                  ].map((forum) => (
                    <button
                      key={forum.key}
                      type="button"
                      onClick={() => setOrganizationType(forum.key)}
                      className={`ios-press py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                        organizationType === forum.key
                          ? 'btn-depth-selected'
                          : 'btn-depth-secondary'
                      }`}
                    >
                      {forum.label}
                    </button>
                  ))}
                </div>

                {organizationType === 'Other' && (
                  <input
                    type="text"
                    required
                    value={customOrganization}
                    onChange={(e) => setCustomOrganization(e.target.value)}
                    placeholder="Enter your forum or network name (e.g. Corporate Forum, Chamber of Commerce)"
                    className="mt-2 w-full text-xs font-semibold py-2.5 px-3.5 rounded-xl border border-slate-200/90 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                  />
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports BNI, CNI, Rotary, Lions Club, TiE, and independent business forums.
                </p>
              </div>

              {/* Admin Credentials Setup */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(15,23,42,0.03)] space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <KeyRound className="w-4 h-4 text-[#0071E3]" />
                  <span>Your Chapter Admin Login</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Login ID
                    </label>
                    <input
                      type="text"
                      required
                      value={adminLoginId}
                      onChange={(e) => setAdminLoginId(e.target.value)}
                      placeholder="e.g. superstars.admin"
                      className="w-full text-xs font-mono font-bold py-2.5 px-3.5 rounded-xl border border-slate-200/90 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Create Password
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Set strong password"
                        className="w-full text-xs font-mono py-2.5 pl-3.5 pr-10 rounded-xl border border-slate-200/90 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        tabIndex={-1}
                        aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                      >
                        {showAdminPassword ? (
                          <EyeOff className="w-4 h-4 text-slate-600" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Selection (Only if NOT a free pass) */}
              {!isVipApplied && (
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Choose Licensing Plan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Semi-Annual */}
                    <div
                      onClick={() => setSelectedPlanKey('SEMI_ANNUAL')}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                        selectedPlanKey === 'SEMI_ANNUAL'
                          ? 'card-depth-selected'
                          : 'card-depth-selectable'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">6 Months</span>
                        <span className="text-xs font-mono font-bold text-slate-900">₹1,194</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">₹199 / month billed semi-annually</p>
                    </div>

                    {/* Annual */}
                    <div
                      onClick={() => setSelectedPlanKey('ANNUAL')}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all relative ${
                        selectedPlanKey === 'ANNUAL'
                          ? 'card-depth-selected'
                          : 'card-depth-selectable'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">1 Year (Annual)</span>
                        <span className="text-xs font-mono font-bold text-slate-900">₹1,999</span>
                      </div>
                      <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                        Save ₹389 · 2 Months Free
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full ios-press py-3 px-5 rounded-xl btn-proxima-primary text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Processing Activation...</span>
                ) : isVipApplied ? (
                  <>
                    <Gift className="w-4 h-4 text-emerald-300" />
                    <span>Activate 1-Year Free Prototype Chapter</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-white" />
                    <span>
                      Pay {selectedPlanKey === 'ANNUAL' ? '₹1,999' : '₹1,194'} & Launch Chapter Map
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
