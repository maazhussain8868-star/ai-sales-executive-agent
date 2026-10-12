import { CRMProvider, CrmLeadData, CrmSyncResult } from '@/types/adapters'

export class FakeCRMProvider implements CRMProvider {
  name = 'fake-crm-sheets'

  async syncLead(_data: CrmLeadData): Promise<CrmSyncResult> {
    void _data
    const providerRecordId = `sheets_row_${Date.now()}`
    return {
      providerRecordId,
      success: true,
      syncedAt: new Date().toISOString()
    }
  }
}

export const FakeCrmSheetsProvider = FakeCRMProvider

