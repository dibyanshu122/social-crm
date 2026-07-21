import { Router } from 'express';
import { 
  connectAdAccount, 
  getAdAccounts, 
  getCampaigns, 
  createCampaign,
  updateCampaignBudget, 
  toggleCampaignStatus, 
  getAdAnalytics 
} from '../controllers/ads.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect all Ads routes
router.use(requireAuth);

router.post('/accounts', connectAdAccount);
router.get('/accounts', getAdAccounts);

router.get('/accounts/:accountId/campaigns', getCampaigns);
router.post('/accounts/:accountId/campaigns', createCampaign);
router.put('/accounts/:accountId/campaigns/:campaignId/budget', updateCampaignBudget);
router.put('/accounts/:accountId/campaigns/:campaignId/status', toggleCampaignStatus);

router.get('/accounts/:accountId/analytics', getAdAnalytics);

export default router;
