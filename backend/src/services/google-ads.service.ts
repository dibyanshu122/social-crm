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

  async createCampaign(customerId: string, refreshToken: string, campaignData: any): Promise<{ id: string }> {
    if (!this.isConfigured || !this.client) {
      console.log(`[MOCK GOOGLE ADS] Creating full campaign for ${customerId}`, campaignData);
      return { id: `mock_google_camp_${Date.now()}` };
    }

    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      // 1. Create Budget
      const budgetAmount = Math.round(campaignData.budget * 1000000);
      const budgetResponse = await customer.campaignBudgets.create([{
        amount_micros: budgetAmount,
        explicitly_shared: false,
      }]);
      const budgetResource = budgetResponse.results[0].resource_name;

      // 2. Create Campaign
      const campaignResponse = await customer.campaigns.create([{
        name: campaignData.name,
        campaign_budget: budgetResource,
        advertising_channel_type: enums.AdvertisingChannelType.DISPLAY,
        status: enums.CampaignStatus.PAUSED,
        network_settings: { target_content_network: true }
      }]);
      const campaignResource = campaignResponse.results[0].resource_name || '';
      const campaignId = campaignResource.split('/').pop() as string;

      // 3. Create Ad Group
      const adGroupResponse = await customer.adGroups.create([{
        campaign: campaignResource,
        name: `${campaignData.name} - Ad Group`,
        type: enums.AdGroupType.DISPLAY_STANDARD,
        status: enums.AdGroupStatus.ENABLED,
      }]);
      const adGroupResource = adGroupResponse.results[0].resource_name;

      // 4. Handle Media / Asset
      let imageAssetResource = '';
      if (campaignData.adMediaUrl) {
        const axios = require('axios');
        const imageRes = await axios.get(campaignData.adMediaUrl, { responseType: 'arraybuffer' });
        const imageBase64 = Buffer.from(imageRes.data, 'binary').toString('base64');
        const assetResponse = await customer.assets.create([{
          type: enums.AssetType.IMAGE,
          image_asset: { data: imageBase64 }
        }]);
        imageAssetResource = assetResponse.results[0].resource_name || '';
      }

      // 5. Create AdGroup Ad
      if (campaignData.adHeadline && campaignData.adText && campaignData.adLinkUrl && imageAssetResource) {
        await customer.adGroupAds.create([{
          ad_group: adGroupResource,
          status: enums.AdGroupAdStatus.ENABLED,
          ad: {
            final_urls: [campaignData.adLinkUrl],
            responsive_display_ad: {
              headlines: [{ text: campaignData.adHeadline.substring(0, 30) }],
              descriptions: [{ text: campaignData.adText.substring(0, 90) }],
              business_name: "Social CRM",
              marketing_images: [{ asset: imageAssetResource }]
            }
          }
        }]);
      }

      console.log(`Successfully created Google Ads campaign ${campaignId}`);
      return { id: campaignId };
    } catch (error: any) {
      console.error('Error creating Google Ads campaign:', error?.message || error);
      throw new Error('Failed to create Google Ads campaign');
    }
  }

  async getAdMetrics(customerId: string, refreshToken: string, campaignId: string): Promise<{ impressions: number, clicks: number, cpc: number, ctr: number, conversions: number }> {
    if (!this.isConfigured || !this.client || campaignId.startsWith('mock_')) {
      return {
        impressions: Math.floor(Math.random() * 10000),
        clicks: Math.floor(Math.random() * 500),
        cpc: Number((Math.random() * 2).toFixed(2)),
        ctr: Number((Math.random() * 5).toFixed(2)),
        conversions: Math.floor(Math.random() * 50)
      };
    }

    try {
      const customer = this.client.Customer({
        customer_id: customerId,
        refresh_token: refreshToken,
      });

      const metrics = await customer.query(`
        SELECT metrics.impressions, metrics.clicks, metrics.average_cpc, metrics.ctr, metrics.conversions
        FROM campaign 
        WHERE campaign.id = ${campaignId}
      `);

      const data = metrics[0]?.metrics || {};
      return {
        impressions: Number(data.impressions) || 0,
        clicks: Number(data.clicks) || 0,
        cpc: data.average_cpc ? Number(data.average_cpc) / 1000000 : 0,
        ctr: Number(data.ctr) || 0,
        conversions: Number(data.conversions) || 0
      };
    } catch (error) {
      console.error('Error fetching Google Ad Metrics:', error);
      return { impressions: 0, clicks: 0, cpc: 0, ctr: 0, conversions: 0 };
    }
  }
}
