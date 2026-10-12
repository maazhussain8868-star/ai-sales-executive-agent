import { CrmIntegrationsMonitorV2 } from '@/components/crm/CrmIntegrationsMonitorV2';

export const metadata = {
  title: 'Integrations & Localization | Desynthic AI Sales Executive',
  description: 'Manage HubSpot, Zoho CRM, Google Sheets connectors and regional language voice models.',
};

export default function IntegrationsPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', padding: '32px 16px' }}>
      <CrmIntegrationsMonitorV2 />
    </main>
  );
}
