import React, { useState } from 'react';
import { apiService } from '../api/apiService';

export default function SearchSection({ onProductTracked }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  
  // Track selected option per product ID
  const [selectedOptions, setSelectedOptions] = useState({});
  // Track loading status per product ID being added
  const [trackingLoading, setTrackingLoading] = useState({});
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setFeedbackMsg(null);

    try {
      const res = await apiService.searchProducts(query);
      setResults(res.data || []);
      
      // Pre-select first option for each result item
      const initialOptions = {};
      (res.data || []).forEach(item => {
        if (item.available_options && item.available_options.length > 0) {
          initialOptions[item.store_product_id] = item.available_options[0];
        } else {
          initialOptions[item.store_product_id] = 'Default';
        }
      });
      setSelectedOptions(initialOptions);

      if ((res.data || []).length === 0) {
        setFeedbackMsg('No matching products found in the INE store.');
      }
    } catch (err) {
      setError(err.message || 'Failed to search mock store');
    } finally {
      setIsSearching(false);
    }
  };

  const handleOptionChange = (storeProductId, option) => {
    setSelectedOptions(prev => ({
      ...prev,
      [storeProductId]: option
    }));
  };

  const handleTrackProduct = async (item) => {
    const storeProductId = item.store_product_id;
    const selectedOption = selectedOptions[storeProductId] || (item.available_options && item.available_options[0]) || 'Default';

    setTrackingLoading(prev => ({ ...prev, [storeProductId]: true }));
    setError(null);
    setFeedbackMsg(null);

    try {
      const payload = {
        store_product_id: storeProductId,
        name: item.name,
        selected_option: selectedOption,
        product_url: item.product_url
      };

      const res = await apiService.trackProduct(payload);
      setFeedbackMsg(`Successfully added "${item.name}" (${selectedOption}) to tracking list!`);
      
      if (onProductTracked) {
        onProductTracked(res.data);
      }
    } catch (err) {
      setError(err.message || `Failed to track product ${item.name}`);
    } finally {
      setTrackingLoading(prev => ({ ...prev, [storeProductId]: false }));
    }
  };

  return (
    <div className="section">
      <div className="section-title">
        <span>Search &amp; Track Mock Store Products</span>
      </div>

      <form onSubmit={handleSearch} className="search-box">
        <input
          type="text"
          className="form-input"
          placeholder="Enter product title or keyword (e.g. Resistance, Gimbal)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={isSearching || !query.trim()}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}
      {feedbackMsg && <div className="alert alert-info">{feedbackMsg}</div>}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((item) => {
            const isTracking = trackingLoading[item.store_product_id];
            const currentSelectedOption = selectedOptions[item.store_product_id] || '';

            return (
              <div key={item.store_product_id} className="search-item">
                <div className="search-item-info">
                  <h4>{item.name}</h4>
                  <p>
                    <strong>ID:</strong> {item.store_product_id} | <strong>Brand:</strong> {item.brand || 'INE'} | <strong>SKU:</strong> {item.sku}
                  </p>
                </div>

                <div className="search-item-action">
                  {item.available_options && item.available_options.length > 0 && (
                    <select
                      className="form-select"
                      value={currentSelectedOption}
                      onChange={(e) => handleOptionChange(item.store_product_id, e.target.value)}
                      disabled={isTracking}
                    >
                      {item.available_options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleTrackProduct(item)}
                    disabled={isTracking}
                  >
                    {isTracking ? 'Adding & Scraping...' : '+ Track Product'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
