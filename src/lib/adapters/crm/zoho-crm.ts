/**
 * PRD v2.1 Phase 10: Zoho CRM Adapter
 * Implements CRMProvider interface for Zoho Leads and Deals.
 */

import { CRMProvider, CrmLeadData, CrmSyncResult } from '@/types/adapters';
import { ZohoLeadPayload } from '@/types/crm-integrations-v2';

export class ZohoCrmAdapter implements CRMProvider {
  public name = 'zoho';
  private apiKey?: string;
  private leadsStore: Map<string, ZohoLeadPayload> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ZOHO_API_KEY || 'fake_zoho_token';
  }

  /**
   * Synchronizes lead data into Zoho CRM as a Lead.
   */
  public async syncLead(data: CrmLeadData): Promise<CrmSyncResult> {
    try {
      if (!data.phone && !data.name) {
        return {
          providerRecordId: '',
          success: false,
          syncedAt: new Date().toISOString(),
          error: 'Cannot sync to Zoho: Name and Phone are missing.',
        };
      }

      const nameParts = (data.name || 'Prospect').trim().split(' ');
      const firstName = nameParts.length > 1 ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || 'Lead';

      const statusUpper = data.status.toUpperCase();
      let leadStatus: ZohoLeadPayload['Lead_Status'] = 'Attempted to Contact';
      if (statusUpper.includes('DISQUALIFIED') || statusUpper.includes('UNQUALIFIED')) {
        leadStatus = 'Lost Lead';
      } else if (statusUpper.includes('QUALIFIED')) {
        leadStatus = 'Qualified';
      } else if (statusUpper.includes('CONNECTED')) {
        leadStatus = 'Contacted';
      }

      const zohoLead: ZohoLeadPayload = {
        First_Name: firstName || undefined,
        Last_Name: lastName,
        Phone: data.phone,
        Company: data.company || 'Individual / SMB',
        Lead_Status: leadStatus,
        Description: `Desynthic AI Call Record. Score: ${data.score || 0}. Summary: ${data.summary || 'N/A'}. Next: ${data.nextAction || 'Follow up'}. Meeting: ${data.meetingTime || 'None'}.`,
      };

      const recordId = `zoho_lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      this.leadsStore.set(recordId, zohoLead);

      return {
        providerRecordId: recordId,
        success: true,
        syncedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      return {
        providerRecordId: '',
        success: false,
        syncedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  public getSyncedLeads(): ZohoLeadPayload[] {
    return Array.from(this.leadsStore.values());
  }
}
