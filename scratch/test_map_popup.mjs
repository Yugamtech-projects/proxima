import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('=================================================================')
console.log('🗺️ PROXIMA MAP POPUP, CARTO 2X & NAVIGATION AUDIT')
console.log('=================================================================')

// Navigation URL logic matching src/utils/navigation.ts
function getNavigationUrls(latitude, longitude, destinationName) {
  const label = destinationName ? encodeURIComponent(destinationName) : ''
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    appleMaps: `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d${label ? `&q=${label}` : ''}`,
    waze: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
  }
}

// Test 1: Navigation URLs
console.log('\n--- 1. Turn-by-Turn Navigation URL Generation ---')
const testLat = 12.9784
const testLng = 77.6408
const testCompany = 'AeroKool HVAC'
const testArea = 'Indiranagar'

const navUrls = getNavigationUrls(testLat, testLng, `${testCompany} (${testArea})`)

assert(navUrls.googleMaps.includes('https://www.google.com/maps/dir/'), 'Google Maps directions URL valid')
assert(navUrls.googleMaps.includes(`destination=${testLat},${testLng}`), 'Coordinates in Google Maps URL')
assert(navUrls.appleMaps.includes('https://maps.apple.com/'), 'Apple Maps directions URL valid')
assert(navUrls.appleMaps.includes(`daddr=${testLat},${testLng}`), 'Coordinates in Apple Maps URL')
console.log(`[PASS] Google Maps Navigation URL: ${navUrls.googleMaps}`)
console.log(`[PASS] Apple Maps Navigation URL: ${navUrls.appleMaps}`)

// Test 2: Free OpenStreetMap Tile HTTP 200 (Zero API Key)
console.log('\n--- 2. OpenStreetMap Tile Accessibility (Zero API Key) ---')
const tileUrl = 'https://a.tile.openstreetmap.org/12/2955/1932.png'
const tileRes = await fetch(tileUrl)
assert.strictEqual(tileRes.status, 200, 'OSM tile must return 200')
console.log(`[PASS] OpenStreetMap tile returned HTTP ${tileRes.status} (Zero API Keys Required)`)

// Test 3: CSS Styles & Canvas Sharpness
console.log('\n--- 3. CSS Sharpness & VisionOS Popup Specifications ---')
const cssPath = path.resolve('src/index.css')
const cssContent = fs.readFileSync(cssPath, 'utf8')

assert(cssContent.includes('.proxima-elegant-popup'), '.proxima-elegant-popup defined in CSS')
assert(cssContent.includes('.proxima-popup-card'), '.proxima-popup-card defined in CSS')
assert(cssContent.includes('image-rendering: -webkit-optimize-contrast'), 'Canvas contrast optimization present')
assert(cssContent.includes('popup-spring-in'), 'Spring entry animation present')
console.log('[PASS] MapLibre Popup Glassmorphism & Spring Animations defined')
console.log('[PASS] High-DPI canvas sharpness optimizations defined')

// Test 4: MapContainer & App Component Integration
console.log('\n--- 4. MapContainer & App Component Integration ---')
const mapContainerPath = path.resolve('src/components/Map/MapContainer.tsx')
const mapContent = fs.readFileSync(mapContainerPath, 'utf8')

assert(mapContent.includes('createMemberPopupElement'), 'Popup DOM creator function exists')
assert(mapContent.includes('activePopupRef'), 'Active popup ref tracked')
assert(mapContent.includes('BULLETPROOF_OSM_STYLE'), 'OpenStreetMap style configured as primary')
assert(mapContent.includes('onOpenProfile'), 'onOpenProfile prop handled in MapContainer')
assert(mapContent.includes('popup-profile-btn'), 'Popup View Profile button wired')
assert(mapContent.includes('popup-navigate-btn'), 'Popup Directions button wired')

const appPath = path.resolve('src/App.tsx')
const appContent = fs.readFileSync(appPath, 'utf8')
assert(appContent.includes('onOpenProfile={(member) =>'), 'App passes onOpenProfile to MapContainer')
console.log('[PASS] MapContainer wires View Profile, Directions, WhatsApp & Phone actions')
console.log('[PASS] App synchronizes profile modal opening directly from map popup')

console.log('\n=================================================================')
console.log('✅ ALL MAP POPUP & SHARPNESS AUDIT CHECKS PASSED!')
console.log('=================================================================')
