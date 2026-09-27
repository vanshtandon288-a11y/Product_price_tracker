import React, { useEffect, useState } from 'react';
import { apiService } from '../api/apiService';

export default function LogsModal({ product, onClose }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!product) return;

    async function fetchLogs() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiService.getProductLogs(product.store_product_id || product.id);
        setLogs(res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch scrape logs');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, [product]);

  if (!product) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Scrape Execution Audit Logs</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              {product.name} ({product.selected_option}) - ID: {product.store_product_id}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {isLoading && <p>Loading scrape logs...</p>}
          {error && <div className="alert alert-error">{error}</div>}

          {!isLoading && !error && logs.length === 0 && (
            <div className="empty-state">No scrape logs recorded yet.</div>
          )}

          {!isLoading && !error && logs.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Outcome</th>
                  <th>Attempts</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Error Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${
                        log.outcome === 'success' ? 'badge-success' : (log.outcome === 'retried' ? 'badge-retried' : 'badge-failed')
                      }`}>
                        {log.outcome}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{log.attempt_count || 1}</td>
                    <td>
                      {log.price !== null && log.price !== undefined
                        ? `₹${Number(log.price).toLocaleString('en-IN')}`
                        : (log.raw_price_display || '--')}
                    </td>
                    <td>{log.stock || '--'}</td>
                    <td style={{ fontSize: '11px', color: log.error_message ? '#b91c1c' : '#64748b' }}>
                      {log.error_message || 'None'}
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
