import type { Member } from '../types/member'


export interface MemberGeoFeature {
  type: 'Feature'
  id: string
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat] per GeoJSON RFC 7946
  }
  properties: {
    memberId: string
    name: string
    company: string
    category: string
    categoryId: string
    categoryIcon: string
    area: string
    city: string
    chapter: string
    photoUrl: string
    phone: string
    whatsapp: string
    status: string
    oneToOneAvailability: string
  }
}

export interface MemberFeatureCollection {
  type: 'FeatureCollection'
  features: MemberGeoFeature[]
}

export function membersToGeoJSON(members: Member[]): MemberFeatureCollection {
  const verifiedMembers = members.filter(
    (m) => m.location.locationStatus === 'VERIFIED'
  )

  return {
    type: 'FeatureCollection',
    features: verifiedMembers.map((m) => ({
      type: 'Feature',
      id: m.id,
      geometry: {
        type: 'Point',
        coordinates: [m.location.longitude, m.location.latitude],
      },
      properties: {
        memberId: m.id,
        name: m.name,
        company: m.company,
        category: m.category,
        categoryId: m.categoryId,
        categoryIcon: m.categoryIcon,
        area: m.location.area,
        city: m.location.city,
        chapter: m.chapter,
        photoUrl: m.photoUrl,
        phone: m.phone,
        whatsapp: m.whatsapp,
        status: m.location.locationStatus,
        oneToOneAvailability: m.oneToOneAvailability,
      },
    })),
  }
}
