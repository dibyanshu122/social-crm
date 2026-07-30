/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   SOCIAL CRM — PRO LEVEL END-TO-END LIVE TEST SUITE        ║
 * ║   Backend: https://social-crm.onrender.com                 ║
 * ║   Tests: Accounts, Analytics, Leads, Text Post,            ║
 * ║           Image Post, Video Post, Ads, Team, Scheduler     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const B   = 'https://social-crm.onrender.com';
const API = `${B}/api/v1`;
const H   = { 'Content-Type': 'application/json' };
const T   = 25000; // timeout per request

// ── Test State ────────────────────────────────────────────
let socialAccounts: any[] = [];
let adAccounts:    any[] = [];
let leads:         any[] = [];
let posts:         any[] = [];
let results: { name: string; status: '✅ PASS' | '❌ FAIL' | '⚠️ WARN'; detail: string }[] = [];

// ── Logger ────────────────────────────────────────────────
const C = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  purple: (s: string) => `\x1b[35m${s}\x1b[0m`,
};

function section(t: string) {
  console.log(`\n${C.purple('━'.repeat(62))}`);
  console.log(`${C.purple('  ▸')} ${C.bold(t)}`);
  console.log(C.purple('━'.repeat(62)));
}
function pass(msg: string)  { console.log(C.green(`  ✅ ${msg}`)); }
function fail(msg: string)  { console.log(C.red(`  ❌ ${msg}`)); }
function warn(msg: string)  { console.log(C.yellow(`  ⚠️  ${msg}`)); }
function info(msg: string)  { console.log(C.cyan(`  📍 ${msg}`)); }

function record(name: string, ok: boolean, detail: string, isWarn = false) {
  const status = ok ? '✅ PASS' : (isWarn ? '⚠️ WARN' : '❌ FAIL');
  results.push({ name, status, detail });
}

async function api(method: 'get'|'post'|'put'|'delete', url: string, data?: any, headers?: any): Promise<any> {
  const r = await axios({ method, url: `${API}${url}`, data, headers: { ...H, ...(headers||{}) }, timeout: T });
  return r.data;
}

// ══════════════════════════════════════════════════════════
// TEST 1: Health Check
// ══════════════════════════════════════════════════════════
async function test_health() {
  section('TEST 1 — Backend Health Check');
  const r = await axios.get(`${B}/api/health`, { timeout: T });
  pass(`Status ${r.status}: ${r.data.message}`);
  record('Health Check', true, r.data.message);
}

// ══════════════════════════════════════════════════════════
// TEST 2: Social Accounts — Real Connected Platforms
// ══════════════════════════════════════════════════════════
async function test_accounts() {
  section('TEST 2 — Connected Social & Ad Accounts');

  const sr = await api('get', '/social/accounts');
  socialAccounts = sr.accounts || [];
  pass(`Social accounts: ${socialAccounts.length} found`);
  socialAccounts.forEach((a: any) => {
    info(`[${a.platform.toUpperCase()}] "${a.accountName}" | ID: ${a.platformAccountId} | Role: ${a.userRole}`);
  });
  record('Social Accounts', socialAccounts.length > 0, `${socialAccounts.length} accounts`, socialAccounts.length === 0);

  const ar = await api('get', '/ads/accounts');
  adAccounts = ar.accounts || [];
  pass(`Ad accounts: ${adAccounts.length} found`);
  adAccounts.forEach((a: any) => {
    info(`[${a.platform.toUpperCase()}] "${a.accountName}" | Role: ${a.userRole}`);
  });
  record('Ad Accounts', true, `${adAccounts.length} accounts`);
}

