const { chromium } = require('playwright');

/**
 * Clean strings by stripping zero-width spaces, non-breaking spaces, and extra whitespace.
 */
function cleanString(str) {
  if (!str) return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
    .replace(/\u00A0/g, ' ')               // convert NBSP to space
    .replace(/\s+/g, ' ')                  // collapse whitespace
    .trim();
}

/**
 * Executes a single scraping attempt with a strict hard timeout limit.
 */
async function executeAttemptWithTimeout(productId, targetUrl, selectedOption, headless, attemptTimeoutMs = 18000) {
  let browser = null;

  const attemptPromise = (async () => {
    try {
      console.log(`[Scraper] Launching Chromium browser...`);
      browser = await chromium.launch({ headless });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
      });
      
      // Set strict default timeouts on context to prevent hanging locators
      context.setDefaultTimeout(5000);
      context.setDefaultNavigationTimeout(10000);

      const page = await context.newPage();

      // Inject init script to continuously auto-dismiss consent modal if injected into DOM by React
      await page.addInitScript(() => {
        const autoDismiss = () => {
          const scrim = document.querySelector('.consent-scrim');
          if (scrim) {
            const btn = scrim.querySelector('button');
            if (btn) btn.click();
            scrim.remove();
            document.body.style.overflow = '';
          }
        };
        const observer = new MutationObserver(autoDismiss);
        document.addEventListener('DOMContentLoaded', () => {
          autoDismiss();
          observer.observe(document.body, { childList: true, subtree: true });
        });
      });

      // 1. Navigation
      console.log(`[Scraper] Navigating to ${targetUrl}...`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // 2. Initial Consent Overlay Check & Natural Click
      const consentScrim = page.locator('.consent-scrim');
      if (await consentScrim.count() > 0) {
        console.log(`[Scraper] Consent overlay (.consent-scrim) detected on load.`);
        const allowBtn = page.locator('.consent-scrim button, .consent-box button');
        if (await allowBtn.count() > 0) {
          console.log(`[Scraper] Dismissing consent overlay via button click...`);
          await allowBtn.first().click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(200);
        }
      }
      console.log(`[Scraper] Consent overlay check passed.`);

      // 3. Verify Product Page Load & Title
      console.log(`[Scraper] Waiting for product title selector (.pdp-summary h1)...`);
      const titleLocator = page.locator('.pdp-summary h1');
      await titleLocator.waitFor({ state: 'visible', timeout: 5000 });
      const productName = cleanString(await titleLocator.innerText());
      console.log(`[Scraper] Product loaded: "${productName}"`);

      // 4. Select Option (if specified)
      console.log(`[Scraper] Locating available product options (.opt-chip)...`);
      const optionChips = await page.locator('.opt-chip').all();
      let matchedChipText = 'Default';

      if (optionChips.length > 0) {
        if (selectedOption) {
          let matchedChip = null;
          for (const chip of optionChips) {
            const text = cleanString(await chip.innerText());
            if (text.toLowerCase() === selectedOption.toLowerCase() ||
                text.toLowerCase().includes(selectedOption.toLowerCase())) {
              matchedChip = chip;
              matchedChipText = text;
              break;
            }
          }

          if (!matchedChip) {
            const availableList = (await Promise.all(optionChips.map(c => c.innerText()))).map(cleanString).join(', ');
            throw new Error(`Option "${selectedOption}" not found. Available options: [${availableList}]`);
          }

          console.log(`[Scraper] Selecting product option: "${matchedChipText}"...`);
          await matchedChip.click({ timeout: 3000 });
          await page.waitForTimeout(300);
        } else {
          const activeChip = page.locator('.opt-chip.opt-chip-on, .opt-chip[aria-pressed="true"]');
          if (await activeChip.count() > 0) {
            matchedChipText = cleanString(await activeChip.first().innerText());
          } else {
            matchedChipText = cleanString(await optionChips[0].innerText());
          }
          console.log(`[Scraper] Using current active option: "${matchedChipText}"`);
        }
      }

      // 5. Mouse Verification Movement over .offer-panel
      console.log(`[Scraper] Locating offer panel (.offer-panel)...`);
      const offerPanel = page.locator('.offer-panel');
      await offerPanel.scrollIntoViewIfNeeded({ timeout: 3000 });
      const panelBox = await offerPanel.boundingBox();

      if (!panelBox) {
        throw new Error('Offer panel (.offer-panel) bounding box could not be determined.');
      }

      const checkBtn = page.locator('.offer-panel button');
      await checkBtn.scrollIntoViewIfNeeded({ timeout: 3000 });
      const btnBox = await checkBtn.boundingBox();

      if (!btnBox) {
        throw new Error('Offer check button (.offer-panel button) bounding box could not be determined.');
      }

      console.log(`[Scraper] Mouse verification started (entering panel from outside to trigger onMouseEnter)...`);

      // Step A: Move mouse OUTSIDE panel first to ensure clean onMouseEnter event
      const outsideX = Math.max(10, panelBox.x - 30);
      const outsideY = Math.max(10, panelBox.y - 30);
      await page.mouse.move(outsideX, outsideY);
      await page.waitForTimeout(50);

      // Step B: Move mouse INTO panel
      const startX = panelBox.x + 15;
      const startY = btnBox.y + (btnBox.height / 2);
      await page.mouse.move(startX, startY);
      await page.waitForTimeout(80);

      // Step C: Perform 15 smooth steps towards button center
      const targetX = btnBox.x + (btnBox.width / 2);
      const targetY = btnBox.y + (btnBox.height / 2);

      const steps = 15;
      for (let i = 1; i <= steps; i++) {
        const cx = startX + ((targetX - startX) * (i / steps));
        const cy = startY + ((targetY - startY) * (i / steps));
        await page.mouse.move(cx, cy);
        await page.waitForTimeout(45); // > 40ms interval rule
      }

      // Step D: Fulfill > 600ms dwell time over button target
      await page.waitForTimeout(700);
      console.log(`[Scraper] Mouse dwell verification complete over button target.`);

      // 6. Click Price / Unlock Button
      console.log(`[Scraper] Triggering price check button click...`);
      await page.evaluate(() => {
        const scrim = document.querySelector('.consent-scrim');
        if (scrim) scrim.remove();
        document.body.style.overflow = '';
      });

      // Wait for button enablement if needed, then click cleanly with fallback
      await page.waitForFunction(() => {
        const b = document.querySelector('.offer-panel button');
        return b && !b.disabled;
      }, { timeout: 2000 }).catch(() => {});

      const activeBtn = page.locator('.offer-panel button');
      await activeBtn.click({ force: true, timeout: 3000 }).catch(async () => {
        await page.evaluate(() => {
          const b = document.querySelector('.offer-panel button');
          if (b) b.click();
        });
      });

      // 7. Wait for state transition
      console.log(`[Scraper] Waiting for offer state change...`);
      await page.waitForTimeout(2500);

      // 8. Handle Inline Retries if store returns .offer-failed
      let inlineAttempts = 0;
      while (await page.locator('.offer-panel.offer-failed').count() > 0 && inlineAttempts < 1) {
        inlineAttempts++;
        console.log(`[Scraper] [INLINE RETRY] Store returned error state (.offer-failed). Triggering inline retry...`);

        await page.mouse.move(outsideX, outsideY);
        await page.waitForTimeout(50);
        await page.mouse.move(startX, startY);
        await page.waitForTimeout(80);

        for (let i = 1; i <= steps; i++) {
          const cx = startX + ((targetX - startX) * (i / steps));
          const cy = startY + ((targetY - startY) * (i / steps));
          await page.mouse.move(cx, cy);
          await page.waitForTimeout(45);
        }
        await page.waitForTimeout(700);

        const retryBtn = page.locator('.offer-panel button');
        await retryBtn.click({ force: true, timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }

      // 9. Extract Price & Stock
      console.log(`[Scraper] Extracting price and stock data...`);
      const priceLocator = page.locator('.offer-panel strong, .offer-panel .price-value');
      const stockLocator = page.locator('.offer-panel .avail-pill');

      let rawPriceText = '';
      if (await priceLocator.count() > 0) {
        const rawPrices = await priceLocator.allInnerTexts();
        rawPriceText = rawPrices.map(cleanString).filter(p => p.length > 0).join(' / ');
      }

      // Fallback search in panel text if needed
      if (!rawPriceText || rawPriceText.includes('Price locked') || rawPriceText.includes('Loading')) {
        const fullPanelText = cleanString(await offerPanel.innerText());
        const match = fullPanelText.match(/₹\s*[\d,.]+/);
        if (match) {
          rawPriceText = match[0];
        }
      }

      let rawStockText = '';
      if (await stockLocator.count() > 0) {
        rawStockText = cleanString(await stockLocator.first().innerText());
      } else {
        const fullPanelText = cleanString(await offerPanel.innerText());
        if (fullPanelText.toLowerCase().includes('sold out')) {
          rawStockText = 'Sold out';
        }
      }

      // 10. Data Validation
      if (!rawPriceText || rawPriceText.includes('Price locked') || rawPriceText.includes('Loading') || rawPriceText.includes('Couldn')) {
        const text = cleanString(await offerPanel.innerText().catch(() => 'Unreadable panel'));
        throw new Error(`Price locked or unextracted. Raw panel text: "${text}"`);
      }

      if (!rawStockText) {
        throw new Error('Stock availability indicator (.avail-pill) could not be extracted.');
      }

      return {
        productName,
        matchedChipText,
        price: rawPriceText,
        stock: rawStockText
      };

    } finally {
      if (browser) {
        console.log(`[Scraper] Closing Chromium browser context...`);
        await browser.close().catch(() => {});
        browser = null;
      }
    }
  })();

  // Hard timeout race wrapper per attempt
  let timeoutTimer;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutTimer = setTimeout(() => {
      reject(new Error(`Attempt hard timeout exceeded (${attemptTimeoutMs}ms)`));
    }, attemptTimeoutMs);
  });

  try {
    const result = await Promise.race([attemptPromise, timeoutPromise]);
    clearTimeout(timeoutTimer);
    return result;
  } catch (err) {
    clearTimeout(timeoutTimer);
    if (browser) {
      console.log(`[Scraper] Cleaning up browser after attempt error/timeout...`);
      await browser.close().catch(() => {});
    }
    throw err;
  }
}

