import { PrismaClient } from '@prisma/client';
import { FacebookService } from './services/facebook.service';
import { TwitterService } from './services/twitter.service';
import { LinkedinService } from './services/linkedin.service';
import { decrypt } from './utils/encryption';

const prisma = new PrismaClient();

async function testAll() {
  const userId = '5690e7df-ac3e-486b-af1e-54aff302da28'; // ddibyanshu2@gmail.com
  const content = 'Test image post from Social CRM & Ads Commander! 🎨🚀 #automation';
  const mediaUrls: string[] = ['https://underfoot-enactive-anja.ngrok-free.dev/uploads/test_logo.png'];

  console.log('Fetching connected accounts for user...');
  const accounts = await prisma.socialAccount.findMany({ where: { userId } });
  console.log(`Found ${accounts.length} connected accounts:`, accounts.map(a => `${a.platform}: ${a.accountName}`));

  for (const account of accounts) {
    try {
      console.log(`\nAttempting publish to [${account.platform.toUpperCase()}] - ${account.accountName}...`);
      const accessToken = decrypt(account.encryptedAccessToken);

      if (account.platform === 'facebook') {
        const fbService = new FacebookService(accessToken);
        const res = await fbService.publishPost(account.platformAccountId, content, mediaUrls);
        console.log('SUCCESS Facebook:', res);
      } else if (account.platform === 'instagram') {
        const fbService = new FacebookService(accessToken);
        const res = await fbService.publishInstagramPost(account.platformAccountId, content, mediaUrls);
        console.log('SUCCESS Instagram:', res);
      } else if (account.platform === 'twitter') {
        const twService = new TwitterService(accessToken, account.id);
        const tweet = await twService.publishTweet(content, mediaUrls);
        console.log('SUCCESS Twitter:', tweet);
      } else if (account.platform === 'linkedin') {
        const lnService = new LinkedinService(accessToken);
        const res = await lnService.publishPost(account.platformAccountId, content, mediaUrls);
        console.log('SUCCESS LinkedIn:', res);
      }
    } catch (err: any) {
      console.error(`FAILED to publish to [${account.platform.toUpperCase()}]:`, err.message || err);
    }
  }

  await prisma.$disconnect();
}

testAll();