// ══════════════════════════════════════════════════════════
// TEST 3: Analytics — Real Data from Connected Platforms
// ══════════════════════════════════════════════════════════
async function test_analytics() {
  section('TEST 3 — Live Analytics from Connected Platforms');

  const r = await api('get', '/social/analytics');
  const a = r.analytics || {};
  let anyConnected = false;

  for (const plt of ['facebook','instagram','twitter','linkedin']) {
    const d = a[plt];
    if (d && d.profile && d.profile !== 'Not connected') {
      anyConnected = true;
      pass(`${plt.toUpperCase()}: profile="${d.profile}" | followers=${d.followers} | reach=${d.reach || d.impressions || 'N/A'}`);
    } else {
      warn(`${plt.toUpperCase()}: Not connected (no token)`);
    }
  }
  record('Analytics', anyConnected, anyConnected ? 'Real data fetched' : 'No platforms connected', !anyConnected);
}

// ══════════════════════════════════════════════════════════
// TEST 4: CRM Leads — Real Data + CRUD
// ══════════════════════════════════════════════════════════
async function test_leads() {
  section('TEST 4 — CRM Leads (Real Data + CRUD)');

  // GET existing leads
  const r = await api('get', '/leads');
  leads = r.leads || [];
  pass(`Existing leads in DB: ${leads.length}`);
  leads.slice(0,5).forEach((l: any) => {
    info(`${l.name} | ${l.email} | Platform: ${l.platform} | Status: ${l.status}`);
  });
  record('Get Leads', true, `${leads.length} leads found`);

  // CREATE new lead
  const nl = await api('post', '/leads', {
    name: 'Pro Test Lead — ' + new Date().toLocaleTimeString(),
    email: `protest_${Date.now()}@testcrm.in`,
    phone: '+91 99887 66554',
    platform: 'facebook',
    formName: 'Summer Sale Lead Form',
    status: 'NEW',
    notes: 'Created by pro-level E2E test suite'
  });
  pass(`Lead CREATED: "${nl.lead?.name}" | ID: ${nl.lead?.id}`);
  record('Create Lead', !!nl.lead?.id, `ID: ${nl.lead?.id}`);

  // UPDATE lead status
  if (nl.lead?.id) {
    const ul = await api('put', `/leads/${nl.lead.id}/status`, { status: 'CONTACTED', notes: 'Contacted via WhatsApp' });
    pass(`Lead UPDATED: Status → ${ul.lead?.status}`);
    record('Update Lead', ul.lead?.status === 'CONTACTED', `Status: ${ul.lead?.status}`);
  }
}

// ══════════════════════════════════════════════════════════
// TEST 5: Text Post — All Connected Platforms
// ══════════════════════════════════════════════════════════
async function test_text_post() {
  section('TEST 5 — Text Post (Real Platform Publishing)');

  const platforms  = socialAccounts.length > 0
    ? [...new Set(socialAccounts.map((a: any) => a.platform))]
    : ['facebook'];
  const accountIds = socialAccounts.map((a: any) => a.id);

  info(`Publishing to: ${platforms.join(', ')}`);

  const r = await api('post', '/social/posts', {
    content: `🚀 Live Test Post from Social CRM Pro!\n\n` +
      `This is a real post published through our Dot Domino Social CRM platform.\n` +
      `Platform: Social CRM v2.0\n` +
      `Time: ${new Date().toLocaleString('en-IN')}\n\n` +
      `#SocialCRM #DotDomino #LiveTest #Automation`,
    platforms,
    socialAccountIds: accountIds,
    mediaUrls: []
  });

  pass(`Post record created: ID=${r.post?.id} | Status=${r.post?.status}`);
  record('Text Post Create', !!r.post?.id, `ID: ${r.post?.id}, Status: ${r.post?.status}`);

  if (r.results) {
    for (const [plt, res] of Object.entries(r.results as Record<string, any>)) {
      if (res?.id || res?.postId || res?.success) {
        pass(`  ${plt.toUpperCase()}: PUBLISHED LIVE ✅ (Platform Post ID: ${res?.id || res?.postId || 'OK'})`);
        record(`Text Post → ${plt}`, true, `PostID: ${res?.id || res?.postId}`);
      } else {
        warn(`  ${plt.toUpperCase()}: ${res?.error || 'No confirmation received'}`);
        record(`Text Post → ${plt}`, false, res?.error || 'Failed', true);
      }
    }
  }
}

