const axios = require("axios");

const test = async () => {
  try {
    const payload = {
      positions: [
        { ticker: "AAPL", shares: 100, cost_basis: 150.0 },
        { ticker: "MSFT", shares: 50, cost_basis: 250.0 },
        { ticker: "INVALIDXYZ", shares: 10, cost_basis: 10.0 }
      ]
    };
    
    console.log("Firing POST request to /api/portfolio/manual?date=2023-01-05...");
    const res = await axios.post("http://127.0.0.1:8001/api/portfolio/manual?date=2023-01-05", payload);
    console.log("API Status:", res.status);
    console.log("Manual NAV:", res.data.total_value);
    console.log("Data Quality Manifest:\n", JSON.stringify(res.data.data_quality_manifest, null, 2));
    console.log("Positions List (Subset):\n", JSON.stringify(res.data.positions.slice(0, 2), null, 2));
  } catch (err) {
    console.error("Manual API Request failed:", err.response?.data || err.message);
  }
};

test();
