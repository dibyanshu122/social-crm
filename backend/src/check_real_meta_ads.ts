import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { decrypt } from './utils/encryption';

const prisma = new PrismaClient();

async function main() {
  const socialAccounts = await prisma.socialAccount.findMany();
  const adAccounts = await prisma.adAccount.findMany({ include: { campaigns: true } });

  console.log(`=== CONNECTED SOCIAL ACCOUNTS (${socialAccounts.length}) ===`);
  for (const acc of socialAccounts) {
    console.log(`- [${acc.platform}] Name: ${acc.accountName} | Role: ${acc.userRole}`);
  }

  console.log(`\n=== CONNECTED AD ACCOUNTS (${adAccounts.length}) ===`);
  for (const acc of adAccounts) {
    console.log(`- [${acc.platform}] Name: ${acc.accountName} | Account ID: ${acc.adAccountId} | Role: ${acc.userRole}`);
    console.log(`  Stored Campaigns (${acc.campaigns.length}):`);
    for (const c of acc.campaigns) {
      console.log(`    * [${c.status}] ${c.name} | Budget: $${c.budget} | Spend: $${c.spend}`);
    }
  }

  // Check live Meta Graph API for real Ad Accounts using stored access tokens
  for (const acc of adAccounts) {
    if (acc.platform === 'facebook') {
      const token = decrypt(acc.encryptedAccessToken);
      console.log(`\nTesting Live Meta Graph API (/me/adaccounts) for token of ${acc.accountName}...`);
      try {
        const resMe = await axios.get(`https://graph.facebook.com/v21.0/me/adaccounts`, {
          params: { access_token: token, fields: 'id,name,account_id,account_status,currency,amount_spent,spend_cap' }
        });
        console.log('Live Meta Ad Accounts:', JSON.stringify(resMe.data, null, 2));

        if (resMe.data.data && resMe.data.data.length > 0) {
          const actId = resMe.data.data[0].id;
          console.log(`Fetching live campaigns for ${actId}...`);
          const resCamps = await axios.get(`https://graph.facebook.com/v21.0/${actId}/campaigns`, {
            params: { access_token: token, fields: 'id,name,status,daily_budget,lifetime_budget,effective_status,insights{spend}' }
          });
          console.log('Live Meta Campaigns:', JSON.stringify(resCamps.data, null, 2));
        }
      } catch (err: any) {
        console.error('Error fetching Meta live ad data:', err.response?.data || err.message);
      }
    }
  }

  // Also test social account user token for Facebook Ad Accounts
  const fbSocialAcc = socialAccounts.find(s => s.platform === 'facebook');
  if (fbSocialAcc) {
    const fbToken = decrypt(fbSocialAcc.encryptedAccessToken);
    console.log('\nTesting Facebook User Token for Live Meta Ad Accounts (/me/adaccounts)...');
    try {
      const resMe = await axios.get(`https://graph.facebook.com/v21.0/me/adaccounts`, {
        params: { access_token: fbToken, fields: 'id,name,account_id,account_status,currency,amount_spent,spend_cap' }
      });
      console.log('Live Meta Ad Accounts via User Token:', JSON.stringify(resMe.data, null, 2));
    } catch (err: any) {
      console.error('Error fetching /me/adaccounts via user token:', err.response?.data || err.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
