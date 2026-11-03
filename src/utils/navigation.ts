/**
 * Universal Navigation Helper
 * Creates deep-links directly using high-precision geographic coordinates
 * rather than loose text addresses, guaranteeing destination accuracy.
 */

export interface NavigationLinks {
  googleMaps: string
  appleMaps: string
  waze: string
}

export function getNavigationUrls(latitude: number, longitude: number, destinationName?: string): NavigationLinks {
  const label = destinationName ? encodeURIComponent(destinationName) : ''

  return {
    // Official Google Maps Directions API URL (universal Android, Desktop, iOS)
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    
    // Apple Maps URL scheme (native on iOS, Mac)
    appleMaps: `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d${label ? `&q=${label}` : ''}`,
    
    // Waze deep-link
    waze: `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
  }
}

/**
 * Triggers native turn-by-turn navigation on the user's device
 */
export function openExternalNavigation(latitude: number, longitude: number, destinationName?: string): void {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
  const links = getNavigationUrls(latitude, longitude, destinationName)

  if (isIOS) {
    // Attempt Apple Maps directly on iOS
    window.open(links.appleMaps, '_blank')
  } else {
    // Default to Google Maps universal directions URL
    window.open(links.googleMaps, '_blank')
  }
}
