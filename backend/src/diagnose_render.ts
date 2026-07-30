import axios from 'axios';

const BACKEND = 'https://social-crm.onrender.com';
const API = `${BACKEND}/api/v1`;

async function diagnose() {
  console.log('🔍 Diagnosing Render Backend DB issues...\n');
  
  // Test 1: Health
  try {
    const r = await axios.get(`${BACKEND}/api/health`, { timeout: 15000 });
    console.log('✅ Health OK:', r.data.message);
  } catch(e: any) { console.log('❌ Health FAIL:', e.message); }

  // Test 2: Auth endpoint (no DB)
  try {
    const r = await axios.post(`${API}/auth/login`, { email: 'test@test.com', password: 'wrong' }, { timeout: 15000 });
    console.log('✅ Auth endpoint reachable');
  } catch(e: any) {
    if (e.response?.status === 401 || e.response?.status === 400) {
      console.log('✅ Auth endpoint reachable (got expected 401/400)');
    } else {
      console.log('❌ Auth endpoint:', e.response?.status, e.response?.data?.error || e.message);
    }
  }

  // Test 3: Social accounts (needs DB)
  try {
    const r = await axios.get(`${API}/social/accounts`, { timeout: 20000 });
    console.log('✅ Social accounts DB works! Count:', r.data.accounts?.length);
  } catch(e: any) {
    console.log('❌ Social accounts (DB query):', e.response?.status, e.response?.data?.error || e.message);
    console.log('   ⚠️  This indicates DATABASE_URL is wrong or not set on Render!');
  }

  // Test 4: Leads (needs DB)
  try {
    const r = await axios.get(`${API}/leads`, { timeout: 20000 });
    console.log('✅ Leads DB works! Count:', r.data.leads?.length);
  } catch(e: any) {
    console.log('❌ Leads (DB query):', e.response?.status, e.response?.data?.error || e.message);
  }
  
  console.log('\n📋 DIAGNOSIS SUMMARY:');
  console.log('If Social accounts & Leads failed above, go to Render Dashboard:');
  console.log('→ Environment Variables → Set these EXACTLY:');
  console.log('DATABASE_URL=postgresql://postgres.bglyejykwwaflbmyothu:Anantya%40098@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true');
  console.log('DIRECT_URL=postgresql://postgres.bglyejykwwaflbmyothu:Anantya%40098@aws-1-ap-south-1.pooler.supabase.com:5432/postgres');
  console.log('→ Build Command: npm install && npx prisma generate && npm run build');
  console.log('→ Then: Manual Deploy → Clear build cache & deploy');
}

diagnose();
