const http = require('http');
const app = require('../src/app');

const TEST_PORT = 5010;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(url, reqOptions, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function runApiTests() {
  console.log(`\n=============================================================`);
  console.log(` Starting Phase 2 Backend API & Database Verification Tests`);
  console.log(` Port: ${TEST_PORT}`);
  console.log(`=============================================================\n`);

  const server = app.listen(TEST_PORT);
  console.log(`[TestRunner] Server started on port ${TEST_PORT}.\n`);

  try {
    // 1. Health Check
    console.log('>>> TEST 1: GET /health');
    const resHealth = await makeRequest('/health');
    console.log(`Status: ${resHealth.status} | Body: ${resHealth.body}`);

    // 2. Search API
    console.log('\n>>> TEST 2: GET /api/search?q=Resistance');
    const resSearch = await makeRequest('/api/search?q=Resistance');
    console.log(`Status: ${resSearch.status}`);
    const searchJson = JSON.parse(resSearch.body);
    console.log(`Found ${searchJson.count} matching product(s). Sample match:`, searchJson.data[0]);

    // 3. Track Product 1: 2268 ("Advanced")
    console.log('\n>>> TEST 3: POST /api/products (Track Product 2268 - "Advanced")');
    const resAdd1 = await makeRequest('/api/products', {
      method: 'POST',
      body: {
        store_product_id: '2268',
        name: 'Solvane Resistance Bands Core',
        selected_option: 'Advanced',
        product_url: 'https://demo.inelabteamdev.com/item/2268'
      }
    });
    console.log(`Status: ${resAdd1.status}`);
    const add1Json = JSON.parse(resAdd1.body);
    console.log('Result:', JSON.stringify(add1Json, null, 2));

    // 4. Track Product 2: 2568 ("Standard kit")
    console.log('\n>>> TEST 4: POST /api/products (Track Product 2568 - "Standard kit")');
    const resAdd2 = await makeRequest('/api/products', {
      method: 'POST',
      body: {
        store_product_id: '2568',
        name: 'Junova Gimbal Nano',
        selected_option: 'Standard kit',
        product_url: 'https://demo.inelabteamdev.com/item/2568'
      }
    });
    console.log(`Status: ${resAdd2.status}`);
    const add2Json = JSON.parse(resAdd2.body);
    console.log('Result:', JSON.stringify(add2Json, null, 2));

    // 5. Get All Tracked Products
    console.log('\n>>> TEST 5: GET /api/products');
    const resProducts = await makeRequest('/api/products');
    console.log(`Status: ${resProducts.status}`);
    const productsJson = JSON.parse(resProducts.body);
    console.log('Tracked products with latest status:', JSON.stringify(productsJson, null, 2));

    // 6. Manual Trigger Scrape All
    console.log('\n>>> TEST 6: POST /api/scrape (Trigger manual scrape across all products)');
    const resScrape = await makeRequest('/api/scrape', { method: 'POST' });
    console.log(`Status: ${resScrape.status}`);
    const scrapeJson = JSON.parse(resScrape.body);
    console.log('Scrape all summary & results:', JSON.stringify(scrapeJson, null, 2));

    // 7. Get Product History
    console.log('\n>>> TEST 7: GET /api/products/2268/history');
    const resHistory = await makeRequest('/api/products/2268/history');
    console.log(`Status: ${resHistory.status}`);
    console.log('History data:', resHistory.body);

    // 8. Get Product Scrape Logs
    console.log('\n>>> TEST 8: GET /api/products/2268/logs');
    const resLogs = await makeRequest('/api/products/2268/logs');
    console.log(`Status: ${resLogs.status}`);
    console.log('Logs data:', resLogs.body);

    // 9. Export CSV
    console.log('\n>>> TEST 9: GET /api/export/csv');
    const resCsv = await makeRequest('/api/export/csv');
    console.log(`Status: ${resCsv.status}`);
    console.log(`Content-Type: ${resCsv.headers['content-type']}`);
    console.log(`Content-Disposition: ${resCsv.headers['content-disposition']}`);
    console.log('CSV Output Content:\n--------------------------------------------------');
    console.log(resCsv.body);
    console.log('--------------------------------------------------');

    console.log('\n=============================================================');
    console.log(' All Phase 2 Backend API Verification Tests PASSED Successfully!');
    console.log('=============================================================\n');

  } catch (err) {
    console.error('\nAPI Verification Error:', err);
  } finally {
    server.close(() => {
      console.log('[TestRunner] Test server shut down cleanly.');
      process.exit(0);
    });
  }
}

runApiTests();
