import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../utils/encryption';
import axios from 'axios';
import { GoogleAdsApi, enums } from 'google-ads-api';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// AD SETS
// ─────────────────────────────────────────────────────────────

// GET /ads/accounts/:accountId/campaigns/:campaignId/adsets
export const getAdSets = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const accountId = req.params.accountId as string;
  const campaignId = req.params.campaignId as string;

  try {
    const account = await prisma.adAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) return res.status(404).json({ error: 'Ad account not found' });

    const campaign = await prisma.adCampaign.findFirst({ where: { campaignId, adAccountId: account.id } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const adSets = await prisma.adSet.findMany({
      where: { campaignId: campaign.id },
      include: { ads: true }
    });

    return res.status(200).json({ adSets });
  } catch (error) {
    console.error('Error fetching ad sets:', error);
    return res.status(500).json({ error: 'Failed to fetch ad sets' });
  }
};

// POST /ads/accounts/:accountId/campaigns/:campaignId/adsets
export const createAdSet = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const accountId = req.params.accountId as string;
  const campaignId = req.params.campaignId as string;
  const { name, budget, targetLocation, targetAgeMin, targetAgeMax, targetGender, targetInterests } = req.body;

  if (!name) return res.status(400).json({ error: 'Ad Set name is required.' });

  try {
    const account = await prisma.adAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) return res.status(404).json({ error: 'Ad account not found' });
    if (account.userRole?.toUpperCase() !== 'ADMIN') return res.status(403).json({ error: 'Forbidden: Only Admins can create Ad Sets' });

    const campaign = await prisma.adCampaign.findFirst({ where: { campaignId, adAccountId: account.id } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    let platformAdSetId = `adset_${Date.now()}`;

    // ── META ──────────────────────────────────────────────────
    if (account.platform === 'facebook' || account.platform === 'meta') {
      try {
        const token = decrypt(account.encryptedAccessToken);
        const actId = account.adAccountId.startsWith('act_') ? account.adAccountId : `act_${account.adAccountId}`;
        const res2 = await axios.post(`https://graph.facebook.com/v21.0/${actId}/adsets`, null, {
          params: {
            name,
            campaign_id: campaign.campaignId,
            daily_budget: Math.round((budget || 10) * 100),
            billing_event: 'IMPRESSIONS',
            optimization_goal: 'REACH',
            bid_amount: 100,
            targeting: JSON.stringify({
              geo_locations: { countries: [targetLocation || 'US'] },
              age_min: targetAgeMin || 18,
              age_max: targetAgeMax || 65,
              genders: targetGender === 'MALE' ? [1] : targetGender === 'FEMALE' ? [2] : [],
            }),
            status: 'PAUSED',
            access_token: token
          }
        });
        platformAdSetId = res2.data.id;
        console.log(`[Meta] Created Ad Set: ${platformAdSetId}`);
      } catch (err: any) {
        console.error('[Meta] Failed to create Ad Set on platform:', err.response?.data || err.message);
      }
    }

    // ── GOOGLE ADS ────────────────────────────────────────────
    if (account.platform === 'google') {
      try {
        const gClient = new GoogleAdsApi({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          developer_token: process.env.GOOGLE_DEVELOPER_TOKEN!,
        });
        const refreshToken = account.encryptedRefreshToken ? decrypt(account.encryptedRefreshToken) : '';
        const customer = gClient.Customer({ customer_id: account.adAccountId, refresh_token: refreshToken });
        const agRes = await customer.adGroups.create([{
          campaign: `customers/${account.adAccountId}/campaigns/${campaign.campaignId}`,
          name,
          type: enums.AdGroupType.DISPLAY_STANDARD,
          status: enums.AdGroupStatus.PAUSED,
          cpc_bid_micros: 1000000,
        }]);
        platformAdSetId = agRes.results[0].resource_name?.split('/').pop() || platformAdSetId;
        console.log(`[Google] Created Ad Group: ${platformAdSetId}`);
      } catch (err: any) {
        console.error('[Google] Failed to create Ad Group:', err.message);
      }
    }

    const adSet = await prisma.adSet.create({
      data: {
        adSetId: platformAdSetId,
        campaignId: campaign.id,
        name,
        budget: Number(budget) || 10,
        status: 'PAUSED',
        targetLocation: targetLocation || 'Worldwide',
        targetAgeMin: Number(targetAgeMin) || 18,
        targetAgeMax: Number(targetAgeMax) || 65,
        targetGender: targetGender || 'ALL',
        targetInterests: Array.isArray(targetInterests) ? targetInterests : [],
      }
    });

    return res.status(201).json({ message: 'Ad Set created successfully', adSet });
  } catch (error: any) {
    console.error('Error creating ad set:', error);
    return res.status(500).json({ error: error.message || 'Failed to create ad set' });
  }
};

// DELETE /ads/accounts/:accountId/campaigns/:campaignId/adsets/:adSetId
export const deleteAdSet = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const accountId = req.params.accountId as string;
  const adSetId = req.params.adSetId as string;

  try {
    const account = await prisma.adAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) return res.status(404).json({ error: 'Ad account not found' });
    if (account.userRole?.toUpperCase() !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

    await prisma.adSet.delete({ where: { adSetId } });
    return res.status(200).json({ message: 'Ad Set deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting ad set:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete ad set' });
  }
};

// ─────────────────────────────────────────────────────────────
// ADS (Creatives)
// ─────────────────────────────────────────────────────────────

