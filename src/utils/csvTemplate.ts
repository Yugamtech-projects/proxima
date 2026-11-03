/**
 * PROXIMA Roster Template Generator
 * 
 * Generates an enterprise-ready CSV template pre-formatted with UTF-8 BOM
 * so that Microsoft Excel, Numbers, and Google Sheets open it in distinct columns
 * without character encoding or comma delimiter corruption.
 */

export interface TemplateRow {
  fullName: string
  companyName: string
  businessCategory: string
  phone: string
  email: string
  officeAddress: string
  localityArea: string
  googleMapsOrCoordinates: string
  website: string
  photoUrl: string
}

export const TEMPLATE_COLUMNS = [
  'Full Name',
  'Company Name',
  'Business Category',
  'Phone',
  'Email',
  'Office Address',
  'Locality / Area',
  'Google Maps Link or Coordinates',
  'Website',
  'Photo URL',
] as const

export function getSampleRowsForCity(cityName?: string): TemplateRow[] {
  const city = (cityName || 'Chennai').toLowerCase()

  if (city.includes('bangalore') || city.includes('bengaluru')) {
    return [
      {
        fullName: 'Karthik Narayanan',
        companyName: 'Nexus Cloud Systems Pvt Ltd',
        businessCategory: 'Enterprise IT & Cloud Infrastructure',
        phone: '+91 98450 12345',
        email: 'karthik@nexuscloud.in',
        officeAddress: 'Ground Floor, Indiranagar 100ft Road',
        localityArea: 'Indiranagar',
        googleMapsOrCoordinates: 'https://maps.google.com/?q=12.9784,77.6408',
        website: 'https://nexuscloud.in',
        photoUrl: '',
      },
      {
        fullName: 'Deepa Hegde',
        companyName: 'Vanguard Legal Partners',
        businessCategory: 'Corporate & Intellectual Property Law',
        phone: '+91 98451 23456',
        email: 'deepa@vanguardlegal.com',
        officeAddress: 'Level 4, Brigade Towers, MG Road',
        localityArea: 'MG Road',
        googleMapsOrCoordinates: '12.9756, 77.6066',
        website: 'https://vanguardlegal.com',
        photoUrl: '',
      },
      {
        fullName: 'Siddharth Rao',
        companyName: 'Apex Precision Engineering',
        businessCategory: 'Industrial Automation & CNC Machinery',
        phone: '+91 98452 34567',
        email: 'siddharth@apexprecision.in',
        officeAddress: 'Phase 2, Electronic City Tech Park',
        localityArea: 'Electronic City',
        googleMapsOrCoordinates: 'https://maps.google.com/?q=12.8399,77.6770',
        website: 'https://apexprecision.in',
        photoUrl: '',
      },
    ]
  }

  if (city.includes('mumbai')) {
    return [
      {
        fullName: 'Rajesh Kulkarni',
        companyName: 'Optima Capital Advisors',
        businessCategory: 'Wealth Management & Private Equity',
        phone: '+91 98200 12345',
        email: 'rajesh@optimacapital.in',
        officeAddress: 'One BKC, G Block, Bandra Kurla Complex',
        localityArea: 'BKC',
        googleMapsOrCoordinates: 'https://maps.google.com/?q=19.0657,72.8687',
        website: 'https://optimacapital.in',
        photoUrl: '',
      },
      {
        fullName: 'Sunita Sharma',
        companyName: 'Atelier Architecture Studio',
        businessCategory: 'Commercial Interior & Architecture',
        phone: '+91 98201 23456',
        email: 'sunita@atelierstudio.in',
        officeAddress: 'The Capital Building, Lower Parel',
        localityArea: 'Lower Parel',
        googleMapsOrCoordinates: '18.9986, 72.8306',
        website: 'https://atelierstudio.in',
        photoUrl: '',
      },
      {
        fullName: 'Sameer Merchant',
        companyName: 'Logix Global Freight',
        businessCategory: 'Supply Chain & International Freight',
        phone: '+91 98202 34567',
        email: 'sameer@logixglobal.com',
        officeAddress: 'Sahar Cargo Complex, Andheri East',
        localityArea: 'Andheri East',
        googleMapsOrCoordinates: 'https://maps.google.com/?q=19.1136,72.8697',
        website: 'https://logixglobal.com',
        photoUrl: '',
      },
    ]
  }

  // Default: Chennai
  return [
    {
      fullName: 'Vikram Menon',
      companyName: 'Apex Legal Advocates',
      businessCategory: 'Commercial & Tax Litigation',
      phone: '+91 98401 23456',
      email: 'vikram@apexlegal.in',
      officeAddress: '12, 2nd Avenue, Near Roundana, Anna Nagar',
      localityArea: 'Anna Nagar',
      googleMapsOrCoordinates: 'https://maps.google.com/?q=13.0878,80.2155',
      website: 'https://apexlegal.in',
      photoUrl: '',
    },
    {
      fullName: 'Dr. Ananya Rao',
      companyName: 'Aura Healthcare & Diagnostics',
      businessCategory: 'Pathology & Diagnostic Healthcare',
      phone: '+91 98402 34567',
      email: 'ananya@auradiagnostics.com',
      officeAddress: 'Ega Complex, Poonamallee High Rd, Kilpauk',
      localityArea: 'Kilpauk',
      googleMapsOrCoordinates: '13.0784, 80.2412',
      website: 'https://auradiagnostics.com',
      photoUrl: '',
    },
    {
      fullName: 'Karthik Subramanian',
      companyName: 'Olympia Real Estate Advisory',
      businessCategory: 'Commercial Real Estate & Coworking',
      phone: '+91 98403 45678',
      email: 'karthik@olympiaadvisory.in',
      officeAddress: 'Olympia Tech Park, Guindy Industrial Estate',
      localityArea: 'Guindy',
      googleMapsOrCoordinates: 'https://maps.google.com/?q=13.0102,80.2078',
      website: 'https://olympiaadvisory.in',
      photoUrl: '',
    },
  ]
}

/**
 * Escapes a cell value for standard CSV compatibility.
 */
function escapeCsvCell(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

/**
 * Generates CSV content with UTF-8 BOM so Excel opens it with clean columns.
 */
export function generateRosterCsv(cityName?: string): string {
  const headers = TEMPLATE_COLUMNS.join(',')
  const samples = getSampleRowsForCity(cityName)

  const rows = samples.map((s) => [
    escapeCsvCell(s.fullName),
    escapeCsvCell(s.companyName),
    escapeCsvCell(s.businessCategory),
    escapeCsvCell(s.phone),
    escapeCsvCell(s.email),
    escapeCsvCell(s.officeAddress),
    escapeCsvCell(s.localityArea),
    escapeCsvCell(s.googleMapsOrCoordinates),
    escapeCsvCell(s.website),
    escapeCsvCell(s.photoUrl),
  ].join(','))

  // \uFEFF is UTF-8 Byte Order Mark for Microsoft Excel
  return `\uFEFF${headers}\r\n${rows.join('\r\n')}\r\n`
}

/**
 * Triggers a browser file download of the template.
 */
export function downloadRosterTemplate(chapterName: string, cityName?: string) {
  const csvContent = generateRosterCsv(cityName)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const sanitizedSlug = chapterName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `proxima_roster_template_${sanitizedSlug || 'chapter'}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
