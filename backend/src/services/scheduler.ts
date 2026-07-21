import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../utils/encryption';
import { TwitterService } from './twitter.service';
import { FacebookService } from './facebook.service';
import { LinkedinService } from './linkedin.service';

const prisma = new PrismaClient();

export function startScheduler() {
  console.log('Starting Post Scheduler...');
  
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find all scheduled posts whose time has come
      const postsToPublish = await prisma.post.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            lte: now
          }
        }
      });

      if (postsToPublish.length > 0) {
        console.log(`Found ${postsToPublish.length} post(s) to publish...`);
      }

      for (const post of postsToPublish) {
        try {
          let accounts;
          if (post.socialAccountIds && post.socialAccountIds.length > 0) {
            accounts = await prisma.socialAccount.findMany({
              where: {
                userId: post.userId,
                id: { in: post.socialAccountIds }
              }
            });
          } else {
            accounts = await prisma.socialAccount.findMany({
              where: {
                userId: post.userId,
                platform: { in: post.platforms }
              }
            });
          }

          for (const account of accounts) {
            try {
              const accessToken = decrypt(account.encryptedAccessToken);
              if (account.platform === 'facebook' || account.platform === 'instagram') {
                const fbService = new FacebookService(accessToken);
                await fbService.publishPost(account.platformAccountId, post.content || '', post.mediaUrls || []);
              } else if (account.platform === 'twitter') {
                const twService = new TwitterService(accessToken, account.id);
                await twService.publishTweet(post.content || '', post.mediaUrls || []);
              } else if (account.platform === 'linkedin') {
                const lnService = new LinkedinService(accessToken);
                await lnService.publishPost(account.platformAccountId, post.content || '', post.mediaUrls || []);
              }
            } catch (err: any) {
              console.error(`Scheduler: Failed to post to ${account.platform} for account ${account.platformAccountId}`, err.message);
            }
          }

          // Mark as published
          await prisma.post.update({
            where: { id: post.id },
            data: { status: 'PUBLISHED' }
          });
          console.log(`Post ID ${post.id} published successfully.`);
        } catch (err: any) {
          console.error(`Failed to process scheduled post ID ${post.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('Error in cron job:', err.message);
    }
  });
}
