const { scrapeProduct } = require('./playwrightScraper');

async function runDemo() {
  const isHeaded = process.argv.includes('--headed');
  console.log(`\n=============================================================`);
  console.log(` Starting Standalone Scraper Verification Demo`);
  console.log(` Mode: ${isHeaded ? 'HEADED (Visual Browser)' : 'HEADLESS'}`);
  console.log(`=============================================================\n`);

  // Test 1: Verified Product 2268 (Solvane Resistance Bands Core, Option: "Advanced")
  console.log('\n>>> RUNNING TEST 1: Item 2268 (Solvane Resistance Bands Core - Option "Advanced")');
  const result1 = await scrapeProduct('2268', 'Advanced', {
    headless: !isHeaded,
    maxAttempts: 3
  });

  console.log('\n>>> TEST 1 STRUCTURED RESULT RESULT:');
  console.dir(result1, { depth: null, colors: true });

  // Test 2: Verified Product 2568 (Junova Gimbal Nano)
  console.log('\n\n>>> RUNNING TEST 2: Item 2568 (Junova Gimbal Nano)');
  const result2 = await scrapeProduct('2568', 'Standard', {
    headless: !isHeaded,
    maxAttempts: 3
  }).catch(async () => {
    // If "Standard" isn't an option name for 2568, try without option or with first option
    return await scrapeProduct('2568', '', {
      headless: !isHeaded,
      maxAttempts: 3
    });
  });

  console.log('\n>>> TEST 2 STRUCTURED RESULT RESULT:');
  console.dir(result2, { depth: null, colors: true });

  console.log('\n=============================================================');
  console.log(` Verification Demo Completed.`);
  console.log(`=============================================================\n`);
}

runDemo().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