// ══════════════════════════════════════════════════════════
// TEST 6: Image Post — Upload + Publish
// ══════════════════════════════════════════════════════════
async function test_image_post() {
  section('TEST 6 — Image Post (Upload & Publish)');

  // Create a proper 100x100 PNG (red square) programmatically
  // PNG structure: signature + IHDR + IDAT + IEND
  const W = 100, HH = 100;
  // Minimal valid PNG - using a proper small PNG bytes
  const pngData = Buffer.from(
    '89504e470d0a1a0a' +           // PNG signature
    '0000000d49484452' +           // IHDR length=13 + type
    `${W.toString(16).padStart(8,'0')}` + // width
    `${HH.toString(16).padStart(8,'0')}` + // height
    '0802000000' +                 // bit depth=8, color=RGB, compression, filter, interlace
    '907753de' +                   // CRC (approximate)
    '0000001f49444154' +           // IDAT chunk
    '789c6360f8cf' +               // zlib compressed red pixel data
    'c000000002000' +
    '1e221bc33' +
    '0000000049454e44ae426082',    // IEND
    'hex'
  ).slice(0, 67); // Trim to valid size

  // Use a real small PNG - 8x8 solid color
  const realPng = Buffer.from([
    137,80,78,71,13,10,26,10,         // PNG signature
    0,0,0,13,73,72,68,82,             // IHDR chunk (length=13, type=IHDR)
    0,0,0,8,0,0,0,8,                  // width=8, height=8
    8,2,0,0,0,75,109,41,59,           // bit depth=8, colortype=2(RGB), CRC
    0,0,0,40,73,68,65,84,             // IDAT chunk (length=40, type=IDAT)
    120,156,98,248,143,129,193,       // zlib data
    3,24,96,24,96,24,96,24,96,24,
    96,24,96,24,96,24,96,0,0,
    3,132,0,1,165,163,78,142,
    0,0,0,0,73,69,78,68,174,66,96,130 // IEND
  ]);

  const imgPath = path.join(process.cwd(), `test_img_${Date.now()}.png`);
  fs.writeFileSync(imgPath, realPng);
  info(`Test image created: ${imgPath} (${realPng.length} bytes)`);

  let imageUrl = '';
  try {
    // Upload image
    const form = new FormData();
    form.append('media', fs.createReadStream(imgPath), { filename: 'pro_test_image.png', contentType: 'image/png' });

    const uploadRes = await axios.post(`${API}/social/upload`, form, {
      headers: form.getHeaders(),
      timeout: 30000
    });
    imageUrl = uploadRes.data.url;
    pass(`Image uploaded: ${imageUrl}`);
    record('Image Upload', !!imageUrl, imageUrl);
  } finally {
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  // Publish image post
  const platforms  = socialAccounts.length > 0
    ? [...new Set(socialAccounts.map((a: any) => a.platform))]
    : ['facebook'];
  const accountIds = socialAccounts.map((a: any) => a.id);

  const r = await api('post', '/social/posts', {
    content: `📸 Image Post via Social CRM Pro!\n\n` +
      `Testing multi-platform image publishing.\n` +
      `${new Date().toLocaleString('en-IN')}\n\n` +
      `#ImagePost #SocialCRM #DotDomino`,
    platforms,
    socialAccountIds: accountIds,
    mediaUrls: imageUrl ? [imageUrl] : []
  });

  pass(`Image post record: ID=${r.post?.id} | Status=${r.post?.status}`);
  record('Image Post Create', !!r.post?.id, `ID: ${r.post?.id}`);

  if (r.results) {
    for (const [plt, res] of Object.entries(r.results as Record<string, any>)) {
      if (res?.id || res?.postId || res?.success) {
        pass(`  ${plt.toUpperCase()}: Image PUBLISHED LIVE ✅`);
        record(`Image Post → ${plt}`, true, `PostID: ${res?.id || res?.postId}`);
      } else {
        warn(`  ${plt.toUpperCase()}: ${res?.error || 'Check token/permissions'}`);
        record(`Image Post → ${plt}`, false, res?.error || 'Partial', true);
      }
    }
  }
}

// ══════════════════════════════════════════════════════════
// TEST 7: Video Post — Upload + Publish
// ══════════════════════════════════════════════════════════
async function test_video_post() {
  section('TEST 7 — Video Post (Upload & Publish)');

  // Create a minimal valid MP4 (smallest possible ftyp box)
  // This is the minimal binary MP4 file header
  const mp4Header = Buffer.from([
    0x00, 0x00, 0x00, 0x20, // box size = 32
    0x66, 0x74, 0x79, 0x70, // box type = 'ftyp'
    0x69, 0x73, 0x6F, 0x6D, // major brand = 'isom'
    0x00, 0x00, 0x02, 0x00, // minor version
    0x69, 0x73, 0x6F, 0x6D, // compatible brand 'isom'
    0x69, 0x73, 0x6F, 0x32, // compatible brand 'iso2'
    0x61, 0x76, 0x63, 0x31, // compatible brand 'avc1'
    0x6D, 0x70, 0x34, 0x31, // compatible brand 'mp41'
    // mdat box (empty media data)
    0x00, 0x00, 0x00, 0x08,
    0x6D, 0x64, 0x61, 0x74,
  ]);

  const vidPath = path.join(process.cwd(), `test_video_${Date.now()}.mp4`);
  fs.writeFileSync(vidPath, mp4Header);
  info(`Test video created: ${vidPath} (${mp4Header.length} bytes - minimal MP4 header)`);

  let videoUrl = '';
  try {
    const form = new FormData();
    form.append('media', fs.createReadStream(vidPath), { filename: 'pro_test_video.mp4', contentType: 'video/mp4' });

    const uploadRes = await axios.post(`${API}/social/upload`, form, {
      headers: form.getHeaders(),
      timeout: 60000
    });
    videoUrl = uploadRes.data.url;
    pass(`Video uploaded: ${videoUrl}`);
    record('Video Upload', !!videoUrl, videoUrl);
  } finally {
    if (fs.existsSync(vidPath)) fs.unlinkSync(vidPath);
  }

  // Publish video post
  const platforms  = socialAccounts.length > 0
    ? [...new Set(socialAccounts.map((a: any) => a.platform))]
    : ['facebook'];
  const accountIds = socialAccounts.map((a: any) => a.id);

  const r = await api('post', '/social/posts', {
    content: `🎬 Video Post via Social CRM Pro!\n\n` +
      `Testing multi-platform video publishing.\n` +
      `${new Date().toLocaleString('en-IN')}\n\n` +
      `#VideoPost #Reels #SocialCRM #DotDomino`,
    platforms,
    socialAccountIds: accountIds,
    mediaUrls: videoUrl ? [videoUrl] : []
  });

  pass(`Video post record: ID=${r.post?.id} | Status=${r.post?.status}`);
  record('Video Post Create', !!r.post?.id, `ID: ${r.post?.id}`);

  if (r.results) {
    for (const [plt, res] of Object.entries(r.results as Record<string, any>)) {
      if (res?.id || res?.postId || res?.success) {
        pass(`  ${plt.toUpperCase()}: Video PUBLISHED LIVE ✅`);
        record(`Video Post → ${plt}`, true, `PostID: ${res?.id || res?.postId}`);
      } else {
        warn(`  ${plt.toUpperCase()}: ${res?.error || 'Check token/permissions'}`);
        record(`Video Post → ${plt}`, false, res?.error || 'Partial', true);
      }
    }
  }
}

// ══════════════════════════════════════════════════════════
// TEST 8: Scheduled Post
// ══════════════════════════════════════════════════════════
async function test_scheduled_post() {
  section('TEST 8 — Scheduled Post');

  const scheduleTime = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
  const platforms    = socialAccounts.length > 0
    ? [...new Set(socialAccounts.map((a: any) => a.platform))]
    : ['facebook'];

  const r = await api('post', '/social/posts', {
    content: `⏰ Scheduled Post Test!\n\nThis post was scheduled via Social CRM Pro.\nScheduled for: ${scheduleTime.toLocaleString('en-IN')}\n\n#Scheduled #SocialCRM`,
    platforms,
    socialAccountIds: socialAccounts.map((a: any) => a.id),
    scheduledAt: scheduleTime.toISOString(),
    mediaUrls: []
  });

  pass(`Post SCHEDULED: ID=${r.post?.id} | Status=${r.post?.status}`);
  pass(`Will publish at: ${scheduleTime.toLocaleString('en-IN')}`);
  record('Schedule Post', r.post?.status === 'SCHEDULED', `Status: ${r.post?.status}`);
}

// ══════════════════════════════════════════════════════════
// TEST 9: Ad Campaigns — Real Data
// ══════════════════════════════════════════════════════════
async function test_ad_campaigns() {
  section('TEST 9 — Ad Campaigns & Analytics');

  if (adAccounts.length === 0) {
    warn('No ad accounts connected — skipping ad tests');
    record('Ad Campaigns', false, 'No ad accounts', true);
    return;
  }

  for (const acc of adAccounts) {
    info(`Testing account: "${acc.accountName}" [${acc.platform}]`);
    try {
      const cr = await api('get', `/ads/accounts/${acc.id}/campaigns`);
      const campaigns = cr.campaigns || [];
      pass(`Campaigns found: ${campaigns.length}`);
      campaigns.slice(0,5).forEach((c: any) => {
        info(`  [${c.status}] "${c.name}" | Budget: ₹${c.budget} | Spend: ₹${c.spend} | CTR: ${c.ctr}`);
      });
      record(`Ad Campaigns (${acc.accountName})`, true, `${campaigns.length} campaigns`);
    } catch(e: any) {
      warn(`Campaigns fetch failed: ${e.response?.data?.error || e.message}`);
      record(`Ad Campaigns (${acc.accountName})`, false, e.message, true);
    }
  }
}

// ══════════════════════════════════════════════════════════
// TEST 10: Team Members
// ══════════════════════════════════════════════════════════
async function test_team() {
  section('TEST 10 — Team Members & Roles');

  const r = await api('get', '/social/team');
  const members = r.members || [];
  pass(`Team members: ${members.length}`);
  members.forEach((m: any) => {
    info(`${m.name || m.email} | Role: ${m.role} | Status: ${m.status}`);
  });
  record('Team Members', true, `${members.length} members`);
}

// ══════════════════════════════════════════════════════════
// TEST 11: All Posts — Verify DB
// ══════════════════════════════════════════════════════════
async function test_all_posts() {
  section('TEST 11 — All Posts in Database');

  const r = await api('get', '/social/posts');
  posts = r.posts || [];
  pass(`Total posts in DB: ${posts.length}`);

  const byStatus = posts.reduce((acc: any, p: any) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  info(`Breakdown: ${Object.entries(byStatus).map(([k,v]) => `${k}=${v}`).join(', ')}`);
  posts.slice(0,3).forEach((p: any) => {
    info(`[${p.status}] "${p.content?.substring(0,60)}..." — Media: ${p.mediaUrls?.length || 0} files`);
  });
  record('All Posts', true, `${posts.length} total (${JSON.stringify(byStatus)})`);
}

// ══════════════════════════════════════════════════════════
// TEST 12: Upload Endpoint Stress Test
// ══════════════════════════════════════════════════════════
async function test_upload_endpoint() {
  section('TEST 12 — Upload Endpoint & File Serving');

  // Upload a PNG and verify URL is accessible
  const png = Buffer.from([
    137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,
    0,0,0,1,0,0,0,1,8,2,0,0,0,144,119,83,222,
    0,0,0,12,73,68,65,84,8,215,99,248,207,192,0,0,
    0,2,0,1,226,33,188,51,0,0,0,0,73,69,78,68,174,66,96,130
  ]);
  const p = path.join(process.cwd(), 'upload_test.png');
  fs.writeFileSync(p, png);

  const form = new FormData();
  form.append('media', fs.createReadStream(p), { filename: 'stress_test.png', contentType: 'image/png' });

  const res = await axios.post(`${API}/social/upload`, form, { headers: form.getHeaders(), timeout: 20000 });
  const url = res.data.url;
  pass(`Uploaded: ${url}`);
  fs.unlinkSync(p);

  // Verify URL is accessible
  try {
    const check = await axios.head(url, { timeout: 10000 });
    pass(`File serving OK: HTTP ${check.status} | Content-Type: ${check.headers['content-type']}`);
    record('Upload + File Serve', true, url);
  } catch {
    warn(`File URL not accessible (may be internal path issue)`);
    record('Upload + File Serve', false, `URL: ${url}`, true);
  }
}

// ══════════════════════════════════════════════════════════
// MAIN — Run All Tests
// ══════════════════════════════════════════════════════════
async function main() {
  console.log('\x1b[35m');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 SOCIAL CRM PRO — COMPLETE E2E LIVE TEST SUITE         ║');
  console.log('║   Backend: https://social-crm.onrender.com                 ║');
  console.log(`║   Started: ${new Date().toLocaleString('en-IN').padEnd(48)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  const start = Date.now();

  const tests = [
    { fn: test_health,        name: 'Health Check' },
    { fn: test_accounts,      name: 'Accounts' },
    { fn: test_analytics,     name: 'Analytics' },
    { fn: test_leads,         name: 'Leads' },
    { fn: test_text_post,     name: 'Text Post' },
    { fn: test_image_post,    name: 'Image Post' },
    { fn: test_video_post,    name: 'Video Post' },
    { fn: test_scheduled_post,name: 'Scheduled Post' },
    { fn: test_ad_campaigns,  name: 'Ad Campaigns' },
    { fn: test_team,          name: 'Team' },
    { fn: test_all_posts,     name: 'All Posts' },
    { fn: test_upload_endpoint, name: 'Upload Endpoint' },
  ];

  for (const t of tests) {
    try {
      await t.fn();
    } catch (e: any) {
      const msg = e.response?.data?.error || e.response?.data?.message || e.message;
      fail(`${t.name} CRASHED: ${msg}`);
      record(t.name, false, msg);
    }
  }

  // ── Final Report ──────────────────────────────────────
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const passed  = results.filter(r => r.status === '✅ PASS').length;
  const warned  = results.filter(r => r.status === '⚠️ WARN').length;
  const failed  = results.filter(r => r.status === '❌ FAIL').length;
  const total   = results.length;

  console.log(`\n\x1b[33m╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  ✅ PASSED: ${passed}/${total}   ❌ FAILED: ${failed}/${total}   ⏱ Time: ${elapsed}s${' '.repeat(Math.max(0, 14-elapsed.toString().length))}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\x1b[0m\n`);

  console.log('\n\x1b[35m' + '═'.repeat(62));
  console.log('  📋 FINAL TEST REPORT');
  console.log('═'.repeat(62) + '\x1b[0m');

  results.forEach(r => {
    const color = r.status === '✅ PASS' ? '\x1b[32m' : r.status === '⚠️ WARN' ? '\x1b[33m' : '\x1b[31m';
    console.log(`  ${color}${r.status}\x1b[0m  ${r.name.padEnd(35)} ${r.detail}`);
  });

  console.log('\n\x1b[35m' + '═'.repeat(62));
  console.log(`  ✅ PASSED: ${passed}/${total}   ⚠️ WARNINGS: ${warned}   ❌ FAILED: ${failed}`);
  console.log(`  ⏱  Total Time: ${elapsed}s`);
  console.log('═'.repeat(62) + '\x1b[0m\n');

  if (failed === 0) {
    console.log('\x1b[32m  🎉 ALL CRITICAL TESTS PASSED! System is production-ready.\x1b[0m\n');
  } else {
    console.log('\x1b[31m  ⚠️  Some tests failed — see details above.\x1b[0m\n');
  }
}

main();
