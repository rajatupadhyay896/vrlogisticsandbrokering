# Setu Logistics

English and Hindi freight brokerage for truck owners, customers, drivers and the broker desk. The React and TypeScript frontend is in frontend/. The Java 21 Spring Boot API is in backend/. PostgreSQL stores booking records, private sessions and uploaded documents.

## Start the complete app

Set DATABASE_PASSWORD and BROKER_ADMIN_PASSWORD in a local .env file. Choose a broker password of at least 12 characters. Run:

```sh
docker compose up --build
```

Open http://localhost:8080. The application serves both the UI and the API. PostgreSQL uses a persistent volume. A fresh installation starts with empty boards. A new database requires a separate migration to use any existing customer records and attachments.

## Development

Start PostgreSQL and set DATABASE_URL (a JDBC URL), DATABASE_USER, DATABASE_PASSWORD and BROKER_ADMIN_PASSWORD. From backend/ run mvn spring-boot:run with JDK 21. From the repository root run npm ci and npm run dev with Node 22. The Vite development server proxies /api/freight to the local Spring Boot service on port 8080.

Run npm run build to type-check and build the frontend. To exercise the freight lifecycle against a disposable, empty local database, start its Spring Boot instance and run:

```sh
TEST_API=http://127.0.0.1:8080 node --test tests/booking.test.mjs
```

The test reads BROKER_ADMIN_PASSWORD from the environment and creates sample records, payments and a document.

## Brokerage workflows

Transporters can look up a route and request a quotation using a truck listing. Truck owners can reverse the route to search for a return load and apply. Brokers can mark a truck’s vehicle document as reviewed after checking the attached evidence, and withdraw that review.

From a trip in the broker desk, create a customer tracking link and share it privately. Anyone holding that link can read the route, shipment milestones and latest driver-reported location. Drivers use a separate private link for check-ins, document uploads and payment requests.

## Hosting

The Dockerfile packages the UI and API together for a Java-capable host. To publish only the frontend on Netlify, import this repository and set FREIGHT_API_ORIGIN to the HTTPS origin of your running Spring Boot API before building. The build generates a same-origin API rewrite. Set PUBLIC_ORIGIN on the backend to the exact public frontend origin (for example https://your-site.netlify.app). Configure the JDBC connection and broker password on the backend. Netlify publishes frontend/dist. Uploading frontend assets alone does not run Java or provide a database.

## Photography

Ashok Leyland e-Comet 2012, by SnapMeUp, from Wikimedia Commons (CC0). The landing page keeps all booking text separate from the photograph.
https://commons.wikimedia.org/wiki/File:Ashok_Leyland_e-Comet_2012.JPG
