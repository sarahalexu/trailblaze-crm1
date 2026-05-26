// src/app/(dashboard)/settings/import/page.tsx
// CSV import wizard for accounts, contacts, interactions

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type ImportType = 'accounts' | 'contacts'
type Step = 'upload' | 'map' | 'preview' | 'done'

const ACCOUNT_FIELDS = [
  { key: 'name', label: 'Account name', required: true },
  { key: 'industry', label: 'Industry', required: false },
  { key: 'website', label: 'Website', required: false },
  { key: 'contract_value_annual', label: 'Contract value (annual)', required: false },
  { key: 'renewal_date', label: 'Renewal date', required: false },
  { key: 'notes', label: 'Notes', required: false },
]

const CONTACT_FIELDS = [
  { key: 'full_name', label: 'Full name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone_number', label: 'Phone number', required: false },
  { key: 'whatsapp_number', label: 'WhatsApp number', required: false },
  { key: 'job_title', label: 'Job title', required: false },
  { key: 'account_name', label: 'Account name (to match)', required: false },
]

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('accounts')
  const [step, setStep] = useState<Step>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, errors: [] as string[] })
  const supabase = createClient()

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) return

      // Parse CSV (basic - handles quoted fields)
      function parseLine(line: string): string[] {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; continue }
          if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
          current += char
        }
        result.push(current.trim())
        return result
      }

      const headers = parseLine(lines[0])
      const rows = lines.slice(1).map(parseLine).filter(r => r.some(cell => cell.length > 0))

      setCsvHeaders(headers)
      setCsvRows(rows)

      // Auto-map by header name similarity
      const fields = importType === 'accounts' ? ACCOUNT_FIELDS : CONTACT_FIELDS
      const autoMap: Record<string, string> = {}
      for (const field of fields) {
        const match = headers.findIndex(h =>
          h.toLowerCase().replace(/[^a-z]/g, '').includes(field.key.replace(/_/g, '')) ||
          h.toLowerCase().includes(field.label.toLowerCase())
        )
        if (match >= 0) autoMap[field.key] = headers[match]
      }
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsText(file)
  }

  async function runImport() {
    setImporting(true)
    const fields = importType === 'accounts' ? ACCOUNT_FIELDS : CONTACT_FIELDS
    let success = 0
    let failed = 0
    const errors: string[] = []

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()
    if (!profile) return

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i]
      const record: any = { org_id: profile.org_id }

      for (const field of fields) {
        const csvCol = mapping[field.key]
        if (!csvCol) continue
        const colIdx = csvHeaders.indexOf(csvCol)
        if (colIdx < 0) continue
        let value = row[colIdx]?.trim() || null

        // Type conversion
        if (field.key === 'contract_value_annual' && value) {
          value = String(parseFloat(value.replace(/[^0-9.]/g, '')) || 0) as any
        }
        if (value) record[field.key] = value
      }

      // Validate required fields
      const requiredMissing = fields.filter(f => f.required && !record[f.key])
      if (requiredMissing.length > 0) {
        failed++
        errors.push(`Row ${i + 1}: Missing ${requiredMissing.map(f => f.label).join(', ')}`)
        continue
      }

      if (importType === 'accounts') {
        const { error } = await supabase.from('accounts').insert(record)
        if (error) { failed++; errors.push(`Row ${i + 1}: ${error.message}`) }
        else success++
      } else {
        // For contacts, try to match account by name
        if (record.account_name) {
          const { data: acct } = await supabase.from('accounts').select('id').eq('org_id', profile.org_id).ilike('name', record.account_name).single()
          if (acct) record.account_id = acct.id
          delete record.account_name
        }
        const { error } = await supabase.from('contacts').insert(record)
        if (error) { failed++; errors.push(`Row ${i + 1}: ${error.message}`) }
        else success++
      }
    }

    setImportResult({ success, failed, errors })
    setStep('done')
    setImporting(false)
  }

  const fields = importType === 'accounts' ? ACCOUNT_FIELDS : CONTACT_FIELDS
  const previewRows = csvRows.slice(0, 5)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/settings" className="hover:text-gray-600">Settings</Link>
        <span>/</span>
        <span className="text-gray-700">Import data</span>
      </div>

      <h1 className="text-xl font-medium text-gray-900 mb-1">Import data</h1>
      <p className="text-sm text-gray-500 mb-6">Upload a CSV file to import accounts or contacts into TrailBlaze CRM.</p>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">What are you importing?</label>
            <div className="flex gap-3">
              {(['accounts', 'contacts'] as ImportType[]).map(t => (
                <button key={t} onClick={() => setImportType(t)}
                  className={`px-4 py-2.5 border rounded-lg text-sm font-medium capitalize ${importType === t ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
            <p className="text-2xl mb-2">{'\u{1F4C4}'}</p>
            <p className="text-sm text-gray-600 mb-1">Drag and drop your CSV file here, or click to browse</p>
            <p className="text-xs text-gray-400 mb-4">Supported format: .csv</p>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="inline-block px-4 py-2 rounded-lg text-sm font-medium cursor-pointer" style={{ background: '#2b0548', color: '#e1b3ee' }}>
              Choose file
            </label>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-1">Expected columns for {importType}:</p>
            <p className="text-xs text-gray-500">{fields.map(f => `${f.label}${f.required ? ' *' : ''}`).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-1">Map your columns</h2>
          <p className="text-xs text-gray-500 mb-4">Match your CSV columns to TrailBlaze fields. We auto-mapped what we could.</p>

          <div className="space-y-3 mb-5">
            {fields.map(field => (
              <div key={field.key} className="flex items-center gap-3">
                <div className="w-40">
                  <p className="text-sm text-gray-900">{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</p>
                </div>
                <span className="text-gray-300">{'\u2192'}</span>
                <select
                  value={mapping[field.key] || ''}
                  onChange={e => setMapping({ ...mapping, [field.key]: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Skip (don't import)</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('upload')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Back</button>
            <button onClick={() => setStep('preview')} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2b0548' }}>Preview import</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-1">Preview</h2>
          <p className="text-xs text-gray-500 mb-4">Showing first 5 rows of {csvRows.length} total. Check the mapping looks correct.</p>

          <div className="overflow-x-auto mb-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  {fields.filter(f => mapping[f.key]).map(f => (
                    <th key={f.key} className="text-left py-2 px-3 text-gray-500 font-medium">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {fields.filter(f => mapping[f.key]).map(f => {
                      const colIdx = csvHeaders.indexOf(mapping[f.key])
                      return <td key={f.key} className="py-2 px-3 text-gray-700">{row[colIdx] || ''}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4 text-xs text-amber-700">
            This will import {csvRows.length} {importType}. This action cannot be undone.
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('map')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Back</button>
            <button onClick={runImport} disabled={importing} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: '#2b0548' }}>
              {importing ? `Importing ${csvRows.length} ${importType}...` : `Import ${csvRows.length} ${importType}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-3xl mb-3">{importResult.failed === 0 ? '\u{2705}' : '\u{26A0}\uFE0F'}</p>
          <h2 className="text-lg font-medium text-gray-900 mb-1">Import complete</h2>
          <p className="text-sm text-gray-600 mb-4">
            {importResult.success} {importType} imported successfully.
            {importResult.failed > 0 && ` ${importResult.failed} failed.`}
          </p>

          {importResult.errors.length > 0 && (
            <div className="text-left mb-4 p-3 bg-red-50 border border-red-200 rounded-lg max-h-40 overflow-y-auto">
              {importResult.errors.slice(0, 10).map((err, i) => (
                <p key={i} className="text-xs text-red-600">{err}</p>
              ))}
              {importResult.errors.length > 10 && (
                <p className="text-xs text-red-400 mt-1">...and {importResult.errors.length - 10} more</p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <Link href={`/${importType}`} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2b0548' }}>
              View {importType}
            </Link>
            <button onClick={() => { setStep('upload'); setCsvHeaders([]); setCsvRows([]); setMapping({}) }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">
              Import more
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
