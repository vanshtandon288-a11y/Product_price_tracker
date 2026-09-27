const envUrl = import.meta.env.VITE_API_BASE_URL;
// Use explicit VITE_API_BASE_URL if set, otherwise fallback to relative URL
const BASE_URL = envUrl ? envUrl.replace(/\/$/, '') : '';

/**
 * Generic fetch wrapper with error handling
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Server returned non-JSON response (${response.status} ${response.statusText})`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.details || `Request failed with status ${response.status}`);
  }

  return data;
}

export const apiService = {
  // Check backend health
  getHealth: () => request('/health'),

  // Get all tracked products with latest scrape status
  getProducts: () => request('/api/products'),

  // Search mock store
  searchProducts: (query) => request(`/api/search?q=${encodeURIComponent(query)}`),

  // Add product to tracking list + initial scrape
  trackProduct: (payload) => request('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Trigger manual scrape execution across all tracked products
  triggerScrapeAll: () => request('/api/scrape', {
    method: 'POST'
  }),

  // Get price/stock history for a product
  getProductHistory: (id) => request(`/api/products/${id}/history`),

  // Get full scrape logs for a product
  getProductLogs: (id) => request(`/api/products/${id}/logs`),

  // CSV export URL
  getExportCsvUrl: () => `${BASE_URL}/api/export/csv`
};
