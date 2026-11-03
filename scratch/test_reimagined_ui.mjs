import fs from 'node:fs'
import path from 'node:path'

console.log('--- PROXIMA REIMAGINED UI AUDIT: UNIFIED CONSOLE & BOTTOM CARD ---')

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

// 1. UnifiedCommandBar inspection
const commandBarPath = path.resolve('src/components/Header/UnifiedCommandBar.tsx')
assert(fs.existsSync(commandBarPath), 'UnifiedCommandBar.tsx exists')
const commandBarCode = fs.readFileSync(commandBarPath, 'utf8')
assert(commandBarCode.includes('RADIUS_OPTIONS'), 'UnifiedCommandBar incorporates radius controls directly')
assert(commandBarCode.includes('searchLocation'), 'UnifiedCommandBar incorporates search & geocoding')
assert(commandBarCode.includes('onResetToGateway'), 'UnifiedCommandBar incorporates clickable brand mark')
assert(commandBarCode.includes('onOpenLegal'), 'UnifiedCommandBar incorporates legal trigger')
assert(commandBarCode.includes('onShareMap'), 'UnifiedCommandBar incorporates share action')
assert(commandBarCode.includes('matchCount'), 'UnifiedCommandBar incorporates interactive office count')

// 2. MemberBottomCard inspection
const bottomCardPath = path.resolve('src/components/MemberList/MemberBottomCard.tsx')
assert(fs.existsSync(bottomCardPath), 'MemberBottomCard.tsx exists')
const bottomCardCode = fs.readFileSync(bottomCardPath, 'utf8')
assert(bottomCardCode.includes('openExternalNavigation'), 'MemberBottomCard has 1-tap Directions')
assert(bottomCardCode.includes('wa.me'), 'MemberBottomCard has 1-tap WhatsApp direct messaging')
assert(bottomCardCode.includes('tel:'), 'MemberBottomCard has 1-tap Phone calling')
assert(bottomCardCode.includes('handlePrev') && bottomCardCode.includes('handleNext'), 'MemberBottomCard has < / > member stepper navigation')
assert(bottomCardCode.includes('onOpenDirectory'), 'MemberBottomCard has 1-tap back to full directory list')

// 3. MemberSideDrawer auto-collapse on mobile inspection
const drawerPath = path.resolve('src/components/MemberList/MemberSideDrawer.tsx')
const drawerCode = fs.readFileSync(drawerPath, 'utf8')
assert(drawerCode.includes('handleMemberClick'), 'MemberSideDrawer defines handleMemberClick')
assert(drawerCode.includes('window.innerWidth < 768'), 'MemberSideDrawer detects mobile screen width')
assert(drawerCode.includes('setDrawerOpen(false)'), 'MemberSideDrawer auto-collapses on member selection so map is 100% visible')

// 4. MapContainer camera offset & padding inspection
const mapPath = path.resolve('src/components/Map/MapContainer.tsx')
const mapCode = fs.readFileSync(mapPath, 'utf8')
assert(mapCode.includes('padding: {') && mapCode.includes('bottom: isMobile ? 220 : 140'), 'MapContainer flyTo includes bottom padding for MemberBottomCard')

// 5. App.tsx integration inspection
const appPath = path.resolve('src/App.tsx')
const appCode = fs.readFileSync(appPath, 'utf8')
assert(appCode.includes('<UnifiedCommandBar'), 'App.tsx renders UnifiedCommandBar')
assert(appCode.includes('<MemberBottomCard'), 'App.tsx renders MemberBottomCard when selectedMember is active')
assert(!appCode.includes('<SearchBar'), 'App.tsx no longer renders standalone disjointed SearchBar')
assert(!appCode.includes('<FilterBar'), 'App.tsx no longer renders standalone disjointed FilterBar')

console.log(`\nREIMAGINED UI AUDIT: ${passed} PASSED, ${failed} FAILED`)
if (failed > 0) process.exit(1)
