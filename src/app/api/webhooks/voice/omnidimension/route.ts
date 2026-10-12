import { NextResponse } from 'next/server'
import { getVoiceProvider } from '@/lib/voice'
import { storeWebhookCallAction } from '@/app/actions/voice'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const provider = getVoiceProvider('omnidimension')

    const parsed = provider.parseWebhook(payload)
    await storeWebhookCallAction(parsed)

    return NextResponse.json({
      received: true,
      callId: parsed.callId,
      providerCallId: parsed.providerCallId,
      status: parsed.status,
    })
  } catch (err) {
    console.error('Error handling OmniDimension voice webhook:', err)
    return NextResponse.json(
      {
        received: false,
        error: err instanceof Error ? err.message : 'Unknown webhook error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/voice/omnidimension',
    provider: 'omnidimension',
  })
}
