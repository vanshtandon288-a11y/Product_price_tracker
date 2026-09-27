const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.PORT, () => {
  console.log(`\n==================================================`);
  console.log(` Product Price Tracker Backend API Server Running`);
  console.log(` Port: http://localhost:${env.PORT}`);
  console.log(` Health Check: http://localhost:${env.PORT}/health`);
  console.log(` API Base: http://localhost:${env.PORT}/api`);
  console.log(`==================================================\n`);
});

module.exports = server;
