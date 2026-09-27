import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import SearchSection from '../components/SearchSection';
import ProductCard from '../components/ProductCard';
import HistoryModal from '../components/HistoryModal';
import LogsModal from '../components/LogsModal';
import { apiService } from '../api/apiService';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrapeFeedback, setScrapeFeedback] = useState(null);
  const [isScrapingAll, setIsScrapingAll] = useState(false);

  // Active modals state
  const [historyProduct, setHistoryProduct] = useState(null);
  const [logsProduct, setLogsProduct] = useState(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.getProducts();
      setProducts(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load tracked products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleTriggerScrapeAll = async () => {
    setIsScrapingAll(true);
    setScrapeFeedback(null);
    setError(null);

    try {
      const res = await apiService.triggerScrapeAll();
      const s = res.summary || {};
      setScrapeFeedback(
        `Manual Scrape Complete! Total: ${s.total || 0}, Success: ${s.success || 0}, Retried: ${s.retried || 0}, Failed: ${s.failed || 0}`
      );
      // Refresh list to update latest price/stock/status
      await fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to execute manual scrape');
    } finally {
      setIsScrapingAll(false);
    }
  };

  const handleProductTracked = (newProductData) => {
    fetchProducts();
  };

  return (
    <div className="app-container">
      <Header
        onTriggerScrapeAll={handleTriggerScrapeAll}
        isScrapingAll={isScrapingAll}
      />

      {error && <div className="alert alert-error">{error}</div>}
      {scrapeFeedback && <div className="alert alert-info">{scrapeFeedback}</div>}

      <SearchSection onProductTracked={handleProductTracked} />

      <div className="section">
        <div className="section-title">
          <span>Tracked Products Dashboard ({products.length})</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchProducts} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>

        {isLoading && <p>Loading tracked products...</p>}

        {!isLoading && products.length === 0 && (
          <div className="empty-state">
            No products are currently being tracked. Use the search section above to search the INE mock store and add products to your tracking list.
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <div className="product-grid">
            {products.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onViewHistory={(p) => setHistoryProduct(p)}
                onViewLogs={(p) => setLogsProduct(p)}
              />
            ))}
          </div>
        )}
      </div>

      {historyProduct && (
        <HistoryModal
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {logsProduct && (
        <LogsModal
          product={logsProduct}
          onClose={() => setLogsProduct(null)}
        />
      )}
    </div>
  );
}
