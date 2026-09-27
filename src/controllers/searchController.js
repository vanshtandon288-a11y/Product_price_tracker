const mockStoreService = require('../services/mockStoreService');

async function searchProducts(req, res) {
  try {
    const query = req.query.q || '';
    const results = await mockStoreService.searchMockStore(query);
    return res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('[SearchController] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to search mock store',
      details: error.message
    });
  }
}

module.exports = {
  searchProducts
};
