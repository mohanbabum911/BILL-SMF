# SMF GST Invoice Application

A professional GST invoice and tax billing web application for SMF, a fabrication and engineering works business in Peenya 2nd Stage, Bengaluru, Karnataka, India.

## Features

- GSTIN verification with backend API route and mock fallback
- Customer database and service database
- Invoice creation, editing, deletion, search, and dashboard
- GST tax calculation with CGST/SGST/IGST logic
- PDF export and Excel export
- WhatsApp sharing support
- Responsive A4 invoice UI
- SQLite database for local development

## Tech Stack

- React + TypeScript + Vite + Tailwind CSS
- Node.js + Express
- SQLite (development-ready)
- jsPDF + autoTable
- xlsx

## Project Structure

- client/: React frontend
- server/: Express backend API + SQLite schema
- docs/: API docs and setup notes

## Quick Start

1. Install [Node.js](https://nodejs.org/) and npm.
2. Install dependencies from the project root:
   ```sh
   npm install
   ```
3. Copy `.env.example` to `.env` in the project root. In PowerShell, run:
   ```powershell
   Copy-Item .env.example .env
   ```
4. Start the frontend and backend:
   ```sh
   npm run dev
   ```
5. Open the frontend at http://localhost:5173. The API runs at http://localhost:5000/api.

## Deploy to GitHub Pages

The GitHub Pages workflow builds and publishes the React frontend when changes are pushed to `main`. In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. After the workflow succeeds, open:

https://mohanbabum911.github.io/SRI-MUNESHWARA-FABRICATION-BILLING-APP/

GitHub Pages hosts only static files; it does not run the Express/SQLite backend. To use customer and invoice storage or GSTIN verification online, deploy the `server/` app to a Node.js host with a persistent database, then add a repository Actions variable named `VITE_API_BASE_URL` with the backend API URL (for example, `https://your-backend.example.com/api`). Push a new commit to rebuild the frontend with that URL. Do not put GST API credentials in this variable; configure them on the backend host.

Without a hosted backend, the page can load, but API-backed features will not work online. For local use, follow the Quick Start instructions above.

## Upload to GitHub

Create an empty repository on GitHub, then run these commands from the project root (replace the URL with your repository URL):

```sh
git init
git add .
git status
```

Check the staged files before continuing. `.gitignore` excludes environment files, dependencies, build output, the local SQLite database, and the tax PDF. Do not upload private business or customer data.

```sh
git commit -m "Add SMF GST invoice application"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

## Company Details

- Company Name: SMF
- Business: Fabrication & Engineering Works
- Location: Peenya 2nd Stage, Bengaluru, Karnataka, India

## GST API Configuration

Set the following variables in your `.env` file:

- GST_API_URL
- GST_API_KEY

If these are not set, the app automatically uses a mock GST verification service so development can continue without exposing credentials.

## GSTIN Verification

The backend exposes a protected route:

- POST /api/gst/verify

Request body:

```json
{
  "gstin": "29ABCDE1234F1Z5"
}
```

The service validates format and then either:

- calls the configured external API when credentials are present
- returns a mock payload for local development when not configured

This keeps credentials on the backend and never exposes them to the browser.

## Invoice PDF

Use the PDF button in the app to export the current invoice as a PDF.

## License

For internal business use.
