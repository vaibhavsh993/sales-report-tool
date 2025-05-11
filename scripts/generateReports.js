import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const inputFilePath = path.resolve('data', 'sample_sales.csv');

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const generateChartUrl = async (labels, data) => {
  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Product Sales (%)',
        data
      }]
    }
  };

  const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
  return url;
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
};

const analyzeAndSendReports = async () => {
  const data = await parseCSV(inputFilePath);
  console.log('Parsed CSV Data:', data); // Log the parsed data for debugging

  const stores = data;

  for (const store of stores) {
    // Accessing the correct keys from the CSV
    const { shopname, 'Total Sales': TotalSales, 'Store manager id': Email, 'Product 1 Sales': P1, 'Product 2 Sales': P2, 'Product 3 Sales': P3, 'Other Product': Other, 'Female buyers': Female, 'Discount offered': Discount } = store;

    // Validate email
    if (!Email || !/\S+@\S+\.\S+/.test(Email)) {
      console.log(`Skipping store ${shopname} due to invalid email: ${Email}`);
      continue; // Skip this store if the email is invalid
    }

    const male = 100 - parseFloat(Female.replace('%', ''));
    const products = {
      'Product 1': parseFloat(P1.replace('%', '')),
      'Product 2': parseFloat(P2.replace('%', '')),
      'Product 3': parseFloat(P3.replace('%', '')),
      'Other': parseFloat(Other.replace('%', ''))
    };

    const chartUrl = await generateChartUrl(Object.keys(products), Object.values(products));

    const bestProductFemale = Object.entries(products).reduce((a, b) => a[1] * parseFloat(Female) > b[1] * parseFloat(Female) ? a : b)[0];
    const bestProductMale = Object.entries(products).reduce((a, b) => a[1] * male > b[1] * male ? a : b)[0];

    const html = `
      <h2>Store Report: ${shopname}</h2>
      <p><strong>Total Sales:</strong> ${TotalSales}</p>
      <ul>
        <li><strong>Product Needing Boost:</strong> ${Object.entries(products).reduce((a, b) => a[1] < b[1] ? a : b)[0]}</li>
        <li><strong>Focus Gender:</strong> ${parseFloat(Female) > 50 ? 'Female' : 'Male'}</li>
        <li><strong>Discount Effective:</strong> ${parseFloat(Discount) > 10 ? 'Yes' : 'Not Significantly'}</li>
        <li><strong>Best Product for Females:</strong> ${bestProductFemale}</li>
        <li><strong>Best Product for Males:</strong> ${bestProductMale}</li>
      </ul>
      <img src="${chartUrl}" alt="Product Sales Chart" />
    `;

    // Send email
    await sendEmail({
      to: Email,
      subject: `Sales Report for ${shopname}`,
      html
    });
  }
};

analyzeAndSendReports().catch((error) => {
  console.error('An error occurred during report generation:', error);
});
