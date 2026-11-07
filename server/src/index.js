import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initializeDatabase } from './db.js';
import { verifyGSTIN, validateGSTIN } from './gstService.js';
import { allSql, getSql, runSql } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SMF GST Invoice API running' });
});

app.post('/api/gst/verify', async (req, res) => {
  const { gstin } = req.body || {};

  if (!gstin || typeof gstin !== 'string') {
    return res.status(400).json({ success: false, error: 'GSTIN is required' });
  }

  try {
    const result = await verifyGSTIN(gstin);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/customers', async (_req, res) => {
  try {
    const rows = await allSql('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, gstin, address, state, phone, email } = req.body;

  if (!name || !gstin) {
    return res.status(400).json({ error: 'Customer name and GSTIN are required.' });
  }

  if (!validateGSTIN(gstin)) {
    return res.status(400).json({ error: 'Invalid GSTIN format.' });
  }

  try {
    const existing = await getSql('SELECT * FROM customers WHERE gstin = ?', [gstin.toUpperCase()]);

    if (existing) {
      const updated = await runSql(
        `UPDATE customers SET name = ?, address = ?, state = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, address || '', state || '', phone || '', email || '', existing.id]
      );
      const refreshed = await getSql('SELECT * FROM customers WHERE id = ?', [existing.id]);
      return res.json({ message: 'Customer updated', customer: refreshed, saved: true });
    }

    const result = await runSql(
      'INSERT INTO customers (name, gstin, address, state, phone, email) VALUES (?, ?, ?, ?, ?, ?)',
      [name, gstin.toUpperCase(), address || '', state || '', phone || '', email || '']
    );

    const customer = await getSql('SELECT * FROM customers WHERE id = ?', [result.id]);
    res.status(201).json({ message: 'Customer saved', customer, saved: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    const rows = await allSql('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, hsn_sac, unit, rate, gst_rate, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Product name is required.' });
  }

  try {
    const result = await runSql(
      'INSERT INTO products (name, hsn_sac, unit, rate, gst_rate, description) VALUES (?, ?, ?, ?, ?, ?)',
      [name, hsn_sac || '', unit || 'Nos', Number(rate || 0), Number(gst_rate || 0), description || '']
    );

    const product = await getSql('SELECT * FROM products WHERE id = ?', [result.id]);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const sampleProducts = [
  { name: 'Fabrication Work', hsn_sac: '998899', unit: 'Job', rate: 2000, gst_rate: 18 },
  { name: 'Industrial Rack', hsn_sac: '7308', unit: 'Nos', rate: 4500, gst_rate: 18 },
  { name: 'Machine Stand', hsn_sac: '7308', unit: 'Nos', rate: 3000, gst_rate: 18 },
  { name: 'Working Table', hsn_sac: '7308', unit: 'Nos', rate: 5200, gst_rate: 18 },
  { name: 'Factory Stand', hsn_sac: '7308', unit: 'Nos', rate: 3800, gst_rate: 18 },
  { name: 'Gate Fabrication', hsn_sac: '998899', unit: 'Job', rate: 7600, gst_rate: 18 },
  { name: 'Grill Work', hsn_sac: '998899', unit: 'Sq Ft', rate: 450, gst_rate: 18 },
  { name: 'Drilling Job Work', hsn_sac: '998899', unit: 'Job', rate: 2200, gst_rate: 18 },
  { name: 'Lathe Job Work', hsn_sac: '998899', unit: 'Job', rate: 2800, gst_rate: 18 },
  { name: 'Welding Work', hsn_sac: '998899', unit: 'Job', rate: 2400, gst_rate: 18 },
  { name: 'Repair & Maintenance', hsn_sac: '998899', unit: 'Job', rate: 1600, gst_rate: 18 },
  { name: 'Custom Fabrication', hsn_sac: '998899', unit: 'Job', rate: 8800, gst_rate: 18 },
];

app.get('/api/seed', async (_req, res) => {
  try {
    for (const item of sampleProducts) {
      const exists = await getSql('SELECT id FROM products WHERE name = ?', [item.name]);
      if (!exists) {
        await runSql(
          'INSERT INTO products (name, hsn_sac, unit, rate, gst_rate, description) VALUES (?, ?, ?, ?, ?, ?)',
          [item.name, item.hsn_sac, item.unit, item.rate, item.gst_rate, item.name]
        );
      }
    }
    res.json({ success: true, message: 'Sample products seeded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices', async (_req, res) => {
  try {
    const rows = await allSql('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(rows.map((invoice) => ({ ...invoice, items: invoice.items ? JSON.parse(invoice.items) : [] })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await getSql('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    invoice.items = invoice.items ? JSON.parse(invoice.items) : [];
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  const invoice = req.body;

  try {
    const result = await runSql(
      `INSERT INTO invoices (
        invoice_number, invoice_date, place_of_supply, payment_terms, due_date,
        customer_name, customer_gstin, customer_address, customer_phone, customer_email,
        company_name, company_gstin, company_address, company_phone, company_email,
        subtotal, discount, taxable_amount, cgst, sgst, igst, grand_total, round_off, amount_payable,
        status, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`,
      [
        invoice.invoiceNumber,
        invoice.invoiceDate,
        invoice.placeOfSupply,
        invoice.paymentTerms,
        invoice.dueDate,
        invoice.customerName,
        invoice.customerGstin,
        invoice.customerAddress,
        invoice.customerPhone,
        invoice.customerEmail,
        invoice.companyName,
        invoice.companyGstin,
        invoice.companyAddress,
        invoice.companyPhone,
        invoice.companyEmail,
        Number(invoice.subtotal || 0),
        Number(invoice.discount || 0),
        Number(invoice.taxableAmount || 0),
        Number(invoice.cgst || 0),
        Number(invoice.sgst || 0),
        Number(invoice.igst || 0),
        Number(invoice.grandTotal || 0),
        Number(invoice.roundOff || 0),
        Number(invoice.amountPayable || 0),
        invoice.status || 'Draft',
        JSON.stringify(invoice.items || [])
      ]
    );

    const created = await getSql('SELECT * FROM invoices WHERE id = ?', [result.id]);
    created.items = created.items ? JSON.parse(created.items) : [];
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  const invoice = req.body;

  try {
    await runSql(
      `UPDATE invoices SET
        invoice_number = ?, invoice_date = ?, place_of_supply = ?, payment_terms = ?, due_date = ?,
        customer_name = ?, customer_gstin = ?, customer_address = ?, customer_phone = ?, customer_email = ?,
        company_name = ?, company_gstin = ?, company_address = ?, company_phone = ?, company_email = ?,
        subtotal = ?, discount = ?, taxable_amount = ?, cgst = ?, sgst = ?, igst = ?, grand_total = ?,
        round_off = ?, amount_payable = ?, status = ?, items = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        invoice.invoiceNumber,
        invoice.invoiceDate,
        invoice.placeOfSupply,
        invoice.paymentTerms,
        invoice.dueDate,
        invoice.customerName,
        invoice.customerGstin,
        invoice.customerAddress,
        invoice.customerPhone,
        invoice.customerEmail,
        invoice.companyName,
        invoice.companyGstin,
        invoice.companyAddress,
        invoice.companyPhone,
        invoice.companyEmail,
        Number(invoice.subtotal || 0),
        Number(invoice.discount || 0),
        Number(invoice.taxableAmount || 0),
        Number(invoice.cgst || 0),
        Number(invoice.sgst || 0),
        Number(invoice.igst || 0),
        Number(invoice.grandTotal || 0),
        Number(invoice.roundOff || 0),
        Number(invoice.amountPayable || 0),
        invoice.status || 'Draft',
        JSON.stringify(invoice.items || []),
        req.params.id,
      ]
    );

    const updated = await getSql('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    updated.items = updated.items ? JSON.parse(updated.items) : [];
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await runSql('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Backend server running on http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
