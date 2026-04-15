// src/app/api/billing/verify/route.ts
import { verifyTransaction } from '@/lib/paystack'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  if (!reference) {
    return NextResponse.json({ error: 'Reference required' }, { status: 400 })
  }

  const result = await verifyTransaction(reference)

  if (result.success) {
    return NextResponse.json({ verified: true, data: result.data })
  }

  return NextResponse.json({ verified: false, error: result.error }, { status: 400 })
}
