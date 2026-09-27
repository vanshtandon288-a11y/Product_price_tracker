import React, { useEffect, useState } from 'react';
import { apiService } from '../api/apiService';

export default function HistoryModal({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!product) return;

    async function fetchHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiService.getProductHistory(product.store_product_id || product.id);
        setHistory(res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch price history');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [product]);

  if (!product) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Price &amp; Stock History</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              {product.name} ({product.selected_option}) - ID: {product.store_product_id}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {isLoading && <p>Loading history records...</p>}
          {error && <div className="alert alert-error">{error}</div>}

          {!isLoading && !error && history.length === 0 && (
            <div className="empty-state">No price history recorded yet for this product.</div>
          )}

          {!isLoading && !error && history.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Attempts</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.timestamp).toLocaleString()}</td>
                    <td>
                      {row.price !== null && row.price !== undefined
                        ? `₹${Number(row.price).toLocaleString('en-IN')}`
                        : (row.raw_price_display || '--')}
                    </td>
                    <td>{row.stock || '--'}</td>
                    <td>{row.attempt_count || 1}</td>
                    <td>
                      <span className={`badge ${
                        row.outcome === 'success' ? 'badge-success' : (row.outcome === 'retried' ? 'badge-retried' : 'badge-failed')
                      }`}>
                        {row.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
