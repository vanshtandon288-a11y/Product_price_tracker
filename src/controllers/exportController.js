const dbService = require('../services/dbService');
const { generateScrapeHistoryCsv } = require('../services/csvService');

/**
 * GET /api/export/csv - Download complete scrape history as a CSV file
 */
async function exportCsv(req, res) {
  try {
    const logs = await dbService.getAllScrapeLogsForCsv();
    const csvContent = generateScrapeHistoryCsv(logs);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="scrape_history.csv"');
    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('[ExportController] Error generating CSV:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate CSV export',
      details: error.message
    });
  }
}

module.exports = {
  exportCsv
};
