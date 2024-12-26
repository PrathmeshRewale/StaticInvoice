/**
 * Author: Prathmesh Rewale
 * Website: https://prathmeshrewale.com
 * Email: hello@prathmeshrewale.com
 * 
 * Description: Static Invoice generater With PDF Download & Sqlite Database
 * 
 * Date Created: 26-12-2024
 * Last Modified: 26-12-2024
 */


const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

const db = new sqlite3.Database('invoices.db', (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
    }
  });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

db.run(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoiceNumber TEXT,
    companyName TEXT,
    customerName TEXT,
    totalAmount REAL,
    date TEXT
  )
`);

app.get('/invoices/:invoiceNumber', (req, res) => {
    const { invoiceNumber } = req.params;
    const filePath = path.join(__dirname, `Invoice_${invoiceNumber}.pdf`);

    console.log(filePath)
  
   
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');  
      res.download(filePath, (err) => {
        if (err) {
          console.error('Error downloading the file:', err);
        }
      });
    } else {
      res.status(404).send('Invoice not found');
    }
  });
  

app.get('/invoices', (req, res) => {
  db.all('SELECT * FROM invoices', (err, rows) => {
    if (err) {
      console.error('Error fetching invoices:', err);
      return res.status(500).send('Error fetching invoices');
    }
    res.json(rows); 
  });
});

app.post('/create-invoice', (req, res) => {
    const {
      companyName,
      companyAddress,
      companyPhone,
      customerName,
      customerMobile,
      invoiceNumber,
      date,
      items,
      totalAmount,
      paidAmount,
      footerNotes
    } = req.body;
  
    if (!companyName || !companyAddress || !companyPhone || !customerName || !customerMobile || !invoiceNumber || !date || !items || !totalAmount || !paidAmount) {
      return res.status(400).send('Missing required fields');
    }

    const doc = new PDFDocument({ margin: 50 });
    const fileName = `Invoice_${invoiceNumber}.pdf`;
    const filePath = path.join(__dirname, fileName);
  
    
      console.log("First: PDF generation finished.");

      db.run('INSERT INTO invoices (invoiceNumber, companyName, customerName, totalAmount, date) VALUES (?, ?, ?, ?, ?)', 
        [invoiceNumber, companyName, customerName, totalAmount, date], (err) => {
          if (err) {
            console.error('Error saving invoice to database:', err);
            return res.status(500).send('Error saving invoice to database');
          }
          console.log('Invoice added to the database');

          res.download(filePath, fileName, (err) => {
            if (err) {
              console.error('Error downloading the file:', err);
            } else {
              fs.unlinkSync(filePath);
            }
          });
        });
    

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(18).text(companyName, { align: 'center' });
    doc.fontSize(12).text(companyAddress, { align: 'center' });
    doc.text(`Phone: ${companyPhone}`, { align: 'center' });
    doc.moveDown();
  
    doc.text(`Date: ${date}`, { align: 'left' });
    doc.text(`Invoice No.: ${invoiceNumber}`, { align: 'left' });
    doc.moveDown();
  
    doc.text(`Bill To: ${customerName}`, { align: 'left' });
    doc.text(`Customer Mobile: ${customerMobile}`, { align: 'left' });
    doc.moveDown();
  
    const tableTop = doc.y + 10;
    doc.fontSize(10);
    doc.text('Qty', 50, tableTop);
    doc.text('Model', 100, tableTop);
    doc.text('IMEI/Serial', 250, tableTop);
    doc.text('Unit Price', 400, tableTop);
    doc.text('Total', 500, tableTop);
  
    let y = tableTop + 15;
    items.forEach((item) => {
      doc.text(item.quantity, 50, y);
      doc.text(item.model, 100, y);
      doc.text(item.imei, 250, y);
      doc.text(`₹${item.unitPrice.toFixed(2)}`, 400, y);
      doc.text(`₹${item.total.toFixed(2)}`, 500, y);
      y += 20;
    });
  
    doc.moveDown(2);
    doc.fontSize(12).text(`Total: ₹${totalAmount.toFixed(2)}`, { align: 'right' });
    doc.text(`Paid: ₹${paidAmount.toFixed(2)}`, { align: 'right' });
  
    if (footerNotes) {
      doc.moveDown();
      doc.fontSize(10).text(footerNotes, { align: 'left', oblique: true });
    }

    doc.end();
  });
  
  
app.get('/view-invoice', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'viewinvoice.html');
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
