/**
 * ============================================================================
 * FUNDINGLY.IN — STATIC DEAL & COMPANY PAGE GENERATOR (SEO & ADSENSE SUITE)
 * ============================================================================
 * Target: Generates 100% pre-rendered, static HTML pages for every startup deal
 * in the Fundingly.in intelligence dataset, complete with:
 * - Dynamic SEO meta tags, title tags, OpenGraph & Twitter Cards
 * - Schema.org JSON-LD Structured Data (Organization, InvestmentOrGrant, BreadcrumbList)
 * - Compliant Google AdSense responsive ad slots
 * - Apple-grade responsive design & Dark/Light mode support
 * - Automatic sitemap.xml generation
 * - 100% $0 serverless deployment on GitHub Pages
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const COMPANY_DIR = path.join(REPO_ROOT, 'company');
const SITEMAP_PATH = path.join(REPO_ROOT, 'sitemap.xml');

// Helper: Ensure directory exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Helper: Clean domain extraction
function extractDomain(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        const cleanUrl = url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim();
        const parsed = new URL(cleanUrl);
        return parsed.hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {
        return '';
    }
}

// Helper: Generate clean slug from string
function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') || 'startup';
}

// Helper: Format USD currency
function formatUSD(amount) {
    if (!amount || isNaN(amount) || amount === 0) return 'Undisclosed';
    const num = Number(amount);
    if (num >= 1000000000) return '$' + (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
    return '$' + num.toLocaleString('en-US');
}

// Helper: Format INR currency approximate conversion (assumes 1 USD ~ 83.5 INR)
function formatINR(amountUsd) {
    if (!amountUsd || isNaN(amountUsd) || amountUsd === 0) return '';
    const inr = Number(amountUsd) * 83.5;
    if (inr >= 10000000) { // 1 Crore = 10,000,000
        const cr = (inr / 10000000).toFixed(1).replace(/\.0$/, '');
        return `₹${cr} Cr`;
    }
    if (inr >= 100000) { // 1 Lakh = 100,000
        const lakh = (inr / 100000).toFixed(1).replace(/\.0$/, '');
        return `₹${lakh} Lakh`;
    }
    return `₹${Math.round(inr).toLocaleString('en-IN')}`;
}

// Helper: Format Date
function formatFundingDateDisplay(dateStr) {
    if (!dateStr) return 'Recent';
    try {
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
            const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
}

// Helper: Determine Stage CSS Class
function getStageBadgeClass(stage) {
    if (!stage) return 'stage-other';
    const s = String(stage).toLowerCase().trim();
    if (s.includes('pre-seed') || s.includes('pre seed') || s.includes('angel') || s.includes('grant')) return 'stage-pre-seed';
    if (s.includes('seed')) return 'stage-seed';
    if (s.includes('pre-series a') || s.includes('series a') || s.includes('venture')) return 'stage-series-a';
    if (s.includes('series b')) return 'stage-series-b';
    if (s.includes('series c') || s.includes('series d') || s.includes('series e') || s.includes('growth') || s.includes('private equity')) return 'stage-growth';
    if (s.includes('debt') || s.includes('bridge') || s.includes('credit') || s.includes('convertible')) return 'stage-debt';
    return 'stage-other';
}

// Helper: Monogram Generator
function getMonogram(name) {
    if (!name) return '•';
    const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return cleaned.substring(0, 2).toUpperCase() || '•';
}

// Helper: Deterministic Color for Avatar
function getMonogramStyle(name) {
    const palettes = [
        { bg: '#EBF5FF', color: '#0066CC', border: '#B8DBFF' },
        { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
        { bg: '#FAF5FF', color: '#9333EA', border: '#E9D5FF' },
        { bg: '#FFF7ED', color: '#EA580C', border: '#FFEDD5' },
        { bg: '#FDF2F8', color: '#DB2777', border: '#FCE7F3' },
        { bg: '#F0FDFA', color: '#0D9488', border: '#CCFBF1' },
        { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' }
    ];
    let hash = 0;
    const str = String(name || '');
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash) % palettes.length;
    return palettes[idx];
}

// Helper: HTML Escaping
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Helper: Clean Sources Link List
function parseSourcesList(sources) {
    if (!sources) return [];
    const list = (Array.isArray(sources) ? sources : String(sources).split(/[,|\n]/))
        .map(s => s.trim())
        .filter(Boolean);
    return list.map(url => {
        let clean = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
        let host = clean.split('/')[0];
        return { url, host };
    });
}

// Helper: Format Person List with Google/LinkedIn Search
function renderFoundersMarkup(foundersStr, companyName) {
    if (!foundersStr) return '<span class="val-empty">Undisclosed</span>';
    const names = foundersStr.split(/[,&|]/).map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return '<span class="val-empty">Undisclosed</span>';

    return names.map(name => {
        const query = `${name} ${companyName} founder LinkedIn`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        return `<span class="founder-tag">
            <span class="material-symbols-outlined founder-icon">person</span>
            <span class="founder-name">${escapeHtml(name)}</span>
            <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="founder-search-link" title="Search ${escapeHtml(name)} on Google / LinkedIn" aria-label="Search ${escapeHtml(name)} on Google">
                <span class="material-symbols-outlined">search</span>
            </a>
        </span>`;
    }).join(' ');
}

// Main Build Function
function buildStaticDealPages() {
    console.log('🚀 Starting Fundingly.in Static Deal Page Generation...');

    if (!fs.existsSync(DATA_DIR)) {
        console.error('❌ Data directory does not exist:', DATA_DIR);
        process.exit(1);
    }

    const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('20') && f.endsWith('.json') && !f.includes('manifest'));
    console.log(`📁 Found ${files.length} quarterly data files:`, files.join(', '));

    const allDeals = [];
    files.forEach(file => {
        try {
            const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
            if (!raw || raw.trim() === '' || raw.trim() === '[]') return;
            const data = JSON.parse(raw);
            const deals = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : []);
            allDeals.push(...deals);
        } catch (e) {
            console.warn(`⚠️ Error reading ${file}:`, e.message);
        }
    });

    console.log(`📊 Loaded ${allDeals.length} total deal records.`);

    // Group deals by company domain (or name if no domain)
    const companyMap = new Map();
    allDeals.forEach(deal => {
        if (!deal || !deal.company_name) return;
        const domain = extractDomain(deal.company_website) || slugify(deal.company_name);
        if (!companyMap.has(domain)) {
            companyMap.set(domain, {
                domain: domain,
                company_name: deal.company_name,
                company_website: deal.company_website || '',
                deals: []
            });
        }
        companyMap.get(domain).deals.push(deal);
    });

    console.log(`🏢 Grouped into ${companyMap.size} unique company dossiers.`);

    ensureDir(COMPANY_DIR);

    const generatedUrls = [];
    const nowISO = new Date().toISOString().split('T')[0];

    // Generate each company static page
    for (const [domainKey, compData] of companyMap.entries()) {
        // Sort deals descending by date
        compData.deals.sort((a, b) => new Date(b.date_of_funding || 0) - new Date(a.date_of_funding || 0));
        const latestDeal = compData.deals[0];

        // Total raised calculation
        const totalRaisedUsd = compData.deals.reduce((sum, d) => sum + (Number(d.funding_amount_usd) || 0), 0);

        // Find related deals in same industry
        const relatedDeals = allDeals
            .filter(d => d.company_name !== latestDeal.company_name && d.industry && d.industry === latestDeal.industry)
            .slice(0, 4);

        const htmlContent = generateCompanyPageHtml(compData, latestDeal, totalRaisedUsd, relatedDeals);

        // Output to company/<domain>/index.html
        const companyFolder = path.join(COMPANY_DIR, domainKey);
        ensureDir(companyFolder);
        fs.writeFileSync(path.join(companyFolder, 'index.html'), htmlContent, 'utf8');

        generatedUrls.push({
            url: `https://fundingly.in/company/${domainKey}/`,
            lastmod: latestDeal.date_of_funding ? latestDeal.date_of_funding.split('T')[0] : nowISO,
            priority: '0.8'
        });
    }

    // Generate updated sitemap.xml
    generateSitemap(generatedUrls, nowISO);

    console.log(`✅ Successfully generated ${companyMap.size} static company dossier pages & updated sitemap.xml!`);
}

// Generate HTML for a single company
function generateCompanyPageHtml(compData, deal, totalRaisedUsd, relatedDeals) {
    const companyName = deal.company_name || 'Startup';
    const domain = compData.domain;
    const roundName = deal.funding_round || 'Funding Round';
    const amountUsdFormatted = formatUSD(deal.funding_amount_usd);
    const amountInrFormatted = formatINR(deal.funding_amount_usd);
    const dateFormatted = formatFundingDateDisplay(deal.date_of_funding);
    const stageClass = getStageBadgeClass(deal.funding_round);
    const mono = getMonogram(companyName);
    const monoStyle = getMonogramStyle(companyName);
    const sourcesList = parseSourcesList(deal.sources || deal.source_url);

    // SEO Dynamic Content
    const pageTitle = `${companyName} Raises ${amountUsdFormatted} in ${roundName} | Fundingly.in`;
    const pageDescription = `${companyName} (${deal.company_headquarters || 'India'}) raised ${amountUsdFormatted}${amountInrFormatted ? ' (' + amountInrFormatted + ')' : ''} in ${roundName} led by ${deal.lead_investor || 'top investors'}. Explore complete cap table, founders, and intelligence dossier on Fundingly.in.`;
    const canonicalUrl = `https://fundingly.in/company/${domain}/`;

    // JSON-LD Schemas
    const foundersArray = (deal.founders || '')
        .split(/[,&|]/)
        .map(f => f.trim())
        .filter(Boolean)
        .map(name => ({ "@type": "Person", "name": name }));

    const investorsArray = (deal.investors || deal.funded_by || '')
        .split(/[,|]/)
        .map(i => i.trim())
        .filter(Boolean)
        .map(name => ({ "@type": "Organization", "name": name }));

    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${canonicalUrl}#organization`,
                "name": companyName,
                "url": deal.company_website || canonicalUrl,
                "foundingDate": deal.year_founded ? String(deal.year_founded) : undefined,
                "description": deal.company_description || undefined,
                "address": deal.company_headquarters ? {
                    "@type": "PostalAddress",
                    "addressLocality": deal.company_headquarters,
                    "addressCountry": "IN"
                } : undefined,
                "founders": foundersArray.length > 0 ? foundersArray : undefined
            },
            {
                "@type": "InvestmentOrGrant",
                "@id": `${canonicalUrl}#funding-round`,
                "name": `${companyName} ${roundName} Funding`,
                "description": `${companyName} raised ${amountUsdFormatted} in ${roundName}`,
                "amount": deal.funding_amount_usd ? {
                    "@type": "MonetaryAmount",
                    "currency": "USD",
                    "value": deal.funding_amount_usd
                } : undefined,
                "funder": investorsArray.length > 0 ? investorsArray : undefined,
                "recipient": {
                    "@type": "Organization",
                    "name": companyName,
                    "url": deal.company_website || canonicalUrl
                }
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://fundingly.in/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": deal.industry || "Startups",
                        "item": `https://fundingly.in/?industry=${encodeURIComponent(deal.industry || '')}`
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": companyName,
                        "item": canonicalUrl
                    }
                ]
            }
        ]
    };

    // Clean JSON-LD string
    const jsonLdString = JSON.stringify(structuredData, null, 2);

    return `<!DOCTYPE html>
<html lang="en">

<head>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-M5MPWNCX');</script>
    <!-- End Google Tag Manager -->

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDescription)}">
    <link rel="canonical" href="${canonicalUrl}">
    <link rel="icon" type="image/png" href="../../assets/fundingly_hello.png">
    <link rel="apple-touch-icon" href="../../assets/fundingly_hello.png">

    <!-- Open Graph & Social Cards -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Fundingly.in">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="${escapeHtml(pageDescription)}">
    <meta property="og:image" content="https://fundingly.in/assets/og-preview.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
    <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
    <meta name="twitter:image" content="https://fundingly.in/assets/og-preview.png">

    <!-- Google AdSense Script (Placeholder ready for Publisher ID) -->
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000" crossorigin="anonymous"></script>

    <!-- Structured Data (JSON-LD) for Google Rich Snippets -->
    <script type="application/ld+json">
${jsonLdString}
    </script>

    <!-- Typography & Material Symbols -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400,0,0" rel="stylesheet" />
    
    <link rel="stylesheet" href="../../css/styles.css">

    <style>
        .dossier-wrapper {
            max-width: 920px;
            margin: 32px auto 80px auto;
            padding: 0 20px;
        }

        .breadcrumb-nav {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--color-text-tertiary);
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .breadcrumb-nav a {
            color: var(--color-text-secondary);
            text-decoration: none;
            transition: color 0.15s ease;
        }

        .breadcrumb-nav a:hover {
            color: var(--color-primary);
        }

        .dossier-hero-card {
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-sheet);
            padding: 36px 36px 28px 36px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.03);
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
        }

        .dossier-hero-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .dossier-brand-wrap {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .dossier-avatar-box {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 22px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            flex-shrink: 0;
        }

        .dossier-title-area h1 {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.025em;
            color: var(--color-text-primary);
            margin: 0 0 6px 0;
            line-height: 1.2;
        }

        .dossier-subtitle {
            font-size: 14px;
            color: var(--color-text-secondary);
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .dossier-hero-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-card);
            padding: 20px;
            margin-top: 24px;
        }

        .hero-metric-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .hero-metric-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .hero-metric-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--color-text-primary);
            letter-spacing: -0.02em;
        }

        .hero-metric-sub {
            font-size: 13px;
            color: var(--color-text-secondary);
            font-weight: 500;
        }

        .dossier-actions-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid var(--color-hairline);
            flex-wrap: wrap;
        }

        .action-pill-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-pill);
            color: var(--color-text-primary);
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .action-pill-btn:hover {
            background: var(--color-surface-tertiary);
            border-color: var(--color-border);
            transform: translateY(-1px);
        }

        .action-pill-btn.primary {
            background: var(--color-primary);
            color: #ffffff;
            border-color: var(--color-primary);
        }

        .action-pill-btn.primary:hover {
            background: var(--color-primary-hover);
        }

        /* AdSense Blocks */
        .ad-container-wrapper {
            margin: 28px 0;
            background: var(--color-surface-secondary);
            border: 1px dashed var(--color-hairline);
            border-radius: var(--radius-card);
            padding: 16px;
            text-align: center;
            overflow: hidden;
        }

        .ad-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--color-text-tertiary);
            margin-bottom: 8px;
        }

        /* Dossier Sections */
        .dossier-section {
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-sheet);
            padding: 28px 32px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-sm);
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 18px;
            border-bottom: 1px solid var(--color-hairline);
            padding-bottom: 12px;
        }

        .section-header h2 {
            font-size: 18px;
            font-weight: 600;
            color: var(--color-text-primary);
            margin: 0;
            letter-spacing: -0.01em;
        }

        .section-header .material-symbols-outlined {
            color: var(--color-primary);
            font-size: 20px;
        }

        .dossier-body-text {
            font-size: 15px;
            line-height: 1.7;
            color: var(--color-text-secondary);
            margin: 0 0 16px 0;
        }

        .dossier-body-text:last-child {
            margin-bottom: 0;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px 24px;
        }

        .info-cell {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .info-cell.full-width {
            grid-column: span 2;
        }

        .info-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }

        .info-value {
            font-size: 14px;
            font-weight: 500;
            color: var(--color-text-primary);
            line-height: 1.5;
        }

        .info-value.highlight {
            color: var(--color-primary);
            font-weight: 600;
        }

        /* Founder Tags */
        .founder-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-pill);
            font-size: 13px;
            font-weight: 500;
            margin: 0 6px 6px 0;
        }

        .founder-icon {
            font-size: 16px;
            color: var(--color-primary);
        }

        .founder-search-link {
            color: var(--color-text-tertiary);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            margin-left: 2px;
            transition: color 0.15s ease;
        }

        .founder-search-link:hover {
            color: var(--color-primary);
        }

        .founder-search-link .material-symbols-outlined {
            font-size: 14px;
        }

        /* Related Deals Grid */
        .related-deals-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        .related-card {
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-card);
            padding: 16px;
            text-decoration: none;
            color: inherit;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: all 0.15s ease;
        }

        .related-card:hover {
            background: var(--color-surface-tertiary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-sm);
        }

        .related-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .related-name {
            font-weight: 600;
            font-size: 15px;
            color: var(--color-text-primary);
        }

        .related-amount {
            font-size: 16px;
            font-weight: 700;
            color: var(--color-primary);
            margin: 4px 0;
        }

        .related-meta {
            font-size: 12px;
            color: var(--color-text-tertiary);
        }

        @media (max-width: 640px) {
            .dossier-hero-card {
                padding: 24px 20px;
            }
            .dossier-section {
                padding: 20px 18px;
            }
            .info-grid {
                grid-template-columns: 1fr;
            }
            .info-cell.full-width {
                grid-column: span 1;
            }
            .hero-metric-value {
                font-size: 20px;
            }
        }
    </style>
