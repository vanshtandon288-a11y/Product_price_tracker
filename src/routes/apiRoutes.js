const express = require('express');
const router = express.Router();

const searchController = require('../controllers/searchController');
const productController = require('../controllers/productController');
const scrapeController = require('../controllers/scrapeController');
const exportController = require('../controllers/exportController');

// Search mock store products
router.get('/search', searchController.searchProducts);

// Track product & run initial scrape
router.post('/products', productController.addProduct);

// Get all tracked products with latest status
router.get('/products', productController.getProducts);

// Get price/stock history for a product
router.get('/products/:id/history', productController.getProductHistory);

// Get all scrape attempt logs for a product (including failures)
router.get('/products/:id/logs', productController.getProductLogs);

// Trigger manual scrape execution across all tracked products
router.post('/scrape', scrapeController.triggerScrapeAll);

// Export full scrape history as CSV
router.get('/export/csv', exportController.exportCsv);

module.exports = router;
