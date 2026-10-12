import { EmailSequenceMonitorV2 } from '@/components/messaging/EmailSequenceMonitorV2';

export const metadata = {
  title: 'Email Sequences | Desynthic AI Sales Executive',
  description: 'Manage automated email nurture sequences, compliance footers, pause-on-reply, and unsubscribes.',
};

export default function EmailSequencesPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', padding: '32px 16px' }}>
      <EmailSequenceMonitorV2 />
    </main>
  );
}
