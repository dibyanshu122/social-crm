import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { 
  facebookOAuthInitiate, 
  facebookOAuthCallback,
  facebookWebhookVerify,
  facebookWebhookReceive,
  twitterOAuthInitiate,
  twitterOAuthCallback,
  linkedinOAuthInitiate,
  linkedinOAuthCallback,
  googleOAuthInitiate,
  googleOAuthCallback,
  disconnectAccount,
} from '../controllers/oauth.controller';

const router = Router();

// Facebook OAuth (also captures Instagram Business Accounts)
router.get('/facebook', facebookOAuthInitiate);
router.get('/facebook/callback', facebookOAuthCallback);

// Facebook & Instagram Webhooks
router.get('/facebook/webhook', facebookWebhookVerify);
router.post('/facebook/webhook', facebookWebhookReceive);

// Twitter / X OAuth 2.0 PKCE
router.get('/twitter', twitterOAuthInitiate);
router.get('/twitter/callback', twitterOAuthCallback);

// LinkedIn OAuth 2.0
router.get('/linkedin', linkedinOAuthInitiate);
router.get('/linkedin/callback', linkedinOAuthCallback);

// Google Ads OAuth 2.0
router.get('/google', googleOAuthInitiate);
router.get('/google/callback', googleOAuthCallback);

// Disconnect a platform (requires auth)
router.delete('/disconnect/:platform', requireAuth, disconnectAccount);

export default router;
