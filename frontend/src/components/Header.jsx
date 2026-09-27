import React from 'react';
import { apiService } from '../api/apiService';

export default function Header({ onTriggerScrapeAll, isScrapingAll }) {
  const handleExportCsv = () => {
    const csvUrl = apiService.getExportCsvUrl();
    window.open(csvUrl, '_blank');
  };

  return (
    <header className="header">
      <div className="header-title">
        <h1>Product Price Tracker</h1>
        <p>INE Mock Store Web Scraping &amp; Monitoring Dashboard</p>
      </div>

      <div className="header-actions">
        <button
          className="btn btn-secondary"
          onClick={handleExportCsv}
          title="Download scrape history as CSV file"
        >
          Export CSV
        </button>

        <button
          className="btn btn-primary"
          onClick={onTriggerScrapeAll}
          disabled={isScrapingAll}
        >
          {isScrapingAll ? (
            <>
              <span>Scraping All...</span>
            </>
          ) : (
            'Run Manual Scrape All'
          )}
        </button>
      </div>
    </header>
  );
}
