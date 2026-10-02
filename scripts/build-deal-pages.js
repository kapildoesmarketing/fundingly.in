/**
 * ============================================================================
 * FUNDINGLY.IN — CANONICAL STATIC DEAL & COMPANY DOSSIER GENERATOR
 * ============================================================================
 * Target: Generates 100% pre-rendered, canonical company dossiers at /deals/{domain}/
 * matching the exact 1:1 Apple-style modal dossier UI, complete with:
 * - Master Canonical Company Dossiers (/deals/{domain}/)
 * - Multi-Round Funding History Timeline with 0ms client-side switcher
 * - 100% Dataset Fields (Deal tags, product, target market, funding use, offices, syndicate)
 * - Multi-Channel Sharing (Native Share, WhatsApp, X/Twitter, LinkedIn, Memo, Copy Link, Print)
 * - Dynamic SEO meta tags, title tags, OpenGraph & Twitter Cards
 * - Schema.org JSON-LD Structured Data (Organization, InvestmentOrGrant, BreadcrumbList)
 * - Google AdSense ad slots
 * - Apple-grade responsive design & Dark/Light mode support
 * - Automatic legacy redirect stubs for backward compatibility
 * - Automatic sitemap.xml generation
 * - 100% $0 serverless deployment on GitHub Pages
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const DEALS_DIR = path.join(REPO_ROOT, 'deals');
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
    if (!dateStr || dateStr === 'N/A') return 'Recent';
    if (typeof dateStr === 'string') {
        const trimmed = dateStr.trim();
        const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    } catch (e) {}
    return dateStr;
}

// Helper: ISO Week Information Calculator
function getWeekInfo(dateStr) {
    if (!dateStr) return null;
    const cleanDate = formatFundingDateDisplay(dateStr);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        return null;
    }
    const parts = cleanDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (isNaN(d.getTime())) return null;

    // ISO-8601 week number calculation (Week 1 has the first Thursday)
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    const isoYear = d.getUTCFullYear();

    return {
        key: `${isoYear}-W${String(weekNo).padStart(2, '0')}`,
        weekNo: weekNo,
        year: isoYear,
        slug: `week-${weekNo}-${isoYear}`,
        title: `Week ${weekNo} of ${isoYear}`
    };
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

// Helper: Format Founders List in Bullet Points with Google & LinkedIn Brandfetch Search Links
function renderFoundersListMarkup(foundersStr, companyName) {
    if (!foundersStr) return '<span style="color: var(--color-text-tertiary);">Undisclosed</span>';
    const names = String(foundersStr).split(/[,&|\n]/).map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return '<span style="color: var(--color-text-tertiary);">Undisclosed</span>';

    return `<ul class="founders-bullet-list">
        ${names.map(name => {
            const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + ' ' + companyName)}`;
            const linkedinSearchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(name + ' ' + companyName)}`;
            return `
            <li class="founder-bullet-item">
                <span class="founder-bullet-dot">•</span>
                <span class="founder-name">${escapeHtml(name)}</span>
                <span class="founder-inline-icons">
                    <a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer" class="founder-brand-icon-btn google" title="Search ${escapeHtml(name)} on Google" aria-label="Search ${escapeHtml(name)} on Google">
                        <img src="https://cdn.brandfetch.io/google.com/icon" alt="Google" width="13" height="13" class="brand-search-icon" loading="lazy">
                    </a>
                    <a href="${linkedinSearchUrl}" target="_blank" rel="noopener noreferrer" class="founder-brand-icon-btn linkedin" title="Search ${escapeHtml(name)} on LinkedIn" aria-label="Search ${escapeHtml(name)} on LinkedIn">
                        <img src="https://cdn.brandfetch.io/linkedin.com/icon" alt="LinkedIn" width="13" height="13" class="brand-search-icon" loading="lazy">
                    </a>
                </span>
            </li>`;
        }).join('')}
    </ul>`;
}
function renderFoundersMarkup(foundersStr, companyName) {
    return renderFoundersListMarkup(foundersStr, companyName);
}

// Main Build Function
function buildStaticDealPages() {
    console.log('🚀 Starting Fundingly.in Canonical Deal Page Generation (/deals/{domain}/ hierarchy)...');

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
            // Strictly enforce verified deals filter
            const verifiedDeals = deals.filter(d => d && (d.verified === true || String(d.verified).toUpperCase() === 'TRUE'));
            allDeals.push(...verifiedDeals);
        } catch (e) {
            console.warn(`⚠️ Error reading ${file}:`, e.message);
        }
    });

    console.log(`📊 Loaded ${allDeals.length} verified deal records.`);

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

    console.log(`🏢 Grouped into ${companyMap.size} unique verified company dossiers.`);

    ensureDir(DEALS_DIR);

    const generatedUrls = [];
    const nowISO = new Date().toISOString().split('T')[0];

    // Generate Canonical Master Dossier for each company at /deals/{domain}/
    for (const [domainKey, compData] of companyMap.entries()) {
        // Sort deals descending by date
        compData.deals.sort((a, b) => new Date(b.date_of_funding || 0) - new Date(a.date_of_funding || 0));
        const latestDeal = compData.deals[0];
        const totalRaisedUsd = compData.deals.reduce((sum, d) => sum + (Number(d.funding_amount_usd) || 0), 0);
        const primarySector = latestDeal.vertical || latestDeal.segment || latestDeal.industry;
        const relatedDeals = allDeals
            .filter(d => d.company_name !== latestDeal.company_name && primarySector && (d.vertical === primarySector || d.segment === primarySector || d.industry === primarySector))
            .slice(0, 4);

        const htmlContent = generateCompanyPageHtml(compData, latestDeal, totalRaisedUsd, relatedDeals);

        // Canonical Directory: deals/{domainKey}/index.html
        const companyFolder = path.join(DEALS_DIR, domainKey);
        ensureDir(companyFolder);
        fs.writeFileSync(path.join(companyFolder, 'index.html'), htmlContent, 'utf8');

        generatedUrls.push({
            url: `https://fundingly.in/deals/${domainKey}/`,
            lastmod: latestDeal.date_of_funding ? latestDeal.date_of_funding.split('T')[0] : nowISO,
            priority: '0.8'
        });

        // Generate Legacy Redirect Stubs for each week that contained this deal
        compData.deals.forEach(d => {
            const wInfo = getWeekInfo(d.date_of_funding);
            if (wInfo && wInfo.slug) {
                const legacyWeekFolder = path.join(DEALS_DIR, wInfo.slug, domainKey);
                ensureDir(legacyWeekFolder);
                const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=../../${domainKey}/">
    <link rel="canonical" href="https://fundingly.in/deals/${domainKey}/">
    <title>Redirecting to ${escapeHtml(compData.company_name)} Dossier | Fundingly.in</title>
    <script>window.location.replace("../../${domainKey}/");</script>
</head>
<body>
    <p>Redirecting to <a href="../../${domainKey}/">${escapeHtml(compData.company_name)} Dossier</a>...</p>
</body>
</html>`;
                fs.writeFileSync(path.join(legacyWeekFolder, 'index.html'), redirectHtml, 'utf8');
            }
        });
    }

    // Generate updated sitemap.xml
    generateSitemap(generatedUrls, nowISO);

    console.log(`✅ Successfully generated ${companyMap.size} canonical static company dossiers at /deals/{domain}/ & updated sitemap.xml!`);
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
    const primarySector = deal.primary_sector || deal.company_industry || 'Sector';

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
    const canonicalUrl = `https://fundingly.in/deals/${domain}/`;

    // 1. Company Quick Google & LinkedIn Search URLs
    const companyGoogleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(companyName + ' startup funding')}`;
    const companyLinkedInSearchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(companyName)}`;

    // 2. Google LinkedIn C-Level Search URL
    const linkedinQuery = `site:linkedin.com/in/ "${companyName}" ("CEO" OR "CFO" OR "COO" OR "CTO" OR "CMO" OR "CHRO" OR "CIO" OR "CISO" OR "CRO" OR "Chief" OR "President" OR "Managing Director")`;
    const linkedinSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(linkedinQuery)}`;

    // 3. ChatGPT Leadership Research Pre-Prompt URL
    const chatgptPrompt = `Research the current C-level and senior executive leadership of ${companyName}. Identify the CEO, CTO, CFO, COO, CMO, founders, and other key decision-makers where publicly verifiable. For each person, provide their name, current title, responsibilities, professional background, and LinkedIn profile if publicly available. Prioritize current and authoritative sources, distinguish confirmed C-suite roles from board/director positions, and flag any information that cannot be independently verified. Include the sources used and the date the information was verified.`;
    const chatgptPromptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatgptPrompt)}`;

    // 4. Careers & Job Openings Search URL ("company name or company domain" + "careers page or job openings")
    const careersQuery = companyDomain 
        ? `("${companyName}" OR "${companyDomain}") ("careers page" OR "job openings" OR "careers" OR "jobs" OR "hiring")`
        : `"${companyName}" ("careers page" OR "job openings" OR "careers" OR "jobs" OR "hiring")`;
    const careersSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(careersQuery)}`;

    // 5. Standardized Subtitle: vertical • sub industry
    const primaryVertical = deal.vertical || deal.industry || 'Technology';
    const primarySubIndustry = deal.sub_industry || deal.sub_vertical || '';
    const subtitleFormatted = primarySubIndustry && primarySubIndustry !== primaryVertical ? `${primaryVertical} • ${primarySubIndustry}` : primaryVertical;

    // 6. Social Share Intent URLs
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
            <div class="modal-section-card sources-section" id="sourcesCard">
                <div class="modal-section-title">
                    <span class="material-symbols-outlined" style="font-size: 15px;">verified</span>
                    <span>Verified Primary Sources & Coverage</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;" id="sourcesListWrapper">
                    ${linksAnchors}
                </div>
            </div>
        `;
    }

    // Funding Rounds Timeline (Interactive Round Switcher for Multi-Round Companies)
    let fundingHistorySection = '';
    if (compData.deals.length > 1) {
        const rows = compData.deals.map((d, idx) => {
            const isActive = idx === 0;
            return `
            <div class="history-round-row ${isActive ? 'active' : ''}" data-deal-idx="${idx}" onclick="switchDealRound(${idx})" role="button" tabindex="0" title="Click to view details for ${escapeHtml(d.funding_round || 'Round')}">
                <div class="history-round-left">
                    <span class="modal-hero-badge ${getStageBadgeClass(d.funding_round)}" style="font-size: 11px; padding: 3px 8px;">${escapeHtml(d.funding_round || 'Round')}</span>
                    <span class="history-round-date">${escapeHtml(formatFundingDateDisplay(d.date_of_funding))}</span>
                </div>
                <div class="history-round-center">
                    <span class="history-round-amount">${formatUSD(d.funding_amount_usd)}</span>
                    <span class="history-round-lead">${escapeHtml(d.lead_investor ? 'Led by ' + d.lead_investor : d.investors || 'Undisclosed')}</span>
                </div>
                <span class="history-round-indicator">${isActive ? 'Active' : 'View'}</span>
            </div>
            `;
        }).join('');

        fundingHistorySection = `
            <div class="modal-section-card">
                <div class="modal-section-title">
                    <span class="material-symbols-outlined" style="font-size: 15px;">timeline</span>
                    <span>Funding History & Rounds Trajectory (${compData.deals.length} Recorded Rounds)</span>
                </div>
                <div class="history-rounds-list" id="historyRoundsList">
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
                        "name": "Deals",
                        "item": "https://fundingly.in/deals/"
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
    <meta property="og:image" content="https://fundingly.in/assets/og-preview.png">
    <meta property="og:image:secure_url" content="https://fundingly.in/assets/og-preview.png">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(pageTitle)}">
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
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400,0,0&display=swap" rel="stylesheet" />
    
    <link rel="stylesheet" href="../../css/styles.css">
    <!-- Three.js Library for 3D Background Metaballs -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

    <style>
        .dossier-page-wrapper {
            max-width: 1140px;
            margin: 88px auto 80px auto;
            padding: 0 16px;
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
            padding: 16px;
            margin-bottom: 24px;
        }

        .history-round-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.16s ease;
        }

        .history-round-row:hover {
            border-color: var(--color-primary-subtle);
            background: var(--color-surface);
            transform: translateX(2px);
        }

        .history-round-row.active {
            border-color: var(--color-primary);
            background: var(--color-primary-subtle);
        }

        .history-round-indicator {
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: var(--radius-pill);
            background: var(--color-surface);
            color: var(--color-primary);
            border: 1px solid var(--color-hairline);
        }

        .history-round-row.active .history-round-indicator {
            background: var(--color-primary);
            color: #ffffff;
            border-color: var(--color-primary);
        }

        /* Founders Bullet List */
        .founders-bullet-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .founder-bullet-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--color-text-primary);
            font-weight: 500;
            line-height: 1.4;
            flex-wrap: wrap;
        }

        .founder-bullet-dot {
            color: var(--color-primary);
            font-size: 14px;
            line-height: 1;
        }

        .founder-name {
            color: var(--color-text-primary);
            font-weight: 500;
        }

        .founder-inline-icons {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            margin-left: 2px;
        }

        .founder-brand-icon-btn,
        .company-brand-icon-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 6px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            transition: all 0.15s ease;
            text-decoration: none;
            flex-shrink: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .company-brand-icon-btn {
            width: 26px;
            height: 26px;
            border-radius: var(--radius-pill);
        }

        .founder-brand-icon-btn:hover,
        .company-brand-icon-btn:hover {
            background: var(--color-surface);
            border-color: var(--color-primary);
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .brand-search-icon {
            width: 13px;
            height: 13px;
            object-fit: contain;
            display: block;
        }

        .company-brand-icon-btn .brand-search-icon {
            width: 14px;
            height: 14px;
        }

        .company-quick-search-group {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            vertical-align: middle;
            margin-left: 8px;
        }

        /* Executive & Leadership Intelligence Actions */
        .intelligence-actions-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-top: 4px;
        }

        .intelligence-action-tile {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            text-decoration: none;
            transition: all 0.16s ease;
            box-sizing: border-box;
            min-width: 0;
        }

        .intelligence-action-tile:hover {
            border-color: var(--color-primary);
            background: var(--color-surface-tertiary);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .intelligence-action-icon-wrap {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            flex-shrink: 0;
        }

        .intelligence-action-content {
            display: flex;
            flex-direction: column;
            min-width: 0;
            overflow: hidden;
        }

        .intelligence-action-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-primary);
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .intelligence-action-sub {
            font-size: 11px;
            color: var(--color-text-secondary);
            line-height: 1.3;
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        @media (max-width: 768px) {
            .intelligence-actions-grid {
                grid-template-columns: 1fr;
                gap: 8px;
            }
        }
    </style>
</head>

<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M5MPWNCX"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->

    <!-- 3D WebGL Background Metaballs Canvas -->
    <div id="hero-metaballs" class="site-metaballs-bg" aria-hidden="true"></div>

    <!-- Navigation Header -->
    <header class="app-header" id="appHeader" role="banner">
        <div class="nav-container">
            <!-- Left: Brand Logo & Title -->
            <div class="nav-left">
                <a href="../../" class="brand-link" aria-label="Fundingly.in Home">
                    <div class="brand-icon-wrapper">
                        <img src="../../assets/fundingly_logo.png" alt="Fundingly.in" class="brand-logo" width="34" height="34">
                    </div>
                    <span class="brand-name">Fundingly<span class="brand-tld">.in</span></span>
                </a>
            </div>

            <!-- Center: Navigation Pages (Glassmorphic Capsule) -->
            <nav class="nav-center" aria-label="Main Navigation">
                <div class="nav-glass-capsule">
                    <ul class="nav-links">
                        <li><a href="../../" class="nav-link">Home</a></li>
                        <li><a href="../../deals/" class="nav-link active">Deals</a></li>
                        <li><a href="../../trends/" class="nav-link">Trends</a></li>
                        <li><a href="../../support/" class="nav-link">Support</a></li>
                        <li><a href="../../about/" class="nav-link">About</a></li>
                    </ul>
                </div>
            </nav>

            <!-- Right: Dark Mode Toggle & Mobile Hamburger Menu -->
            <div class="nav-right">
                <button type="button" class="btn-icon-pill" id="themeToggleBtn" title="Toggle light/dark theme" aria-label="Toggle theme appearance">
                    <span class="material-symbols-outlined" id="themeIcon">dark_mode</span>
                </button>
                <button type="button" class="btn-icon-pill btn-mobile-menu" id="mobileMenuBtn" title="Open navigation menu" aria-label="Toggle navigation menu" aria-expanded="false">
                    <span class="material-symbols-outlined" id="mobileMenuIcon">menu</span>
                </button>
            </div>
        </div>

        <!-- Mobile Navigation Drawer Overlay (Glassmorphism Slide-Down) -->
        <div class="mobile-nav-drawer" id="mobileNavDrawer" aria-hidden="true">
            <ul class="mobile-nav-links">
                <li><a href="../../" class="mobile-nav-link"><span class="material-symbols-outlined">home</span><span>Home</span></a></li>
                <li><a href="../../deals/" class="mobile-nav-link active"><span class="material-symbols-outlined">payments</span><span>Deals</span></a></li>
                <li><a href="../../trends/" class="mobile-nav-link"><span class="material-symbols-outlined">monitoring</span><span>Trends</span></a></li>
                <li><a href="../../support/" class="mobile-nav-link"><span class="material-symbols-outlined">volunteer_activism</span><span>Support</span></a></li>
                <li><a href="../../about/" class="mobile-nav-link"><span class="material-symbols-outlined">info</span><span>About</span></a></li>
            </ul>
        </div>
    </header>

    <main class="dossier-page-wrapper" role="main">
        <div class="dossier-layout-grid">
            <!-- Main Column: Exact 1:1 Apple Sheet Modal Card + Full Dataset -->
            <article class="dossier-standalone-card">
                <div class="modal-hero">
                    <!-- Tier 1: Top Bar (Avatar on Left, Badges on Right) -->
                    <div class="modal-hero-top-bar" style="padding-right: 0;">
                        ${avatarHTML}
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="modal-hero-badge ${stageClass}" id="heroRoundBadge">${escapeHtml(deal.funding_round || 'Funding')}</span>
                            ${compData.deals.length > 1 ? `<span class="modal-hero-badge" style="background: var(--color-primary-subtle); color: var(--color-primary); border: 1px solid var(--color-primary-tint); font-weight: 700;">Total: ${totalRaisedFormatted}</span>` : ''}
                        </div>
                    </div>

                    <!-- Tier 2: 100% Full-Width Identity Block -->
                    <div class="modal-hero-identity">
                        <div class="modal-hero-title-wrap">
                            <h1 class="modal-hero-title">${escapeHtml(companyName)}</h1>
                            <div class="company-quick-search-group">
                                <a href="${companyGoogleSearchUrl}" target="_blank" rel="noopener noreferrer" class="company-brand-icon-btn google" title="Search ${escapeHtml(companyName)} on Google" aria-label="Search ${escapeHtml(companyName)} on Google">
                                    <img src="https://cdn.brandfetch.io/google.com/icon" alt="Google" width="14" height="14" class="brand-search-icon" loading="lazy">
                                </a>
                                <a href="${companyLinkedInSearchUrl}" target="_blank" rel="noopener noreferrer" class="company-brand-icon-btn linkedin" title="Search ${escapeHtml(companyName)} on LinkedIn" aria-label="Search ${escapeHtml(companyName)} on LinkedIn">
                                    <img src="https://cdn.brandfetch.io/linkedin.com/icon" alt="LinkedIn" width="14" height="14" class="brand-search-icon" loading="lazy">
                                </a>
                            </div>
                        </div>
                        <div class="modal-hero-subtitle" id="heroSubtitle">
                            ${escapeHtml(subtitleFormatted)}
                        </div>
                    </div>

                    <!-- Tier 3: Unified Actions Toolbar -->
                    <div class="modal-hero-toolbar">
                        <div class="modal-hero-action-row">
                            ${companyDomain ? `
                                <a href="${encodeURI(deal.company_website)}" target="_blank" rel="noopener noreferrer" class="modal-domain-chip" id="heroDomainLink" title="Visit website: ${escapeHtml(deal.company_website)}">
                                    <span class="material-symbols-outlined">language</span>
                                    <span id="heroDomainText">${escapeHtml(companyDomain)}</span>
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
                    <div class="modal-stats-strip" id="dealStatsStrip">
                        <div class="stat-pill-block">
                            <span class="stat-pill-label">Amount Raised</span>
                            <span class="stat-pill-value" id="statAmountUsd">${escapeHtml(amountUsdFormatted)}</span>
                            <span style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;" id="statAmountInr">${amountInrFormatted ? '~ ' + escapeHtml(amountInrFormatted) : ''}</span>
                        </div>
                        <div class="stat-pill-block">
                            <span class="stat-pill-label">Round & Type</span>
                            <span class="stat-pill-value" id="statRound">${escapeHtml(roundName)}</span>
                            <span style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;" id="statType">${escapeHtml(deal.funding_type || 'Equity')}</span>
                        </div>
                        <div class="stat-pill-block">
                            <span class="stat-pill-label">Funding Date</span>
                            <span class="stat-pill-value" id="statDate">${escapeHtml(dateFormatted)}</span>
                            <span style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;" id="statQuarter">${quarterDisplay ? escapeHtml(quarterDisplay) : ''}</span>
                        </div>
                        <div class="stat-pill-block full-span">
                            <span class="stat-pill-label">Lead Investor</span>
                            <span class="stat-pill-value lead-investor" id="statLeadInvestor">${escapeHtml(deal.lead_investor || 'Undisclosed')}</span>
                        </div>
                    </div>
                </div>

                <!-- Section 1: Overview & Thesis -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">corporate_fare</span>
                        <span>Company Overview &amp; Business Model</span>
                    </div>
                    <p class="modal-description-text" id="descOverview">${escapeHtml(deal.company_description || 'No detailed public overview provided for this entity.')}</p>
                </div>

                <!-- Section 2: Product & Solution Breakdown -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">category</span>
                        <span>Product, Technology &amp; Solution</span>
                    </div>
                    <p class="modal-description-text" id="descProduct">${escapeHtml(deal.product_or_solution || deal.product_solution || 'Proprietary technology stack and enterprise workflow platform.')}</p>
                </div>

                <!-- Section 3: Target Market & Vertical Taxonomy -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">hub</span>
                        <span>Market Classification &amp; Target Industry</span>
                    </div>
                    <div class="inspector-grid" style="grid-template-columns: repeat(2, 1fr);">
                        <div class="inspector-item">
                            <span class="inspector-label">Vertical</span>
                            <span class="inspector-val highlight" id="taxVertical">${escapeHtml(deal.vertical || deal.industry || 'Technology')}</span>
                        </div>
                        <div class="inspector-item">
                            <span class="inspector-label">Sub-Vertical</span>
                            <span class="inspector-val" id="taxSubVertical">${escapeHtml(deal.sub_vertical || deal.sub_industry || 'Core Platform')}</span>
                        </div>
                        <div class="inspector-item">
                            <span class="inspector-label">Industry Segment</span>
                            <span class="inspector-val" id="taxSegment">${escapeHtml(deal.segment || deal.vertical || 'General')}</span>
                        </div>
                        <div class="inspector-item">
                            <span class="inspector-label">Target Market Scope</span>
                            <span class="inspector-val" id="taxMarket">${escapeHtml(deal.target_market || 'Domestic & International')}</span>
                        </div>
                    </div>
                </div>

                <!-- Section 4: Use of Funds & Growth Strategy -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">payments</span>
                        <span>Capital Deployment &amp; Use of Funds</span>
                    </div>
                    <p class="modal-description-text" id="descFundingUse">${escapeHtml(deal.funding_use || 'Capital is deployed towards engineering headcount, product expansion, customer acquisition, and operational scaling.')}</p>
                </div>

                <!-- Section 5: Cap Table & Syndicate Participants -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">groups</span>
                        <span>Cap Table &amp; Participating Investors</span>
                    </div>
                    <div class="feature-callout-box" style="margin-bottom: 12px;" id="boxSyndicate">
                        <span class="feature-callout-title">Full Syndicate</span>
                        <span class="feature-callout-desc" id="valSyndicate">${escapeHtml(deal.investors || deal.funded_by || deal.lead_investor || 'Undisclosed Investors')}</span>
                    </div>
                    <div class="inspector-grid" style="grid-template-columns: repeat(2, 1fr);">
                        <div class="inspector-item">
                            <span class="inspector-label">Lead Investor(s)</span>
                            <span class="inspector-val highlight" id="gridLeadInvestor">${escapeHtml(deal.lead_investor || 'Undisclosed')}</span>
                        </div>
                        <div class="inspector-item">
                            <span class="inspector-label">Estimated Valuation</span>
                            <span class="inspector-val" id="gridValuation">${formatUSD(deal.valuation_usd) !== 'Undisclosed' ? formatUSD(deal.valuation_usd) : 'Confidential'}</span>
                        </div>
                    </div>
                </div>

                <!-- Section 6: Founders & Leadership Directory -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">badge</span>
                        <span>Founders &amp; Leadership Directory</span>
                    </div>
                    <div class="founders-container">
                        ${renderFoundersMarkup(deal.founders, companyName)}
                    </div>
                </div>

                <!-- Section 7: Executive & Leadership Intelligence Actions -->
                <div class="modal-section-card intelligence-actions-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">psychology</span>
                        <span>Executive &amp; Leadership Intelligence</span>
                    </div>
                    <div class="intelligence-actions-grid">
                        <a href="${linkedinSearchUrl}" target="_blank" rel="noopener noreferrer" class="intelligence-action-tile" title="Find C-Level Executives on LinkedIn" aria-label="Find C-Level Executives on LinkedIn">
                            <div class="intelligence-action-icon-wrap linkedin">
                                <img src="https://cdn.brandfetch.io/linkedin.com/icon" alt="LinkedIn" width="18" height="18" class="brand-search-icon" loading="lazy">
                            </div>
                            <div class="intelligence-action-content">
                                <span class="intelligence-action-title">Find C-Level Execs</span>
                                <span class="intelligence-action-sub">Search executive team on LinkedIn ↗</span>
                            </div>
                        </a>
                        <a href="${chatgptPromptUrl}" target="_blank" rel="noopener noreferrer" class="intelligence-action-tile" title="Deep executive background research via ChatGPT" aria-label="Deep Leadership Intelligence via ChatGPT">
                            <div class="intelligence-action-icon-wrap chatgpt">
                                <img src="https://cdn.brandfetch.io/openai.com/icon" alt="ChatGPT" width="18" height="18" class="brand-search-icon" loading="lazy">
                            </div>
                            <div class="intelligence-action-content">
                                <span class="intelligence-action-title">Leadership Research</span>
                                <span class="intelligence-action-sub">Executive deep-dive via ChatGPT ↗</span>
                            </div>
                        </a>
                        <a href="${careersSearchUrl}" target="_blank" rel="noopener noreferrer" class="intelligence-action-tile" title="Search active job openings & hiring" aria-label="Search Careers & Job Openings">
                            <div class="intelligence-action-icon-wrap careers">
                                <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary);">work</span>
                            </div>
                            <div class="intelligence-action-content">
                                <span class="intelligence-action-title">Recent Job Openings</span>
                                <span class="intelligence-action-sub">Explore hiring &amp; careers ↗</span>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Section 8: Geographic Footprint & Operating Locations -->
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">location_on</span>
                        <span>Geographic Footprint &amp; Offices</span>
                    </div>
                    <div class="inspector-grid" style="grid-template-columns: repeat(2, 1fr);">
                        <div class="inspector-item">
                            <span class="inspector-label">Headquarters</span>
                            <span class="inspector-val highlight">${escapeHtml(deal.company_headquarters || 'India')}</span>
                        </div>
                        <div class="inspector-item">
                            <span class="inspector-label">Operating Presence</span>
                            <span class="inspector-val">${escapeHtml(deal.other_offices_in_india || deal.other_offices || 'Domestic Network')}</span>
                        </div>
                    </div>
                </div>

                <!-- Section 9: Focus Tags -->
                ${dealTagsHTML ? `
                <div class="modal-section-card">
                    <div class="modal-section-title">
                        <span class="material-symbols-outlined" style="font-size: 15px;">tag</span>
                        <span>Venture Taxonomy &amp; Focus Tags</span>
                    </div>
                    <div class="deal-tags-wrapper">
                        ${dealTagsHTML}
                    </div>
                </div>
                ` : ''}

                <!-- Section 10: Funding History Timeline (Interactive) -->
                ${fundingHistorySection}

                <!-- Section 11: Primary Sources -->
                ${sourceLink}

                <!-- Modal Action Bar -->
                <div class="modal-action-bar">
                    <a href="mailto:hello@fundingly.in?subject=Correction%20Request%3A%20${encodeURIComponent(companyName)}&body=Company%3A%20${encodeURIComponent(companyName)}%0ADomain%3A%20${encodeURIComponent(companyDomain)}%0A%0ARequested%20Correction%3A%0A" class="btn-suggest-correction" title="Report a correction or update for this dossier">
                        <span class="material-symbols-outlined">edit_note</span>
                        <span>Suggest Correction</span>
                    </a>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="btn-detail" onclick="shareDossier()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Share via WhatsApp, X, LinkedIn, or Email">
                            <span class="material-symbols-outlined">share</span>
                            <span>Share</span>
                        </button>
                        <button type="button" class="btn-detail" onclick="copyPageUrl()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Copy URL">
                            <span class="material-symbols-outlined">link</span>
                            <span>Copy Link</span>
                        </button>
                    </div>
                </div>
            </article>

            <!-- Right Sidebar Rail -->
            <aside class="dossier-sidebar">
                <!-- Google AdSense Unit #1 -->
                <div class="ad-container-wrapper">
                    <span class="ad-label">Sponsored Advertisement</span>
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-6148655095183291"
                         data-ad-slot="1876441959"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                    <div class="ad-placeholder-slot">
                        <span class="material-symbols-outlined" style="font-size: 28px; color: var(--color-text-tertiary); margin-bottom: 6px;">ad_units</span>
                        <div class="ad-placeholder-text">Sponsored Advertisement</div>
                        <div class="ad-placeholder-sub">Google AdSense Partner</div>
                    </div>
                    <script>
                         (adsbygoogle = window.adsbygoogle || []).push({});
                    </script>
                </div>

                <!-- Support Our Research Widget -->
                <div class="sidebar-widget support-sidebar-widget">
                    <div class="support-widget-header">
                        <div class="support-widget-icon-wrap">
                            <span class="material-symbols-outlined" style="font-size: 18px;">volunteer_activism</span>
                        </div>
                        <div class="support-widget-title-group">
                            <h3 class="support-widget-heading">Support Our Research</h3>
                            <p class="support-widget-subheading">100% Free &amp; Open Intelligence</p>
                        </div>
                    </div>
                    <p class="support-widget-desc">
                        Help keep Indian startup funding data, trends reports, and dossiers open for all builders without paywalls.
                    </p>
                    <a href="../../support/" class="btn-sidebar-support" title="Support Fundingly Research">
                        <span class="material-symbols-outlined" style="font-size: 15px;">bolt</span>
                        <span>Support via UPI / Card</span>
                    </a>
                </div>

                <!-- Related Sector Deals Widget -->
                ${relatedDeals.length > 0 ? `
                <div class="sidebar-widget">
                    <h3 class="sidebar-widget-title">
                        <span class="material-symbols-outlined">hub</span>
                        <span>Related ${escapeHtml(primarySector || 'Sector')} Deals</span>
                    </h3>
                    <div class="sidebar-related-list">
                        ${relatedDeals.map(rDeal => {
                            const rDomain = extractDomain(rDeal.company_website) || slugify(rDeal.company_name);
                            const rAvatar = renderCompanyAvatarHTML(rDeal);
                            return `
                            <a href="../${rDomain}/" class="sidebar-related-item">
                                ${rAvatar}
                                <div class="sidebar-related-info">
                                    <span class="sidebar-related-name">${escapeHtml(rDeal.company_name)}</span>
                                    <span class="sidebar-related-meta">${formatUSD(rDeal.funding_amount_usd)} • ${escapeHtml(rDeal.funding_round || 'Round')}</span>
                                </div>
                            </a>
                            `;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
            </aside>
        </div>

        <!-- Google AdSense Unit #2 (Bottom Banner) -->
        <div class="bottom-ad-wrapper">
            <span class="ad-label">Sponsored Advertisement</span>
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="ca-pub-6148655095183291"
                 data-ad-slot="6069828671"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
            <div class="ad-placeholder-slot banner">
                <span class="material-symbols-outlined" style="font-size: 22px; color: var(--color-text-tertiary);">ad_units</span>
                <div style="text-align: left;">
                    <div class="ad-placeholder-text">Sponsored Advertisement Space</div>
                    <div class="ad-placeholder-sub">Google AdSense Display Partner Network</div>
                </div>
            </div>
            <script>
                 (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
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
                <a href="../../support/" class="footer-support-btn" title="Support Fundingly Research">
                    <span class="material-symbols-outlined">volunteer_activism</span>
                    <span>Support Our Research</span>
                </a>
                <a href="https://www.linkedin.com/company/fundingly-in" target="_blank" rel="noopener noreferrer" class="footer-social-link" title="Fundingly on LinkedIn" aria-label="Fundingly LinkedIn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 1.63 1.64 1.63 1.63 0 0 0-1.63-1.64Z"/></svg>
                    <span>LinkedIn</span>
                </a>
                <a href="https://www.instagram.com/fundingly.in/" target="_blank" rel="noopener noreferrer" class="footer-social-link" title="Fundingly.in on Instagram" aria-label="Instagram">
                    <svg class="social-svg-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689-.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                    </svg>
                    <span>Instagram</span>
                </a>
            </div>
        </div>
        <div class="main-footer-bottom">
            <p class="main-footer-copy">&copy; 2026 Fundingly.in. All data is compiled from public regulatory filings, press announcements, and verified founder submissions.</p>
            <div class="main-footer-links">
                <a href="../../founders-note/">Founder's Note</a>
                <a href="../../about/">About</a>
                <a href="../../contact/">Contact</a>
                <a href="../../privacy-policy/">Privacy Policy</a>
                <a href="../../terms/">Terms of Service</a>
            </div>
        </div>
    </footer>

    <!-- Floating Toast Notification -->
    <div id="dossierToast" class="dossier-toast" role="status" aria-live="polite">
        <span class="material-symbols-outlined" id="toastIcon" style="font-size: 18px;">check_circle</span>
        <span id="toastMessage">Link copied to clipboard</span>
    </div>

    <!-- Embedded Deals JSON for Multi-Round Switcher -->
    <script id="companyDealsJSON" type="application/json">
${JSON.stringify(compData.deals)}
    </script>

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

            // Mobile Navigation Drawer Toggle Controller
            const menuBtn = document.getElementById('mobileMenuBtn');
            const drawer = document.getElementById('mobileNavDrawer');
            const menuIcon = document.getElementById('mobileMenuIcon');
            if (menuBtn && drawer) {
                const toggleDrawer = (open) => {
                    const isOpen = typeof open === 'boolean' ? open : !drawer.classList.contains('open');
                    if (isOpen) {
                        drawer.classList.add('open');
                        drawer.setAttribute('aria-hidden', 'false');
                        menuBtn.setAttribute('aria-expanded', 'true');
                        if (menuIcon) menuIcon.textContent = 'close';
                    } else {
                        drawer.classList.remove('open');
                        drawer.setAttribute('aria-hidden', 'true');
                        menuBtn.setAttribute('aria-expanded', 'false');
                        if (menuIcon) menuIcon.textContent = 'menu';
                    }
                };
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleDrawer();
                });
                document.addEventListener('click', (e) => {
                    if (!drawer.contains(e.target) && !menuBtn.contains(e.target)) {
                        toggleDrawer(false);
                    }
                });
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') toggleDrawer(false);
                });
            }
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
                '*' + ${JSON.stringify(companyName)} + ' — ' + ${JSON.stringify(roundName)} + ' Funding Dossier*',
                '• Amount Raised: ' + ${JSON.stringify(amountUsdFormatted + (amountInrFormatted ? ' (~ ' + amountInrFormatted + ')' : ''))},
                '• Stage & Type: ' + ${JSON.stringify(roundName + (deal.funding_type ? ' (' + deal.funding_type + ')' : ''))},
                '• Date: ' + ${JSON.stringify(dateFormatted + (quarterDisplay ? ' [' + quarterDisplay + ']' : ''))},
                '• Vertical: ' + ${JSON.stringify((deal.vertical || deal.industry || 'General') + (deal.sub_vertical || deal.sub_industry ? ' (' + (deal.sub_vertical || deal.sub_industry) + ')' : ''))},
                ${JSON.stringify(deal.segment ? '• Segment: ' + deal.segment + (deal.sub_segment ? ' (' + deal.sub_segment + ')' : '') : null)},
                ${JSON.stringify(deal.deal_tags ? '• Focus Tags: ' + deal.deal_tags : null)},
                '• Headquarters: ' + ${JSON.stringify(deal.company_headquarters || 'N/A')},
                ${JSON.stringify(deal.other_offices_in_india ? '• India Offices: ' + deal.other_offices_in_india : null)},
                ${JSON.stringify(deal.founders ? '• Founders: ' + deal.founders : null)},
                ${JSON.stringify(deal.company_website ? '• Website: ' + deal.company_website : null)},
                ${JSON.stringify(deal.product_or_solution ? '• Product / Solution: ' + deal.product_or_solution : null)},
                ${JSON.stringify(deal.target_market ? '• Target Market: ' + deal.target_market : null)},
                ${JSON.stringify(deal.funding_use ? '• Funding Use: ' + deal.funding_use : null)},
                ${JSON.stringify(deal.company_description ? '• Overview: ' + deal.company_description : null)},
                '• Full Intelligence Dossier: ' + window.location.href
            ].filter(Boolean);

            const memo = lines.join('\n');

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

        // Multi-Round Switcher Controller
        const rawDeals = JSON.parse(document.getElementById('companyDealsJSON')?.textContent || '[]');
        window.switchDealRound = function(idx) {
            const d = rawDeals[idx];
            if (!d) return;

            // Update row active state
            document.querySelectorAll('.history-round-row').forEach((row, i) => {
                if (i === idx) {
                    row.classList.add('active');
                    const ind = row.querySelector('.history-round-indicator');
                    if (ind) ind.textContent = 'Active';
                } else {
                    row.classList.remove('active');
                    const ind = row.querySelector('.history-round-indicator');
                    if (ind) ind.textContent = 'View';
                }
            });

            // Update stats
            const statAmtUsd = document.getElementById('statAmountUsd');
            const statAmtInr = document.getElementById('statAmountInr');
            const statRound = document.getElementById('statRound');
            const statType = document.getElementById('statType');
            const statDate = document.getElementById('statDate');
            const statQuarter = document.getElementById('statQuarter');
            const statLead = document.getElementById('statLeadInvestor');
            const heroBadge = document.getElementById('heroRoundBadge');
            const descOverview = document.getElementById('descOverview');
            const descProduct = document.getElementById('descProduct');
            const descFundingUse = document.getElementById('descFundingUse');
            const valSyndicate = document.getElementById('valSyndicate');
            const gridLead = document.getElementById('gridLeadInvestor');
            const gridVal = document.getElementById('gridValuation');

            function fmtUSD(val) {
                if (!val || val === 'Undisclosed') return 'Undisclosed';
                const n = Number(val);
                if (isNaN(n) || n <= 0) return 'Undisclosed';
                if (n >= 1000000000) return '$' + (n / 1000000000).toFixed(1).replace(/\\.0$/, '') + 'B';
                if (n >= 1000000) return '$' + (n / 1000000).toFixed(1).replace(/\\.0$/, '') + 'M';
                if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
                return '$' + n.toLocaleString('en-US');
            }

            if (statAmtUsd) statAmtUsd.textContent = fmtUSD(d.funding_amount_usd);
            if (statRound) statRound.textContent = d.funding_round || 'Funding Round';
            if (statType) statType.textContent = d.funding_type || 'Equity';
            if (statDate) statDate.textContent = d.date_of_funding || 'Recent';
            if (statLead) statLead.textContent = d.lead_investor || 'Undisclosed';
            if (heroBadge) {
                heroBadge.textContent = d.funding_round || 'Funding';
                heroBadge.className = 'modal-hero-badge ' + (d.funding_round ? d.funding_round.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'stage-other');
            }
            if (descOverview && d.company_description) descOverview.textContent = d.company_description;
            if (descProduct && (d.product_or_solution || d.product_solution)) descProduct.textContent = d.product_or_solution || d.product_solution;
            if (descFundingUse && d.funding_use) descFundingUse.textContent = d.funding_use;
            if (valSyndicate) valSyndicate.textContent = d.investors || d.funded_by || d.lead_investor || 'Undisclosed Investors';
            if (gridLead) gridLead.textContent = d.lead_investor || 'Undisclosed';
            if (gridVal) gridVal.textContent = d.valuation_usd ? fmtUSD(d.valuation_usd) : 'Confidential';

            if (d.date_of_funding) {
                history.replaceState(null, '', '#round-' + d.date_of_funding);
            }
        };

        // Activate Round from Hash if present
        if (window.location.hash.startsWith('#round-')) {
            const dateStr = window.location.hash.replace('#round-', '');
            const matchIdx = rawDeals.findIndex(d => d.date_of_funding === dateStr);
            if (matchIdx >= 0) {
                switchDealRound(matchIdx);
            }
        }

        // Ad container placeholder handler
        window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                document.querySelectorAll('.ad-container-wrapper, .bottom-ad-wrapper').forEach(function(el) {
                    var ins = el.querySelector('ins.adsbygoogle');
                    if (ins && (ins.getAttribute('data-ad-status') === 'filled' || ins.querySelector('iframe'))) {
                        el.classList.add('ad-filled');
                    }
                });
            }, 1200);
        });
    </script>
    <!-- 3D Metaballs Canvas Script -->
    <script src="../../js/metaballs.js"></script>
