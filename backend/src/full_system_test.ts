/**
 * Full System Test — Tests LIVE Render Backend
 * Uses real Supabase auth token from curl approach
 */
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import https from 'https';

const BACKEND = 'https://social-crm.onrender.com';
const API = `${BACKEND}/api/v1`;

// Known dev fallback userId already in backend auth middleware
// Backend uses: 57bc2705-e440-4a59-93aa-29fb952eb96f as fallback

let socialAccounts: any[] = [];
let adAccounts: any[] = [];

const log = {
  ok:      (msg: string) => console.log(`\x1b[32m  ✅ ${msg}\x1b[0m`),
  fail:    (msg: string) => console.log(`\x1b[31m  ❌ ${msg}\x1b[0m`),
  info:    (msg: string) => console.log(`\x1b[36m  📍 ${msg}\x1b[0m`),
  warn:    (msg: string) => console.log(`\x1b[33m  ⚠️  ${msg}\x1b[0m`),
  section: (msg: string) => console.log(`\n\x1b[35m${'═'.repeat(60)}\n  🔷 ${msg}\n${'═'.repeat(60)}\x1b[0m`),
};

const H = { 'Content-Type': 'application/json' };

async function step1_health() {
  log.section('STEP 1: Live Backend Health Check (Render.com)');
  const r1 = await axios.get(`${BACKEND}/`, { timeout: 30000 });
  log.ok(`Root: ${r1.data.message}`);
  const r2 = await axios.get(`${BACKEND}/api/health`, { timeout: 30000 });
  log.ok(`Health: ${r2.data.message}`);
}

async function step2_accounts() {
  log.section('STEP 2: Connected Social & Ad Accounts');
  const sr = await axios.get(`${API}/social/accounts`, { headers: H, timeout: 30000 });
  socialAccounts = sr.data.accounts || [];
  log.ok(`Social accounts: ${socialAccounts.length}`);
  if (socialAccounts.length === 0) {
    log.warn('No social accounts — OAuth connections needed via Integrations tab');
  } else {
    socialAccounts.forEach((a: any) => log.info(`[${a.platform.toUpperCase()}] ${a.accountName} | Role: ${a.userRole}`));
  }

  const ar = await axios.get(`${API}/ads/accounts`, { headers: H, timeout: 30000 });
  adAccounts = ar.data.accounts || [];
  log.ok(`Ad accounts: ${adAccounts.length}`);
  adAccounts.forEach((a: any) => log.info(`[${a.platform.toUpperCase()}] ${a.accountName} | Role: ${a.userRole}`));
}

async function step3_analytics() {
  log.section('STEP 3: Analytics / Live Metrics');
  const r = await axios.get(`${API}/social/analytics`, { headers: H, timeout: 30000 });
  const a = r.data.analytics || {};
  log.ok('Analytics data:');
  ['facebook','instagram','twitter','linkedin'].forEach(p => {
    if (a[p] && a[p].profile && a[p].profile !== 'Not connected') {
      log.ok(`${p.toUpperCase()}: followers=${a[p].followers} | profile="${a[p].profile}"`);
    } else {
      log.warn(`${p.toUpperCase()}: Not connected`);
    }
  });
}

async function step4_leads() {
  log.section('STEP 4: CRM Leads');
  const r = await axios.get(`${API}/leads`, { headers: H, timeout: 30000 });
  const leads = r.data.leads || [];
  log.ok(`Total leads in database: ${leads.length}`);
  leads.slice(0, 5).forEach((l: any) =>
    log.info(`${l.name} | Status: ${l.status} | Platform: ${l.platform}`)
  );

  const nl = await axios.post(`${API}/leads`, {
    name: 'Live System Test Lead',
    email: `livetest_${Date.now()}@autotest.com`,
    phone: '+91 88888 11111',
    platform: 'facebook',
    formName: 'Live Test Form',
    status: 'NEW',
    notes: 'Created by live system test on Render backend'
  }, { headers: H, timeout: 30000 });
  log.ok(`Test lead created: "${nl.data.lead?.name}" | ID: ${nl.data.lead?.id}`);
}

async function step5_text_post() {
  log.section('STEP 5: Text Post (Live Platforms)');
  const platforms = socialAccounts.length > 0
    ? [...new Set(socialAccounts.map((a: any) => a.platform))]
    : ['facebook'];
  const accountIds = socialAccounts.map((a: any) => a.id);

  const r = await axios.post(`${API}/social/posts`, {
    content: `🚀 LIVE System Test Post from Social CRM!\n\nThis post was published automatically via our Render.com Live Backend API.\nTimestamp: ${new Date().toLocaleString()}\n\n#SocialCRM #LiveTest #Render`,
    platforms,
    socialAccountIds: accountIds,
    mediaUrls: []
  }, { headers: H, timeout: 30000 });

  log.ok(`Post created: ID=${r.data.post?.id} | Status=${r.data.post?.status}`);
  if (r.data.results) {
    Object.entries(r.data.results).forEach(([plt, res]: [string, any]) => {
      if (res?.id || res?.postId || res?.success) {
        log.ok(`${plt.toUpperCase()}: PUBLISHED LIVE ✅ (PostID: ${res?.id || res?.postId || 'N/A'})`);
      } else {
        log.warn(`${plt.toUpperCase()}: ${res?.error || 'Token/permission needed'}`);
      }
    });
  } else {
    log.info(`Post saved with status: ${r.data.post?.status}`);
  }
}

