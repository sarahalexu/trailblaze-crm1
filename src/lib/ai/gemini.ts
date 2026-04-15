// src/lib/ai/gemini.ts
// TrailBlaze CRM — Gemini AI Integration
// Powers: at-risk detection, follow-up drafting, next-best-action, renewal reminders

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

interface GeminiResponse {
  success: boolean
  text?: string
  error?: string
}

async function callGemini(prompt: string, systemInstruction?: string): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { success: false, error: 'Gemini API key not configured' }

  try {
    const body: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { success: true, text: data.candidates[0].content.parts[0].text }
    }

    return { success: false, error: data.error?.message || 'No response generated' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================
// System context for all AI features
// ============================================
const SYSTEM_CONTEXT = `You are the AI assistant inside TrailBlaze CRM, an account management platform built for African businesses. You help account managers retain and grow client relationships.

Key context:
- The KEEP Framework scores accounts on Know (understanding client), Engage (interaction quality), Exceed (delivering beyond expectations), Prevent (proactive risk mitigation). Each scored 0-5, total out of 20.
- Healthy = 15-20, At Risk = 10-14, Critical = 0-9
- Communication is primarily via WhatsApp in this market
- Nigerian business culture values personal relationships, respect, and directness
- Currency is Nigerian Naira (₦)

Always be professional, warm, and action-oriented. Nigerian English is fine. Keep messages concise — WhatsApp messages should be under 300 characters when possible.`

// ============================================
// 1. At-Risk Detection
// ============================================
export interface RiskAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: string[]
  recommendedActions: string[]
  urgency: string
}

