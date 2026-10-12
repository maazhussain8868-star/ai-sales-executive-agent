import { NextResponse } from 'next/server'
import { getCompiledBrainAction } from '@/app/actions/brain'

export const dynamic = 'force-dynamic'

export async function GET() {
  const brain = await getCompiledBrainAction()
  if (!brain) {
    return NextResponse.json({ error: 'No compiled brain available' }, { status: 404 })
  }

  const jsonStr = JSON.stringify(brain.sampleObjections, null, 2)

  return new NextResponse(jsonStr, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="10_SAMPLE_OBJECTIONS.json"',
    },
  })
}
