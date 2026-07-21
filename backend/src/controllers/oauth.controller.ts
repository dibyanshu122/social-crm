import { Request, Response } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { encrypt } from '../utils/encryption';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:5000';

// In-memory store for PKCE verifiers keyed by state
// In production, use Redis or express-session
const pkceStore: Record<string, string> = {};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// ─────────────────────────────────────────────────────────────────────────────
// FACEBOOK OAUTH FLOW
// Handles both Facebook Pages AND Instagram Business accounts via Facebook Login
// ─────────────────────────────────────────────────────────────────────────────

export const facebookOAuthInitiate = (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).send('userId is required');

  const appId = process.env.META_APP_ID;
  if (!appId) return res.status(500).send('META_APP_ID not configured');

  const targetRedirectUri = `${BACKEND_URL}/api/v1/oauth/facebook/callback`;
  console.log('--- FACEBOOK OAUTH INITIATE ---');
  console.log('BACKEND_URL raw:', process.env.BACKEND_URL);
  console.log('Target redirect URI:', targetRedirectUri);

  const redirectUri = encodeURIComponent(targetRedirectUri);
  const state       = encodeURIComponent(userId);
  // instagram_basic + instagram_content_publish gives access to linked Instagram pages
  const scope = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'business_management',
    'ads_read',
    'ads_management',
    'public_profile',
  ].join(',');

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&response_type=code`;
  console.log('Final Auth Redirect URL:', authUrl);

  return res.redirect(authUrl);
};

export const facebookOAuthCallback = async (req: Request, res: Response) => {
  console.log('--- FACEBOOK CALLBACK RECEIVED ---');
  console.log('Query params:', req.query);
  const { code, state, error, error_description, error_code, error_message } = req.query;

  if (error || error_message) {
    const errMsg = (error_message || error_description || error || 'Unknown OAuth Error') as string;
    console.error('Facebook OAuth Error:', errMsg);
    return res.redirect(`${FRONTEND_URL}/integrations?error=${encodeURIComponent(errMsg)}`);
  }

  if (!code || !state) {
    console.error('Facebook Callback Validation Failed: missing code or state');
    return res.redirect(`${FRONTEND_URL}/integrations?error=Invalid_Callback`);
  }

  const userId     = decodeURIComponent(state as string);
  const appId      = process.env.META_APP_ID;
  const appSecret  = process.env.META_APP_SECRET;
  const redirectUri = `${BACKEND_URL}/api/v1/oauth/facebook/callback`;

  try {
    // 1. Exchange code → short-lived user token
    const tokenRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: { client_id: appId, redirect_uri: redirectUri, client_secret: appSecret, code },
    });
    const shortToken: string = tokenRes.data.access_token;

    // 2. Exchange short-lived → long-lived user token
    const longTokenRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortToken,
      },
    });
    const longToken: string = longTokenRes.data.access_token;

    // 3. Fetch user's Facebook Pages (each page gets its own never-expiring page token)
    const pagesRes = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
      params: { access_token: longToken, fields: 'id,name,access_token,instagram_business_account' },
    });
    console.log('Facebook Pages API Response data:', JSON.stringify(pagesRes.data, null, 2));
    const pages: any[] = pagesRes.data.data || [];

    // Ensure Profile exists in local DB
    await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        fullName: 'Facebook User',
      }
    });

    let connected = 0;

    for (const page of pages) {
      // Save Facebook Page
      await prisma.socialAccount.upsert({
        where: { userId_platform_platformAccountId: { userId, platform: 'facebook', platformAccountId: page.id } },
        update:  { accountName: page.name, encryptedAccessToken: encrypt(page.access_token) },
        create:  { userId, platform: 'facebook', platformAccountId: page.id, accountName: page.name, encryptedAccessToken: encrypt(page.access_token) },
      });
      connected++;

      // If the page has a linked Instagram Business account, save that too
      if (page.instagram_business_account?.id) {
        const igId = page.instagram_business_account.id;
        // Fetch IG username
        const igRes = await axios.get(`https://graph.facebook.com/v21.0/${igId}`, {
          params: { fields: 'id,name,username', access_token: page.access_token },
        });
        const ig = igRes.data;
        await prisma.socialAccount.upsert({
          where: { userId_platform_platformAccountId: { userId, platform: 'instagram', platformAccountId: ig.id } },
          update:  { accountName: ig.username || ig.name, encryptedAccessToken: encrypt(page.access_token) },
          create:  { userId, platform: 'instagram', platformAccountId: ig.id, accountName: ig.username || ig.name, encryptedAccessToken: encrypt(page.access_token) },
        });
        connected++;
      }
    }

    if (connected === 0) {
      return res.redirect(`${FRONTEND_URL}/integrations?error=No_Pages_Found_Please_Create_A_Facebook_Page_First`);
    }

    // 3.5 Fetch user's Meta Ad Accounts automatically
    try {
      const adAccountsRes = await axios.get('https://graph.facebook.com/v21.0/me/adaccounts', {
        params: { access_token: longToken, fields: 'id,name,account_status' },
      });
      const adAccounts = adAccountsRes.data.data || [];
      for (const adAcc of adAccounts) {
        await prisma.adAccount.upsert({
          where: { userId_platform_adAccountId: { userId, platform: 'facebook', adAccountId: adAcc.id } },
          update: { accountName: adAcc.name || `Meta Ad Account ${adAcc.id}`, encryptedAccessToken: encrypt(longToken) },
          create: { userId, platform: 'facebook', adAccountId: adAcc.id, accountName: adAcc.name || `Meta Ad Account ${adAcc.id}`, encryptedAccessToken: encrypt(longToken) },
        });
      }
    } catch (adErr: any) {
      console.error('Failed to automatically fetch Meta Ad Accounts:', adErr.response?.data || adErr.message);
    }

    return res.redirect(`${FRONTEND_URL}/integrations?success=facebook_connected&pages=${connected}`);
  } catch (err: any) {
    console.error('Facebook callback error:', err.response?.data || err.message);
    return res.redirect(`${FRONTEND_URL}/integrations?error=Facebook_Token_Exchange_Failed`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TWITTER / X OAUTH 2.0 — PKCE (Proof Key for Code Exchange)
// ─────────────────────────────────────────────────────────────────────────────

export const twitterOAuthInitiate = (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).send('userId is required');

  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) return res.status(500).send('TWITTER_CLIENT_ID not configured');

  // Generate PKCE verifier + challenge per-request
  const codeVerifier  = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  // state encodes both userId and a random nonce
  const rawState = `${userId}:${crypto.randomBytes(8).toString('hex')}`;
  const state    = Buffer.from(rawState).toString('base64url');

  // Store verifier keyed by state (in-memory; good enough for single-server dev)
  pkceStore[state] = codeVerifier;

  const redirectUri = encodeURIComponent(`${BACKEND_URL}/api/v1/oauth/twitter/callback`);
  const scope = 'tweet.read tweet.write users.read offline.access';

  const authUrl = [
    'https://twitter.com/i/oauth2/authorize',
    `?response_type=code`,
    `&client_id=${encodeURIComponent(clientId)}`,
    `&redirect_uri=${redirectUri}`,
    `&scope=${encodeURIComponent(scope)}`,
    `&state=${state}`,
    `&code_challenge=${codeChallenge}`,
    `&code_challenge_method=S256`,
  ].join('');

  return res.redirect(authUrl);
};

