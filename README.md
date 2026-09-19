# fundingly.in — Indian Startup Funding Dashboard

Free, public, and serverless tracker for Indian startup funding rounds, aggregated and structured automatically.

🌐 **Live URL:** [https://fundingly.in](https://fundingly.in)

---

## ⚡ Architecture Overview

Fundingly operates as a **100% static, client-side web application** hosted on GitHub Pages:
- **No custom servers or backend databases** to maintain.
- Frontend dynamically fetches structured funding rounds via quarter-wise partitions (`data/manifest.json` -> `data/2026_q3.json`, etc.).
- Aggregations, weekly feed clustering, multi-dimensional filters, fuzzy search, and trends intelligence are computed dynamically client-side in vanilla JavaScript.

---

## 📂 Repository Structure

```
├── index.html            # Main dashboard web app
├── 404.html              # Custom 404 & domain-based deep link router
├── privacy-policy.html   # Privacy policy & compliance (AdSense & DPDP India)
├── terms.html            # Terms of Service & legal disclaimers
├── robots.txt            # Search crawler directives
├── sitemap.xml           # Canonical XML sitemap for SEO
├── ads.txt               # Google AdSense publisher verification
├── manifest.json         # PWA installable manifest
├── CNAME                 # Custom domain configuration (fundingly.in)
├── .nojekyll             # Bypasses Jekyll build pipeline for instant deploys
├── assets/               # Favicons, Apple Touch icons & OG share preview image
├── css/
│   └── styles.css        # Apple Design System tokenized stylesheet & dark mode
├── js/
│   └── app.js            # Frontend application logic, filters, and modals
└── data/
    ├── manifest.json     # Declares available quarters & active latest quarter
    ├── 2026_q3.json      # Q3 2026 funding rounds
    └── 2026_q2.json      # Q2 2026 historical funding rounds
```

---

## 🔗 Direct Company Domain Deep-Linking

Visiting `https://fundingly.in/{company_domain}` (e.g. `fundingly.in/factrika.com`):
1. **GitHub Pages Router (`404.html`)**: Extracts the domain and checks available quarters in `data/manifest.json`.
2. **Auto-Modal Display**: If the domain exists in the dataset, opens the dashboard and immediately pops open the deal intelligence memo for that exact company.
3. **Smart 404**: If no funding rounds exist for that domain, displays a personalized *"No recorded funding rounds found for domain 'xyz.com'"* message.

## 🚀 Running Locally

To run the dashboard locally for testing:

```bash
# Navigate into the repository folder
cd "Repo Files"

# Launch a lightweight local HTTP server
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 📊 Data Schema (`data/[year]_[quarter].json`)

Each funding round record contains:
- `company_name`: Name of startup
- `company_website`: Official website URL
- `industry` & `sub_industry`: Categorization tags
- `company_description`: Brief summary of products/services
- `year_founded`: Year startup was founded
- `business_model`: B2B, B2C, D2C, etc.
- `company_headquarters`: City / region
- `date_of_funding`: ISO date (`YYYY-MM-DD`)
- `funding_round`: Stage (`Pre-Seed`, `Seed`, `Series A`, `Series B`, `Growth`, `Debt`)
- `funding_amount_usd`: Number (in USD)
- `funded_by`: Syndicate / investors list
- `lead_investor`: Lead institutional investor
- `founders`: Founder names
- `source_url`: Verifiable news source or press release URL
