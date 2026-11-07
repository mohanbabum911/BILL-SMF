import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const COMPANY = {
  name: 'SMF',
  business: 'Fabrication & Engineering Works',
  address: 'Peenya 2nd Stage, Bengaluru, Karnataka, India',
  gstin: '29ABCDE1234F1Z5',
  phone: '+91 98765 43210',
  email: 'sales@smfworks.in',
  bankName: 'State Bank of India',
  bankAcc: '12345678901234',
  ifsc: 'SBIN0001234',
  branch: 'Peenya, Bengaluru',
  signatory: 'Authorized Signatory',
};

const defaultItems = [
  { description: 'Fabrication Work', hsn: '998899', quantity: 1, unit: 'Job', rate: 25000, discount: 0, gstRate: 18 },
  { description: 'Industrial Rack', hsn: '7308', quantity: 2, unit: 'Nos', rate: 12000, discount: 0, gstRate: 18 },
  { description: 'Gate Fabrication', hsn: '998899', quantity: 1, unit: 'Job', rate: 18000, discount: 1500, gstRate: 18 },
];

const defaultInvoice = {
  invoiceNumber: 'SMF/INV/2026/001',
  invoiceDate: new Date().toISOString().slice(0, 10),
  placeOfSupply: 'Karnataka',
  paymentTerms: 'Net 15 Days',
  dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
  customerName: 'Mohan Industries',
  customerGstin: '29ABCDE1234F1Z5',
  customerAddress: 'Peenya Industrial Area, Bengaluru, Karnataka, India',
  customerPhone: '+91 99887 66554',
  customerEmail: 'accounts@mohanindustries.in',
  customerState: 'Karnataka',
  legalBusinessName: 'Mohan Industries',
  tradeName: '',
  gstStatus: 'Active',
  registrationDate: '2020-06-01',
  taxpayerType: 'Regular',
  companyName: COMPANY.name,
  companyGstin: COMPANY.gstin,
  companyAddress: COMPANY.address,
  companyPhone: COMPANY.phone,
  companyEmail: COMPANY.email,
  items: defaultItems,
};

type InvoiceItem = {
  id?: number;
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  gstRate: number;
};

type InvoiceDraft = {
  invoiceNumber: string;
  invoiceDate: string;
  placeOfSupply: string;
  paymentTerms: string;
  dueDate: string;
  customerName: string;
  customerGstin: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  customerState: string;
  legalBusinessName: string;
  tradeName: string;
  gstStatus: string;
  registrationDate: string;
  taxpayerType: string;
  companyName: string;
  companyGstin: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  items: InvoiceItem[];
};

type CustomerRecord = {
  id?: number;
  name: string;
  gstin: string;
  address: string;
  state: string;
  phone: string;
  email: string;
};

const roundTo2 = (value: number) => Number(value.toFixed(2));

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

