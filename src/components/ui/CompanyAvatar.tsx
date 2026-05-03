// src/components/ui/CompanyAvatar.tsx
// Shows company logo from Google favicons, falls back to initials
'use client'

import { useState } from 'react'
import { getCompanyLogoUrl } from '@/lib/company-logo'

interface Props {
  name: string
  website?: string
  size?: number
  className?: string
}

export default function CompanyAvatar({ name, website, size = 36, className = '' }: Props) {
  const [imgError, setImgError] = useState(false)
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const logoUrl = website ? getCompanyLogoUrl(website) : getCompanyLogoUrl(name)

  if (imgError || (!website && !name.includes('.'))) {
    // Show initials avatar
    return (
      <div className={`rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${className}`}
        style={{ width: size, height: size, background: '#2b054812', color: '#5a1890' }}>
        {initials}
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}>
      <img src={logoUrl} alt={name} width={size - 8} height={size - 8}
        onError={() => setImgError(true)}
        style={{ objectFit: 'contain' }} />
    </div>
  )
}
