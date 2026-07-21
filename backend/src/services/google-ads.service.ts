import { GoogleAdsApi, enums } from 'google-ads-api';

export class GoogleAdsService {
  private client: GoogleAdsApi | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_DEVELOPER_TOKEN) {
      this.client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_DEVELOPER_TOKEN,
      });
      this.isConfigured = true;
    } else {
      console.warn('Google Ads credentials missing. Running in mock mode.');
    }
  }

  async getCampaigns(customerId: string, refreshToken: string): Promise<any[]> {
    if (!this.isConfigured || !this.client) {
      console.log(`[MOCK GOOGLE ADS] Fetching campaigns for ${customerId}`);
      return [
        { id: '1', name: 'Summer Sale', status: 'PAUSED', budget: 50.00, spend: 120.00, budgetResourceName: 'customers/mock/campaignBudgets/1' },
        { id: '2', name: 'Retargeting', status: 'ACTIVE', budget: 100.00, spend: 320.00, budgetResourceName: 'customers/mock/campaignBudgets/2' },
      ];
    }

    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const campaigns = await customer.query(`
        SELECT campaign.id, campaign.name, campaign.status, campaign.campaign_budget, campaign_budget.amount_micros 
        FROM campaign 
        WHERE campaign.status != 'REMOVED'
      `);

      return campaigns.map((c: any) => ({
        id: c.campaign.id,
        name: c.campaign.name,
        status: enums.CampaignStatus[c.campaign.status],
        budget: c.campaign_budget ? c.campaign_budget.amount_micros / 1000000 : 0,
        spend: 0, // In production, we'd query metrics.cost_micros for the past 30 days
        budgetResourceName: c.campaign.campaign_budget,
      }));
    } catch (error) {
      console.error('Error fetching Google Ads campaigns:', error);
      throw new Error('Failed to fetch campaigns');
    }
  }

  async updateCampaignBudget(customerId: string, refreshToken: string, budgetResourceName: string, newBudgetAmount: number): Promise<any> {
    if (!this.isConfigured || !this.client) {
      console.log(`[MOCK GOOGLE ADS] Updating campaign budget ${budgetResourceName} for ${customerId} to $${newBudgetAmount}`);
      return { success: true };
    }

    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const amountMicros = Math.round(newBudgetAmount * 1000000);

      const result = await customer.campaignBudgets.update([
        {
          resource_name: budgetResourceName,
          amount_micros: amountMicros,
        }
      ]);
      
      console.log(`Successfully updated budget for ${budgetResourceName}`);
      return result;
    } catch (error) {
      console.error('Error updating Google Ads budget:', error);
      throw new Error('Failed to update Google Ads campaign budget');
    }
  }

  async toggleCampaignStatus(customerId: string, refreshToken: string, campaignId: string, status: 'ACTIVE' | 'PAUSED'): Promise<any> {
    if (!this.isConfigured || !this.client) {
      console.log(`[MOCK GOOGLE ADS] Setting campaign ${campaignId} status for ${customerId} to ${status}`);
      return { success: true };
    }

    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const googleStatus = status === 'ACTIVE' ? enums.CampaignStatus.ENABLED : enums.CampaignStatus.PAUSED;

      const result = await customer.campaigns.update([
        {
          resource_name: `customers/${customerId}/campaigns/${campaignId}`,
          status: googleStatus,
        }
      ]);

      console.log(`Successfully updated status for campaign ${campaignId} to ${status}`);
      return result;
    } catch (error) {
      console.error('Error toggling Google Ads status:', error);
      throw new Error('Failed to toggle Google Ads campaign status');
    }
  }
}