export const twitterOAuthCallback = async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('Twitter OAuth error:', error_description);
    return res.redirect(`${FRONTEND_URL}/integrations?error=${encodeURIComponent((error_description || error) as string)}`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/integrations?error=Invalid_Twitter_Callback`);
  }

  const stateStr = state as string;
  const codeVerifier = pkceStore[stateStr];
  if (!codeVerifier) {
    return res.redirect(`${FRONTEND_URL}/integrations?error=State_Mismatch_Please_Try_Again`);
  }
  delete pkceStore[stateStr]; // one-time use

  // Decode userId from state
  const rawState = Buffer.from(stateStr, 'base64url').toString();
  const userId   = rawState.split(':')[0];

  const clientId     = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const redirectUri  = `${BACKEND_URL}/api/v1/oauth/twitter/callback`;

  try {
    // 1. Exchange code → access token
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes  = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        code: code as string,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const { access_token, refresh_token } = tokenRes.data;

    // 2. Fetch the authenticated user's profile
    const userRes = await axios.get('https://api.twitter.com/2/users/me', {
      params: { 'user.fields': 'id,name,username,profile_image_url' },
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const twitterUser = userRes.data.data;

    // Ensure Profile exists in local DB
    await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        fullName: twitterUser.name || twitterUser.username,
      }
    });

    // 3. Save / update in DB
    await prisma.socialAccount.upsert({
      where:  { userId_platform_platformAccountId: { userId, platform: 'twitter', platformAccountId: twitterUser.id } },
      update: {
        accountName: `@${twitterUser.username}`,
        encryptedAccessToken:  encrypt(access_token),
        encryptedRefreshToken: refresh_token ? encrypt(refresh_token) : null,
      },
      create: {
        userId,
        platform: 'twitter',
        platformAccountId: twitterUser.id,
        accountName: `@${twitterUser.username}`,
        encryptedAccessToken:  encrypt(access_token),
        encryptedRefreshToken: refresh_token ? encrypt(refresh_token) : null,
      },
    });

    return res.redirect(`${FRONTEND_URL}/integrations?success=twitter_connected&account=${encodeURIComponent('@' + twitterUser.username)}`);
  } catch (err: any) {
    console.error('Twitter callback error:', err.response?.data || err.message);
    return res.redirect(`${FRONTEND_URL}/integrations?error=Twitter_Token_Exchange_Failed`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LINKEDIN OAUTH 2.0
// ─────────────────────────────────────────────────────────────────────────────

export const linkedinOAuthInitiate = (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).send('userId is required');

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) return res.status(500).send('LINKEDIN_CLIENT_ID not configured — add it to .env');

  const state       = encodeURIComponent(userId);
  const redirectUri = encodeURIComponent(`${BACKEND_URL}/api/v1/oauth/linkedin/callback`);
  const scope       = encodeURIComponent('openid profile email w_member_social');

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;

  return res.redirect(authUrl);
};

export const linkedinOAuthCallback = async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/integrations?error=${encodeURIComponent((error_description || error) as string)}`);
  }
  if (!code || !state) return res.redirect(`${FRONTEND_URL}/integrations?error=Invalid_LinkedIn_Callback`);

  const userId       = decodeURIComponent(state as string);
  const clientId     = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const redirectUri  = `${BACKEND_URL}/api/v1/oauth/linkedin/callback`;

  try {
    // 1. Exchange code → access token
    const tokenRes = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token } = tokenRes.data;

    // 2. Fetch LinkedIn profile
    const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = profileRes.data;
    const linkedinId   = profile.sub; // The OpenID Connect sub is the unique URN/ID
    
    const givenName = profile.given_name || '';
    const familyName = profile.family_name || '';
    let accountName = profile.name || 'LinkedIn User';
    if (accountName.includes('undefined')) {
      accountName = `${givenName} ${familyName}`.trim() || profile.email || 'LinkedIn User';
    }

    // Ensure Profile exists in local DB
    await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        fullName: accountName,
      }
    });

    // 3. Save to DB
    await prisma.socialAccount.upsert({
      where:  { userId_platform_platformAccountId: { userId, platform: 'linkedin', platformAccountId: linkedinId } },
      update: { accountName, encryptedAccessToken: encrypt(access_token) },
      create: { userId, platform: 'linkedin', platformAccountId: linkedinId, accountName, encryptedAccessToken: encrypt(access_token) },
    });

    // 3.5 Auto-upsert a LinkedIn Ad Account so it is ready for management
    try {
      await prisma.adAccount.upsert({
        where: { userId_platform_adAccountId: { userId, platform: 'linkedin', adAccountId: `li_ads_${linkedinId}` } },
        update: { accountName: `${accountName}'s LinkedIn Ads`, encryptedAccessToken: encrypt(access_token) },
        create: { userId, platform: 'linkedin', adAccountId: `li_ads_${linkedinId}`, accountName: `${accountName}'s LinkedIn Ads`, encryptedAccessToken: encrypt(access_token) },
      });
    } catch (adErr) {
      console.error('Failed to create LinkedIn Ad Account:', adErr);
    }

    return res.redirect(`${FRONTEND_URL}/integrations?success=linkedin_connected&account=${encodeURIComponent(accountName)}`);
  } catch (err: any) {
    console.error('LinkedIn callback error:', err.response?.data || err.message);
    return res.redirect(`${FRONTEND_URL}/integrations?error=LinkedIn_Token_Exchange_Failed`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DISCONNECT (Remove a connected social account)
// ─────────────────────────────────────────────────────────────────────────────

export const disconnectAccount = async (req: Request, res: Response) => {
  const platform = req.params.platform as string;
  const userId = req.user?.id as string;

  try {
    await prisma.socialAccount.deleteMany({ where: { userId, platform } });
    return res.status(200).json({ message: `${platform} account disconnected` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to disconnect account' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE ADS OAUTH 2.0
// ─────────────────────────────────────────────────────────────────────────────

export const googleOAuthInitiate = (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).send('userId is required');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).send('GOOGLE_CLIENT_ID not configured — add it to .env');

  const state       = encodeURIComponent(userId);
  const redirectUri = encodeURIComponent(`${BACKEND_URL}/api/v1/oauth/google/callback`);
  const scope       = encodeURIComponent('https://www.googleapis.com/auth/adwords openid email profile');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&access_type=offline&prompt=consent`;

  return res.redirect(authUrl);
};

export const googleOAuthCallback = async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/integrations?error=${encodeURIComponent((error_description || error) as string)}`);
  }
  if (!code || !state) return res.redirect(`${FRONTEND_URL}/integrations?error=Invalid_Google_Callback`);

  const userId       = decodeURIComponent(state as string);
  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN || '';
  const redirectUri  = `${BACKEND_URL}/api/v1/oauth/google/callback`;

  try {
    // 1. Exchange code → access token & refresh token
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, refresh_token } = tokenRes.data;

    // 2. Fetch accessible Google Ads customers
    let customerIds: string[] = [];
    if (developerToken) {
      try {
        const customersRes = await axios.get('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'developer-token': developerToken,
          }
        });
        const resourceNames = customersRes.data.resourceNames || [];
        customerIds = resourceNames.map((name: string) => name.replace('customers/', ''));
      } catch (apiErr) {
        console.error('Failed to list Google Ads customer IDs automatically:', apiErr);
      }
    }

    if (customerIds.length === 0) {
      // Fallback: Use a mock or default Customer ID if API is not fully set up or verified yet
      customerIds = ['1234567890'];
    }

    // 3. Save Ad Accounts to DB
    for (const customerId of customerIds) {
      await prisma.adAccount.upsert({
        where: { userId_platform_adAccountId: { userId, platform: 'google', adAccountId: customerId } },
        update: { 
          accountName: `Google Ads Customer ${customerId}`, 
          encryptedAccessToken: encrypt(access_token),
          encryptedRefreshToken: refresh_token ? encrypt(refresh_token) : undefined
        },
        create: { 
          userId, 
          platform: 'google', 
          adAccountId: customerId, 
          accountName: `Google Ads Customer ${customerId}`, 
          encryptedAccessToken: encrypt(access_token),
          encryptedRefreshToken: refresh_token ? encrypt(refresh_token) : undefined
        },
      });
    }

    return res.redirect(`${FRONTEND_URL}/integrations?success=google_connected&account=${encodeURIComponent(`Google Ads (${customerIds.length} Acc)`)}`);
  } catch (err: any) {
    console.error('Google callback error:', err.response?.data || err.message);
    return res.redirect(`${FRONTEND_URL}/integrations?error=Google_Token_Exchange_Failed`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FACEBOOK & INSTAGRAM WEBHOOKS
// ─────────────────────────────────────────────────────────────────────────────

export const facebookWebhookVerify = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN || 'my_super_secure_webhook_token_2026';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('--- FACEBOOK WEBHOOK VERIFICATION SUCCESSFUL ---');
    return res.status(200).send(challenge);
  } else {
    console.error('--- FACEBOOK WEBHOOK VERIFICATION FAILED --- Mismatched verification token.');
    return res.status(403).send('Forbidden');
  }
};

export const facebookWebhookReceive = (req: Request, res: Response) => {
  const body = req.body;

  console.log('--- FACEBOOK/INSTAGRAM WEBHOOK RECEIVED ---');
  console.log(JSON.stringify(body, null, 2));

  // Confirm receipt of the event (Meta requires 200 OK)
  return res.status(200).send('EVENT_RECEIVED');
};
