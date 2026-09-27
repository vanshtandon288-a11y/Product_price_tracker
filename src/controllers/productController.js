const dbService = require('../services/dbService');
const { scrapeProduct } = require('../scraper/playwrightScraper');
const env = require('../config/env');

/**
 * POST /api/products - Add product + option to tracking list & run initial scrape
 */
async function addProduct(req, res) {
  try {
    const { store_product_id, name, selected_option, product_url } = req.body;

    const productId = String(store_product_id || req.body.productId || '').trim();
    const optionName = String(selected_option || req.body.option || '').trim();
    const url = String(product_url || req.body.url || `${env.MOCK_STORE_URL.replace(/\/$/, '')}/item/${productId}`).trim();
    const prodName = String(name || req.body.productName || `Product ${productId}`).trim();

    if (!productId) {
      return res.status(400).json({ success: false, error: 'store_product_id is required.' });
    }
    if (!optionName) {
      return res.status(400).json({ success: false, error: 'selected_option is required.' });
    }

    // 1. Check if product + option is already tracked
    const existing = await dbService.getProductById(productId);
    let trackedProduct;
    if (existing) {
      trackedProduct = existing;
    } else {
      trackedProduct = await dbService.createProduct({
        store_product_id: productId,
        name: prodName,
        selected_option: optionName,
        product_url: url
      });
    }

    // 2. Perform initial scrape
    console.log(`[ProductController] Running initial scrape for tracked product ${productId} ("${optionName}")...`);
    const scrapeResult = await scrapeProduct(productId, optionName, { headless: true, maxAttempts: 3 });

    // 3. Update name if baseline scrape discovered real title
    if (scrapeResult.productName && scrapeResult.productName !== 'Unknown') {
      trackedProduct.name = scrapeResult.productName;
    }

    // 4. Save initial scrape log
    const logEntry = await dbService.addScrapeLog({
      product_id: trackedProduct.id,
      timestamp: scrapeResult.timestamp,
      outcome: scrapeResult.outcome,
      price: scrapeResult.price,
      stock: scrapeResult.stock,
      attempt_count: scrapeResult.attempts,
      error_message: scrapeResult.error
    });

    return res.status(201).json({
      success: true,
      data: {
        product: trackedProduct,
        initial_scrape: {
          log_id: logEntry.id,
          outcome: scrapeResult.outcome,
          price: scrapeResult.price,
          stock: scrapeResult.stock,
          timestamp: scrapeResult.timestamp,
          attempts: scrapeResult.attempts,
          error: scrapeResult.error
        }
      }
    });

  } catch (error) {
    console.error('[ProductController] addProduct error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to track product',
      details: error.message
    });
  }
}

/**
 * GET /api/products - Get all tracked products with latest price/stock status
 */
async function getProducts(req, res) {
  try {
    const products = await dbService.getAllProductsWithLatestStatus();
    return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('[ProductController] getProducts error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/products/:id/history - Get price/stock history for a product
 */
async function getProductHistory(req, res) {
  try {
    const { id } = req.params;
    const history = await dbService.getProductHistory(id);

    if (!history) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('[ProductController] getProductHistory error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/products/:id/logs - Get all scrape logs for a product (including failures)
 */
async function getProductLogs(req, res) {
  try {
    const { id } = req.params;
    const logs = await dbService.getProductLogs(id);

    if (!logs) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('[ProductController] getProductLogs error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  addProduct,
  getProducts,
  getProductHistory,
  getProductLogs
};
