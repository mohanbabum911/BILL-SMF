CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gstin TEXT,
  address TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  hsn_sac TEXT,
  unit TEXT,
  rate REAL,
  gst_rate REAL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TEXT NOT NULL,
  place_of_supply TEXT,
  payment_terms TEXT,
  due_date TEXT,
  customer_name TEXT,
  customer_gstin TEXT,
  customer_address TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  company_name TEXT,
  company_gstin TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  subtotal REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  taxable_amount REAL DEFAULT 0,
  cgst REAL DEFAULT 0,
  sgst REAL DEFAULT 0,
  igst REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  round_off REAL DEFAULT 0,
  amount_payable REAL DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  items TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
