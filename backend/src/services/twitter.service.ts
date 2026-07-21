import { TwitterApi } from 'twitter-api-v2';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';

const prisma = new PrismaClient();

export class TwitterService {
  private client: TwitterApi | null = null;
  private isConfigured: boolean = false;
  private accountId?: string;

  constructor(accessToken?: string, accountId?: string) {
    if (accessToken) {
      this.client = new TwitterApi(accessToken);
      this.isConfigured = true;
      this.accountId = accountId;
    } else {
      console.warn('Twitter Service initialized without an access token. Running in mock mode.');
    }
  }

  async publishTweet(content: string, mediaUrls: string[]): Promise<any> {
    if (!this.isConfigured || !this.client) {
      console.log(`[MOCK TWITTER] Tweeting: ${content}`);
      return { data: { id: 'mock_tweet_id_' + Date.now(), text: content }, success: true };
    }

    try {
      // 1. Upload media if image URL is provided
      let mediaId: string | undefined;
      if (mediaUrls && mediaUrls.length > 0) {
        try {
          const axios = require('axios');
          const imageRes = await axios.get(mediaUrls[0], { responseType: 'arraybuffer' });
          const buffer = Buffer.from(imageRes.data);
          
          // Upload to Twitter
          mediaId = await this.client.v1.uploadMedia(buffer, { mimeType: 'image/jpeg' });
          console.log('Twitter media uploaded successfully. ID:', mediaId);
        } catch (mediaErr: any) {
          console.error('Failed to upload Twitter media:', mediaErr.message);
        }
      }

      // 2. Publish tweet
      const payload: any = { text: content };
      if (mediaId) {
        payload.media = { media_ids: [mediaId] };
      }

      const tweet = await this.client.v2.tweet(payload);
      console.log('Successfully posted to Twitter:', tweet);
      return tweet;
    } catch (error: any) {
      // Check if 401 Unauthorized (token expired) and try to refresh
      const isUnauthorized = error.status === 401 || error.statusCode === 401 || error.message?.includes('401');
      if (this.accountId && isUnauthorized) {
        console.log('Twitter token expired (401). Attempting automatic token refresh...');
        try {
          const account = await prisma.socialAccount.findUnique({
            where: { id: this.accountId }
          });
          
          const refreshToken = account?.encryptedRefreshToken ? decrypt(account.encryptedRefreshToken) : '';
          if (refreshToken) {
            const refreshClient = new TwitterApi({
              clientId: process.env.TWITTER_CLIENT_ID!,
              clientSecret: process.env.TWITTER_CLIENT_SECRET!,
            });
            
            const { accessToken: newAccess, refreshToken: newRefresh, expiresIn } = await refreshClient.refreshOAuth2Token(refreshToken);
            
            // Save refreshed tokens back to DB
            await prisma.socialAccount.update({
              where: { id: this.accountId },
              data: {
                encryptedAccessToken: encrypt(newAccess),
                encryptedRefreshToken: newRefresh ? encrypt(newRefresh) : undefined,
                tokenExpiresAt: new Date(Date.now() + (expiresIn || 7200) * 1000)
              }
            });

            // Re-initialize client and retry publish once
            this.client = new TwitterApi(newAccess);
            
            // Re-run media upload & tweet
            let mediaIdRetry: string | undefined;
            if (mediaUrls && mediaUrls.length > 0) {
              try {
                const axios = require('axios');
                const imageRes = await axios.get(mediaUrls[0], { responseType: 'arraybuffer' });
                const buffer = Buffer.from(imageRes.data);
                mediaIdRetry = await this.client.v1.uploadMedia(buffer, { mimeType: 'image/jpeg' });
              } catch (retryMediaErr) {}
            }

            const payloadRetry: any = { text: content };
            if (mediaIdRetry) {
              payloadRetry.media = { media_ids: [mediaIdRetry] };
            }

            const tweetRetry = await this.client.v2.tweet(payloadRetry);
            console.log('Twitter auto-refresh and tweet successful!');
            return tweetRetry;
          }
        } catch (refreshError: any) {
          console.error('Twitter token auto-refresh failed:', refreshError.message);
        }
      }

      console.error('Error publishing to Twitter:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to publish to Twitter');
    }
  }
}
