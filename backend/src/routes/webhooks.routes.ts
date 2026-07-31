import express from 'express';
import { verifyMetaWebhook, handleMetaWebhook, handleGoogleWebhook, handleLinkedinWebhook } from '../controllers/webhooks.controller';

const router = express.Router();

// Meta Webhooks
router.get('/meta', verifyMetaWebhook);
router.post('/meta', handleMetaWebhook);

// Google Webhooks
router.post('/google', handleGoogleWebhook);

// LinkedIn Webhooks
router.post('/linkedin', handleLinkedinWebhook);

export default router;
