import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

export const config = {
  port: Number(process.env.PORT || 5000),
  apiBaseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  gstApiUrl: process.env.GST_API_URL || '',
  gstApiKey: process.env.GST_API_KEY || '',
  dbPath: process.env.DB_PATH || './db/smf-invoices.db',
  nodeEnv: process.env.NODE_ENV || 'development',
};