function App() {
  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDraft>(defaultInvoice);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [savedInvoices, setSavedInvoices] = useState<any[]>([]);
  const [gstinLoading, setGstinLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [lastMessage, setLastMessage] = useState('');

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE}/customers`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`${API_BASE}/invoices`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      setSavedInvoices(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
    seedProducts();
  }, []);

  const seedProducts = async () => {
    try {
      await fetch(`${API_BASE}/seed`);
    } catch (error) {
      console.error('Could not seed products', error);
    }
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    let taxableAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    invoice.items.forEach((item) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const itemDiscount = Number(item.discount || 0);
      const gstRate = Number(item.gstRate || 0);
      const lineBase = qty * rate;
      const discountedValue = Math.max(lineBase - itemDiscount, 0);
      subtotal += lineBase;
      discount += itemDiscount;
      taxableAmount += discountedValue;

      const taxValue = discountedValue * (gstRate / 100);
      if (invoice.customerState && invoice.customerState.toLowerCase() === 'karnataka') {
        const half = taxValue / 2;
        cgst += half;
        sgst += half;
      } else {
        igst += taxValue;
      }
    });

    const grandTotal = taxableAmount + cgst + sgst + igst;
    const roundOff = roundTo2(grandTotal - Math.round(grandTotal));
    const amountPayable = Math.round(grandTotal);

    return { subtotal, discount, taxableAmount, cgst, sgst, igst, grandTotal, roundOff, amountPayable };
  }, [invoice]);

  const updateInvoiceField = (field: keyof InvoiceDraft, value: string) => {
    setInvoice((current) => ({ ...current, [field]: value }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setInvoice((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], [field]: value };
      return { ...current, items };
    });
  };

  const addItemRow = () => {
    setInvoice((current) => ({
      ...current,
      items: [...current.items, { description: '', hsn: '', quantity: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18 }],
    }));
  };

  const removeItemRow = (index: number) => {
    setInvoice((current) => ({
      ...current,
      items: current.items.filter((_, i) => i !== index),
    }));
  };

  const saveCustomer = async () => {
    try {
      const response = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: invoice.customerName,
          gstin: invoice.customerGstin,
          address: invoice.customerAddress,
          state: invoice.customerState,
          phone: invoice.customerPhone,
          email: invoice.customerEmail,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save customer');
      fetchCustomers();
      setLastMessage('Customer saved successfully.');
    } catch (error: any) {
      setLastMessage(error.message || 'Customer save failed.');
    }
  };

  const handleGSTINVerify = async () => {
    const gstin = invoice.customerGstin.trim();
    const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/;

    if (!pattern.test(gstin)) {
      setLastMessage('Invalid GSTIN format. Example: 29ABCDE1234F1Z5');
      return;
    }

    setGstinLoading(true);
    setLastMessage('Verifying GSTIN...');

    try {
      const response = await fetch(`${API_BASE}/gst/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'GSTIN verification failed');

      const business = data.data;
      setInvoice((current) => ({
        ...current,
        customerName: business.legalName || current.customerName,
        legalBusinessName: business.legalName || current.legalBusinessName,
        tradeName: business.tradeName || current.tradeName,
        gstStatus: business.status || current.gstStatus,
        registrationDate: business.registrationDate || current.registrationDate,
        taxpayerType: business.taxpayerType || current.taxpayerType,
        customerState: business.state || current.customerState,
        customerAddress: business.address || current.customerAddress,
      }));
      setLastMessage('GSTIN verified successfully.');
    } catch (error: any) {
      setLastMessage(error.message || 'GSTIN verification failed.');
    } finally {
      setGstinLoading(false);
    }
  };

  const saveInvoice = async () => {
    const payload = {
      ...invoice,
      subtotal: totals.subtotal,
      discount: totals.discount,
      taxableAmount: totals.taxableAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      grandTotal: totals.grandTotal,
      roundOff: totals.roundOff,
      amountPayable: totals.amountPayable,
    };

    try {
      const response = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invoice save failed');
      fetchInvoices();
      setLastMessage('Invoice saved successfully.');
    } catch (error: any) {
      setLastMessage(error.message || 'Invoice save failed.');
    }
  };

  const updateInvoice = async (invoiceId: number) => {
    const payload = {
      ...invoice,
      subtotal: totals.subtotal,
      discount: totals.discount,
      taxableAmount: totals.taxableAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      grandTotal: totals.grandTotal,
      roundOff: totals.roundOff,
      amountPayable: totals.amountPayable,
    };

    try {
      const response = await fetch(`${API_BASE}/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed');
      fetchInvoices();
      setLastMessage('Invoice updated successfully.');
    } catch (error: any) {
      setLastMessage(error.message || 'Update failed.');
    }
  };

  const deleteInvoice = async (invoiceId: number) => {
    try {
      const response = await fetch(`${API_BASE}/invoices/${invoiceId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      fetchInvoices();
      setLastMessage('Invoice deleted successfully.');
    } catch (error: any) {
      setLastMessage(error.message || 'Delete failed.');
    }
  };

  const handleSearch = (term: string) => {
    setSearch(term);
  };

  const filteredInvoices = savedInvoices.filter((invoiceRecord) => {
    const value = search.toLowerCase();
    return !value || Object.values(invoiceRecord).join(' ').toLowerCase().includes(value);
  });

  const printInvoice = () => window.print();

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('SMF', 40, 50);
    doc.setFontSize(10);
    doc.text('Fabrication & Engineering Works', 40, 68);
    doc.text('Peenya 2nd Stage, Bengaluru, Karnataka', 40, 84);
    doc.text(`GSTIN: ${COMPANY.gstin}`, 350, 50);

    doc.setFontSize(12);
    doc.text('Tax Invoice', 430, 120, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 40, 120);
    doc.text(`Invoice Date: ${invoice.invoiceDate}`, 40, 136);
    doc.text(`Place of Supply: ${invoice.placeOfSupply}`, 40, 152);

    autoTable(doc, {
      startY: 180,
      head: [['Description', 'HSN', 'Qty', 'Rate', 'Discount', 'Taxable', 'GST %', 'CGST', 'SGST', 'IGST', 'Total']],
      body: invoice.items.map((item) => {
        const qty = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const discount = Number(item.discount || 0);
        const taxable = Math.max(qty * rate - discount, 0);
        const gst = Number(item.gstRate || 0);
        const tax = taxable * (gst / 100);
        const cgst = invoice.customerState && invoice.customerState.toLowerCase() === 'karnataka' ? tax / 2 : 0;
        const sgst = invoice.customerState && invoice.customerState.toLowerCase() === 'karnataka' ? tax / 2 : 0;
        const igst = invoice.customerState && invoice.customerState.toLowerCase() === 'karnataka' ? 0 : tax;
        const total = taxable + cgst + sgst + igst;
        return [
          item.description,
          item.hsn,
          String(qty),
          String(rate),
          String(discount),
          String(taxable),
          `${gst}%`,
          String(cgst.toFixed(2)),
          String(sgst.toFixed(2)),
          String(igst.toFixed(2)),
          String(total.toFixed(2)),
        ];
      }),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: 40, right: 40 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${formatCurrency(totals.subtotal)}`, 360, finalY);
    doc.text(`Discount: ${formatCurrency(totals.discount)}`, 360, finalY + 16);
    doc.text(`Taxable Amount: ${formatCurrency(totals.taxableAmount)}`, 360, finalY + 32);
    doc.text(`CGST: ${formatCurrency(totals.cgst)}`, 360, finalY + 48);
    doc.text(`SGST: ${formatCurrency(totals.sgst)}`, 360, finalY + 64);
    doc.text(`IGST: ${formatCurrency(totals.igst)}`, 360, finalY + 80);
    doc.text(`Grand Total: ${formatCurrency(totals.grandTotal)}`, 360, finalY + 96);
    doc.text(`Round Off: ${formatCurrency(totals.roundOff)}`, 360, finalY + 112);
    doc.text(`Amount Payable: ${formatCurrency(totals.amountPayable)}`, 360, finalY + 128);

    doc.text('Authorized Signatory', 40, finalY + 150);
    doc.text('Bank: State Bank of India | A/C: 12345678901234 | IFSC: SBIN0001234', 40, finalY + 170);
    doc.text('Terms & Conditions: Goods once sold cannot be returned. Interest at 18% p.a. will be charged on overdue amounts.', 40, finalY + 186);
    doc.text('Thank you for your business.', 40, finalY + 210);

    doc.save(`SMF-Invoice-${invoice.invoiceNumber}.pdf`);
  };

  const exportExcel = () => {
    const rows = invoice.items.map((item) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const discount = Number(item.discount || 0);
      const taxable = Math.max(qty * rate - discount, 0);
      const gst = Number(item.gstRate || 0);
      const tax = taxable * (gst / 100);
      const cgst = invoice.customerState && invoice.customerState.toLowerCase() === 'karnataka' ? tax / 2 : 0;
      const sgst = invoice.customerState && invoice.customerState.toLowerCase() === 'karnataka' ? tax / 2 : 0;
      const igst = invoice.customerState && invoice.customerState.toLowerCase() === 'karnataka' ? 0 : tax;
      return {
        Description: item.description,
        'HSN/SAC': item.hsn,
        Quantity: qty,
        Unit: item.unit,
        Rate: rate,
        Discount: discount,
        'Taxable Value': taxable,
        'GST %': gst,
        CGST: cgst,
        SGST: sgst,
        IGST: igst,
        Total: taxable + cgst + sgst + igst,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');
    XLSX.writeFile(workbook, `SMF-Invoice-${invoice.invoiceNumber}.xlsx`);
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent(
      `SMF Tax Invoice\nInvoice No: ${invoice.invoiceNumber}\nAmount Payable: ${formatCurrency(totals.amountPayable)}\nThank you for your business.`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const loadSavedInvoice = (record: any) => {
    const loadedInvoice = {
      invoiceNumber: record.invoice_number,
      invoiceDate: record.invoice_date,
      placeOfSupply: record.place_of_supply,
      paymentTerms: record.payment_terms,
      dueDate: record.due_date,
      customerName: record.customer_name,
      customerGstin: record.customer_gstin,
      customerAddress: record.customer_address,
      customerPhone: record.customer_phone,
      customerEmail: record.customer_email,
      customerState: record.customer_name ? 'Karnataka' : '',
      legalBusinessName: record.customer_name,
      tradeName: record.customer_name,
      gstStatus: 'Active',
      registrationDate: '',
      taxpayerType: 'Regular',
      companyName: record.company_name || COMPANY.name,
      companyGstin: record.company_gstin || COMPANY.gstin,
      companyAddress: record.company_address || COMPANY.address,
      companyPhone: record.company_phone || COMPANY.phone,
      companyEmail: record.company_email || COMPANY.email,
      items: record.items || defaultItems,
    };
    setInvoice(loadedInvoice);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="no-print rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-300">SMF Dashboard</p>
              <h1 className="mt-2 text-3xl font-bold">GST Invoice Portal</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={saveInvoice} className="rounded-md bg-emerald-500 px-4 py-2 font-semibold text-white hover:bg-emerald-600">Save Invoice</button>
              <button onClick={() => setInvoice(defaultInvoice)} className="rounded-md bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600">New Invoice</button>
              <button onClick={printInvoice} className="rounded-md bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600">Print</button>
              <button onClick={exportPdf} className="rounded-md bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600">Download PDF</button>
              <button onClick={exportExcel} className="rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">Download Excel</button>
              <button onClick={shareWhatsApp} className="rounded-md bg-teal-500 px-4 py-2 font-semibold text-white hover:bg-teal-600">WhatsApp</button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="no-print space-y-6 rounded-2xl bg-white p-5 shadow-sm">
            <section>
              <h2 className="text-lg font-semibold text-slate-800">Customer Database</h2>
              <div className="mt-3 space-y-3">
                {customers.map((customer) => (
                  <button
                    key={customer.id || customer.gstin}
                    onClick={() => {
                      setInvoice((current) => ({
                        ...current,
                        customerName: customer.name,
                        customerGstin: customer.gstin,
                        customerAddress: customer.address,
                        customerState: customer.state,
                        customerPhone: customer.phone,
                        customerEmail: customer.email,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-200 p-3 text-left hover:border-blue-500 hover:bg-blue-50"
                  >
                    <div className="font-medium text-slate-800">{customer.name}</div>
                    <div className="text-sm text-slate-500">{customer.gstin}</div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-800">Invoice Search</h2>
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search invoices"
                className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
              <div className="mt-3 space-y-2">
                {filteredInvoices.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => loadSavedInvoice(record)}
                    className="w-full rounded-lg border border-slate-200 p-3 text-left hover:border-blue-500 hover:bg-blue-50"
                  >
                    <div className="font-medium text-slate-800">{record.invoice_number}</div>
                    <div className="text-sm text-slate-500">{record.customer_name}</div>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-800">Customer & GST Verification</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Customer GSTIN</span>
                  <input value={invoice.customerGstin} onChange={(e) => updateInvoiceField('customerGstin', e.target.value.toUpperCase())} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" placeholder="29ABCDE1234F1Z5" />
                </label>
                <div className="flex items-end">
                  <button disabled={gstinLoading} onClick={handleGSTINVerify} className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-70">
                    {gstinLoading ? 'Verifying...' : 'Verify GSTIN'}
                  </button>
                </div>
                <div className="flex items-end">
                  <button onClick={saveCustomer} className="w-full rounded-md bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700">Save Customer</button>
                </div>
                <div className="flex items-end">
                  <button onClick={async () => { await saveInvoice(); await fetchInvoices(); }} className="w-full rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">Create Invoice</button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Legal Business Name</span>
                  <input value={invoice.legalBusinessName} onChange={(e) => updateInvoiceField('legalBusinessName', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Trade Name</span>
                  <input value={invoice.tradeName} onChange={(e) => updateInvoiceField('tradeName', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">GST Registration Status</span>
                  <input value={invoice.gstStatus} onChange={(e) => updateInvoiceField('gstStatus', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Registration Date</span>
                  <input type="date" value={invoice.registrationDate} onChange={(e) => updateInvoiceField('registrationDate', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Taxpayer Type</span>
                  <input value={invoice.taxpayerType} onChange={(e) => updateInvoiceField('taxpayerType', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">State</span>
                  <input value={invoice.customerState} onChange={(e) => updateInvoiceField('customerState', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2 md:col-span-2 xl:col-span-2">
                  <span className="text-sm font-medium text-slate-600">Registered Address</span>
                  <textarea value={invoice.customerAddress} onChange={(e) => updateInvoiceField('customerAddress', e.target.value)} className="min-h-[42px] w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-800">Invoice Details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Invoice Number</span>
                  <input value={invoice.invoiceNumber} onChange={(e) => updateInvoiceField('invoiceNumber', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Invoice Date</span>
                  <input type="date" value={invoice.invoiceDate} onChange={(e) => updateInvoiceField('invoiceDate', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Place of Supply</span>
                  <input value={invoice.placeOfSupply} onChange={(e) => updateInvoiceField('placeOfSupply', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Payment Terms</span>
                  <input value={invoice.paymentTerms} onChange={(e) => updateInvoiceField('paymentTerms', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Due Date</span>
                  <input type="date" value={invoice.dueDate} onChange={(e) => updateInvoiceField('dueDate', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2 md:col-span-2 xl:col-span-2">
                  <span className="text-sm font-medium text-slate-600">Customer Name</span>
                  <input value={invoice.customerName} onChange={(e) => updateInvoiceField('customerName', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2 md:col-span-2 xl:col-span-2">
                  <span className="text-sm font-medium text-slate-600">Customer Address</span>
                  <textarea value={invoice.customerAddress} onChange={(e) => updateInvoiceField('customerAddress', e.target.value)} className="min-h-[42px] w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Customer Phone</span>
                  <input value={invoice.customerPhone} onChange={(e) => updateInvoiceField('customerPhone', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600">Customer Email</span>
                  <input type="email" value={invoice.customerEmail} onChange={(e) => updateInvoiceField('customerEmail', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">Item Details</h2>
                <button onClick={addItemRow} className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">Add Row</button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Sl. No.</th>
                      <th className="px-2 py-2">Description</th>
                      <th className="px-2 py-2">HSN/SAC</th>
                      <th className="px-2 py-2">Qty</th>
                      <th className="px-2 py-2">Unit</th>
                      <th className="px-2 py-2">Rate</th>
                      <th className="px-2 py-2">Discount</th>
                      <th className="px-2 py-2">Taxable Value</th>
                      <th className="px-2 py-2">GST %</th>
                      <th className="px-2 py-2">CGST</th>
                      <th className="px-2 py-2">SGST</th>
                      <th className="px-2 py-2">IGST</th>
                      <th className="px-2 py-2">Total</th>
                      <th className="px-2 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => {
                      const taxableValue = Math.max((Number(item.quantity || 0) * Number(item.rate || 0)) - Number(item.discount || 0), 0);
                      const tax = taxableValue * (Number(item.gstRate || 0) / 100);
                      const sameState = invoice.customerState && invoice.customerState.toLowerCase() === 'karnataka';
                      const cgst = sameState ? tax / 2 : 0;
                      const sgst = sameState ? tax / 2 : 0;
                      const igst = sameState ? 0 : tax;
                      const total = taxableValue + cgst + sgst + igst;

                      return (
                        <tr key={`${index}-${item.description}`} className="rounded-lg bg-slate-50 text-sm text-slate-700">
                          <td className="px-2 py-2">{index + 1}</td>
                          <td className="px-2 py-2"><input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1" /></td>
                          <td className="px-2 py-2"><input value={item.hsn} onChange={(e) => updateItem(index, 'hsn', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1" /></td>
                          <td className="px-2 py-2"><input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} className="w-full rounded border border-slate-300 px-2 py-1" /></td>
                          <td className="px-2 py-2"><input value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1" /></td>
                          <td className="px-2 py-2"><input type="number" value={item.rate} onChange={(e) => updateItem(index, 'rate', Number(e.target.value))} className="w-full rounded border border-slate-300 px-2 py-1" /></td>
                          <td className="px-2 py-2"><input type="number" value={item.discount} onChange={(e) => updateItem(index, 'discount', Number(e.target.value))} className="w-full rounded border border-slate-300 px-2 py-1" /></td>
                          <td className="px-2 py-2">{formatCurrency(taxableValue)}</td>
                          <td className="px-2 py-2"><input type="number" value={item.gstRate} onChange={(e) => updateItem(index, 'gstRate', Number(e.target.value))} className="w-full rounded border border-slate-300 px-2 py-1" /></td>
                          <td className="px-2 py-2">{formatCurrency(cgst)}</td>
                          <td className="px-2 py-2">{formatCurrency(sgst)}</td>
                          <td className="px-2 py-2">{formatCurrency(igst)}</td>
                          <td className="px-2 py-2">{formatCurrency(total)}</td>
                          <td className="px-2 py-2"><button onClick={() => removeItemRow(index)} className="text-red-600 hover:text-red-700">Remove</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold text-slate-800">Invoice Summary</h2>
                {lastMessage && <p className="text-sm text-emerald-600">{lastMessage}</p>}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs uppercase text-slate-500">Subtotal</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totals.subtotal)}</div></div>
                <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs uppercase text-slate-500">Discount</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totals.discount)}</div></div>
                <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs uppercase text-slate-500">Taxable Amount</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totals.taxableAmount)}</div></div>
                <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs uppercase text-slate-500">CGST</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totals.cgst)}</div></div>
                <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs uppercase text-slate-500">SGST</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totals.sgst)}</div></div>
                <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs uppercase text-slate-500">IGST</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totals.igst)}</div></div>
                <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs uppercase text-slate-500">Grand Total</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totals.grandTotal)}</div></div>
                <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs uppercase text-slate-500">Round Off</div><div className="mt-2 text-xl font-semibold">{formatCurrency(totals.roundOff)}</div></div>
                <div className="rounded-lg border border-slate-200 p-3 md:col-span-2 xl:col-span-4"><div className="text-xs uppercase text-slate-500">Amount Payable</div><div className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totals.amountPayable)}</div></div>
              </div>
            </section>
          </main>
        </div>

        <div ref={invoiceRef} className="invoice-sheet mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <div className="border-b border-slate-300 pb-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">SMF</h2>
                <p className="text-sm font-medium text-slate-600">Fabrication & Engineering Works</p>
                <p className="text-sm text-slate-600">Peenya 2nd Stage, Bengaluru, Karnataka</p>
              </div>
              <div className="text-sm text-slate-600 md:text-right">
                <div className="font-semibold text-slate-800">Company GSTIN: {COMPANY.gstin}</div>
                <div>Phone: {COMPANY.phone}</div>
                <div>Email: {COMPANY.email}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 border-b border-slate-300 pb-5 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Bill To</h3>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <div className="font-semibold">{invoice.customerName}</div>
                <div>{invoice.legalBusinessName}</div>
                <div>{invoice.customerAddress}</div>
                <div>{invoice.customerState}</div>
                <div>GSTIN: {invoice.customerGstin}</div>
                <div>{invoice.customerPhone}</div>
                <div>{invoice.customerEmail}</div>
              </div>
            </div>
            <div className="md:text-right">
              <h3 className="text-lg font-semibold text-slate-800">Tax Invoice</h3>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <div><span className="font-semibold">Invoice No:</span> {invoice.invoiceNumber}</div>
                <div><span className="font-semibold">Invoice Date:</span> {invoice.invoiceDate}</div>
                <div><span className="font-semibold">Place of Supply:</span> {invoice.placeOfSupply}</div>
                <div><span className="font-semibold">Payment Terms:</span> {invoice.paymentTerms}</div>
                <div><span className="font-semibold">Due Date:</span> {invoice.dueDate}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-2">Sl. No.</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">HSN/SAC</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2">Taxable Value</th>
                  <th className="px-3 py-2">GST %</th>
                  <th className="px-3 py-2">CGST</th>
                  <th className="px-3 py-2">SGST</th>
                  <th className="px-3 py-2">IGST</th>
                  <th className="px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => {
                  const taxableValue = Math.max((Number(item.quantity || 0) * Number(item.rate || 0)) - Number(item.discount || 0), 0);
                  const gstRate = Number(item.gstRate || 0);
                  const tax = taxableValue * (gstRate / 100);
                  const sameState = invoice.customerState && invoice.customerState.toLowerCase() === 'karnataka';
                  const cgst = sameState ? tax / 2 : 0;
                  const sgst = sameState ? tax / 2 : 0;
                  const igst = sameState ? 0 : tax;
                  const total = taxableValue + cgst + sgst + igst;

                  return (
                    <tr key={`${index}-${item.description}`} className="border-b border-slate-200">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2">{item.hsn}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{item.unit}</td>
                      <td className="px-3 py-2">{formatCurrency(Number(item.rate || 0))}</td>
                      <td className="px-3 py-2">{formatCurrency(Number(item.discount || 0))}</td>
                      <td className="px-3 py-2">{formatCurrency(taxableValue)}</td>
                      <td className="px-3 py-2">{gstRate}%</td>
                      <td className="px-3 py-2">{formatCurrency(cgst)}</td>
                      <td className="px-3 py-2">{formatCurrency(sgst)}</td>
                      <td className="px-3 py-2">{formatCurrency(igst)}</td>
                      <td className="px-3 py-2">{formatCurrency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="text-base font-semibold text-slate-800">Bank Details</h4>
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                  <div><span className="font-semibold">Bank:</span> {COMPANY.bankName}</div>
                  <div><span className="font-semibold">Account:</span> {COMPANY.bankAcc}</div>
                  <div><span className="font-semibold">IFSC:</span> {COMPANY.ifsc}</div>
                  <div><span className="font-semibold">Branch:</span> {COMPANY.branch}</div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="text-base font-semibold text-slate-800">Terms & Conditions</h4>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
                  <li>Goods once sold cannot be returned or exchanged.</li>
                  <li>Interest at 18% per annum will be charged on overdue amounts.</li>
                  <li>All disputes subject to Bengaluru jurisdiction.</li>
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>{formatCurrency(totals.discount)}</span></div>
                <div className="flex justify-between"><span>Taxable Amount</span><span>{formatCurrency(totals.taxableAmount)}</span></div>
                <div className="flex justify-between"><span>CGST</span><span>{formatCurrency(totals.cgst)}</span></div>
                <div className="flex justify-between"><span>SGST</span><span>{formatCurrency(totals.sgst)}</span></div>
                <div className="flex justify-between"><span>IGST</span><span>{formatCurrency(totals.igst)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900"><span>Grand Total</span><span>{formatCurrency(totals.grandTotal)}</span></div>
                <div className="flex justify-between"><span>Round Off</span><span>{formatCurrency(totals.roundOff)}</span></div>
                <div className="flex justify-between text-lg font-bold text-emerald-600"><span>Amount Payable</span><span>{formatCurrency(totals.amountPayable)}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-300 pt-5 text-sm text-slate-700">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between">
              <div>
                <div className="font-semibold">Authorized Signatory</div>
                <div>{COMPANY.signatory}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">Thank you for your business.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
