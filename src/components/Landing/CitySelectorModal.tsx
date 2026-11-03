import React from 'react'

export interface CityOption {
  id: string
  name: string
  stateOrCountry: string
  accessKey: string
  centerCoordinates: [number, number]
  hubs: string[]
  isDemo?: boolean
}

// Deprecated: Chapter directories are strictly private and not exposed via public modals.
export const CitySelectorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = () => null
