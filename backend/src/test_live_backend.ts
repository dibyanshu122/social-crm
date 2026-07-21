import axios from 'axios';

async function testBackend() {
  console.log('Testing Render Live Backend API: https://social-crm.onrender.com...');
  try {
    const rootRes = await axios.get('https://social-crm.onrender.com');
    console.log('Root Endpoint Status:', rootRes.status, rootRes.data);

    const healthRes = await axios.get('https://social-crm.onrender.com/api/health');
    console.log('Health Endpoint Status:', healthRes.status, healthRes.data);
  } catch (err: any) {
    console.error('Render API test error:', err.response?.data || err.message);
  }
}

testBackend();
