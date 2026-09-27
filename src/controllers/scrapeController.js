const dbService = require('../services/dbService');
const { scrapeProduct } = require('../scraper/playwrightScraper');

/**
 * POST /api/scrape - Trigger manual scrape execution across all tracked products
 */
async function triggerScrapeAll(req, res) {
  try {
    const products = await dbService.getAllProductsWithLatestStatus();

    console.log(`[ScrapeController] Triggering manual scrape for ${products.length} tracked product(s)...`);

    const summary = {
      total: products.length,
      success: 0,
      retried: 0,
      failed: 0
    };

    const results = [];

    for (const prod of products) {
      console.log(`\n[ScrapeController] Scraping product ${prod.store_product_id} ("${prod.selected_option}")...`);

      const scrapeResult = await scrapeProduct(prod.store_product_id, prod.selected_option, {
        headless: true,
        maxAttempts: 3
      });

      // Update outcome counts
      if (scrapeResult.outcome === 'success') summary.success++;
      else if (scrapeResult.outcome === 'retried') summary.retried++;
      else summary.failed++;

      // Save log entry to database
      const logEntry = await dbService.addScrapeLog({
        product_id: prod.id,
        timestamp: scrapeResult.timestamp,
        outcome: scrapeResult.outcome,
        price: scrapeResult.price,
        stock: scrapeResult.stock,
        attempt_count: scrapeResult.attempts,
        error_message: scrapeResult.error
      });

      results.push({
        product_id: prod.id,
        store_product_id: prod.store_product_id,
        product_name: prod.name,
        selected_option: prod.selected_option,
        log_id: logEntry.id,
        outcome: scrapeResult.outcome,
        price: scrapeResult.price,
        stock: scrapeResult.stock,
        attempts: scrapeResult.attempts,
        error: scrapeResult.error,
        timestamp: scrapeResult.timestamp
      });
    }

    return res.status(200).json({
      success: true,
      summary,
      results
    });

  } catch (error) {
    console.error('[ScrapeController] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute manual scrape',
      details: error.message
    });
  }
}

module.exports = {
  triggerScrapeAll
};
