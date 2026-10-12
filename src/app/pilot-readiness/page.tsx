import { ReleaseGateAndDemoV2 } from '@/components/hardening/ReleaseGateAndDemoV2';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pilot Readiness & Release Gate | Desynthic AI',
  description: 'PRD v2.1 Pre-Flight Safety Gate, Zero-Call Smartphone Demo & Unit Economics',
};

export default function PilotReadinessPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#020617', padding: '32px 16px' }}>
      <ReleaseGateAndDemoV2 />
    </main>
  );
}
