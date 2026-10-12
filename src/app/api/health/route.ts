import { NextResponse } from 'next/server'
import { defaultAdapters } from '@/lib/adapters'
import { defaultModelRouter } from '@/lib/model-router/router'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1-pilot',
    adapters: {
      voice: defaultAdapters.voice.name,
      llm: defaultAdapters.llm.name,
      calendar: defaultAdapters.calendar.name,
      crm: defaultAdapters.crm.name,
      messaging: defaultAdapters.messaging.name,
    },
    modelRouter: {
      tasksConfigured: [
        'brain_compilation',
        'transcript_analysis',
        'qa_scoring',
        'message_drafting',
        'conversation_signals'
      ],
      activeTestModel: defaultModelRouter.getModelForTask('transcript_analysis')
    },
    database: {
      status: 'connected',
      migrationsSchemaVersion: '00001_v2_core_foundation'
    }
  })
}
