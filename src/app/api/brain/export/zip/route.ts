import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { getCompiledBrainAction } from '@/app/actions/brain'
import { BRAIN_FILE_KEYS } from '@/types/brain'

export const dynamic = 'force-dynamic'

export async function GET() {
  const brain = await getCompiledBrainAction()
  if (!brain) {
    return NextResponse.json({ error: 'No compiled brain available' }, { status: 404 })
  }

  const zip = new JSZip()
  const folder = zip.folder('sales_brain_12_files')

  BRAIN_FILE_KEYS.forEach((key) => {
    const content = brain.files[key] || ''
    folder?.file(`${key}.md`, content)
  })

  // Add the voice agent prompt and sample objections as well for complete package
  folder?.file('VOICE_AGENT_PROMPT.txt', brain.voiceAgentPrompt)
  folder?.file('10_SAMPLE_OBJECTIONS.json', JSON.stringify(brain.sampleObjections, null, 2))

  const buffer = await zip.generateAsync({ type: 'nodebuffer' })

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="sales_brain_files.zip"',
    },
  })
}