</body>

</html>
`;
}

// Helper: Render company avatar
function renderCompanyAvatarHTML(deal) {
    const companyName = deal.company_name || 'Startup';
    const domain = extractDomain(deal.company_website);
    const mono = getMonogram(companyName);
    const monoStyle = getMonogramStyle(companyName);

    if (domain) {
        return `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128" alt="${escapeHtml(companyName)}" class="modal-hero-avatar" style="width: 32px; height: 32px; border-radius: 8px;" onerror="this.outerHTML='<div class=\\'modal-hero-monogram\\' style=\\'width:32px; height:32px; font-size:12px; border-radius:8px; background:${monoStyle.bg}; color:${monoStyle.color}; border:1px solid ${monoStyle.border};\\'>${mono}</div>'">`;
    }
    return `<div class="modal-hero-monogram" style="width:32px; height:32px; font-size:12px; border-radius:8px; background:${monoStyle.bg}; color:${monoStyle.color}; border:1px solid ${monoStyle.border};">${mono}</div>`;
}

// Generate sitemap.xml
function generateSitemap(companyUrls, nowISO) {
    const staticPages = [
        { url: 'https://fundingly.in/', priority: '1.0', changefreq: 'daily' },
        { url: 'https://fundingly.in/deals/', priority: '1.0', changefreq: 'daily' },
        { url: 'https://fundingly.in/trends/', priority: '0.9', changefreq: 'daily' },
        { url: 'https://fundingly.in/about/', priority: '0.6', changefreq: 'monthly' },
        { url: 'https://fundingly.in/support/', priority: '0.7', changefreq: 'monthly' },
        { url: 'https://fundingly.in/contact/', priority: '0.6', changefreq: 'monthly' },
        { url: 'https://fundingly.in/privacy-policy/', priority: '0.5', changefreq: 'monthly' },
        { url: 'https://fundingly.in/terms/', priority: '0.5', changefreq: 'monthly' },
        { url: 'https://fundingly.in/founders-note/', priority: '0.8', changefreq: 'weekly' }
    ];

    const TRENDS_DIR = path.join(REPO_ROOT, 'trends');
    const trendsUrls = [];
    if (fs.existsSync(TRENDS_DIR)) {
        const weekFolders = fs.readdirSync(TRENDS_DIR).filter(f => f.startsWith('week-') && fs.statSync(path.join(TRENDS_DIR, f)).isDirectory());
        weekFolders.forEach(folder => {
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
