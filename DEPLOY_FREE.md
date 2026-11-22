# Setu Logistics — free backend hosting (pilot only)

This repository already contains the **Java 21 Spring Boot API**, a **Dockerfile** and **PostgreSQL schema**. The frontend is hosted separately by Netlify at **https://setusupplychain.in**.

This guide uses **Render Free (Java Docker service)** + **Neon Free (PostgreSQL)**. Unlike Render's temporary Free Postgres database, the Neon Free database has no fixed 30-day expiry, subject to its service limits and account terms.

> **Not production-grade:** Render Free sleeps after ~15 minutes idle; the first request after sleep can take ~1 minute and may fail through Netlify's proxy. A Free instance can restart and is resource-limited (512 MB RAM, fractional CPU). Do not depend on this stack for time-critical dispatch, payment operations, or storage of critical documents without verified backups and a paid reliability plan.

## 1. Create the free Neon database

1. Open https://console.neon.tech/ and create a **Free** project named, for example, `setu-freight`.
2. Select a region reasonably close to Render's available deployment region.
3. In **Connect**, note the hostname, database name, role/user and generated password. Store the password securely.
4. The backend expects **separate** Java JDBC environment variables:
   - `DATABASE_URL` — `jdbc:postgresql://<NEON-HOST>/<DATABASE-NAME>?sslmode=require` (no password embedded).
   - `DATABASE_USER` — Neon database user/role from your Connect panel.
   - `DATABASE_PASSWORD` — Neon database password from your Connect panel.
   
   If Neon displays a `postgresql://user:password@host/database?sslmode=require` connection string, **do not paste it unchanged** into `DATABASE_URL`. Convert it to the JDBC form above, and set user/password in their own variables. A Neon pooled hostname (`-pooler`) is supported; the Spring app has a small pool (max 3 connections).

## 2. Deploy the Java API at no charge on Render

1. Open https://dashboard.render.com/ and create a free account.
2. Choose **New → Blueprint**, connect GitHub, and select `rajatupadhyay896/vrlogisticsandbrokering`.
3. Render will read the checked-in `render.yaml`. Confirm that service `setu-freight-backend` uses **Free** (not Starter or paid) and **Docker**.
4. Supply the four private environment variables when prompted:
   - `DATABASE_URL` (JDBC URL from step 1)
   - `DATABASE_USER`
   - `DATABASE_PASSWORD`
   - `BROKER_ADMIN_PASSWORD` (a fresh, unique password of **at least 12 characters**, not your Neon password)
5. The blueprint already sets:
   - `PORT=8080`
   - `PUBLIC_ORIGIN=https://setusupplychain.in`
   - Java memory limits suitable for a small 512 MB instance.
6. Deploy and obtain your Render service's actual HTTPS URL, of the form `https://<your-assigned-host>.onrender.com`.

**Verify first:** open `https://<your-assigned-host>.onrender.com/api/freight/health`. It should return JSON containing `"status":"ok"` and `"configured":true`. If the deploy fails, inspect Render's **Logs**. Never send screenshots containing passwords or raw database connection strings.

## 3. Connect the existing Netlify frontend to the backend

1. Open https://app.netlify.com/ and select the site hosting `setusupplychain.in`.
2. Go to **Project configuration / Site configuration → Environment variables**.
3. Add this **build-time** environment variable:
   - **Key:** `FREIGHT_API_ORIGIN`
   - **Value:** your exact Render HTTPS origin, e.g. `https://setu-freight-backend.onrender.com` **if and only if Render actually assigned that hostname**.
   - Do not include a trailing slash, `/api/freight` or any credentials.
4. **Trigger a fresh production deploy** on Netlify after adding the variable. Vite's existing build config automatically emits `frontend/dist/_redirects` that forwards requests from `/api/freight/*` to the HTTPS Render backend while the browser stays on `setusupplychain.in`.
5. **Verify via the live domain:** `https://setusupplychain.in/api/freight/health` should return the same JSON as the backend. It must **not** return Netlify's HTML 404 page.
6. Test one **disposable** load and one **disposable** truck submission, Broker Desk login and a complete trip, including file upload/download, before using genuine customer data.

**Do not create a new GoDaddy DNS record, change Netlify nameservers, or create an API subdomain for this setup.** Netlify proxies the API under your existing domain.

## 4. Deployment and security notes

- GitHub pushes to `main` can trigger the Render Docker deploy and Netlify frontend deploy independently **after both Git integrations are connected**.
- `BROKER_ADMIN_PASSWORD` belongs only in Render's private environment. **Never** commit it to GitHub or copy it into Netlify's frontend variables.
- The backend protects the Broker Desk with an HTTP-only cookie and uses `PUBLIC_ORIGIN` for accepted browser requests. Keep `PUBLIC_ORIGIN` set to the exact primary site URL (`https://setusupplychain.in`).
- The repository's `Dockerfile` **includes the frontend** inside the Java container, but Netlify continues to serve the public website. The Render service is primarily used for API endpoints.
- Neon Free has compute, storage and transfer quotas (as of Nov 2026, approximately **1 GB of storage per project** and **100 compute-unit hours per project per month**; confirm the terms at signup). Uploaded documents may consume the free storage quickly.
- Render Free has **750 instance hours per workspace per month**, a **512 MB** container, and sleep/cold-start delays. It is appropriate for a small proof of concept, **not a high-availability production logistics system**.
- Render's Free PostgreSQL database expires after 30 days; that is why this guide uses Neon instead.
- Schedule and test exports/backups before collecting real operational documents. A free database does **not** remove your responsibility to maintain recoverable copies.
- A public-facing freight brokerage with customers, confidential rates, identity data, POD and payment records should move to a reliable paid backend with role-based accounts, backups, monitoring and retention policies before scaling.

### Troubleshooting

| Symptom | Verify |
|---|---|
| Render deploy fails | Render logs, JDK21 Docker build, `DATABASE_URL` starts with `jdbc:postgresql://`, credentials and Neon SSL |
| Backend health returns configured false | `BROKER_ADMIN_PASSWORD` missing or fewer than 12 characters |
| Netlify API returns 404 HTML | `FREIGHT_API_ORIGIN` not set at build time, stale deploy, missing generated `_redirects` |
| 503, 502 or long loading on first visit | Render Free asleep, waking, exhausted resources or Neon cold start |
| Login rejected from custom domain | `PUBLIC_ORIGIN` mismatch, wrong password, or cookie/proxy configuration |
| Data disappears after deployment | Check which Neon project/branch Render uses and whether a new database was connected |
