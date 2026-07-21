import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { decrypt } from './utils/encryption';

const prisma = new PrismaClient();

async function main() {
  const socialAccounts = await prisma.socialAccount.findMany();
  console.log(`=== CONNECTED SOCIAL ACCOUNTS (${socialAccounts.length}) ===`);

  for (const acc of socialAccounts) {
    const token = decrypt(acc.encryptedAccessToken);

    if (acc.platform === 'facebook') {
      console.log(`\nFetching Live Facebook Page Analytics for Page ID: ${acc.platformAccountId}...`);
      try {
        const pageRes = await axios.get(`https://graph.facebook.com/v21.0/${acc.platformAccountId}`, {
          params: { access_token: token, fields: 'id,name,fan_count,followers_count,talking_about_count' }
        });
        console.log('Live Facebook Page Metrics:', JSON.stringify(pageRes.data, null, 2));

        console.log(`Fetching Live LeadGen Forms for Page ID: ${acc.platformAccountId}...`);
        const formsRes = await axios.get(`https://graph.facebook.com/v21.0/${acc.platformAccountId}/leadgen_forms`, {
          params: { access_token: token, fields: 'id,name,status,created_time,leads_count' }
        });
        console.log('Live Meta LeadGen Forms:', JSON.stringify(formsRes.data, null, 2));

        if (formsRes.data?.data && formsRes.data.data.length > 0) {
          for (const form of formsRes.data.data) {
            console.log(`Fetching leads for Form ID ${form.id} (${form.name})...`);
            const leadsRes = await axios.get(`https://graph.facebook.com/v21.0/${form.id}/leads`, {
              params: { access_token: token, fields: 'id,created_time,field_data' }
            });
            console.log(`Leads for Form ${form.id}:`, JSON.stringify(leadsRes.data, null, 2));
          }
        }
      } catch (err: any) {
        console.error('Error fetching live Facebook Page analytics/leadgen:', err.response?.data || err.message);
      }
    }

    if (acc.platform === 'instagram') {
      console.log(`\nFetching Live Instagram Business Metrics for IG User ID: ${acc.platformAccountId}...`);
      try {
        const igRes = await axios.get(`https://graph.facebook.com/v21.0/${acc.platformAccountId}`, {
          params: { access_token: token, fields: 'id,username,followers_count,follows_count,media_count' }
        });
        console.log('Live Instagram Metrics:', JSON.stringify(igRes.data, null, 2));
      } catch (err: any) {
        console.error('Error fetching live Instagram metrics:', err.response?.data || err.message);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
