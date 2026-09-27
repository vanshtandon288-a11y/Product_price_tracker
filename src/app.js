const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Product Price Tracker Backend API',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if present
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && req.path !== '/health') {
      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
    next();
  });
}

module.exports = app;
