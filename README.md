# n8n Sales Report Tool

This project analyzes a CSV file with store sales data and sends each store a personalized email report.

## Setup

1. Clone this repo and install dependencies:

```bash
npm install
```

2. Add your environment variables to `.env`.

3. Put your CSV as `data/sample_sales.csv`.

4. Run the tool:

```bash
npm start
```

## Integration with n8n

You can set up an n8n workflow that runs this script on a schedule or when a new file is uploaded.
