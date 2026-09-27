import React from 'react';

export default function ProductCard({ product, onViewHistory, onViewLogs }) {
  const formatTimestamp = (ts) => {
    if (!ts) return 'Never scraped';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleString();
  };

  const getOutcomeBadgeClass = (outcome) => {
    if (!outcome) return 'badge-failed';
    const lower = outcome.toLowerCase();
    if (lower === 'success') return 'badge-success';
    if (lower === 'retried') return 'badge-retried';
    return 'badge-failed';
  };

  const formattedPrice = product.current_price !== null && product.current_price !== undefined
    ? `₹${Number(product.current_price).toLocaleString('en-IN')}`
    : '--';

  return (
    <div className="product-card">
      <div>
        <div className="product-card-header">
          <div className="product-card-title">{product.name}</div>
          <span className={`badge ${getOutcomeBadgeClass(product.latest_scrape_outcome)}`}>
            {product.latest_scrape_outcome || 'UNSCRAPED'}
          </span>
        </div>

        <div className="product-card-meta">
          Store ID: <strong>{product.store_product_id}</strong> | Option:{' '}
          <span className="badge-option">{product.selected_option}</span>
        </div>

        <div className="product-stats">
          <div className="stat-row">
            <span className="stat-label">Current Price:</span>
            <span className="stat-value">{formattedPrice}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Stock Status:</span>
            <span className="stat-value">{product.current_stock || '--'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Last Scraped:</span>
            <span className="stat-value" style={{ fontSize: '11px', color: '#64748b' }}>
              {formatTimestamp(product.latest_scrape_timestamp)}
            </span>
          </div>
        </div>
      </div>

      <div className="product-card-actions">
        <button
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          onClick={() => onViewHistory(product)}
        >
          View History
        </button>

        <button
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          onClick={() => onViewLogs(product)}
        >
          View Logs
        </button>
      </div>
    </div>
  );
}
