import {
  VoiceProvider,
  LLMProvider,
  CalendarProvider,
  CRMProvider,
  MessagingProvider
} from '@/types/adapters'
import { FakeVoiceProvider } from './fake/fake-voice'
import { FakeLLMProvider } from './fake/fake-llm'
import { FakeCalendarProvider } from './fake/fake-calendar'
import { FakeCRMProvider } from './fake/fake-crm'
import { FakeMessagingProvider } from './fake/fake-messaging'

export interface AdapterRegistry {
  voice: VoiceProvider
  llm: LLMProvider
  calendar: CalendarProvider
  crm: CRMProvider
  messaging: MessagingProvider
}

export function createAdapterRegistry(): AdapterRegistry {
  // Config-driven adapter resolution. Defaults cleanly to fake/mock adapters in dev & tests
  return {
    voice: new FakeVoiceProvider(),
    llm: new FakeLLMProvider(),
    calendar: new FakeCalendarProvider(),
    crm: new FakeCRMProvider(),
    messaging: new FakeMessagingProvider()
  }
}

export const defaultAdapters = createAdapterRegistry()
