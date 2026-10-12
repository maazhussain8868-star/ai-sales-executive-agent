import { NextResponse } from 'next/server'
import { getCompiledBrainAction } from '@/app/actions/brain'

export const dynamic = 'force-dynamic'

export async function GET() {
  const brain = await getCompiledBrainAction()
  if (!brain) {
    return NextResponse.json({ error: 'No compiled brain available' }, { status: 404 })
  }

  return new NextResponse(brain.voiceAgentPrompt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="VOICE_AGENT_PROMPT.txt"',
    },
  })
}
