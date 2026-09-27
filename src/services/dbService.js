const { supabase, isConfigured } = require('../config/supabase');
const crypto = require('crypto');

// In-memory / local storage fallback when Supabase keys are not set
const localProducts = new Map();
const localLogs = [];

/**
 * Parse price string (e.g. "₹60,090 / ₹86,511" or "₹91,701") to a numeric float value.
 */
function parsePriceToNumeric(priceStr) {
  if (!priceStr) return null;
  // Pick the first currency number found
  const match = priceStr.match(/[\d,.]+/);
  if (!match) return null;
  const cleaned = match[0].replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Save a new tracked product.
 */
async function createProduct({ store_product_id, name, selected_option, product_url }) {
  const newProduct = {
    id: crypto.randomUUID(),
    store_product_id,
    name,
    selected_option,
    product_url,
    created_at: new Date().toISOString()
  };

  if (isConfigured()) {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        store_product_id: newProduct.store_product_id,
        name: newProduct.name,
        selected_option: newProduct.selected_option,
        product_url: newProduct.product_url
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase createProduct error: ${error.message}`);
    }
    return data;
  } else {
    localProducts.set(newProduct.id, newProduct);
    return newProduct;
  }
}

/**
 * Add a scrape log entry.
 */
async function addScrapeLog(inputData = {}) {
  const product_id = inputData.product_id || inputData.productId;
  const timestamp = inputData.timestamp || new Date().toISOString();
  const outcome = inputData.outcome || 'failed';
  const price = inputData.price;
  const stock = inputData.stock;
  const attempt_count = (inputData.attempt_count !== undefined && inputData.attempt_count !== null)
    ? inputData.attempt_count
    : ((inputData.attempts !== undefined && inputData.attempts !== null) ? inputData.attempts : 1);
  const error_message = inputData.error_message || inputData.error || null;

  const numericPrice = parsePriceToNumeric(price);

  const newLog = {
    id: crypto.randomUUID(),
    product_id,
    timestamp,
    outcome,
    price: numericPrice,
    raw_price_display: price || null,
    stock: stock || null,
    attempt_count,
    error_message
  };

  if (isConfigured()) {
    const { data, error } = await supabase
      .from('scrape_logs')
      .insert([{
        product_id: newLog.product_id,
        timestamp: newLog.timestamp,
        outcome: newLog.outcome,
        price: newLog.price,
        stock: newLog.stock,
        attempt_count: newLog.attempt_count,
        error_message: newLog.error_message
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase addScrapeLog error: ${error.message}`);
    }
    return data;
  } else {
    localLogs.push(newLog);
    return newLog;
  }
}

/**
 * Get product by ID (UUID or store_product_id).
 */
async function getProductById(id) {
  if (isConfigured()) {
    // Try UUID first
    let { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!data) {
      // Try store_product_id
      const res = await supabase
        .from('products')
        .select('*')
        .eq('store_product_id', id)
        .maybeSingle();
      data = res.data;
    }
    return data;
  } else {
    if (localProducts.has(id)) return localProducts.get(id);
    for (const p of localProducts.values()) {
      if (p.store_product_id === id) return p;
    }
    return null;
  }
}

/**
 * Get all tracked products with their latest scrape status.
 */
async function getAllProductsWithLatestStatus() {
  if (isConfigured()) {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Supabase getAllProducts error: ${error.message}`);

    const result = [];
    for (const prod of products) {
      const { data: logs } = await supabase
        .from('scrape_logs')
        .select('*')
        .eq('product_id', prod.id)
        .order('timestamp', { ascending: false })
        .limit(1);

      const latest = logs && logs.length > 0 ? logs[0] : null;

      result.push({
        id: prod.id,
        store_product_id: prod.store_product_id,
        name: prod.name,
        selected_option: prod.selected_option,
        product_url: prod.product_url,
        created_at: prod.created_at,
        current_price: latest ? latest.price : null,
        current_stock: latest ? latest.stock : null,
        latest_scrape_timestamp: latest ? latest.timestamp : null,
        latest_scrape_outcome: latest ? latest.outcome : null
      });
    }
    return result;
  } else {
    const result = [];
    for (const prod of localProducts.values()) {
      const prodLogs = localLogs
        .filter(l => l.product_id === prod.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const latest = prodLogs.length > 0 ? prodLogs[0] : null;

      result.push({
        id: prod.id,
        store_product_id: prod.store_product_id,
        name: prod.name,
        selected_option: prod.selected_option,
        product_url: prod.product_url,
        created_at: prod.created_at,
        current_price: latest ? latest.price : null,
        current_stock: latest ? latest.stock : null,
        latest_scrape_timestamp: latest ? latest.timestamp : null,
        latest_scrape_outcome: latest ? latest.outcome : null
      });
    }
    return result;
  }
}

/**
 * Get price/stock history for a tracked product.
 */
async function getProductHistory(productId) {
  const prod = await getProductById(productId);
  if (!prod) return null;

  if (isConfigured()) {
    const { data, error } = await supabase
      .from('scrape_logs')
      .select('*')
      .eq('product_id', prod.id)
      .order('timestamp', { ascending: true });

    if (error) throw new Error(`Supabase getProductHistory error: ${error.message}`);
    return data;
  } else {
    return localLogs
      .filter(l => l.product_id === prod.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
}

/**
 * Get all scrape attempt logs for a tracked product (including failures).
 */
async function getProductLogs(productId) {
  const prod = await getProductById(productId);
  if (!prod) return null;

  if (isConfigured()) {
    const { data, error } = await supabase
      .from('scrape_logs')
      .select('*')
      .eq('product_id', prod.id)
      .order('timestamp', { ascending: false });

    if (error) throw new Error(`Supabase getProductLogs error: ${error.message}`);
    return data;
  } else {
    return localLogs
      .filter(l => l.product_id === prod.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

/**
 * Get all scrape logs across all products formatted for CSV export.
 */
async function getAllScrapeLogsForCsv() {
  if (isConfigured()) {
    const { data: logs, error } = await supabase
      .from('scrape_logs')
      .select('*, products(store_product_id, name, selected_option)')
      .order('timestamp', { ascending: false });

    if (error) throw new Error(`Supabase getAllScrapeLogsForCsv error: ${error.message}`);

    return logs.map(log => ({
      store_product_id: log.products ? log.products.store_product_id : 'N/A',
      product_name: log.products ? log.products.name : 'Unknown',
      selected_option: log.products ? log.products.selected_option : 'N/A',
      timestamp: new Date(log.timestamp).toISOString(),
      price: log.price !== null && log.price !== undefined ? log.price : '',
      stock: log.stock !== null && log.stock !== undefined ? log.stock : '',
      outcome: log.outcome
    }));
  } else {
    return localLogs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .map(log => {
        const prod = localProducts.get(log.product_id);
        return {
          store_product_id: prod ? prod.store_product_id : 'N/A',
          product_name: prod ? prod.name : 'Unknown',
          selected_option: prod ? prod.selected_option : 'N/A',
          timestamp: new Date(log.timestamp).toISOString(),
          price: log.price !== null && log.price !== undefined ? log.price : '',
          stock: log.stock !== null && log.stock !== undefined ? log.stock : '',
          outcome: log.outcome
        };
      });
  }
}

module.exports = {
  createProduct,
  addScrapeLog,
  getProductById,
  getAllProductsWithLatestStatus,
  getProductHistory,
  getProductLogs,
  getAllScrapeLogsForCsv,
  parsePriceToNumeric
};