</head>

<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M5MPWNCX"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->

    <!-- Navigation Header (Frosted Glass) -->
    <header class="app-header" role="banner">
        <div class="header-left">
            <a href="../../" class="brand-title" style="text-decoration: none; color: inherit;">
                <img src="../../assets/fundingly_logo.png" alt="Fundingly.in" class="brand-logo" width="46" height="46">
                <span>Fundingly.in</span>
            </a>
        </div>
        <div class="nav-controls">
            <a href="../../" class="btn-nav-about" style="text-decoration: none;">
                <span class="material-symbols-outlined">dashboard</span>
                <span>Live Feed</span>
            </a>
            <a href="../../founders-note/" class="btn-nav-about" style="text-decoration: none;">
                <span class="material-symbols-outlined">edit_note</span>
                <span>Founder's Note</span>
            </a>
            <button id="themeToggleBtn" class="btn-theme-toggle" aria-label="Toggle Color Theme" title="Switch Theme">
                <span class="material-symbols-outlined" id="themeIcon">dark_mode</span>
            </button>
        </div>
    </header>

    <main class="dossier-wrapper" role="main">
        <!-- Breadcrumbs -->
        <nav class="breadcrumb-nav" aria-label="Breadcrumbs">
            <a href="../../">Home</a>
            <span>›</span>
            <a href="../../?industry=${encodeURIComponent(deal.industry || '')}">${escapeHtml(deal.industry || 'Startups')}</a>
            <span>›</span>
            <span style="color: var(--color-text-primary); font-weight: 600;">${escapeHtml(companyName)}</span>
        </nav>

        <!-- Hero Card -->
        <article class="dossier-hero-card">
            <div class="dossier-hero-header">
                <div class="dossier-brand-wrap">
                    <div class="dossier-avatar-box" style="background: ${monoStyle.bg}; color: ${monoStyle.color}; border: 1px solid ${monoStyle.border};">
                        ${escapeHtml(mono)}
                    </div>
                    <div class="dossier-title-area">
                        <h1>${escapeHtml(companyName)}</h1>
                        <div class="dossier-subtitle">
                            <span>${escapeHtml(deal.industry || 'Tech')}</span>
                            ${deal.sub_industry ? `<span>•</span><span>${escapeHtml(deal.sub_industry)}</span>` : ''}
                            ${deal.company_headquarters ? `<span>•</span><span>${escapeHtml(deal.company_headquarters)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="dossier-badge-wrap">
                    <span class="badge-round ${stageClass}" style="font-size: 13px; padding: 6px 14px;">
                        ${escapeHtml(roundName)}
                    </span>
                </div>
            </div>

            <!-- Key Deal Metrics Grid -->
            <div class="dossier-hero-metrics">
                <div class="hero-metric-item">
                    <span class="hero-metric-label">Amount Raised</span>
                    <span class="hero-metric-value">${escapeHtml(amountUsdFormatted)}</span>
                    ${amountInrFormatted ? `<span class="hero-metric-sub">~ ${escapeHtml(amountInrFormatted)}</span>` : ''}
                </div>
                <div class="hero-metric-item">
                    <span class="hero-metric-label">Funding Date</span>
                    <span class="hero-metric-value" style="font-size: 18px;">${escapeHtml(dateFormatted)}</span>
                    <span class="hero-metric-sub">${escapeHtml(deal.funding_type || 'Equity Round')}</span>
                </div>
                <div class="hero-metric-item">
                    <span class="hero-metric-label">Lead Investor</span>
                    <span class="hero-metric-value" style="font-size: 18px; color: var(--color-primary);">${escapeHtml(deal.lead_investor || 'Undisclosed')}</span>
                    <span class="hero-metric-sub">${deal.investor_count ? escapeHtml(deal.investor_count) + ' Participating' : 'Venture Round'}</span>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="dossier-actions-bar">
                ${deal.company_website ? `
                    <a href="${encodeURI(deal.company_website)}" target="_blank" rel="noopener noreferrer" class="action-pill-btn primary">
                        <span class="material-symbols-outlined" style="font-size: 16px;">language</span>
                        <span>Visit ${escapeHtml(domain)}</span>
                        <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
                    </a>
                ` : ''}
                <button type="button" class="action-pill-btn" onclick="copyDossierMemo()">
                    <span class="material-symbols-outlined" style="font-size: 16px;" id="memoIcon">content_copy</span>
                    <span id="memoText">Copy Deal Memo</span>
                </button>
                <button type="button" class="action-pill-btn" onclick="shareDossierPage()">
                    <span class="material-symbols-outlined" style="font-size: 16px;">share</span>
                    <span>Share</span>
                </button>
                <button type="button" class="action-pill-btn" onclick="window.print()">
                    <span class="material-symbols-outlined" style="font-size: 16px;">print</span>
                    <span>Print PDF</span>
                </button>
            </div>
        </article>

        <!-- Google AdSense Slot #1 (Hero Banner Unit) -->
        <div class="ad-container-wrapper">
            <div class="ad-label">Sponsored Intelligence</div>
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="ca-pub-0000000000000000"
                 data-ad-slot="0000000000"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
            <script>
                 (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        </div>

        <!-- Section 1: Executive Overview & Product -->
        <section class="dossier-section">
            <div class="section-header">
                <span class="material-symbols-outlined">info</span>
                <h2>Executive Overview & Product Solution</h2>
            </div>
            <p class="dossier-body-text">
                ${escapeHtml(deal.company_description || 'Detailed operational profile pending review in Indian venture database.')}
            </p>
            ${deal.product_or_solution ? `
                <div style="margin-top: 16px; padding: 16px; background: var(--color-surface-secondary); border-radius: var(--radius-card);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; margin-bottom: 6px;">Product / Solution Architecture</div>
                    <p class="dossier-body-text" style="margin: 0;">${escapeHtml(deal.product_or_solution)}</p>
                </div>
            ` : ''}
            ${deal.target_market ? `
                <div style="margin-top: 12px; font-size: 14px; color: var(--color-text-secondary);">
                    <strong>Target Market:</strong> ${escapeHtml(deal.target_market)}
                </div>
            ` : ''}
        </section>

        <!-- Section 2: Leadership & Cap Table -->
        <section class="dossier-section">
            <div class="section-header">
                <span class="material-symbols-outlined">groups</span>
                <h2>Leadership & Cap Table Syndicate</h2>
            </div>
            <div class="info-grid">
                <div class="info-cell full-width">
                    <span class="info-label">Founders & Leadership</span>
                    <div class="info-value" style="margin-top: 6px;">
                        ${renderFoundersMarkup(deal.founders, companyName)}
                    </div>
                </div>
                <div class="info-cell">
                    <span class="info-label">Lead Investor</span>
                    <div class="info-value highlight">${escapeHtml(deal.lead_investor || 'Undisclosed')}</div>
                </div>
                <div class="info-cell">
                    <span class="info-label">Total Investors</span>
                    <div class="info-value">${escapeHtml(deal.investor_count || '1')} Backer(s)</div>
                </div>
                <div class="info-cell full-width">
                    <span class="info-label">Syndicate / All Investors</span>
                    <div class="info-value">${escapeHtml(deal.investors || deal.funded_by || 'Confidential')}</div>
                </div>
                ${deal.funding_use ? `
                    <div class="info-cell full-width">
                        <span class="info-label">Use of Funds</span>
                        <div class="info-value">${escapeHtml(deal.funding_use)}</div>
                    </div>
                ` : ''}
            </div>
        </section>

        <!-- Section 3: Company Profile & Operating Details -->
        <section class="dossier-section">
            <div class="section-header">
                <span class="material-symbols-outlined">business</span>
                <h2>Company Details & Corporate Footprint</h2>
            </div>
            <div class="info-grid">
                <div class="info-cell">
                    <span class="info-label">Industry Sector</span>
                    <div class="info-value highlight">${escapeHtml(deal.industry || 'N/A')}</div>
                </div>
                <div class="info-cell">
                    <span class="info-label">Sub-Industry</span>
                    <div class="info-value">${escapeHtml(deal.sub_industry || 'N/A')}</div>
                </div>
                <div class="info-cell">
                    <span class="info-label">Business Model</span>
                    <div class="info-value">${escapeHtml(deal.business_model || 'B2B / B2C')}</div>
                </div>
                <div class="info-cell">
                    <span class="info-label">Year Founded</span>
                    <div class="info-value">${escapeHtml(deal.year_founded || 'N/A')}</div>
                </div>
                <div class="info-cell">
                    <span class="info-label">Headquarters</span>
                    <div class="info-value">${escapeHtml(deal.company_headquarters || 'India')}</div>
                </div>
                <div class="info-cell">
                    <span class="info-label">Team Size</span>
                    <div class="info-value">${escapeHtml(deal.employee_count_range_at_funding || deal.employee_count_range || 'N/A')}</div>
                </div>
                ${deal.other_offices_in_india ? `
                    <div class="info-cell full-width">
                        <span class="info-label">Other Offices in India</span>
                        <div class="info-value">${escapeHtml(deal.other_offices_in_india)}</div>
                    </div>
                ` : ''}
            </div>
        </section>

        <!-- Google AdSense Slot #2 (In-Article Unit) -->
        <div class="ad-container-wrapper">
            <div class="ad-label">Advertisement</div>
            <ins class="adsbygoogle"
                 style="display:block; text-align:center;"
                 data-ad-layout="in-article"
                 data-ad-format="fluid"
                 data-ad-client="ca-pub-0000000000000000"
                 data-ad-slot="0000000000"></ins>
            <script>
                 (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        </div>

        ${sourcesList.length > 0 ? `
            <!-- Verified Sources & Footnotes -->
            <section class="dossier-section" style="background: var(--color-surface-secondary);">
                <div class="section-header">
                    <span class="material-symbols-outlined">verified</span>
                    <h2>Verified News & Intelligence Sources</h2>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${sourcesList.map(s => `<a href="${encodeURI(s.url)}" target="_blank" rel="noopener noreferrer" class="action-pill-btn" style="font-size: 12px; background: var(--color-surface);">
                        <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
                        <span>${escapeHtml(s.host)}</span>
                    </a>`).join('')}
                </div>
            </section>
        ` : ''}

        ${relatedDeals.length > 0 ? `
            <!-- Related Deals in Same Sector -->
            <section class="dossier-section">
                <div class="section-header">
                    <span class="material-symbols-outlined">trending_up</span>
                    <h2>More ${escapeHtml(deal.industry || 'Venture')} Deals in India</h2>
                </div>
                <div class="related-deals-grid">
                    ${relatedDeals.map(rd => {
                        const rDomain = extractDomain(rd.company_website) || slugify(rd.company_name);
                        return `
                            <a href="../${rDomain}/" class="related-card">
                                <div class="related-top">
                                    <span class="related-name">${escapeHtml(rd.company_name)}</span>
                                    <span class="badge-round ${getStageBadgeClass(rd.funding_round)}" style="font-size: 9px;">${escapeHtml(rd.funding_round || 'Round')}</span>
                                </div>
                                <div class="related-amount">${formatUSD(rd.funding_amount_usd)}</div>
                                <div class="related-meta">${escapeHtml(formatFundingDateDisplay(rd.date_of_funding))} • ${escapeHtml(rd.company_headquarters || 'India')}</div>
                            </a>
                        `;
                    }).join('')}
                </div>
            </section>
        ` : ''}

        <!-- Back to Dashboard Sticky Footer Link -->
        <div style="text-align: center; margin: 40px 0 20px 0;">
            <a href="../../" class="action-pill-btn primary" style="padding: 12px 28px; font-size: 15px; border-radius: var(--radius-pill);">
                <span class="material-symbols-outlined">arrow_back</span>
                <span>Explore Full Venture Feed on Fundingly.in</span>
            </a>
        </div>
    </main>

    <!-- Global App Footer -->
    <footer class="app-main-footer" role="contentinfo">
        <div class="main-footer-top">
            <div class="main-footer-brand">
                <img src="../../assets/fundingly_logo.png" alt="Fundingly.in" class="main-footer-logo" width="28" height="28">
                <span class="main-footer-brand-name">Fundingly.in</span>
                <span class="main-footer-tagline">Indian Startup Funding Intelligence</span>
            </div>
        </div>
        <div class="main-footer-bottom">
            <nav class="main-footer-nav" aria-label="Footer Navigation">
                <a href="../../founders-note/" class="main-footer-link">Founder's Note</a>
                <span class="main-footer-dot">•</span>
                <a href="../../about/" class="main-footer-link">About Us</a>
                <span class="main-footer-dot">•</span>
                <a href="../../contact/" class="main-footer-link">Contact</a>
                <span class="main-footer-dot">•</span>
                <a href="../../privacy-policy/" class="main-footer-link">Privacy Policy</a>
                <span class="main-footer-dot">•</span>
                <a href="../../terms/" class="main-footer-link">Terms of Service</a>
            </nav>
            <div class="main-footer-copy">
                <span>© 2026 Fundingly.in. Built with care by <a href="https://www.linkedin.com/in/kapilpidhwani/" target="_blank" rel="noopener noreferrer" class="footer-creator-link">Kapil Pidhwani</a>.</span>
            </div>
        </div>
    </footer>

    <script>
        // Minimal Theme Controller
        (function () {
            const btn = document.getElementById('themeToggleBtn');
            const icon = document.getElementById('themeIcon');
            const saved = localStorage.getItem('fundingly_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', saved);
            if (icon) icon.textContent = saved === 'dark' ? 'light_mode' : 'dark_mode';

            if (btn) {
                btn.addEventListener('click', () => {
                    const cur = document.documentElement.getAttribute('data-theme');
                    const next = cur === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', next);
                    localStorage.setItem('fundingly_theme', next);
                    if (icon) icon.textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
                });
            }
        })();

        // Copy Markdown Deal Memo for Slack/Email
        function copyDossierMemo() {
            const memo = \`**\${${JSON.stringify(companyName)}}** Raised **\${${JSON.stringify(amountUsdFormatted)}}** (\${${JSON.stringify(roundName)}})\\n\` +
                \`• **Lead Investor:** \${${JSON.stringify(deal.lead_investor || 'Undisclosed')}}\\n\` +
                \`• **Date:** \${${JSON.stringify(dateFormatted)}}\\n\` +
                \`• **HQ:** \${${JSON.stringify(deal.company_headquarters || 'India')}}\\n\` +
                \`• **Founders:** \${${JSON.stringify(deal.founders || 'Undisclosed')}}\\n\` +
                \`• **Overview:** \${${JSON.stringify(deal.company_description || '')}}\\n\` +
                \`• **Dossier:** \${window.location.href}\`;

            navigator.clipboard.writeText(memo).then(() => {
                const text = document.getElementById('memoText');
                const icon = document.getElementById('memoIcon');
                if (text) text.textContent = 'Copied to Clipboard!';
                if (icon) icon.textContent = 'check';
                setTimeout(() => {
                    if (text) text.textContent = 'Copy Deal Memo';
                    if (icon) icon.textContent = 'content_copy';
                }, 2000);
            }).catch(err => console.warn('Copy failed:', err));
        }

        // Web Share API or fallback copy URL
        function shareDossierPage() {
            if (navigator.share) {
                navigator.share({
                    title: document.title,
                    text: \`Check out \${${JSON.stringify(companyName)}} funding round dossier on Fundingly.in:\`,
                    url: window.location.href
                }).catch(() => {});
            } else {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('Deal link copied to clipboard!');
                });
            }
        }
    </script>
</body>

</html>
`;
}

// Generate sitemap.xml
function generateSitemap(companyUrls, nowISO) {
    const staticPages = [
        { url: 'https://fundingly.in/', priority: '1.0', changefreq: 'daily' },
        { url: 'https://fundingly.in/about/', priority: '0.6', changefreq: 'monthly' },
        { url: 'https://fundingly.in/contact/', priority: '0.6', changefreq: 'monthly' },
        { url: 'https://fundingly.in/privacy-policy/', priority: '0.5', changefreq: 'monthly' },
        { url: 'https://fundingly.in/terms/', priority: '0.5', changefreq: 'monthly' },
        { url: 'https://fundingly.in/founders-note/', priority: '0.8', changefreq: 'weekly' }
    ];

    const allUrls = [...staticPages, ...companyUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(item => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastmod || nowISO}</lastmod>
    <changefreq>${item.changefreq || 'weekly'}</changefreq>
    <priority>${item.priority || '0.7'}</priority>
  </url>`).join('\n')}
</urlset>
`;

    fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
    console.log(`🗺️ Updated sitemap.xml with ${allUrls.length} total indexed URLs.`);
}

// Execute generator
buildStaticDealPages();
