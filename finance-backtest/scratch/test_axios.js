const axios = require('axios');

const API_BASE = 'http://127.0.0.1:8001/api';

async function test() {
  try {
    console.log('Sending requests...');
    const [pRes, mRes, hRes] = await Promise.all([
      axios.get(`${API_BASE}/performance`),
      axios.get(`${API_BASE}/metrics`),
      axios.get(`${API_BASE}/holdings`),
    ]);

    console.log('Got responses.');
    console.log('Performance status:', pRes.status);
    console.log('Metrics status:', mRes.status);
    console.log('Holdings status:', hRes.status);

    const perfData = pRes.data.dates.map((date, i) => {
      const row = { date };
      for (const key in pRes.data.data) {
        row[key] = pRes.data.data[key][i];
      }
      return row;
    });

    console.log('Mapped performance data successfully. First element:', perfData[0]);
    console.log('Metrics sample:', mRes.data.metrics?.[0]);
    console.log('Holdings sample:', hRes.data.holdings?.[0]);
  } catch (e) {
    console.error('Error during axios fetch:', e.message);
    if (e.response) {
      console.error('Response data:', e.response.data);
      console.error('Response status:', e.response.status);
    }
  }
}

test();
