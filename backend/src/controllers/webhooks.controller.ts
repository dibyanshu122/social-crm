import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Verify Meta Webhook (GET)
export const verifyMetaWebhook = (req: Request, res: Response) => {
  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'social-crm-token';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

// Handle Meta Webhook payload (POST)
export const handleMetaWebhook = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.object !== 'page') {
    return res.sendStatus(404);
  }

  // Acknowledge receipt quickly
  res.status(200).send('EVENT_RECEIVED');

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field === 'leadgen') {
        const leadgenId = change.value.leadgen_id;
        const pageId = change.value.page_id;
        const adId = change.value.ad_id;
        const campaignId = change.value.campaign_id;

        try {
          console.log(`Received Meta Lead: ${leadgenId} for Campaign: ${campaignId}`);

          // Fetch the Ad Account mapping to get the system's access token
          // Realistically, you'd match the pageId or adAccountId to a SocialAccount in DB
          const adAccount = await prisma.adAccount.findFirst({
            where: { platform: 'facebook', status: 'ACTIVE' }
          });

          if (!adAccount) continue;

          // Note: Needs a system access token or page access token
          // const accessToken = decrypt(adAccount.encryptedAccessToken);
          // const leadRes = await axios.get(`https://graph.facebook.com/v21.0/${leadgenId}?access_token=${accessToken}`);
          // const leadData = leadRes.data;

          // Mock mapping data for demo
          const leadEmail = `lead_${Date.now()}@example.com`;
          const leadName = `Facebook Lead`;

          // Find which campaign this belongs to in our DB
          const localCampaign = await prisma.adCampaign.findUnique({
            where: { campaignId: campaignId }
          });

          if (localCampaign) {
            await prisma.lead.create({
              data: {
                userId: adAccount.userId,
                name: leadName,
                email: leadEmail,
                platform: 'facebook',
                formName: 'Facebook Ad Form',
                status: 'NEW',
                adCampaignId: localCampaign.id
              }
            });
            console.log(`Saved Lead ${leadEmail} linked to Ad Campaign ${localCampaign.id}`);
          }
        } catch (error) {
          console.error('Error processing Meta Webhook Lead:', error);
        }
      }
    }
  }
};

// Handle Google Webhook payload (POST)
export const handleGoogleWebhook = async (req: Request, res: Response) => {
  // Google Lead Form Webhook typically sends JSON payload directly
  const { user_column_data, campaign_id } = req.body;

  res.status(200).send('OK');

  try {
    let email = '';
    let name = '';

    if (user_column_data && Array.isArray(user_column_data)) {
      user_column_data.forEach((col: any) => {
        if (col.column_id === 'EMAIL') email = col.string_value;
        if (col.column_id === 'FULL_NAME') name = col.string_value;
      });
    }

    if (!email) return; // Ignore empty leads

    const localCampaign = await prisma.adCampaign.findUnique({
      where: { campaignId: campaign_id }
    });

    if (localCampaign) {
      const adAccount = await prisma.adAccount.findUnique({ where: { id: localCampaign.adAccountId }});
      if (adAccount) {
        await prisma.lead.create({
          data: {
            userId: adAccount.userId,
            name: name || 'Google Lead',
            email,
            platform: 'google',
            formName: 'Google Ads Form',
            status: 'NEW',
            adCampaignId: localCampaign.id
          }
        });
        console.log(`Saved Lead ${email} linked to Ad Campaign ${localCampaign.id}`);
      }
    }
  } catch (error) {
    console.error('Error processing Google Webhook Lead:', error);
  }
};

// Handle LinkedIn Webhook payload (POST)
export const handleLinkedinWebhook = async (req: Request, res: Response) => {
  const body = req.body;
  // LinkedIn sends Challenge verification on initial setup similar to Meta
  if (req.body && req.body.challengeCode) {
    return res.status(200).send({ challengeResponse: req.body.challengeCode });
  }

  res.status(200).send('OK');

  try {
    const { elements } = body;
    if (!elements || !Array.isArray(elements)) return;

    for (const leadEvent of elements) {
      const campaignId = leadEvent.campaign?.split(':').pop(); // urn:li:sponsoredCampaign:123
      const formResponse = leadEvent.formResponse || [];
      
      let email = '';
      let name = '';

      // LinkedIn returns an array of answers
      formResponse.forEach((answer: any) => {
        if (answer.questionDetails?.questionType === 'EMAIL') email = answer.response;
        if (answer.questionDetails?.questionType === 'FIRST_NAME') name = answer.response;
      });

      if (!email) continue;

      const localCampaign = await prisma.adCampaign.findUnique({
        where: { campaignId }
      });

      if (localCampaign) {
        const adAccount = await prisma.adAccount.findUnique({ where: { id: localCampaign.adAccountId }});
        if (adAccount) {
          await prisma.lead.create({
            data: {
              userId: adAccount.userId,
              name: name || 'LinkedIn Lead',
              email,
              platform: 'linkedin',
              formName: 'LinkedIn Lead Gen Form',
              status: 'NEW',
              adCampaignId: localCampaign.id
            }
          });
          console.log(`Saved Lead ${email} linked to LinkedIn Ad Campaign ${localCampaign.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error processing LinkedIn Webhook Lead:', error);
  }
};
