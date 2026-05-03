// src/lib/company-logo.ts
// Gets company logos from free APIs
// Usage: <CompanyLogo name="paystack" website="paystack.com" />

export function getCompanyLogoUrl(websiteOrName: string): string {
  // Try to extract domain from website URL or company name
  let domain = websiteOrName
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase()
    .trim()

  // If it's a company name (no dots), try common patterns
  if (!domain.includes('.')) {
    domain = domain.replace(/\s+/g, '') + '.com'
  }

  // Use Google's favicon service (free, no API key needed, reliable)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

// Alternative: Clearbit (higher quality but may have rate limits)
export function getClearbitLogo(domain: string): string {
  return `https://logo.clearbit.com/${domain}`
}
