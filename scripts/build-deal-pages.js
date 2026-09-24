/**
 * ============================================================================
 * FUNDINGLY.IN — STATIC DEAL & COMPANY PAGE GENERATOR (SEO, SHARING & ADS SUITE)
 * ============================================================================
 * Target: Generates 100% pre-rendered, static HTML pages matching the exact
 * 1:1 Apple-style modal dossier UI, complete with:
 * - 100% Dataset Fields (Deal tags, product, target market, funding use, offices, syndicate)
 * - Multi-Channel Sharing (Native Share, WhatsApp, X/Twitter, LinkedIn, Memo, Copy Link, Print)
 * - Funding History Timeline (if company has multiple deals)
 * - Dynamic SEO meta tags, title tags, OpenGraph & Twitter Cards
 * - Schema.org JSON-LD Structured Data (Organization, InvestmentOrGrant, BreadcrumbList)
 * - Sidebar & Bottom Google AdSense ad slots (content remains pure & unscattered)
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
    if (amount === null || amount === undefined || amount === '' || amount === 'Undisclosed' || amount === 'undisclosed') return 'Undisclosed';
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return 'Undisclosed';
    if (num >= 1000000000) return '$' + (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
    return '$' + num.toLocaleString('en-US');
}

// Helper: Format INR currency approximate conversion (assumes 1 USD ~ 83.5 INR)
function formatINR(amountUsd, originalAmount, originalCurrency) {
    if (originalCurrency === 'INR' && originalAmount && !isNaN(originalAmount)) {
        const inr = Number(originalAmount);
        if (inr >= 10000000) {
            return `₹${(inr / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
        }
        if (inr >= 100000) {
            return `₹${(inr / 100000).toFixed(1).replace(/\.0$/, '')} Lakh`;
        }
        return `₹${Math.round(inr).toLocaleString('en-IN')}`;
    }
    if (!amountUsd || isNaN(amountUsd) || amountUsd === 0) return '';
    const inr = Number(amountUsd) * 83.5;
    if (inr >= 10000000) {
        const cr = (inr / 10000000).toFixed(1).replace(/\.0$/, '');
        return `₹${cr} Cr`;
    }
    if (inr >= 100000) {
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

// Helper: Format Deal Tags into Badges
function renderDealTagsMarkup(tagsStr) {
    if (!tagsStr) return '';
    const tags = String(tagsStr).split(/[,|]/).map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) return '';
    return tags.map(tag => `<span class="deal-keyword-tag">#${escapeHtml(tag)}</span>`).join(' ');
}

// Helper: Format Person List with Google/LinkedIn Search
function renderFoundersMarkup(foundersStr, companyName) {
    if (!foundersStr) return '<span style="color: var(--color-text-tertiary);">Undisclosed</span>';
    const names = foundersStr.split(/[,&|]/).map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return '<span style="color: var(--color-text-tertiary);">Undisclosed</span>';

    return names.map(name => {
        const query = `${name} ${companyName} founder LinkedIn`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        return `<span class="person-tag" style="display:inline-flex; align-items:center; gap:4px; margin-right:8px; margin-bottom:4px;">
            <span>${escapeHtml(name)}</span>
            <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="micro-search-btn" title="Search ${escapeHtml(name)} on Google" aria-label="Search ${escapeHtml(name)} on Google">
                <span class="material-symbols-outlined" style="font-size: 13px;">search</span>
            </a>
        </span>`;
    }).join(' ');
}

// Main Build Function
function buildStaticDealPages() {
    console.log('🚀 Starting Fundingly.in Static Deal Page Generation (Modal Parity, Complete Data & Rich Sharing)...');

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

        // Find related deals in same vertical / segment
        const primarySector = latestDeal.vertical || latestDeal.segment || latestDeal.industry;
        const relatedDeals = allDeals
            .filter(d => d.company_name !== latestDeal.company_name && primarySector && (d.vertical === primarySector || d.segment === primarySector || d.industry === primarySector))
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

// Generate HTML for a single company matching the 1:1 modal layout + complete dataset fields + rich sharing
function generateCompanyPageHtml(compData, deal, totalRaisedUsd, relatedDeals) {
    const companyName = deal.company_name || 'Startup';
    const domain = compData.domain;
    const companyDomain = extractDomain(deal.company_website);
    const roundName = deal.funding_round || 'Funding Round';
    const amountUsdFormatted = formatUSD(deal.funding_amount_usd);
    const amountInrFormatted = formatINR(deal.funding_amount_usd, deal.original_funding_amount, deal.original_funding_currency);
    const totalRaisedFormatted = formatUSD(totalRaisedUsd);
    const dateFormatted = formatFundingDateDisplay(deal.date_of_funding);
    const stageClass = getStageBadgeClass(deal.funding_round);
    const mono = getMonogram(companyName);
    const monoStyle = getMonogramStyle(companyName);
    const sourcesList = parseSourcesList(deal.sources || deal.source_url);
    const dealTagsHTML = renderDealTagsMarkup(deal.deal_tags);

    // Quarter calculation
    let quarterDisplay = '';
    if (deal.date_of_funding) {
        const month = parseInt(deal.date_of_funding.split('-')[1], 10);
        const year = deal.date_of_funding.split('-')[0];
        if (month && year) {
            const q = Math.ceil(month / 3);
            quarterDisplay = `Q${q} ${year}`;
        }
    }

    // SEO Dynamic Content
    const pageTitle = amountUsdFormatted !== 'Undisclosed'
        ? `${companyName} Raises ${amountUsdFormatted} in ${roundName} | Fundingly.in`
        : `${companyName} Secures ${roundName} Funding | Fundingly.in`;
    const pageDescription = `${companyName} (${deal.company_headquarters || 'India'}) raised ${amountUsdFormatted}${amountInrFormatted ? ' (' + amountInrFormatted + ')' : ''} in ${roundName} led by ${deal.lead_investor || 'top investors'}. Explore complete cap table, founders, and intelligence dossier on Fundingly.in.`;
    const canonicalUrl = `https://fundingly.in/company/${domain}/`;

    // 1. Google LinkedIn C-Level Search URL
    const linkedinQuery = `site:linkedin.com/in/ "${companyName}" ("CEO" OR "CFO" OR "COO" OR "CTO" OR "CMO" OR "CHRO" OR "CIO" OR "CISO" OR "CRO" OR "Chief" OR "President" OR "Managing Director")`;
    const linkedinSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(linkedinQuery)}`;

    // 2. ChatGPT Leadership Research Pre-Prompt URL
    const chatgptPrompt = `Research the current C-level and senior executive leadership of ${companyName}. Identify the CEO, CTO, CFO, COO, CMO, founders, and other key decision-makers where publicly verifiable. For each person, provide their name, current title, responsibilities, professional background, and LinkedIn profile if publicly available. Prioritize current and authoritative sources, distinguish confirmed C-suite roles from board/director positions, and flag any information that cannot be independently verified. Include the sources used and the date the information was verified.`;
    const chatgptPromptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatgptPrompt)}`;

    // 3. Social Share Intent URLs
    const shareText = `📊 ${companyName} raised ${amountUsdFormatted} in ${roundName}${deal.lead_investor ? ' led by ' + deal.lead_investor : ''}.\n\nExplore the full venture intelligence dossier on Fundingly.in:`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + canonicalUrl)}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(canonicalUrl)}&hashtags=IndianStartups,VentureCapital,Funding`;
    const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`;

    // Avatar HTML
    let avatarHTML = '';
    if (companyDomain) {
        avatarHTML = `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(companyDomain)}&sz=128" alt="${escapeHtml(companyName)}" class="modal-hero-avatar" onerror="this.outerHTML='<div class=\\'modal-hero-monogram\\' style=\\'background:${monoStyle.bg}; color:${monoStyle.color}; border:1px solid ${monoStyle.border};\\'>${mono}</div>'">`;
    } else {
        avatarHTML = `<div class="modal-hero-monogram" style="background:${monoStyle.bg}; color:${monoStyle.color}; border:1px solid ${monoStyle.border};">${mono}</div>`;
    }

    // Sources footer string
    let sourceLink = '';
    if (sourcesList.length > 0) {
        const linksAnchors = sourcesList.map(s => `<a href="${encodeURI(s.url)}" target="_blank" rel="noopener noreferrer" class="source-chip-tag" title="Verified source: ${escapeHtml(s.host)}"><span class="material-symbols-outlined" style="font-size:13px;">link</span><span>${escapeHtml(s.host)}</span></a>`).join(' ');
        sourceLink = `
            <div class="modal-section-card sources-section">
                <div class="modal-section-title">
                    <span class="material-symbols-outlined" style="font-size: 15px;">verified</span>
                    <span>Verified Primary Sources & Coverage</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    ${linksAnchors}
                </div>
            </div>
        `;
    }

    // Funding Rounds Timeline (if multiple rounds exist for this company)
    let fundingHistorySection = '';
    if (compData.deals.length > 1) {
        const rows = compData.deals.map(d => `
            <div class="history-round-row">
                <div class="history-round-left">
                    <span class="modal-hero-badge ${getStageBadgeClass(d.funding_round)}" style="font-size: 11px; padding: 3px 8px;">${escapeHtml(d.funding_round || 'Round')}</span>
                    <span class="history-round-date">${escapeHtml(formatFundingDateDisplay(d.date_of_funding))}</span>
                </div>
                <div class="history-round-center">
                    <span class="history-round-amount">${formatUSD(d.funding_amount_usd)}</span>
                    <span class="history-round-lead">${escapeHtml(d.lead_investor ? 'Led by ' + d.lead_investor : d.investors || 'Undisclosed')}</span>
                </div>
            </div>
        `).join('');

        fundingHistorySection = `
            <div class="modal-section-card">
                <div class="modal-section-title">
                    <span class="material-symbols-outlined" style="font-size: 15px;">timeline</span>
                    <span>Funding History & Rounds Trajectory (${compData.deals.length} Recorded Rounds)</span>
                </div>
                <div class="history-rounds-list">
                    ${rows}
                </div>
            </div>
        `;
    }

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
                        "name": companyName,
                        "item": canonicalUrl
                    }
                ]
            }
        ]
    };

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
    <!-- Instant Theme Synchronization (Anti-Flicker) -->
    <script>
        (function() {
            try {
                const saved = localStorage.getItem('fundingly_theme');
                const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = (saved === 'dark' || saved === 'light') ? saved : (isSystemDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
            } catch (e) {}
        })();
    </script>
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

    <!-- Google AdSense Script -->
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6148655095183291" crossorigin="anonymous"></script>

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
        .dossier-page-wrapper {
            max-width: 1140px;
            margin: 20px auto 80px auto;
            padding: 0 16px;
        }

        .page-nav-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .page-nav-back {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--color-primary);
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: color 0.15s ease, transform 0.1s ease;
        }

        .page-nav-back:hover {
            color: var(--color-primary-hover);
            transform: translateX(-2px);
        }

        /* 2-Column Desktop Grid (Main Card + Side Rail) */
        .dossier-layout-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 320px;
            gap: 24px;
            align-items: start;
        }

        /* Main Dossier Sheet Card (1:1 Modal Parity) */
        .dossier-standalone-card {
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-sheet);
            padding: 32px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
            position: relative;
            min-width: 0;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            box-sizing: border-box;
        }

        .modal-stats-strip {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            padding: 12px 14px;
            margin-top: 12px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            min-width: 0;
        }

        .stat-pill-block {
            display: flex;
            flex-direction: column;
            min-width: 0;
            max-width: 100%;
            overflow-wrap: break-word;
            word-break: break-word;
        }

        .stat-pill-block.full-span {
            grid-column: 1 / -1;
            padding-top: 8px;
            margin-top: 4px;
            border-top: 1px solid var(--color-hairline);
        }

        .stat-pill-label {
            font-size: 9.5px;
            font-weight: 600;
            color: var(--color-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 2px;
        }

        .stat-pill-value {
            font-size: 13.5px;
            font-weight: 600;
            color: var(--color-text-primary);
            overflow-wrap: break-word;
            word-break: break-word;
            min-width: 0;
            letter-spacing: -0.01em;
            line-height: 1.4;
        }

        /* Deal Keywords / Tags */
        .deal-tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 10px;
        }

        .deal-keyword-tag {
            font-size: 11.5px;
            font-weight: 500;
            background: var(--color-surface-secondary);
            color: var(--color-text-secondary);
            border: 1px solid var(--color-hairline);
            padding: 2px 8px;
            border-radius: var(--radius-pill);
            transition: all 0.15s ease;
        }

        .deal-keyword-tag:hover {
            color: var(--color-primary);
            border-color: var(--color-primary-subtle);
        }

        /* Feature Callout Box (Product, Target Market, Use of Funds) */
        .feature-callout-box {
            margin-top: 12px;
            padding: 12px 14px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            font-size: 13px;
            color: var(--color-text-primary);
            line-height: 1.5;
        }

        .feature-callout-header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-text-secondary);
            margin-bottom: 4px;
        }

        .feature-callout-header .material-symbols-outlined {
            font-size: 15px;
            color: var(--color-primary);
        }

        /* Source Chip Tag */
        .source-chip-tag {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 11px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-pill);
            font-size: 12px;
            font-weight: 600;
            color: var(--color-primary);
            text-decoration: none;
            transition: all 0.15s ease;
        }

        .source-chip-tag:hover {
            background: var(--color-primary);
            color: #ffffff;
            border-color: var(--color-primary);
        }

        /* Funding History Timeline */
        .history-rounds-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
        }

        .history-round-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            flex-wrap: wrap;
            gap: 8px;
        }

        .history-round-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .history-round-date {
            font-size: 12px;
            color: var(--color-text-secondary);
        }

        .history-round-center {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .history-round-amount {
            font-size: 14px;
            font-weight: 700;
            color: var(--color-primary);
        }

        .history-round-lead {
            font-size: 12px;
            color: var(--color-text-secondary);
        }

        /* Side Rail (Sticky Ad + Share + Related Deals) */
        .dossier-sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
            position: sticky;
            top: 76px;
        }

        .ad-container-wrapper {
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-sheet);
            padding: 16px;
            text-align: center;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        }

        .ad-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--color-text-tertiary);
            margin-bottom: 8px;
            display: block;
        }

        .sidebar-widget {
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-sheet);
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        }

        .sidebar-widget-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0 0 14px 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .sidebar-widget-title .material-symbols-outlined {
            font-size: 16px;
            color: var(--color-primary);
        }

        /* Share Widget Buttons Grid */
        .share-buttons-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .share-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: var(--radius-pill);
            border: 1px solid var(--color-hairline);
            background: var(--color-surface-secondary);
            color: var(--color-text-primary);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.15s ease;
        }

        .share-btn:hover {
            transform: translateY(-1px);
        }

        .share-btn.whatsapp:hover {
            background: #25D366;
            color: #ffffff;
            border-color: #25D366;
        }

        .share-btn.twitter:hover {
            background: #000000;
            color: #ffffff;
            border-color: #000000;
        }

        .share-btn.linkedin:hover {
            background: #0A66C2;
            color: #ffffff;
            border-color: #0A66C2;
        }

        .share-btn.copy-link:hover {
            background: var(--color-primary);
            color: #ffffff;
            border-color: var(--color-primary);
        }

        .sidebar-deals-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .sidebar-deal-item {
            display: flex;
            flex-direction: column;
            padding: 10px 12px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-card);
            text-decoration: none;
            color: inherit;
            transition: all 0.15s ease;
        }

        .sidebar-deal-item:hover {
            background: var(--color-surface-tertiary);
            transform: translateY(-1px);
        }

        .sidebar-deal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .sidebar-deal-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-primary);
        }

        .sidebar-deal-amount {
            font-size: 14px;
            font-weight: 700;
            color: var(--color-primary);
        }

        .sidebar-deal-meta {
            font-size: 11px;
            color: var(--color-text-tertiary);
        }

        /* Bottom Ad Banner */
        .bottom-ad-wrapper {
            margin-top: 32px;
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-sheet);
            padding: 20px;
            text-align: center;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        }

        /* Reusable Floating Toast Notification */
        .dossier-toast {
            position: fixed;
            bottom: 32px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: rgba(29, 29, 31, 0.94);
            color: #ffffff;
            padding: 10px 20px;
            border-radius: var(--radius-pill);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.28);
            font-size: 13.5px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 99999;
            opacity: 0;
            pointer-events: none;
            transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease;
            backdrop-filter: blur(16px);
        }

        .dossier-toast.active {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
            pointer-events: auto;
        }

        [data-theme="dark"] .dossier-toast {
            background: rgba(245, 245, 247, 0.94);
            color: #121215;
        }

        @media (max-width: 960px) {
            .dossier-layout-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            .dossier-sidebar {
                position: static;
            }
            .dossier-standalone-card {
                padding: 24px 18px;
            }
        }

        @media (max-width: 680px) {
            .dossier-page-wrapper {
                margin: 10px auto 40px auto;
                padding: 0 10px;
                max-width: 100vw;
                overflow-x: hidden;
            }

            .dossier-standalone-card {
                padding: 16px 12px;
                border-radius: 18px;
                max-width: 100%;
                overflow: hidden;
            }

            .modal-hero-title {
                font-size: 20px !important;
                line-height: 1.3;
            }

            .modal-stats-strip {
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                padding: 8px 10px;
            }

            .stat-pill-block.full-span {
                grid-column: 1 / -1;
            }

            .stat-pill-value {
                font-size: 13px;
            }

            .inspector-grid {
                grid-template-columns: 1fr;
                gap: 8px;
            }

            .inspector-row[style*="span 2"] {
                grid-column: span 1 !important;
            }

            .executive-intel-actions {
                grid-template-columns: 1fr;
                gap: 8px;
            }

            .modal-action-bar {
                flex-direction: column;
                align-items: stretch;
                gap: 10px;
            }

            .modal-action-bar > div {
                width: 100%;
                justify-content: space-between;
            }

            .modal-action-bar .btn-suggest-correction,
            .modal-action-bar .btn-detail {
                flex: 1 1 auto;
                justify-content: center;
            }

            .share-buttons-grid {
                grid-template-columns: 1fr 1fr;
                gap: 6px;
            }

            .bottom-ad-wrapper {
                margin-top: 20px;
                padding: 14px 10px;
                border-radius: 18px;
            }

            .ad-container-wrapper {
                padding: 14px 10px;
                border-radius: 18px;
            }

            .history-round-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
            }

            .history-round-left,
            .history-round-center {
                width: 100%;
                justify-content: space-between;
            }
        }

        /* Print One-Pager Optimization */
        @media print {
            .app-header,
            .page-nav-bar,
            .dossier-sidebar,
            .bottom-ad-wrapper,
            .modal-action-bar,
            .dossier-toast,
            .app-main-footer,
            .modal-hero-toolbar,
            .executive-intel-actions {
                display: none !important;
            }
            .dossier-layout-grid {
                grid-template-columns: 1fr !important;
            }
            .dossier-standalone-card {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }
            body {
                background: #ffffff !important;
                color: #000000 !important;
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
            <a href="../../" class="btn-nav-about" style="text-decoration: none;" title="Venture Deals Feed">
                <span class="material-symbols-outlined">dashboard</span>
                <span class="btn-nav-text">Live Feed</span>
            </a>
            <a href="../../founders-note/" class="btn-nav-about" style="text-decoration: none;" title="Founder's Note">
                <span class="material-symbols-outlined">edit_note</span>
                <span class="btn-nav-text">Founder's Note</span>
            </a>
            <button id="themeToggleBtn" type="button" class="btn-theme-toggle" aria-label="Toggle Color Theme" title="Toggle Appearance">
                <span class="material-symbols-outlined" id="themeIcon">dark_mode</span>
            </button>
        </div>
    </header>

    <main class="dossier-page-wrapper" role="main">
        <!-- Top Navigation Bar -->
        <nav class="page-nav-bar" aria-label="Navigation">
            <a href="../../" class="page-nav-back">
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                <span>Back to Live Feed</span>
            </a>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn-detail" onclick="shareDossier()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Share Deal Dossier">
                    <span class="material-symbols-outlined" style="font-size: 16px;">share</span>
                    <span>Share</span>
                </button>
                <button type="button" class="btn-detail" onclick="window.print()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Print or save as PDF">
                    <span class="material-symbols-outlined" style="font-size: 16px;">print</span>
                    <span>Print PDF</span>
                </button>
            </div>
        </nav>

        <div class="dossier-layout-grid">
            <!-- Main Column: Exact 1:1 Apple Sheet Modal Card + Full Dataset -->
            <article class="dossier-standalone-card">
                <div class="modal-hero">
                    <!-- Tier 1: Top Bar (Avatar on Left, Badges on Right) -->
                    <div class="modal-hero-top-bar" style="padding-right: 0;">
                        ${avatarHTML}
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="modal-hero-badge ${stageClass}">${escapeHtml(deal.funding_round || 'Funding')}</span>
                            ${compData.deals.length > 1 ? `<span class="modal-hero-badge" style="background: var(--color-primary-subtle); color: var(--color-primary); border: 1px solid var(--color-primary-tint); font-weight: 700;">Total: ${totalRaisedFormatted}</span>` : ''}
                        </div>
                    </div>

                    <!-- Tier 2: 100% Full-Width Identity Block -->
                    <div class="modal-hero-identity">
                        <div class="modal-hero-title-wrap">
                            <h1 class="modal-hero-title">${escapeHtml(companyName)}</h1>
                        </div>
                        <div class="modal-hero-subtitle">
                            ${escapeHtml(deal.vertical || deal.industry || 'General')}${deal.sub_vertical || deal.sub_industry ? ' • ' + escapeHtml(deal.sub_vertical || deal.sub_industry) : ''}
                        </div>
                        ${dealTagsHTML ? `<div class="deal-tags-container">${dealTagsHTML}</div>` : ''}
                    </div>

                    <!-- Tier 3: Unified Actions Toolbar -->
                    <div class="modal-hero-toolbar">
                        <div class="modal-hero-action-row">
                            ${companyDomain ? `
                                <a href="${encodeURI(deal.company_website)}" target="_blank" rel="noopener noreferrer" class="modal-domain-chip" title="Visit website: ${escapeHtml(deal.company_website)}">
                                    <span class="material-symbols-outlined">language</span>
                                    <span>${escapeHtml(companyDomain)}</span>
                                    <span class="material-symbols-outlined" style="font-size: 12px; opacity: 0.75;">open_in_new</span>
                                </a>
                                <button type="button" class="modal-micro-btn" onclick="copyDomainText('${escapeHtml(companyDomain)}', this)" title="Copy domain: ${escapeHtml(companyDomain)}" aria-label="Copy domain ${escapeHtml(companyDomain)}">
                                    <span class="material-symbols-outlined">content_copy</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="modal-hero-utility-row">
                            <button type="button" class="modal-micro-btn" onclick="shareDossier()" title="Share Deal Dossier" aria-label="Share Deal Dossier">
                                <span class="material-symbols-outlined">share</span>
                            </button>
                            <button type="button" class="modal-micro-btn" id="copySummaryBtn" onclick="copyDealSummary()" title="Copy Markdown deal summary for Slack/Email" aria-label="Copy Deal Summary">
                                <span class="material-symbols-outlined" id="copySummaryIcon">assignment</span>
                            </button>
                            <button type="button" class="modal-micro-btn" onclick="window.print()" title="Print One-Pager Deal Memo" aria-label="Print One-Pager Deal Memo">
                                <span class="material-symbols-outlined">print</span>
                            </button>
                        </div>
                    </div>

                    <!-- Tier 4: Deal Snapshot Meta Tile -->
                    <div class="modal-stats-strip">
                        <div class="stat-pill-block">
                            <span class="stat-pill-label">Amount Raised</span>
                            <span class="stat-pill-value">${escapeHtml(amountUsdFormatted)}</span>
                            ${amountInrFormatted ? `<span style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;">~ ${escapeHtml(amountInrFormatted)}</span>` : ''}
                        </div>
                        <div class="stat-pill-block">
                            <span class="stat-pill-label">Round & Type</span>
                            <span class="stat-pill-value">${escapeHtml(roundName)}</span>
                            <span style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;">${escapeHtml(deal.funding_type || 'Equity')}</span>
                        </div>
                        <div class="stat-pill-block">
                            <span class="stat-pill-label">Funding Date</span>
                            <span class="stat-pill-value">${escapeHtml(dateFormatted)}</span>
                            ${quarterDisplay ? `<span style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;">${escapeHtml(quarterDisplay)}</span>` : ''}
                        </div>
                        <div class="stat-pill-block full-span">
                            <span class="stat-pill-label">Lead Investor</span>
                            <span class="stat-pill-value">${escapeHtml(deal.lead_investor || 'Undisclosed')}</span>
                        </div>
                    </div>
                </div>

                <!-- Section 1: Overview, Mission & Product -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">info</span>
                        <span>Company Overview & Solution</span>
                    </div>
                    <p class="modal-desc-body">${escapeHtml(deal.company_description || 'No description available for this entity.')}</p>
                    
                    ${deal.product_or_solution ? `
                        <div class="feature-callout-box">
                            <div class="feature-callout-header">
                                <span class="material-symbols-outlined">inventory_2</span>
                                <span>Product & Solution</span>
                            </div>
                            <div>${escapeHtml(deal.product_or_solution)}</div>
                        </div>
                    ` : ''}

                    ${deal.target_market ? `
                        <div class="feature-callout-box">
                            <div class="feature-callout-header">
                                <span class="material-symbols-outlined">target</span>
                                <span>Target Market & ICP</span>
                            </div>
                            <div>${escapeHtml(deal.target_market)}</div>
                        </div>
                    ` : ''}
                </div>

                <!-- Section 2: Deal Terms, Syndicate & Capital Allocation -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">paid</span>
                        <span>Deal Terms & Syndicate Intelligence</span>
                    </div>
                    <div class="inspector-grid">
                        <div class="inspector-row"><span class="inspector-label">Funding Round</span><div class="inspector-val highlight">${escapeHtml(deal.funding_round || 'N/A')}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Funding Type</span><div class="inspector-val">${escapeHtml(deal.funding_type || 'Equity')}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Amount Raised (USD)</span><div class="inspector-val highlight">${escapeHtml(amountUsdFormatted)}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Amount (INR / Original)</span><div class="inspector-val">${amountInrFormatted ? escapeHtml(amountInrFormatted) : 'N/A'}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Date of Funding</span><div class="inspector-val">${escapeHtml(dateFormatted)}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Lead Investor</span><div class="inspector-val highlight">${escapeHtml(deal.lead_investor || 'Undisclosed')}</div></div>
                        <div class="inspector-row" style="grid-column: span 2;">
                            <span class="inspector-label">Syndicate / All Backers</span>
                            <div class="inspector-val">${escapeHtml(deal.investors || deal.funded_by || 'Undisclosed')}</div>
                        </div>
                        ${deal.investor_types || deal.investor_count ? `
                            <div class="inspector-row" style="grid-column: span 2;">
                                <span class="inspector-label">Investor Structure</span>
                                <div class="inspector-val">${deal.investor_count ? deal.investor_count + ' Investor(s)' : ''}${deal.investor_count && deal.investor_types ? ' • ' : ''}${escapeHtml(deal.investor_types || '')}</div>
                            </div>
                        ` : ''}
                        ${deal.funding_use ? `
                            <div class="inspector-row" style="grid-column: span 2;">
                                <span class="inspector-label">Use of Funds</span>
                                <div class="inspector-val">${escapeHtml(deal.funding_use)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Section 3: Company Profile & Geographic Footprint -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">business</span>
                        <span>Company Profile & Footprint</span>
                    </div>
                    <div class="inspector-grid">
                        <div class="inspector-row"><span class="inspector-label">Vertical</span><div class="inspector-val highlight">${escapeHtml(deal.vertical || deal.industry || 'N/A')}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Sub-Vertical</span><div class="inspector-val">${escapeHtml(deal.sub_vertical || deal.sub_industry || 'N/A')}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Segment</span><div class="inspector-val highlight">${escapeHtml(deal.segment || deal.industry || 'N/A')}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Sub-Segment</span><div class="inspector-val">${escapeHtml(deal.sub_segment || deal.sub_industry || 'N/A')}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Business Model</span><div class="inspector-val">${escapeHtml(deal.business_model || 'N/A')}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Year Founded</span><div class="inspector-val">${escapeHtml(deal.year_founded || 'N/A')}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Team Size at Funding</span><div class="inspector-val">${escapeHtml(deal.employee_count_range_at_funding || deal.employee_count_range || 'N/A')}</div></div>
                        <div class="inspector-row"><span class="inspector-label">Headquarters</span><div class="inspector-val">${escapeHtml(deal.company_headquarters || 'N/A')}</div></div>
                        ${deal.other_offices_in_india ? `
                            <div class="inspector-row" style="grid-column: span 2;">
                                <span class="inspector-label">Offices across India</span>
                                <div class="inspector-val">${escapeHtml(deal.other_offices_in_india)}</div>
                            </div>
                        ` : ''}
                        ${deal.other_offices_outside_india ? `
                            <div class="inspector-row" style="grid-column: span 2;">
                                <span class="inspector-label">International Footprint</span>
                                <div class="inspector-val">${escapeHtml(deal.other_offices_outside_india)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Section 4: Leadership & Executive Intelligence -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">groups</span>
                        <span>Leadership & Executive Intelligence</span>
                    </div>
                    <div class="inspector-grid">
                        <div class="inspector-row" style="grid-column: span 2;">
                            <span class="inspector-label">Founders & Leadership</span>
                            <div class="inspector-val highlight">${renderFoundersMarkup(deal.founders, companyName)}</div>
                        </div>
                    </div>
                    <div class="executive-intel-actions">
                        <a href="${linkedinSearchUrl}" target="_blank" rel="noopener noreferrer" class="executive-intel-btn" title="Search Google for C-Level LinkedIn Profiles">
                            <div class="executive-intel-icon-wrap" style="background: rgba(10, 102, 194, 0.12); color: #0a66c2;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">person_search</span>
                            </div>
                            <div class="executive-intel-btn-text">
                                <span class="executive-intel-btn-title">Search C-Suite on LinkedIn</span>
                                <span class="executive-intel-btn-sub">Find verified executive profiles</span>
                            </div>
                            <span class="material-symbols-outlined" style="font-size: 14px; opacity: 0.5; margin-left: auto;">open_in_new</span>
                        </a>
                        <a href="${chatgptPromptUrl}" target="_blank" rel="noopener noreferrer" class="executive-intel-btn" title="Research Leadership Dossier with ChatGPT">
                            <div class="executive-intel-icon-wrap" style="background: rgba(16, 163, 127, 0.12); color: #10a37f;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">smart_toy</span>
                            </div>
                            <div class="executive-intel-btn-text">
                                <span class="executive-intel-btn-title">Research Leadership on ChatGPT</span>
                                <span class="executive-intel-btn-sub">Generate full executive dossier</span>
                            </div>
                            <span class="material-symbols-outlined" style="font-size: 14px; opacity: 0.5; margin-left: auto;">open_in_new</span>
                        </a>
                    </div>
                </div>

                ${fundingHistorySection}

                ${sourceLink}

                <!-- Action Bar -->
                <div class="modal-action-bar" style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-hairline); flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <a href="mailto:hello@fundingly.in?subject=Data%20Correction%3A%20${encodeURIComponent(companyName)}%20(${encodeURIComponent(deal.date_of_funding || '')})&body=${encodeURIComponent('Hello Fundingly Team,\n\nI noticed an inaccuracy regarding ' + companyName + ':\n- Date: ' + (deal.date_of_funding || 'N/A') + '\n- Amount: ' + amountUsdFormatted + '\n- Round: ' + roundName + '\n\nSuggested Correction:\n[Please describe corrected information and press link here]\n\nThank you!')}" class="btn-suggest-correction" title="Report an inaccuracy or suggest updated deal information">
                            <span class="material-symbols-outlined" style="font-size: 16px;">edit_note</span>
                            <span>Suggest Correction</span>
                        </a>
                        ${(deal.verified === true || String(deal.verified).toLowerCase() === 'true') ? `
                        <span class="verified-status-chip verified" title="Reviewed and verified by Fundingly.in Research Team">
                            <span class="material-symbols-outlined" style="font-size: 15px;">verified</span>
                            <span>Reviewed by Fundingly.in Team</span>
                        </span>
                        ` : `
                        <span class="verified-status-chip pending" title="Data under active verification by Fundingly.in Research Team">
                            <span class="material-symbols-outlined" style="font-size: 15px;">pending_actions</span>
                            <span>Review in Progress</span>
                        </span>
                        `}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="btn-detail" onclick="copyDealSummary()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Copy markdown deal memo">
                            <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            <span>Copy Memo</span>
                        </button>
                        <button type="button" class="btn-detail" onclick="copyPageUrl()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Copy canonical page URL">
                            <span class="material-symbols-outlined" style="font-size: 16px;">link</span>
                            <span>Copy Link</span>
                        </button>
                    </div>
                </div>
            </article>

            <!-- Right Sidebar: Sticky Ad Unit + Share Suite + Sector Deals -->
            <aside class="dossier-sidebar">
                <!-- Google AdSense Slot #1 (Sidebar Display Unit - Banner Right) -->
                <div class="ad-container-wrapper">
                    <span class="ad-label">Sponsored</span>
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-6148655095183291"
                         data-ad-slot="1876441959"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                    <script>
                         (adsbygoogle = window.adsbygoogle || []).push({});
                    </script>
                </div>

                <!-- Share & Export Widget -->
                <div class="sidebar-widget">
                    <h3 class="sidebar-widget-title">
                        <span class="material-symbols-outlined">share</span>
                        <span>Share Deal Dossier</span>
                    </h3>
                    <div class="share-buttons-grid">
                        <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="share-btn whatsapp" title="Share via WhatsApp">
                            <span class="material-symbols-outlined" style="font-size: 16px;">chat</span>
                            <span>WhatsApp</span>
                        </a>
                        <a href="${twitterUrl}" target="_blank" rel="noopener noreferrer" class="share-btn twitter" title="Share on X (Twitter)">
                            <span class="material-symbols-outlined" style="font-size: 16px;">send</span>
                            <span>X (Twitter)</span>
                        </a>
                        <a href="${linkedinShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn linkedin" title="Share on LinkedIn">
                            <span class="material-symbols-outlined" style="font-size: 16px;">work</span>
                            <span>LinkedIn</span>
                        </a>
                        <button type="button" class="share-btn copy-link" onclick="copyPageUrl()" title="Copy Page URL">
                            <span class="material-symbols-outlined" style="font-size: 16px;">link</span>
                            <span>Copy Link</span>
                        </button>
                    </div>
                    <div style="margin-top: 10px;">
                        <button type="button" class="share-btn" onclick="copyDealSummary()" style="width: 100%; justify-content: center;" title="Copy Markdown Summary for Slack/Teams">
                            <span class="material-symbols-outlined" style="font-size: 16px;">assignment</span>
                            <span>Copy Markdown Memo</span>
                        </button>
                    </div>
                </div>

                ${relatedDeals.length > 0 ? `
                    <!-- Related Deals Widget -->
                    <div class="sidebar-widget">
                        <h3 class="sidebar-widget-title">
                            <span class="material-symbols-outlined">trending_up</span>
                            <span>More in ${escapeHtml(deal.industry || 'Tech')}</span>
                        </h3>
                        <div class="sidebar-deals-list">
                            ${relatedDeals.map(rd => {
                                const rDomain = extractDomain(rd.company_website) || slugify(rd.company_name);
                                return `
                                    <a href="../${rDomain}/" class="sidebar-deal-item">
                                        <div class="sidebar-deal-header">
                                            <span class="sidebar-deal-name">${escapeHtml(rd.company_name)}</span>
                                            <span class="modal-hero-badge ${getStageBadgeClass(rd.funding_round)}" style="font-size: 9px; padding: 2px 6px;">${escapeHtml(rd.funding_round || 'Round')}</span>
                                        </div>
                                        <div class="sidebar-deal-amount">${formatUSD(rd.funding_amount_usd)}</div>
                                        <div class="sidebar-deal-meta">${escapeHtml(formatFundingDateDisplay(rd.date_of_funding))} • ${escapeHtml(rd.company_headquarters || 'India')}</div>
                                    </a>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </aside>
        </div>

        <!-- Google AdSense Slot #2 (Bottom Banner Unit - Banner Bottom) -->
        <div class="bottom-ad-wrapper">
            <span class="ad-label">Sponsored Intelligence</span>
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="ca-pub-6148655095183291"
                 data-ad-slot="6069828671"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
            <script>
                 (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        </div>

        <!-- Return to Dashboard Link -->
        <div style="text-align: center; margin: 32px 0 12px 0;">
            <a href="../../" class="btn-detail primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px; font-size: 14px; text-decoration: none; border-radius: var(--radius-pill); background: var(--color-primary); color: #ffffff;">
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                <span>Back to Live Venture Feed</span>
            </a>
        </div>
    </main>

    <!-- Global App Footer -->
    <footer class="app-main-footer" role="contentinfo" style="margin-top: 40px;">
        <div class="main-footer-top">
            <div class="main-footer-brand">
                <img src="../../assets/fundingly_logo.png" alt="Fundingly.in" class="main-footer-logo" width="28" height="28">
                <span class="main-footer-brand-name">Fundingly.in</span>
                <span class="main-footer-tagline">Indian Startup Funding Intelligence</span>
            </div>
            <div class="main-footer-social">
                <a href="https://www.linkedin.com/company/fundingly-in" target="_blank"
                    rel="noopener noreferrer" class="footer-social-link" title="Fundingly.in on LinkedIn"
                    aria-label="LinkedIn">
                    <svg class="social-svg-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path
                            d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 1.63 1.64 1.63 1.63 0 0 0-1.63-1.64Z" />
                    </svg>
                    <span>LinkedIn</span>
                </a>
                <a href="https://www.instagram.com/fundingly.in/" target="_blank" rel="noopener noreferrer"
                    class="footer-social-link" title="Fundingly.in on Instagram" aria-label="Instagram">
                    <svg class="social-svg-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path
                            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                    </svg>
                    <span>Instagram</span>
                </a>
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
                <span>© 2026 Fundingly.in • Created by <a href="../../founders-note/" class="footer-creator-link">Kapil Pidhwani</a> • <a href="mailto:hello@fundingly.in" class="footer-creator-link">hello@fundingly.in</a></span>
            </div>
        </div>
    </footer>

    <!-- Floating Toast Notification -->
    <div id="dossierToast" class="dossier-toast" role="status" aria-live="polite">
        <span class="material-symbols-outlined" id="toastIcon" style="font-size: 18px; color: #34c759;">check_circle</span>
        <span id="toastMessage">Copied to clipboard</span>
    </div>

    <script>
        // Deisgned by Kapil Pidhwani: Unified Theme Switcher & Persistence Controller
        (function () {
            const btn = document.getElementById('themeToggleBtn');
            const icon = document.getElementById('themeIcon');
            function updateIcon(theme) {
                if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
            }
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            updateIcon(currentTheme);

            if (btn) {
                btn.addEventListener('click', () => {
                    const cur = document.documentElement.getAttribute('data-theme') || 'light';
                    const next = cur === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', next);
                    localStorage.setItem('fundingly_theme', next);
                    updateIcon(next);
                });
            }

            try {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    if (!localStorage.getItem('fundingly_theme')) {
                        const next = e.matches ? 'dark' : 'light';
                        document.documentElement.setAttribute('data-theme', next);
                        updateIcon(next);
                    }
                });
            } catch (err) {}
        })();

        // Toast Feedback Controller
        let toastTimeout;
        function showToast(message, icon = 'check_circle') {
            const toast = document.getElementById('dossierToast');
            const msgEl = document.getElementById('toastMessage');
            const iconEl = document.getElementById('toastIcon');
            if (!toast || !msgEl) return;

            msgEl.textContent = message;
            if (iconEl) iconEl.textContent = icon;

            toast.classList.add('active');
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                toast.classList.remove('active');
            }, 2500);
        }

        // Native Web Share or Fallback
        function shareDossier() {
            const shareData = {
                title: ${JSON.stringify(pageTitle)},
                text: ${JSON.stringify(shareText)},
                url: window.location.href
            };
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                navigator.share(shareData).catch(err => {
                    if (err.name !== 'AbortError') {
                        copyPageUrl();
                    }
                });
            } else {
                copyPageUrl();
            }
        }

        // Copy Canonical Page URL
        function copyPageUrl() {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showToast('Link copied to clipboard!');
            }).catch(() => {
                showToast('Could not copy link');
            });
        }

        // Copy Domain Micro Action
        function copyDomainText(text, btnEl) {
            navigator.clipboard.writeText(text).then(() => {
                if (btnEl) {
                    const icon = btnEl.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.textContent = 'check';
                        setTimeout(() => { icon.textContent = 'content_copy'; }, 1500);
                    }
                }
                showToast('Domain copied: ' + text);
            }).catch(e => console.warn('Copy domain failed:', e));
        }

        // Copy Markdown Deal Memo for Slack/Email (Complete Dataset Fields)
        function copyDealSummary() {
            const lines = [
                \`*${companyName} — ${roundName} Funding Dossier*\`,
                \`• Amount Raised: ${amountUsdFormatted}${amountInrFormatted ? ' (~ ' + amountInrFormatted + ')' : ''}\`,
                \`• Stage & Type: ${roundName}${deal.funding_type ? ' (' + deal.funding_type + ')' : ''}\`,
                \`• Date: ${dateFormatted}${quarterDisplay ? ' [' + quarterDisplay + ']' : ''}\`,
                \`• Vertical: ${deal.vertical || deal.industry || 'General'}${deal.sub_vertical || deal.sub_industry ? ' (' + (deal.sub_vertical || deal.sub_industry) + ')' : ''}\`,
                ${JSON.stringify(deal.segment ? '• Segment: ' + deal.segment + (deal.sub_segment ? ' (' + deal.sub_segment + ')' : '') : null)},
                ${JSON.stringify(deal.deal_tags ? '• Focus Tags: ' + deal.deal_tags : null)},
                \`• Headquarters: ${deal.company_headquarters || 'N/A'}\`,
                ${JSON.stringify(deal.other_offices_in_india ? '• India Offices: ' + deal.other_offices_in_india : null)},
                ${JSON.stringify(deal.founders ? '• Founders: ' + deal.founders : null)},
                ${JSON.stringify(deal.company_website ? '• Website: ' + deal.company_website : null)},
                ${JSON.stringify(deal.product_or_solution ? '• Product / Solution: ' + deal.product_or_solution : null)},
                ${JSON.stringify(deal.target_market ? '• Target Market: ' + deal.target_market : null)},
                ${JSON.stringify(deal.funding_use ? '• Funding Use: ' + deal.funding_use : null)},
                ${JSON.stringify(deal.company_description ? '• Overview: ' + deal.company_description : null)},
                \`• Full Intelligence Dossier: \${window.location.href}\`
            ].filter(Boolean);

            const memo = lines.join('\\n');

            navigator.clipboard.writeText(memo).then(() => {
                const icon = document.getElementById('copySummaryIcon');
                if (icon) {
                    icon.textContent = 'check';
                    setTimeout(() => { icon.textContent = 'assignment'; }, 1500);
                }
                showToast('Deal memo copied for Slack/Email!');
            }).catch(err => {
                console.warn('Copy failed:', err);
                showToast('Could not copy deal memo');
            });
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

    const trendsUrls = [];
    const trendsDir = path.join(REPO_ROOT, 'trends');
    if (fs.existsSync(trendsDir)) {
        const trendFolders = fs.readdirSync(trendsDir).filter(f => fs.statSync(path.join(trendsDir, f)).isDirectory());
        trendFolders.forEach(folder => {
            trendsUrls.push({
                url: `https://fundingly.in/trends/${folder}/`,
                lastmod: nowISO,
                priority: '0.9',
                changefreq: 'weekly'
            });
        });
    }

    const allUrls = [...staticPages, ...trendsUrls, ...companyUrls];

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
