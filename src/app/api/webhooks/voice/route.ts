import { NextRequest, NextResponse } from 'next/server';
import { processVoiceWebhook } from '@/lib/voice/webhook-handler';
import { VoiceWebhookPayload } from '@/types/voice-v2';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload: VoiceWebhookPayload = {
      provider_event_id: body.provider_event_id || body.event_id || req.headers.get('x-provider-event-id') || `evt_${Date.now()}`,
      provider_call_id: body.provider_call_id || body.call_id || '',
      event_type: body.event_type || body.type || 'call_completed',
      timestamp: body.timestamp || new Date().toISOString(),
      call_duration_seconds: body.call_duration_seconds || body.duration_seconds,
      recording_url: body.recording_url,
      transcript: body.transcript,
      failure_reason: body.failure_reason,
      cost_inr: body.cost_inr,
      metadata: body.metadata,
    };

    const result = await processVoiceWebhook(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown webhook error';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/voice',
    supportedEvents: [
      'call_initiated',
      'call_ringing',
      'call_answered',
      'call_completed',
      'call_failed',
      'transcript_ready',
      'opt_out_detected',
    ],
  });
}
