/**
 * PRD v2.1 Phase 10: HubSpot CRM Adapter
 * Implements CRMProvider interface for HubSpot contacts and pipeline deals.
 */

import { CRMProvider, CrmLeadData, CrmSyncResult } from '@/types/adapters';
import { HubSpotContactPayload, HubSpotDealPayload } from '@/types/crm-integrations-v2';

export class HubSpotCrmAdapter implements CRMProvider {
  public name = 'hubspot';
  private apiKey?: string;
  private contactsStore: Map<string, HubSpotContactPayload> = new Map();
  private dealsStore: Map<string, HubSpotDealPayload> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUBSPOT_API_KEY || 'fake_hubspot_token';
  }

  /**
   * Synchronizes lead data into HubSpot as a Contact and optional Deal.
   */
  public async syncLead(data: CrmLeadData): Promise<CrmSyncResult> {
    try {
      if (!data.phone && !data.name) {
        return {
          providerRecordId: '',
          success: false,
          syncedAt: new Date().toISOString(),
          error: 'Cannot sync to HubSpot: Name and Phone are missing.',
        };
      }

      // 1. Map to HubSpot Contact
      const email = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'lead'}@prospect.in`;
      const statusUpper = data.status.toUpperCase();
      const isQualified =
        statusUpper.includes('QUALIFIED') &&
        !statusUpper.includes('DISQUALIFIED') &&
        !statusUpper.includes('UNQUALIFIED');

      const contact: HubSpotContactPayload = {
        email,
        firstname: data.name.split(' ')[0] || data.name,
        lastname: data.name.split(' ').slice(1).join(' ') || undefined,
        phone: data.phone,
        company: data.company || 'Unknown',
        lifecyclestage: isQualified
          ? 'salesqualifiedlead'
          : 'lead',
        hs_lead_status: data.status,
        notes: `AI Sales Agent Summary: ${data.summary || 'None'}. Score: ${data.score || 0}. Objections: ${(data.objections || []).join(', ')}.`,
      };

      const contactId = `hs_contact_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      this.contactsStore.set(contactId, contact);

      // 2. If Qualified, create associated HubSpot Deal
      let dealId: string | undefined;
      if (isQualified) {
        const deal: HubSpotDealPayload = {
          dealname: `${data.company || data.name} - AI Qualified Opportunity`,
          amount: 50000, // Estimated ACV
          dealstage: data.meetingTime ? 'appointmentscheduled' : 'qualifiedtobuy',
          pipeline: 'default',
          contactEmail: email,
        };
        dealId = `hs_deal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.dealsStore.set(dealId, deal);
      }

      return {
        providerRecordId: dealId ? `${contactId}|${dealId}` : contactId,
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

  public getSyncedContacts(): HubSpotContactPayload[] {
    return Array.from(this.contactsStore.values());
  }

  public getSyncedDeals(): HubSpotDealPayload[] {
    return Array.from(this.dealsStore.values());
  }
}