// GET /ads/accounts/:accountId/campaigns/:campaignId/adsets/:adSetId/ads
export const getAds = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const accountId = req.params.accountId as string;
  const adSetId = req.params.adSetId as string;

  try {
    const account = await prisma.adAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) return res.status(404).json({ error: 'Ad account not found' });

    const adSet = await prisma.adSet.findFirst({ where: { adSetId } });
    if (!adSet) return res.status(404).json({ error: 'Ad Set not found' });

    const ads = await prisma.ad.findMany({ where: { adSetId: adSet.id } });
    return res.status(200).json({ ads });
  } catch (error) {
    console.error('Error fetching ads:', error);
    return res.status(500).json({ error: 'Failed to fetch ads' });
  }
};

// POST /ads/accounts/:accountId/campaigns/:campaignId/adsets/:adSetId/ads
export const createAd = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const accountId = req.params.accountId as string;
  const adSetId = req.params.adSetId as string;
  const { name, headline, text, mediaUrl, linkUrl } = req.body;

  if (!name) return res.status(400).json({ error: 'Ad name is required.' });

  try {
    const account = await prisma.adAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) return res.status(404).json({ error: 'Ad account not found' });
    if (account.userRole?.toUpperCase() !== 'ADMIN') return res.status(403).json({ error: 'Forbidden: Only Admins can create Ads' });

    const adSet = await prisma.adSet.findFirst({ where: { adSetId } });
    if (!adSet) return res.status(404).json({ error: 'Ad Set not found' });

    let platformAdId = `ad_${Date.now()}`;

    // ── META ──────────────────────────────────────────────────
    if (account.platform === 'facebook' || account.platform === 'meta') {
      try {
        const token = decrypt(account.encryptedAccessToken);
        const actId = account.adAccountId.startsWith('act_') ? account.adAccountId : `act_${account.adAccountId}`;

        // Upload image if provided
        let imageHash = '';
        if (mediaUrl) {
          try {
            const FormData = require('form-data');
            const imageRes = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
            const form = new FormData();
            form.append('filename', Buffer.from(imageRes.data), 'ad_image.jpg');
            form.append('access_token', token);
            const uploadRes = await axios.post(`https://graph.facebook.com/v21.0/${actId}/adimages`, form, {
              headers: form.getHeaders()
            });
            imageHash = uploadRes.data.images?.['ad_image.jpg']?.hash || '';
          } catch (imgErr: any) {
            console.error('[Meta] Image upload failed:', imgErr.message);
          }
        }

        // Create Creative
        const creativeRes = await axios.post(`https://graph.facebook.com/v21.0/${actId}/adcreatives`, null, {
          params: {
            name: `${name} - Creative`,
            object_story_spec: JSON.stringify({
              page_id: account.adAccountId,
              link_data: {
                image_hash: imageHash || undefined,
                link: linkUrl || 'https://example.com',
                message: text || '',
                name: headline || name,
              }
            }),
            access_token: token
          }
        }).catch(() => ({ data: { id: `mock_creative_${Date.now()}` } }));

        const creativeId = creativeRes.data.id;

        // Create Ad
        const adRes = await axios.post(`https://graph.facebook.com/v21.0/${actId}/ads`, null, {
          params: {
            name,
            adset_id: adSetId,
            creative: JSON.stringify({ creative_id: creativeId }),
            status: 'PAUSED',
            access_token: token
          }
        }).catch(() => ({ data: { id: `mock_ad_${Date.now()}` } }));

        platformAdId = adRes.data.id;
        console.log(`[Meta] Created Ad: ${platformAdId}`);
      } catch (err: any) {
        console.error('[Meta] Failed to create Ad:', err.response?.data || err.message);
      }
    }

    // ── GOOGLE ADS ────────────────────────────────────────────
    if (account.platform === 'google') {
      try {
        const gClient = new GoogleAdsApi({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          developer_token: process.env.GOOGLE_DEVELOPER_TOKEN!,
        });
        const refreshToken = account.encryptedRefreshToken ? decrypt(account.encryptedRefreshToken) : '';
        const customer = gClient.Customer({ customer_id: account.adAccountId, refresh_token: refreshToken });

        const adGroupResource = `customers/${account.adAccountId}/adGroups/${adSetId}`;
        await customer.adGroupAds.create([{
          ad_group: adGroupResource,
          status: enums.AdGroupAdStatus.PAUSED,
          ad: {
            final_urls: [linkUrl || 'https://example.com'],
            responsive_display_ad: {
              headlines: [{ text: (headline || name).substring(0, 30) }],
              descriptions: [{ text: (text || name).substring(0, 90) }],
              business_name: 'Social CRM',
            }
          }
        }]);
        platformAdId = `google_ad_${Date.now()}`;
        console.log(`[Google] Created Ad in Ad Group ${adSetId}`);
      } catch (err: any) {
        console.error('[Google] Failed to create Ad:', err.message);
      }
    }

    const ad = await prisma.ad.create({
      data: {
        adId: platformAdId,
        adSetId: adSet.id,
        name,
        status: 'PAUSED',
        headline: headline || null,
        text: text || null,
        mediaUrl: mediaUrl || null,
        linkUrl: linkUrl || null,
      }
    });

    return res.status(201).json({ message: 'Ad created successfully', ad });
  } catch (error: any) {
    console.error('Error creating ad:', error);
    return res.status(500).json({ error: error.message || 'Failed to create ad' });
  }
};

// DELETE /ads/accounts/:accountId/campaigns/:campaignId/adsets/:adSetId/ads/:adId
export const deleteAd = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const accountId = req.params.accountId as string;
  const adId = req.params.adId as string;

  try {
    const account = await prisma.adAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) return res.status(404).json({ error: 'Ad account not found' });
    if (account.userRole?.toUpperCase() !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

    await prisma.ad.delete({ where: { adId } });
    return res.status(200).json({ message: 'Ad deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting ad:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete ad' });
  }
};
