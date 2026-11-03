import fs from 'node:fs'
import path from 'node:path'

console.log('--- PROXIMA LEGAL & STATUTORY COMPLIANCE AUDIT ---')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passed++
  } else {
    console.error(`[FAIL] ${message}`)
    failed++
  }
}

// 1. Verify docs/PRIVACY_POLICY.md exists and contains DPDP Act 2023 clauses
const privacyPath = path.resolve('docs/PRIVACY_POLICY.md')
assert(fs.existsSync(privacyPath), 'docs/PRIVACY_POLICY.md exists on disk')
const privacyContent = fs.readFileSync(privacyPath, 'utf8')
assert(privacyContent.includes('Digital Personal Data Protection Act, 2023'), 'Privacy Policy references DPDP Act 2023')
assert(privacyContent.includes('Data Principal'), 'Privacy Policy defines Data Principal rights')
assert(privacyContent.includes('Right to Erasure'), 'Privacy Policy specifies Right to Erasure / Right to be Forgotten')
assert(privacyContent.includes('Grievance Redressal Officer'), 'Privacy Policy designates Grievance Redressal Officer')
assert(privacyContent.includes('privacy@yugamhq.com'), 'Privacy Policy provides official statutory escalation email')
assert(privacyContent.toLowerCase().includes('zero cross-chapter exposure'), 'Privacy Policy mandates tenant isolation')

// 2. Verify docs/TERMS_AND_CONDITIONS.md exists and contains vital protective covenants
const termsPath = path.resolve('docs/TERMS_AND_CONDITIONS.md')
assert(fs.existsSync(termsPath), 'docs/TERMS_AND_CONDITIONS.md exists on disk')
const termsContent = fs.readFileSync(termsPath, 'utf8')
assert(termsContent.includes('PROHIBITION AGAINST SCRAPING'), 'Terms & Conditions explicitly bans scraping and harvesting')
assert(termsContent.includes('Chennai, Tamil Nadu'), 'Governing law specifies Chennai, Tamil Nadu jurisdiction')
assert(termsContent.toLowerCase().includes('intellectual property rights'), 'Terms protects Proxima proprietary IP')
assert(termsContent.includes('Commercial Premises Only'), 'Terms requires authentic commercial office listings')

// 3. Verify LegalModal component
const modalPath = path.resolve('src/components/Legal/LegalModal.tsx')
assert(fs.existsSync(modalPath), 'src/components/Legal/LegalModal.tsx exists')
const modalContent = fs.readFileSync(modalPath, 'utf8')
assert(modalContent.includes('Statutory Privacy Policy'), 'LegalModal renders Privacy Policy tab')
assert(modalContent.includes('Terms & Conditions of Use'), 'LegalModal renders Terms & Conditions tab')
assert(modalContent.includes('privacy@yugamhq.com'), 'LegalModal includes copy grievance email functionality')

// 4. Verify LandingPage wiring
const landingPath = path.resolve('src/components/Landing/LandingPage.tsx')
const landingContent = fs.readFileSync(landingPath, 'utf8')
assert(landingContent.includes('onOpenPrivacy'), 'LandingPage accepts onOpenPrivacy callback')
assert(landingContent.includes('onOpenTerms'), 'LandingPage accepts onOpenTerms callback')
assert(landingContent.includes('Privacy Policy'), 'LandingPage footer provides clickable Privacy Policy link')
assert(landingContent.includes('Terms & Conditions'), 'LandingPage footer provides clickable Terms link')

// 5. Verify App.tsx wiring
const appPath = path.resolve('src/App.tsx')
const appContent = fs.readFileSync(appPath, 'utf8')
assert(appContent.includes('LegalModal'), 'App.tsx imports and renders LegalModal')
assert(appContent.includes('openPrivacyModal'), 'App.tsx provides openPrivacyModal handler')
assert(appContent.includes('openTermsModal'), 'App.tsx provides openTermsModal handler')
assert(appContent.includes('Legal'), 'App.tsx header provides Legal quick action button')

// 6. Verify MemberSideDrawer wiring
const drawerPath = path.resolve('src/components/MemberList/MemberSideDrawer.tsx')
const drawerContent = fs.readFileSync(drawerPath, 'utf8')
assert(drawerContent.includes('DPDP (2023) Protected'), 'MemberSideDrawer renders DPDP statutory protection tag')
assert(drawerContent.includes('onOpenPrivacy'), 'MemberSideDrawer wires privacy modal')

console.log(`\nLEGAL AUDIT FINISHED: ${passed} PASSED, ${failed} FAILED`)
if (failed > 0) process.exit(1)