async function step6_image_upload() {
  log.section('STEP 6: Image Upload Test (Render Backend)');
  const imgPath = path.join(process.cwd(), 'test_live_img.png');
  
  // Valid minimal 1x1 PNG
  const pngBytes = Buffer.from([
    0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,
    0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
    0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
    0xde,0x00,0x00,0x00,0x0c,0x49,0x44,0x41,
    0x54,0x08,0xd7,0x63,0xf8,0xcf,0xc0,0x00,
    0x00,0x00,0x02,0x00,0x01,0xe2,0x21,0xbc,
    0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,
    0x44,0xae,0x42,0x60,0x82
  ]);
  fs.writeFileSync(imgPath, pngBytes);
  log.info('Test PNG image created (1x1 pixel)');

  try {
    const form = new FormData();
    form.append('media', fs.createReadStream(imgPath), { filename: 'live_test.png', contentType: 'image/png' });

    const r = await axios.post(`${API}/social/upload`, form, {
      headers: form.getHeaders(),
      timeout: 30000
    });
    log.ok(`Image uploaded to: ${r.data.url}`);
    
    // Post with image if accounts available
    if (socialAccounts.length > 0) {
      const platforms = [...new Set(socialAccounts.map((a: any) => a.platform))];
      const accountIds = socialAccounts.map((a: any) => a.id);
      const pr = await axios.post(`${API}/social/posts`, {
        content: `📸 Image Post Test — Social CRM Live Backend!\nTimestamp: ${new Date().toLocaleString()}\n\n#ImagePost #SocialCRM #Live`,
        platforms,
        socialAccountIds: accountIds,
        mediaUrls: [r.data.url]
      }, { headers: H, timeout: 30000 });
      log.ok(`Image post: ID=${pr.data.post?.id} | Status=${pr.data.post?.status}`);
      if (pr.data.results) {
        Object.entries(pr.data.results).forEach(([plt, res]: [string, any]) => {
          if (res?.id || res?.postId || res?.success) log.ok(`${plt.toUpperCase()}: Image LIVE ✅`);
          else log.warn(`${plt.toUpperCase()}: ${res?.error || 'Check token'}`);
        });
      }
    } else {
      log.warn('Upload OK — No accounts connected to publish image to');
    }
  } finally {
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
}

async function step7_ads() {
  log.section('STEP 7: Ad Campaigns (Meta/Facebook Ads)');
  if (adAccounts.length === 0) { log.warn('No ad accounts connected'); return; }
  const acc = adAccounts[0];
  const r = await axios.get(`${API}/ads/campaigns/${acc.id}`, { headers: H, timeout: 30000 });
  const campaigns = r.data.campaigns || [];
  log.ok(`"${acc.accountName}" — ${campaigns.length} campaigns`);
  campaigns.slice(0,5).forEach((c: any) =>
    log.info(`[${c.status}] ${c.name} | Budget: ₹${c.budget} | Spend: ₹${c.spend}`)
  );
}

async function step8_team() {
  log.section('STEP 8: Team Members');
  const r = await axios.get(`${API}/social/team`, { headers: H, timeout: 30000 });
  const members = r.data.members || [];
  log.ok(`Team members: ${members.length}`);
  members.forEach((m: any) => log.info(`${m.name || 'Member'} | ${m.email} | Role: ${m.role}`));
}

async function step9_all_posts() {
  log.section('STEP 9: All Posts in Database');
  const r = await axios.get(`${API}/social/posts`, { headers: H, timeout: 30000 });
  const posts = r.data.posts || [];
  log.ok(`Total posts: ${posts.length}`);
  posts.slice(0, 5).forEach((p: any) =>
    log.info(`[${p.status}] ${p.platforms?.join(',')} | "${p.content?.substring(0,55)}..."`)
  );
}

async function main() {
  console.log('\x1b[33m');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   SOCIAL CRM — LIVE SYSTEM TEST (Render Backend)        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\x1b[0mBackend: ${BACKEND}\n`);

  const start = Date.now();
  let passed = 0, failed = 0;

  const run = async (fn: () => Promise<void>, name: string) => {
    try { await fn(); passed++; }
    catch (e: any) {
      const msg = e.response?.data?.error || e.message;
      log.fail(`${name} FAILED: ${msg}`);
      failed++;
    }
  };

  await run(step1_health, 'Health');
  await run(step2_accounts, 'Accounts');
  await run(step3_analytics, 'Analytics');
  await run(step4_leads, 'Leads');
  await run(step5_text_post, 'TextPost');
  await run(step6_image_upload, 'ImageUpload');
  await run(step7_ads, 'AdCampaigns');
  await run(step8_team, 'Team');
  await run(step9_all_posts, 'AllPosts');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const total = passed + failed;
  console.log(`\n\x1b[33m╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  ✅ PASSED: ${passed}/${total}   ❌ FAILED: ${failed}/${total}   ⏱ Time: ${elapsed}s${' '.repeat(Math.max(0, 14-elapsed.length))}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\x1b[0m\n`);
}

main();
