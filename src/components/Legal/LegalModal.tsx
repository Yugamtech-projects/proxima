import React, { useState } from 'react'
import {
  ShieldCheck,
  Scale,
  FileText,
  X,
  Lock,
  CheckCircle2,
  Mail,
  Copy,
  Check,
  Printer,
  ChevronRight,
  Globe,
  Building2,
  Ban,
  FileCode,
  ShieldAlert,
} from 'lucide-react'

export type LegalTab = 'security' | 'privacy' | 'terms'

interface LegalModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: LegalTab
  chapterName?: string
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
  chapterName = 'Chapter Network',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab)
  const [copiedEmail, setCopiedEmail] = useState(false)

  // Keep state in sync with initialTab if reopened
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  if (!isOpen) return null

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-[#F8F9FA] w-full max-w-4xl rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.45)] border border-white/70 overflow-hidden flex flex-col max-h-[92vh] text-[#1D1D1F]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md flex-shrink-0">
              {activeTab === 'security' && <Lock className="w-5 h-5 text-sky-400" />}
              {activeTab === 'privacy' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              {activeTab === 'terms' && <Scale className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[#0F172A] tracking-tight font-display">
                  {activeTab === 'security' && 'Security Policy'}
                  {activeTab === 'privacy' && 'Privacy Policy'}
                  {activeTab === 'terms' && 'Terms & Conditions of Use'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    activeTab === 'security'
                      ? 'bg-sky-50 text-sky-800 border-sky-200/70'
                      : activeTab === 'privacy'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                      : 'bg-amber-50 text-amber-800 border-amber-200/70'
                  }`}
                >
                  {activeTab === 'security' && 'Private Directory'}
                  {activeTab === 'privacy' && 'Minimal Data Storage'}
                  {activeTab === 'terms' && 'Member Terms'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                PROXIMA by Yugam Consulting · {chapterName} · Governed by Indian Law (Jurisdiction: Chennai, Tamil Nadu)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="ios-press hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="ios-press w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Tab Selection Bar */}
        <div className="px-6 py-2.5 bg-slate-50/90 border-b border-black/[0.05] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-200/70 rounded-2xl flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`ios-press flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
              <span>Security Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`ios-press flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`ios-press flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>Terms & Conditions</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 font-mono-num">
            <span>Verified Version 2.4</span>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-xs text-slate-600 leading-relaxed no-scrollbar select-text">
          
          {/* ========================================================================= */}
          {/* TAB 1: SECURITY POLICY                                                   */}
          {/* ========================================================================= */}
          {activeTab === 'security' && (
            <div className="space-y-5 max-w-3xl mx-auto animate-in fade-in">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/90 to-sky-50/50 border border-blue-200/70 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
                  <Lock className="w-4 h-4 text-[#0071E3]" />
                  <span>Privacy & Security Standards</span>
                </div>
                <p className="text-xs text-blue-950/85 leading-relaxed font-normal">
                  Proxima by Yugam Consulting is built to keep your chapter directory secure and private. Each chapter has its own private link so member details are never visible to the public web, search engines, or other chapters.
                </p>
              </div>

              {/* Section 1: Cryptographic Tenant Isolation */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>1. Private Chapter Links</span>
                  </h4>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 font-mono-num">
                    Secure Links
                  </span>
                </div>
                <p>
                  Every chapter in Proxima gets a unique, secure link. Each chapter's members and admin settings are kept separate. No one outside your chapter can search, see, or scrape your member directory.
                </p>
              </div>

              {/* Section 2: Zero Public Indexing & Anti-Scraping */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>2. Anti-Harvesting & Zero Search Bot Exposure</span>
                  </h4>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                    No Crawlers
                  </span>
                </div>
                <p>
                  Proxima blocks automated scrapers and search engines (like Google and Bing). Member lists, phone numbers, and office addresses are never published to public search engines.
                </p>
              </div>

              {/* Section 3: In-Transit Encryption & Credential Hashing */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3. Encrypted Connections & Secure Passwords</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Encrypted
                  </span>
                </div>
                <p>
                  All connections are encrypted with secure TLS protocols. Chapter passwords are encrypted before they are saved—we never store plain text passwords.
                </p>
              </div>

              {/* Section 4: Ephemeral Client-Side Geolocation */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <Globe className="w-3.5 h-3.5 text-purple-600" />
                    <span>4. Private Device Location</span>
                  </h4>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
                    Zero GPS Logs
                  </span>
                </div>
                <p>
                  When you use &quot;Near Me&quot;, distance calculations run directly on your phone or computer. Proxima does not track, save, or record your GPS location or travel history on any server.
                </p>
              </div>

              {/* Security Contact Card */}
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 font-display">
                    <Mail className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Security Incident & Audit Contact</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Official Security Escalations: <code className="font-mono font-bold text-slate-800">security@oruyugam.com</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyEmail('security@oruyugam.com')}
                  className="ios-press self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#0071E3] border border-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PRIVACY POLICY                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-5 max-w-3xl mx-auto animate-in fade-in">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/60 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Privacy Policy</span>
                </div>
                <p className="text-xs text-emerald-950/85 leading-relaxed font-normal">
                  Proxima by Yugam Consulting is built exclusively for verified business chapters. We only store essential business contact details so chapter members can connect. We never show ads or sell your data.
                </p>
              </div>

              {/* Section 1: Data Minimization */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <FileText className="w-3.5 h-3.5 text-slate-700" />
                    <span>1. Commercial Data Collected</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    Minimization Standard
                  </span>
                </div>
                <p>
                  Proxima collects only executive commercial coordinates provided by members or chapter leadership during enrollment:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <strong className="text-slate-800 block mb-0.5">Commercial Office Coordinates:</strong>
                    Physical address, area locality, and latitude/longitude coordinates of member offices, showrooms, and business premises.
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <strong className="text-slate-800 block mb-0.5">Professional Business Profile:</strong>
                    Member name, company entity, business category classification, and profile headshot.
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <strong className="text-slate-800 block mb-0.5">Official Direct Channels:</strong>
                    Official business mobile phone, direct WhatsApp connect link, and corporate website.
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <strong className="text-slate-800 block mb-0.5">Zero Behavioral Trackers:</strong>
                    No browsing history, device fingerprinting, or biometric identification is collected or processed.
                  </div>
                </div>
              </div>

              {/* Section 2: Zero Third-Party Monetization */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>2. Zero Advertising & Broker Monetization</span>
                  </h4>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/50">
                    No Data Sales
                  </span>
                </div>
                <p>
                  We do not sell, rent, license, or exchange member data with marketing agencies, telemarketers, or commercial lead brokers. Proxima operates completely free of third-party advertising pixels, ad networks, and behavioral retargeting scripts.
                </p>
              </div>

              {/* Section 3: Member Visibility & Delisting Rights */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3. Member Visibility & Delisting Controls</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    Real-Time Control
                  </span>
                </div>
                <ul className="space-y-1.5 text-slate-600 list-none pl-0">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Real-Time Visibility Toggle:</strong> Chapter administrators can toggle a member&apos;s map visibility instantly upon renewal changes or membership departure.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Coordinate Correction:</strong> Members relocating their office or showroom can request pin recalibration through their chapter administrator.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Permanent Deletion:</strong> Former members can request complete deletion of their commercial records upon membership conclusion.</span>
                  </li>
                </ul>
              </div>

              {/* Privacy Officer Contact Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5 font-display">
                    <Mail className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Privacy Officer & Member Inquiries</span>
                  </div>
                  <p className="text-[11px] text-emerald-900/80 mt-0.5">
                    Official Privacy Inquiries: <code className="font-mono font-bold text-emerald-950">privacy@oruyugam.com</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyEmail('privacy@oruyugam.com')}
                  className="ios-press self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TERMS & CONDITIONS                                                */}
          {/* ========================================================================= */}
          {activeTab === 'terms' && (
            <div className="space-y-5 max-w-3xl mx-auto animate-in fade-in">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 border border-amber-200/60 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                  <Scale className="w-4 h-4 text-amber-600" />
                  <span>Binding Terms of Service & Membership Covenant</span>
                </div>
                <p className="text-xs text-amber-950/85 leading-relaxed font-normal">
                  By accessing Proxima by Yugam Consulting via an authorized chapter access key or token, you enter into a legally binding agreement with Yugam Consulting. Access is restricted exclusively to authorized chapter members, chapter leadership, and inducted business affiliates.
                </p>
              </div>

              {/* Clause 1: Anti-Scraping Mandate */}
              <div className="ios-glass p-5 rounded-2xl border border-red-200/70 bg-red-50/30 space-y-2.5">
                <div className="flex items-center justify-between border-b border-red-200/60 pb-2">
                  <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <Ban className="w-3.5 h-3.5 text-red-600" />
                    <span>1. Strict Anti-Scraping & Non-Harvesting Mandate</span>
                  </h4>
                  <span className="text-[10px] font-bold text-red-800 bg-red-100/90 px-2 py-0.5 rounded-full border border-red-300/60">
                    Zero Tolerance
                  </span>
                </div>
                <p className="text-red-950/90 font-medium">
                  Automated scraping, crawling, bulk indexing, script extraction, or systematic downloading of member phone numbers, WhatsApp contacts, office coordinates, or headshots is <strong>strictly prohibited</strong>.
                </p>
                <ul className="space-y-1 text-[11px] text-red-900/80 list-disc pl-4">
                  <li>No member directory data may be aggregated into telemarketing lead banks or third-party CRM databases.</li>
                  <li>No automated promotional broadcasting or spamming is permitted through extracted member numbers.</li>
                  <li>Violations trigger immediate token invalidation, chapter notification, and legal remedies under applicable civil and cyber laws.</li>
                </ul>
              </div>

              {/* Clause 2: Authorized Commercial Purpose */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <Building2 className="w-3.5 h-3.5 text-slate-700" />
                    <span>2. Authorized B2B Commercial Purpose</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    B2B Utility
                  </span>
                </div>
                <p>
                  Proxima is engineered solely to facilitate <strong>one-to-one executive business meetings</strong>, mutual chapter referrals, and physical visits to verified member showrooms and commercial offices. Any other commercial aggregation requires written consent from Yugam Consulting.
                </p>
              </div>

              {/* Clause 3: Accuracy of Self-Reported Locations */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <FileCode className="w-3.5 h-3.5 text-slate-700" />
                    <span>3. Accuracy of Self-Reported Commercial Locations</span>
                  </h4>
                </div>
                <p>
                  Members warrant that coordinates and address locations submitted represent genuine commercial offices, customer suites, factories, or consulting spaces. Users agree to hold Yugam Consulting and chapter administrators harmless regarding third-party navigation variations.
                </p>
              </div>

              {/* Clause 4: Intellectual Property */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <Lock className="w-3.5 h-3.5 text-slate-700" />
                    <span>4. Proprietary Intellectual Property</span>
                  </h4>
                </div>
                <p>
                  The Proxima platform, spatial map rendering engine, radar calculations, visual styling systems, and source code are the exclusive intellectual property of Yugam Consulting. No unauthorized decompilation, redistribution, or white-labeling is permitted.
                </p>
              </div>

              {/* Clause 5: Governing Law & Jurisdiction */}
              <div className="ios-glass p-5 rounded-2xl border border-black/[0.06] bg-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
                    <Globe className="w-3.5 h-3.5 text-slate-700" />
                    <span>5. Governing Law & Jurisdiction</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                    Chennai, India
                  </span>
                </div>
                <p>
                  These Terms are governed strictly by the laws of India. Any claims, disputes, or legal actions arising under this Agreement shall fall within the exclusive jurisdiction of the competent courts in <strong>Chennai, Tamil Nadu, India</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-3.5 border-t border-black/[0.06] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Proxima by Yugam Consulting · Enterprise Chapter Network Security</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="ios-press w-full sm:w-auto px-6 py-2 bg-[#1D1D1F] hover:bg-black text-white text-xs font-bold rounded-full transition-all shadow-xs cursor-pointer font-display"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
