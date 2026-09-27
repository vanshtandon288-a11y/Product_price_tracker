const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

let supabase = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('[Database] Connecting to remote Supabase PostgreSQL instance...');
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
} else {
  console.warn('[Database] WARNING: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY environment variables are not set.');
  console.warn('[Database] Using local database emulation mode for offline API testing.');
}

module.exports = {
  supabase,
  isConfigured: () => Boolean(supabase)
};