export async function analyseAccountRisk(account: {
  name: string
  healthScore: number
  keepScores: { know: number; engage: number; exceed: number; prevent: number }
  lastInteractionDays: number
  renewalDays: number | null
  contractValue: number
  recentInteractions: string[]
}): Promise<RiskAnalysis | null> {
  const prompt = `Analyse this account's churn risk and provide specific recommendations.

Account: ${account.name}
KEEP Scores: Know=${account.keepScores.know}/5, Engage=${account.keepScores.engage}/5, Exceed=${account.keepScores.exceed}/5, Prevent=${account.keepScores.prevent}/5 (Total: ${account.healthScore}/20)
Days since last interaction: ${account.lastInteractionDays}
Days until renewal: ${account.renewalDays !== null ? account.renewalDays : 'No renewal date set'}
Contract value: ₦${account.contractValue.toLocaleString()}/year
Recent interactions: ${account.recentInteractions.slice(0, 5).join('; ') || 'None recorded'}

Respond in this exact JSON format only, no markdown:
{"riskLevel":"low|medium|high|critical","riskFactors":["factor1","factor2"],"recommendedActions":["action1","action2","action3"],"urgency":"description of timing"}`

  const result = await callGemini(prompt, SYSTEM_CONTEXT)
  if (!result.success || !result.text) return null

  try {
    const cleaned = result.text.replace(/```json\n?|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

// ============================================
// 2. Follow-Up Message Drafting
// ============================================
export interface DraftedMessage {
  whatsappMessage: string
  emailSubject: string
  emailBody: string
  context: string
}

export async function draftFollowUpMessage(params: {
  contactName: string
  accountName: string
  purpose: 'check_in' | 'renewal' | 'recovery' | 'upsell' | 'qbr' | 'onboarding'
  lastInteraction?: string
  healthScore: number
  additionalContext?: string
}): Promise<DraftedMessage | null> {
  const purposeDescriptions: Record<string, string> = {
    check_in: 'a regular check-in to maintain the relationship',
    renewal: 'a renewal discussion — their contract is coming up for renewal',
    recovery: 'a recovery conversation — this account is at risk and needs attention',
    upsell: 'introducing an upsell or expansion opportunity',
    qbr: 'scheduling or following up on a quarterly business review',
    onboarding: 'welcoming a new client and setting expectations',
  }

  const prompt = `Draft a follow-up message for this scenario.

Contact: ${params.contactName} at ${params.accountName}
Purpose: ${purposeDescriptions[params.purpose]}
Health score: ${params.healthScore}/20
Last interaction: ${params.lastInteraction || 'Unknown'}
Additional context: ${params.additionalContext || 'None'}

Respond in this exact JSON format only, no markdown:
{"whatsappMessage":"short WhatsApp message under 280 chars, warm and professional, Nigerian English ok","emailSubject":"email subject line","emailBody":"email body, 3-5 sentences, professional but warm","context":"brief explanation of why this approach was chosen"}`

  const result = await callGemini(prompt, SYSTEM_CONTEXT)
  if (!result.success || !result.text) return null

  try {
    const cleaned = result.text.replace(/```json\n?|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

// ============================================
// 3. Next-Best-Action Suggestions
// ============================================
export interface NextAction {
  action: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  suggestedTimeline: string
}

export async function suggestNextActions(account: {
  name: string
  healthScore: number
  keepScores: { know: number; engage: number; exceed: number; prevent: number }
  stage: string
  lastInteractionDays: number
  renewalDays: number | null
  activePlaybooks: string[]
  recentInteractions: string[]
}): Promise<NextAction[]> {
  const prompt = `Suggest 3 specific next actions for this account.

Account: ${account.name}
Stage: ${account.stage}
KEEP Scores: K=${account.keepScores.know} E=${account.keepScores.engage} E=${account.keepScores.exceed} P=${account.keepScores.prevent} (Total: ${account.healthScore}/20)
Days since last contact: ${account.lastInteractionDays}
Renewal in: ${account.renewalDays !== null ? account.renewalDays + ' days' : 'No date set'}
Active playbooks: ${account.activePlaybooks.join(', ') || 'None'}
Recent interactions: ${account.recentInteractions.slice(0, 3).join('; ') || 'None'}

Respond in this exact JSON format only, no markdown:
[{"action":"specific action","reason":"why this matters now","priority":"high|medium|low","suggestedTimeline":"when to do it"}]`

  const result = await callGemini(prompt, SYSTEM_CONTEXT)
  if (!result.success || !result.text) return []

  try {
    const cleaned = result.text.replace(/```json\n?|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return []
  }
}

// ============================================
// 4. Contextual Renewal Reminders
// ============================================
export interface RenewalInsight {
  summary: string
  riskAssessment: string
  recommendedApproach: string
  talkingPoints: string[]
}

export async function generateRenewalInsight(params: {
  accountName: string
  contactName: string
  contractValue: number
  renewalDays: number
  healthScore: number
  keepScores: { know: number; engage: number; exceed: number; prevent: number }
  interactionHistory: string[]
}): Promise<RenewalInsight | null> {
  const prompt = `Generate renewal preparation insights for this account.

Account: ${params.accountName}
Primary contact: ${params.contactName}
Contract: ₦${params.contractValue.toLocaleString()}/year
Renewal in: ${params.renewalDays} days
Health: ${params.healthScore}/20 (K=${params.keepScores.know} E=${params.keepScores.engage} E=${params.keepScores.exceed} P=${params.keepScores.prevent})
Recent history: ${params.interactionHistory.slice(0, 5).join('; ') || 'Limited history'}

Respond in this exact JSON format only, no markdown:
{"summary":"1-2 sentence account summary","riskAssessment":"likelihood of renewal and why","recommendedApproach":"how to approach the renewal conversation","talkingPoints":["point1","point2","point3"]}`

  const result = await callGemini(prompt, SYSTEM_CONTEXT)
  if (!result.success || !result.text) return null

  try {
    const cleaned = result.text.replace(/```json\n?|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

// ============================================
// 5. Health Score Suggestion
// ============================================
export async function suggestHealthScore(account: {
  name: string
  currentScores: { know: number; engage: number; exceed: number; prevent: number }
  interactionFrequency: number // interactions per month
  lastInteractionDays: number
  renewalDays: number | null
  recentSentiments: string[]
}): Promise<{ suggestedScores: { know: number; engage: number; exceed: number; prevent: number }; reasoning: string } | null> {
  const prompt = `Based on the data, suggest updated KEEP scores for this account.

Account: ${account.name}
Current scores: K=${account.currentScores.know} E=${account.currentScores.engage} E=${account.currentScores.exceed} P=${account.currentScores.prevent}
Interaction frequency: ${account.interactionFrequency} per month
Days since last contact: ${account.lastInteractionDays}
Renewal: ${account.renewalDays !== null ? 'in ' + account.renewalDays + ' days' : 'no date'}
Recent sentiments: ${account.recentSentiments.join(', ') || 'No sentiment data'}

Respond in this exact JSON format only, no markdown:
{"suggestedScores":{"know":0,"engage":0,"exceed":0,"prevent":0},"reasoning":"brief explanation of suggested changes"}`

  const result = await callGemini(prompt, SYSTEM_CONTEXT)
  if (!result.success || !result.text) return null

  try {
    const cleaned = result.text.replace(/```json\n?|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}