/**
 * Reusable Playwright Scraper for INE Hosted Mock Store.
 *
 * Outcome Semantics:
 * - First attempt succeeds on initial try: outcome = "success"
 * - First attempt encounters transient error but recovers via inline or subsequent attempt: outcome = "retried"
 * - All attempts fail: outcome = "failed"
 *
 * @param {string|number} productUrlOrId - Product ID (e.g. '2268') or full item URL
 * @param {string} [selectedOption=''] - Option label to select (e.g. 'Advanced', 'Regular', 'Starter').
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.headless=true] - Run browser in headless mode
 * @param {number} [options.maxAttempts=3] - Maximum retry attempts
 * @param {string} [options.baseUrl='https://demo.inelabteamdev.com'] - Base store URL
 * @returns {Promise<Object>} Structured scrape result
 */
async function scrapeProduct(productUrlOrId, selectedOption = '', options = {}) {
  const headless = options.headless !== false;
  const maxAttempts = options.maxAttempts || 3;
  const baseUrl = options.baseUrl || 'https://demo.inelabteamdev.com';

  // Normalize URL & Product ID
  let targetUrl = '';
  let productId = '';

  const inputStr = String(productUrlOrId).trim();
  if (inputStr.startsWith('http://') || inputStr.startsWith('https://')) {
    targetUrl = inputStr;
    const match = inputStr.match(/\/item\/([a-zA-Z0-9_-]+)/);
    productId = match ? match[1] : inputStr.split('/').pop();
  } else {
    productId = inputStr;
    targetUrl = `${baseUrl.replace(/\/$/, '')}/item/${productId}`;
  }

  console.log(`\n==================================================`);
  console.log(`[Scraper] Initializing scrape job for Product ID: ${productId}`);
  console.log(`[Scraper] Target URL: ${targetUrl}`);
  console.log(`[Scraper] Target Option: "${selectedOption || '(Default Option)'}"`);
  console.log(`[Scraper] Headless Mode: ${headless} | Max Attempts: ${maxAttempts}`);
  console.log(`==================================================`);

  let lastError = null;
  let productName = null;
  let hasEncounteredTransient = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      hasEncounteredTransient = true;
      const backoffMs = (attempt - 1) * 1000;
      console.log(`\n[Scraper] [RETRY] Starting browser attempt ${attempt} of ${maxAttempts} after ${backoffMs}ms backoff...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    } else {
      console.log(`\n[Scraper] Starting Attempt 1 of ${maxAttempts}...`);
    }

    try {
      const data = await executeAttemptWithTimeout(productId, targetUrl, selectedOption, headless, 18000);
      productName = data.productName;

      // Explicit Outcome Mapping Semantics
      const outcome = (attempt === 1 && !hasEncounteredTransient) ? 'success' : 'retried';

      console.log(`[Scraper] Price extracted successfully: "${data.price}"`);
      console.log(`[Scraper] Stock extracted successfully: "${data.stock}"`);
      console.log(`[Scraper] Scrape outcome: ${outcome.toUpperCase()} (Attempt ${attempt}/${maxAttempts}, Transient Occurred: ${hasEncounteredTransient})`);

      return {
        productId,
        productName,
        selectedOption: data.matchedChipText,
        price: data.price,
        stock: data.stock,
        timestamp: new Date().toISOString(),
        outcome,
        attempts: attempt,
        error: null
      };

    } catch (err) {
      console.error(`[Scraper] Attempt ${attempt} failed with error: ${err.message}`);
      lastError = err;
      hasEncounteredTransient = true;
    }
  }

  // All attempts failed
  console.log(`[Scraper] All ${maxAttempts} attempt(s) failed. Returning FAILED result.`);
  return {
    productId,
    productName: productName || 'Unknown',
    selectedOption: selectedOption || 'Default',
    price: null,
    stock: null,
    timestamp: new Date().toISOString(),
    outcome: 'failed',
    attempts: maxAttempts,
    error: lastError ? lastError.message : 'Unknown scraping error'
  };
}

module.exports = {
  scrapeProduct
};
