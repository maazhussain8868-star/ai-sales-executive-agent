import { VoiceCallMonitorV2 } from '@/components/voice/VoiceCallMonitorV2';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voice Calling Engine | Desynthic AI',
  description: 'PRD v2.1 OmniDimension Agent Priya live call monitor and test suite',
};

export default function CallsPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#020617', padding: '32px 16px' }}>
      <VoiceCallMonitorV2 />
    </main>
  );
}
