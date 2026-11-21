# V.R Logistics and Brokering

The freight API runs in Python. The mobile-first English/Hindi browser interface is carried over from the original V.R Logistics release `9bebd9b`. It uses the same routes, form fields and reference numbers.

## Run on Netlify

1. In Netlify, import this GitHub repository as a project. Select the main branch and leave the base directory at the repository root. The included netlify.toml sets the build command, publish directory, functions directory and runtime files.
2. Before building, set BROKER_ADMIN_PASSWORD (at least 12 characters) and BROKER_SESSION_SECRET (at least 32 characters) as secret environment variables available to Functions. Use a password manager to generate and store these values.
3. Deploy and open /api/freight/health. A working installation returns status ok and configured true. Open Broker desk and sign in with the configured password.

A plain drag-and-drop upload of public/ serves the screens only. Use repository import to build the Python runtime and package the backend. Netlify runs a small JavaScript function that passes requests to bundled CPython via Pyodide. Python code in freight/ handles the business rules. Runtime files are installed at build time. Visitors do not download the Python interpreter. The Netlify adapter uses site-scoped Netlify Blobs. A new Netlify project starts with an empty database. This repository contains no customer records or uploaded files.

## Run locally with native Python

Use Python 3.11 or newer. Create a virtual environment and install requirements.txt. Set the two environment variables above, then run:

```sh
python app.py
```

Open http://localhost:3000. PORT overrides the port. BROKER_DATA_DIR selects the private SQLite storage directory (default data/). Native records and uploaded documents are saved together in SQLite transactions. This local database is independent of Netlify.

## Features

- Public truck and load boards, owner submissions, customer requirements, load applications and private contact details.
- Broker login, dashboard, application review, matching and ranking, quotations, sharing, booking confirmation and JSON export.
- Private driver links, ordered trip stages, payment and halt requests, broker review, POD evidence and private file download.
- Separate customer receipts and trucker payments, balance checks and settlement before closing.
- Responsive forms, English/Hindi labels, mobile shortcuts and laptop broker controls.

## Check the Netlify runtime locally

```sh
npm ci
npm run build
npm test
```

The integration test runs a full booking through the actual Netlify handler and its Python interpreter, using an in-memory storage double. It exercises owner applications, private broker access, quotation acceptance, driver requests, document upload/download, settlement, closure and export. The Netlify service itself requires verification after deployment. GitHub is the source of this build; the original production site is managed separately.
