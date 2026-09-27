/**
 * Helper to escape CSV field values safely according to RFC 4180.
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV file string from list of scrape logs.
 *
 * @param {Array<Object>} logs - Array of scrape log records with product metadata
 * @returns {string} Formatted CSV string
 */
function generateScrapeHistoryCsv(logs = []) {
  const headers = [
    'Store Product ID',
    'Product Name',
    'Selected Option',
    'Timestamp',
    'Price',
    'Stock',
    'Outcome'
  ];

  const rows = logs.map(log => {
    // If outcome is failed, price and stock MUST be left empty string
    const isFailed = log.outcome === 'failed';
    const priceStr = isFailed ? '' : (log.price !== null && log.price !== undefined ? log.price : '');
    const stockStr = isFailed ? '' : (log.stock !== null && log.stock !== undefined ? log.stock : '');

    return [
      escapeCsvValue(log.store_product_id),
      escapeCsvValue(log.product_name),
      escapeCsvValue(log.selected_option),
      escapeCsvValue(new Date(log.timestamp).toISOString()),
      escapeCsvValue(priceStr),
      escapeCsvValue(stockStr),
      escapeCsvValue(log.outcome)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

module.exports = {
  generateScrapeHistoryCsv
};
