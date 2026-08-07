import { Router } from 'express';
import { 
  connectAdAccount, 
  getAdAccounts, 
  getCampaigns, 
  createCampaign,
  updateCampaignBudget, 
  toggleCampaignStatus, 
  deleteCampaign,
  getAdAnalytics 
} from '../controllers/ads.controller';
import { 
  getAdSets, createAdSet, deleteAdSet,
  getAds, createAd, deleteAd
} from '../controllers/adsets.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect all Ads routes
router.use(requireAuth);

router.post('/accounts', connectAdAccount);
router.get('/accounts', getAdAccounts);

// Campaign routes
router.get('/accounts/:accountId/campaigns', getCampaigns);
router.post('/accounts/:accountId/campaigns', createCampaign);
router.put('/accounts/:accountId/campaigns/:campaignId/budget', updateCampaignBudget);
router.put('/accounts/:accountId/campaigns/:campaignId/status', toggleCampaignStatus);
router.delete('/accounts/:accountId/campaigns/:campaignId', deleteCampaign);

// Ad Set routes (Meta: Ad Sets / Google: Ad Groups)
router.get('/accounts/:accountId/campaigns/:campaignId/adsets', getAdSets);
router.post('/accounts/:accountId/campaigns/:campaignId/adsets', createAdSet);
router.delete('/accounts/:accountId/campaigns/:campaignId/adsets/:adSetId', deleteAdSet);

// Ad (Creative) routes
router.get('/accounts/:accountId/campaigns/:campaignId/adsets/:adSetId/ads', getAds);
router.post('/accounts/:accountId/campaigns/:campaignId/adsets/:adSetId/ads', createAd);
router.delete('/accounts/:accountId/campaigns/:campaignId/adsets/:adSetId/ads/:adId', deleteAd);

router.get('/accounts/:accountId/analytics', getAdAnalytics);

export default router;
