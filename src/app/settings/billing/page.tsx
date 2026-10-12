import { BillingAndUsageMonitorV2 } from '@/components/billing/BillingAndUsageMonitorV2';

export const metadata = {
  title: 'Billing & Usage Ledger | Desynthic AI Sales Executive',
  description: 'Manage minute allowances, plan subscription, overage settings, GST invoices, and carrier reconciliation.',
};

export default function BillingPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', padding: '32px 16px' }}>
      <BillingAndUsageMonitorV2 />
    </main>
  );
}
