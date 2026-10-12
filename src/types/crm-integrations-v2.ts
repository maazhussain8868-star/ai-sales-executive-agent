/**
 * PRD v2.1 Phase 10: Regional Languages & Unified CRM Integrations Types
 */

export type ExtendedRegionalLanguage = 'en' | 'hi' | 'hinglish' | 'te' | 'ta' | 'mr';

export interface RegionalLanguageConfig {
  code: ExtendedRegionalLanguage;
  name: string;
  nativeName: string;
  aiDisclosureLine: string;
  optOutPhrases: string[];
}

export interface HubSpotContactPayload {
  email: string;
  firstname: string;
  lastname?: string;
  phone: string;
  company?: string;
  lifecyclestage: 'lead' | 'marketingqualifiedlead' | 'salesqualifiedlead' | 'opportunity';
  hs_lead_status?: string;
  notes?: string;
}

export interface HubSpotDealPayload {
  dealname: string;
  amount?: number;
  dealstage: 'appointmentscheduled' | 'qualifiedtobuy' | 'presentationscheduled' | 'closedwon' | 'closedlost';
  pipeline: 'default';
  contactEmail: string;
}

export interface ZohoLeadPayload {
  First_Name?: string;
  Last_Name: string;
  Email?: string;
  Phone: string;
  Company: string;
  Lead_Status: 'Attempted to Contact' | 'Contacted' | 'Qualified' | 'Pre-Qualified' | 'Lost Lead';
  Description?: string;
}

export interface CrmConnectionStatus {
  provider: 'google_sheets' | 'hubspot' | 'zoho';
  isConnected: boolean;
  apiKeyMasked?: string;
  portalId?: string;
  lastSyncedAt?: string;
  totalSyncedLeads: number;
}
