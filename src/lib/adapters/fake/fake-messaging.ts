import {
  MessagingProvider,
  SendMessageRequest,
  SendMessageResult
} from '@/types/adapters'

export class FakeMessagingProvider implements MessagingProvider {
  name = 'fake-whatsapp'

  async sendTemplate(_request: SendMessageRequest): Promise<SendMessageResult> {
    void _request
    const providerMessageId = `wamid_fake_${Date.now()}`
    return {
      providerMessageId,
      status: 'DELIVERED',
      timestamp: new Date().toISOString()
    }
  }

  async sendFreeText(_request: SendMessageRequest): Promise<SendMessageResult> {
    void _request
    const providerMessageId = `wamid_fake_text_${Date.now()}`
    return {
      providerMessageId,
      status: 'SENT',
      timestamp: new Date().toISOString()
    }
  }
}

export const FakeWhatsAppProvider = FakeMessagingProvider

