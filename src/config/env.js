require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  MOCK_STORE_URL: process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com'
};
