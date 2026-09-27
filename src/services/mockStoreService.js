const env = require('../config/env');

/**
 * Search INE Hosted Mock Store by partial or full product name.
 *
 * @param {string} query - Search term
 * @returns {Promise<Array<Object>>} Array of candidate products with available options
 */
async function searchMockStore(query = '') {
  const baseUrl = env.MOCK_STORE_URL.replace(/\/$/, '');
  const searchUrl = `${baseUrl}/api/v2/listings?page=1&limit=30`;

  console.log(`[MockStoreService] Querying listings from ${searchUrl}...`);
  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Mock store search failed with HTTP status ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || data.items || [];

  // Filter results if query is provided
  const searchTerm = String(query).trim().toLowerCase();
  const filtered = searchTerm
    ? results.filter(item =>
        (item.name && item.name.toLowerCase().includes(searchTerm)) ||
        (item.brand && item.brand.toLowerCase().includes(searchTerm)) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm)) ||
        (item.category && item.category.toLowerCase().includes(searchTerm))
      )
    : results;

  // Enrich top 10 matches with their available options
  const enriched = await Promise.all(
    filtered.slice(0, 10).map(async item => {
      let options = ['Default'];
      try {
        const itemRes = await fetch(`${baseUrl}/api/v2/items/${item.id}`);
        if (itemRes.ok) {
          const itemDetail = await itemRes.json();
          if (itemDetail.options && Array.isArray(itemDetail.options)) {
            options = itemDetail.options.map(opt => opt.label || opt.name || opt.id);
          }
        }
      } catch (e) {
        console.warn(`[MockStoreService] Could not fetch options for item ${item.id}:`, e.message);
      }

      return {
        store_product_id: String(item.id),
        name: item.name,
        brand: item.brand,
        category: item.category,
        sku: item.sku,
        product_url: `${baseUrl}/item/${item.id}`,
        available_options: options
      };
    })
  );

  return enriched;
}

module.exports = {
  searchMockStore
};
