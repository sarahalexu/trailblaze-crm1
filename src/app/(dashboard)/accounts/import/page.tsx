// src/app/(dashboard)/accounts/import/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ParsedRow { name: string; industry?: string; website?: string; contract_value?: string; renewal_date?: string; contact_name?: string; contact_email?: string; contact_phone?: string }

export default function ImportAccountsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [headers, setHeaders] = useState<string[]>([])
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload')
  const [imported, setImported] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const supabase = createClient()

  const targetFields = [
    { key: 'name', label: 'Company name *', required: true },
    { key: 'industry', label: 'Industry', required: false },
    { key: 'website', label: 'Website', required: false },
    { key: 'contract_value', label: 'Contract value (annual)', required: false },
    { key: 'renewal_date', label: 'Renewal date', required: false },
    { key: 'contact_name', label: 'Primary contact name', required: false },
    { key: 'contact_email', label: 'Contact email', required: false },
    { key: 'contact_phone', label: 'Contact phone/WhatsApp', required: false },
  ]

  function parseCSV(text: string): { headers: string[]; rows: string[][] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const h = lines[0].split(',').map(s => s.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line => {
      const result: string[] = []; let current = ''; let inQuotes = false
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes }
        else if (char === ',' && !inQuotes) { result.push(current.trim()); current = '' }
        else { current += char }
      }
      result.push(current.trim())
      return result
    })
    return { headers: h, rows }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers: h, rows } = parseCSV(text)
      setHeaders(h)
      // Auto-map by matching header names
      const autoMap: Record<string, string> = {}
      h.forEach((header, i) => {
        const lower = header.toLowerCase()
        if (lower.includes('company') || lower.includes('name') || lower.includes('account')) autoMap['name'] = header
        if (lower.includes('industry') || lower.includes('sector')) autoMap['industry'] = header
        if (lower.includes('website') || lower.includes('url')) autoMap['website'] = header
        if (lower.includes('value') || lower.includes('revenue') || lower.includes('contract')) autoMap['contract_value'] = header
        if (lower.includes('renewal') || lower.includes('expir')) autoMap['renewal_date'] = header
        if (lower.includes('contact') && lower.includes('name')) autoMap['contact_name'] = header
        if (lower.includes('email')) autoMap['contact_email'] = header
        if (lower.includes('phone') || lower.includes('whatsapp') || lower.includes('mobile')) autoMap['contact_phone'] = header
      })
      setMapping(autoMap)
      // Parse rows into objects
      const mapped = rows.map(row => {
        const obj: any = {}
        h.forEach((header, i) => { obj[header] = row[i] || '' })
        return obj
      })
      setParsed(mapped)
      setStep('map')
    }
    reader.readAsText(f)
  }

  function getFieldValue(row: any, fieldKey: string): string {
    const mappedHeader = mapping[fieldKey]
    return mappedHeader ? (row[mappedHeader] || '') : ''
  }

  async function startImport() {
    if (!mapping['name']) { alert('You must map the Company name field.'); return }
    setStep('importing')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    // Get default pipeline and first stage
    const { data: pipeline } = await supabase.from('pipelines').select('id').eq('org_id', profile.org_id).eq('pipeline_type', 'retention').eq('is_default', true).single()
    let stageId = null
    if (pipeline) {
      const { data: stage } = await supabase.from('pipeline_stages').select('id').eq('pipeline_id', pipeline.id).order('sort_order').limit(1).single()
      stageId = stage?.id
    }

    let successCount = 0
    const errs: string[] = []

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i]
      const name = getFieldValue(row, 'name')
      if (!name) { errs.push(`Row ${i + 1}: Missing company name, skipped`); continue }

      const contractVal = getFieldValue(row, 'contract_value')
      const { data: account, error: accErr } = await supabase.from('accounts').insert({
        org_id: profile.org_id, name,
        industry: getFieldValue(row, 'industry') || null,
        website: getFieldValue(row, 'website') || null,
        contract_value_annual: contractVal ? parseFloat(contractVal.replace(/[^0-9.]/g, '')) : null,
        renewal_date: getFieldValue(row, 'renewal_date') || null,
        assigned_user_id: profile.id,
        pipeline_id: pipeline?.id, stage_id: stageId, status: 'active',
      }).select().single()

      if (accErr) { errs.push(`Row ${i + 1} (${name}): ${accErr.message}`); continue }

      // Create contact if provided
      const contactName = getFieldValue(row, 'contact_name')
      if (contactName && account) {
        await supabase.from('contacts').insert({
          account_id: account.id, org_id: profile.org_id, full_name: contactName,
          email: getFieldValue(row, 'contact_email') || null,
          whatsapp_number: getFieldValue(row, 'contact_phone') || null,
          role_type: 'decision_maker', is_primary: true,
        })
      }
      successCount++
      setImported(successCount)
    }

    setErrors(errs)
    setStep('done')
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/accounts" className="hover:text-gray-600">Accounts</Link><span>/</span><span className="text-gray-700">Import CSV</span>
      </div>

      <h1 className="text-xl font-medium text-gray-900 mb-1">Import accounts from CSV</h1>
      <p className="text-sm text-gray-500 mb-6">Upload a CSV file with your client accounts. We'll map the columns and import everything.</p>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-purple-300 transition-colors">
          <div className="text-3xl mb-3">📄</div>
          <p className="text-sm text-gray-600 mb-4">Drop your CSV file here or click to browse</p>
          <input type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" id="csv-upload" />
          <label htmlFor="csv-upload" className="tb-btn-primary cursor-pointer inline-block">Choose CSV file</label>
          <p className="text-xs text-gray-400 mt-4">Expected columns: Company name, Industry, Website, Contract value, Renewal date, Contact name, Contact email, Phone</p>
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && (
        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-1">File loaded: {file?.name}</h3>
            <p className="text-xs text-gray-500">{parsed.length} rows found, {headers.length} columns detected</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Map your columns</h3>
            <p className="text-xs text-gray-500 mb-4">We auto-detected some mappings. Adjust if needed.</p>
            <div className="space-y-3">
              {targetFields.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-40 text-sm text-gray-700">{field.label}</div>
                  <span className="text-gray-300">→</span>
                  <select value={mapping[field.key] || ''} onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="">-- Skip --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('upload')} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Back</button>
            <button onClick={() => setStep('preview')} disabled={!mapping['name']}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: '#2b0548', color: '#e1b3ee' }}>
              Preview ({parsed.length} rows)
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Preview — first 5 rows</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-200">
                  {targetFields.filter(f => mapping[f.key]).map(f => <th key={f.key} className="text-left py-2 px-3 text-gray-500">{f.label}</th>)}
                </tr></thead>
                <tbody>
                  {parsed.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {targetFields.filter(f => mapping[f.key]).map(f => (
                        <td key={f.key} className="py-2 px-3 text-gray-700">{getFieldValue(row, f.key) || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('map')} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700">Back</button>
            <button onClick={startImport} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>
              Import {parsed.length} accounts
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {step === 'importing' && (
        <div className="text-center py-16">
          <div className="tb-spinner mx-auto mb-4"></div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">Importing accounts...</h3>
          <p className="text-sm text-gray-500">{imported} of {parsed.length} imported</p>
          <div className="w-full max-w-xs mx-auto mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(imported / parsed.length) * 100}%`, background: '#5a1890' }} />
          </div>
        </div>
      )}

      {/* Step 5: Done */}
      {step === 'done' && (
        <div className="text-center py-12">
          <div className="text-3xl mb-3">🎉</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Import complete</h3>
          <p className="text-sm text-gray-600 mb-4">{imported} accounts imported successfully{errors.length > 0 ? `, ${errors.length} skipped` : ''}.</p>
          {errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left mb-4 max-h-40 overflow-y-auto">
              <h4 className="text-xs font-medium text-amber-800 mb-2">Skipped rows:</h4>
              {errors.map((err, i) => <p key={i} className="text-xs text-amber-700">{err}</p>)}
            </div>
          )}
          <Link href="/accounts" className="tb-btn-primary inline-block">View your accounts</Link>
        </div>
      )}
    </div>
  )
}
