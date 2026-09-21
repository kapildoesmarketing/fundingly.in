/**
 * ============================================================================
 * FUNDINGLY.IN — STATIC WEEKLY TREND REPORT GENERATOR (SEO, SHARING & ADS)
 * ============================================================================
 * Target: Generates 100% pre-rendered, static HTML pages matching the exact
 * 1:1 Apple-style weekly intelligence trend modal UI, complete with:
 * - 4-Tile Hero Velocity KPI Strip (Total Capital, Deals, Median Check, Top Deal)
 * - Stage Distribution Continuous Segmented Bar + Color Legend
 * - 3-Tier Hierarchical Industry Hotspot Drilldown
 * - 2-Column Regional Deal Hubs & Active Lead Investors Grid
 * - Top Showcase Deals Roster with Direct Links to Company Dossiers
 * - Multi-Channel Sharing (Native Share, WhatsApp, X/Twitter, LinkedIn, Copy Digest, Print)
 * - Dynamic SEO meta tags, title tags, OpenGraph & Twitter Cards
 * - Schema.org JSON-LD Structured Data (Report, BreadcrumbList)
 * - Sidebar & Bottom Google AdSense ad slots (content remains pure & unscattered)
 * - Sidebar Weekly Archive Navigator (instant jumping between weekly reports)
 * - Apple-grade responsive design & Dark/Light mode support
 * - Automatic sitemap.xml generation
 * - 100% $0 serverless deployment on GitHub Pages
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const TRENDS_DIR = path.join(REPO_ROOT, 'trends');
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
            return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    return String(dateStr);
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

    // Monday and Sunday of that week
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - 3);
    const sunday = new Date(d);
    sunday.setUTCDate(d.getUTCDate() + 3);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monStr = `${monthNames[monday.getUTCMonth()]} ${monday.getUTCDate()}`;
    const sunStr = `${monthNames[sunday.getUTCMonth()]} ${sunday.getUTCDate()}, ${sunday.getUTCFullYear()}`;
    const rangeStr = `${monStr} – ${sunStr}`;

    const qNum = Math.floor(monday.getUTCMonth() / 3) + 1;
    const qKey = `${isoYear}_q${qNum}`;
    const qTitle = `${isoYear} Q${qNum}`;
    const qRanges = ['Jan – Mar', 'Apr – Jun', 'Jul – Sep', 'Oct – Dec'];
    const qDateRange = `${qRanges[qNum - 1]} ${isoYear}`;

    return {
        key: `${isoYear}-W${String(weekNo).padStart(2, '0')}`,
        weekNo: weekNo,
        year: isoYear,
        quarterNum: qNum,
        quarterKey: qKey,
        quarterTitle: qTitle,
        quarterDateRange: qDateRange,
        title: `Week ${weekNo} of ${isoYear}`,
        rangeStr: rangeStr,
        timestamp: monday.getTime(),
        startDateISO: monday.toISOString().split('T')[0],
        endDateISO: sunday.toISOString().split('T')[0]
    };
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

// Helper: Render Drilldown HTML
function renderDrilldownListHTML(categories) {
    if (!categories || categories.length === 0) {
        return `<span style="color: var(--color-text-secondary); font-size: 11.5px;">No sector data recorded for this week.</span>`;
    }
    return categories.map(v => {
        const subCats = v.subCategories || [];
        const subListHtml = subCats.map(sub => {
            const comps = sub.companies || [];
            const companyListHtml = comps.map(comp => {
                const avatarHtml = renderCompanyAvatarHTML(comp);
                const cDomain = extractDomain(comp.company_website) || slugify(comp.company_name);
                const companyUrl = `../../company/${cDomain}/`;
                return `
                    <div class="trends-drill-company-row">
                        <div class="trends-deal-left">
                            <a href="${companyUrl}" class="avatar-link" aria-label="View ${escapeHtml(comp.company_name || 'Enterprise')}">${avatarHtml}</a>
                            <div style="min-width: 0;">
                                <a href="${companyUrl}" class="company-title-link" style="text-decoration: none; color: inherit;">
                                    <div class="trends-deal-title">${escapeHtml(comp.company_name || 'Enterprise')}</div>
                                </a>
                                <div class="trends-deal-meta">${escapeHtml(comp.funding_round || 'Round')}${comp.lead_investor ? ' • ' + escapeHtml(comp.lead_investor) : ''}</div>
                            </div>
                        </div>
                        <div class="trends-deal-right">
                            <div class="trends-deal-amount">${formatUSD(comp.funding_amount_usd)}</div>
                            <a href="${companyUrl}" class="btn-trends-memo" aria-label="View details for ${escapeHtml(comp.company_name || 'Enterprise')}">
                                <span>View Details</span>
                                <span class="material-symbols-outlined" style="font-size: 13px;">arrow_outward</span>
                            </a>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="trends-drill-sub-item">
                    <div class="trends-drill-sub-header" role="button" tabindex="0" onclick="toggleTrendsDrilldown(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleTrendsDrilldown(this);}">
                        <button type="button" class="trends-drill-chevron" aria-label="Toggle ${escapeHtml(sub.name)}" tabindex="-1">
                            <span class="material-symbols-outlined">chevron_right</span>
                        </button>
                        <div class="trends-drill-info">
                            <div class="trends-progress-labels">
                                <span class="trends-sub-name" title="${escapeHtml(sub.name)}">${escapeHtml(sub.name)}</span>
                                <span class="trends-progress-val">${formatUSD(sub.amount)} • ${sub.count} ${sub.count === 1 ? 'deal' : 'deals'} (${sub.pctOfParent}%)</span>
                            </div>
                            <div class="trends-progress-track sub-track">
                                <div class="trends-progress-fill" style="width: ${Math.max(sub.pctOfParent, 3)}%;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="trends-drill-company-list">
                        ${companyListHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="trends-drill-item">
                <div class="trends-drill-header" role="button" tabindex="0" onclick="toggleTrendsDrilldown(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleTrendsDrilldown(this);}">
                    <button type="button" class="trends-drill-chevron" aria-label="Toggle ${escapeHtml(v.name)}" tabindex="-1">
                        <span class="material-symbols-outlined">chevron_right</span>
                    </button>
                    <div class="trends-drill-info">
                        <div class="trends-progress-labels">
                            <span class="trends-progress-name" title="${escapeHtml(v.name)}">${escapeHtml(v.name)}</span>
                            <span class="trends-progress-val">${formatUSD(v.amount)} • ${v.count} ${v.count === 1 ? 'deal' : 'deals'} (${v.pct}%)</span>
                        </div>
                        <div class="trends-progress-track">
                            <div class="trends-progress-fill" style="width: ${Math.max(v.pct, 3)}%;"></div>
                        </div>
                    </div>
                </div>
                <div class="trends-drill-sub-list">
                    ${subListHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Main Build Function
function buildStaticTrendPages() {
    console.log('🚀 Starting Fundingly.in Static Weekly Trend Reports Generation...');

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

    // Group deals by week
    const weekMap = new Map();
    allDeals.forEach(deal => {
        if (!deal || !deal.date_of_funding) return;
        const wInfo = getWeekInfo(deal.date_of_funding);
        if (!wInfo) return;

        if (!weekMap.has(wInfo.key)) {
            weekMap.set(wInfo.key, {
                weekInfo: wInfo,
                deals: []
            });
        }
        weekMap.get(wInfo.key).deals.push(deal);
    });

    // Chronologically sort all weeks
    const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => a.weekInfo.timestamp - b.weekInfo.timestamp);
    console.log(`📅 Discovered ${sortedWeeks.length} active funding weeks.`);

    ensureDir(TRENDS_DIR);

    const generatedUrls = [];
    const nowISO = new Date().toISOString().split('T')[0];

    // Compute metrics for each week
    const weekMetricsList = sortedWeeks.map((wGroup, index) => {
        const weekDeals = wGroup.deals;
        const wInfo = wGroup.weekInfo;
        const prevGroup = index > 0 ? sortedWeeks[index - 1] : null;

        // Core KPIs
        let totalCapital = 0;
        let capitalDealCount = 0;
        const validAmounts = [];

        weekDeals.forEach(c => {
            const amt = Number(c.funding_amount_usd);
            if (!isNaN(amt) && amt > 0) {
                totalCapital += amt;
                capitalDealCount++;
                validAmounts.push(amt);
            }
        });

        const dealCount = weekDeals.length;
        validAmounts.sort((a, b) => a - b);

        let medianCheck = 0;
        if (validAmounts.length > 0) {
            const mid = Math.floor(validAmounts.length / 2);
            medianCheck = validAmounts.length % 2 !== 0 ? validAmounts[mid] : (validAmounts[mid - 1] + validAmounts[mid]) / 2;
        }

        const avgRound = capitalDealCount > 0 ? totalCapital / capitalDealCount : 0;

        // Prior week comparison
        let prevTotalCapital = 0;
        let prevDealCount = prevGroup ? prevGroup.deals.length : 0;
        if (prevGroup) {
            prevGroup.deals.forEach(c => {
                const amt = Number(c.funding_amount_usd);
                if (!isNaN(amt) && amt > 0) prevTotalCapital += amt;
            });
        }

        let capitalDeltaPct = null;
        if (prevGroup && prevTotalCapital > 0) {
            capitalDeltaPct = Math.round(((totalCapital - prevTotalCapital) / prevTotalCapital) * 100);
        }

        let dealDeltaCount = prevGroup ? dealCount - prevDealCount : null;

        // Largest deal
        let topDeal = null;
        let maxAmt = -1;
        weekDeals.forEach(c => {
            const amt = Number(c.funding_amount_usd) || 0;
            if (amt > maxAmt) {
                maxAmt = amt;
                topDeal = c;
            }
        });
        if (!topDeal && weekDeals.length > 0) topDeal = weekDeals[0];

        // Stage allocation
        const stageDefs = [
            { id: 'seed', label: 'Seed / Angel', color: '#34a853', match: r => r.includes('seed') || r.includes('angel') || r.includes('pre-seed') },
            { id: 'series_a', label: 'Series A', color: '#1a73e8', match: r => r.includes('series a') },
            { id: 'series_bc', label: 'Series B / C', color: '#8e24aa', match: r => r.includes('series b') || r.includes('series c') },
            { id: 'growth', label: 'Growth / Late', color: '#e37400', match: r => r.includes('growth') || r.includes('series d') || r.includes('series e') || r.includes('series f') || r.includes('late') },
            { id: 'other', label: 'Debt / Other', color: '#5f6368', match: () => true }
        ];

        const stageStats = stageDefs.map(def => ({ ...def, amount: 0, count: 0, pct: 0 }));

        weekDeals.forEach(c => {
            const r = (c.funding_round || '').toLowerCase().trim();
            const amt = Number(c.funding_amount_usd) || 0;
            let assigned = false;
            for (let i = 0; i < stageStats.length - 1; i++) {
                if (stageStats[i].match(r)) {
                    stageStats[i].amount += amt;
                    stageStats[i].count += 1;
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                stageStats[stageStats.length - 1].amount += amt;
                stageStats[stageStats.length - 1].count += 1;
            }
        });

        const baseForStagePct = totalCapital > 0 ? totalCapital : dealCount;
        stageStats.forEach(st => {
            st.pct = baseForStagePct > 0 ? Math.round(((totalCapital > 0 ? st.amount : st.count) / baseForStagePct) * 100) : 0;
        });

        // 3-Tier Industry Drilldown
        const indMap = new Map();
        weekDeals.forEach(c => {
            const ind = (c.industry && c.industry.trim()) || 'General / Other';
            const subInd = (c.sub_industry && c.sub_industry.trim()) || 'Core / General';
            const amt = Number(c.funding_amount_usd) || 0;
            if (!indMap.has(ind)) indMap.set(ind, { name: ind, amount: 0, count: 0, subMap: new Map() });
            const item = indMap.get(ind);
            item.amount += amt;
            item.count += 1;
            if (!item.subMap.has(subInd)) item.subMap.set(subInd, { name: subInd, amount: 0, count: 0, companies: [] });
            const subItem = item.subMap.get(subInd);
            subItem.amount += amt;
            subItem.count += 1;
            subItem.companies.push(c);
        });

        const topIndustries = Array.from(indMap.values())
            .sort((a, b) => b.amount - a.amount || b.count - a.count)
            .slice(0, 5)
            .map(ind => ({
                name: ind.name,
                amount: ind.amount,
                count: ind.count,
                pct: totalCapital > 0 ? Math.round((ind.amount / totalCapital) * 100) : (dealCount > 0 ? Math.round((ind.count / dealCount) * 100) : 0),
                subCategories: Array.from(ind.subMap.values())
                    .sort((a, b) => b.amount - a.amount || b.count - a.count)
                    .map(sub => ({
                        name: sub.name,
                        amount: sub.amount,
                        count: sub.count,
                        pctOfParent: ind.amount > 0 ? Math.round((sub.amount / ind.amount) * 100) : (ind.count > 0 ? Math.round((sub.count / ind.count) * 100) : 0),
                        companies: [...sub.companies].sort((a, b) => (Number(b.funding_amount_usd) || 0) - (Number(a.funding_amount_usd) || 0))
                    }))
            }));

        // Regional Hubs
        const hubMap = new Map();
        weekDeals.forEach(c => {
            const hq = (c.company_headquarters && c.company_headquarters.trim()) || 'Undisclosed';
            const city = hq.split(/[,;\/]/)[0].trim() || 'Undisclosed';
            if (!hubMap.has(city)) hubMap.set(city, { city: city, count: 0 });
            hubMap.get(city).count += 1;
        });
        const topHubs = Array.from(hubMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(h => ({
                ...h,
                pct: dealCount > 0 ? Math.round((h.count / dealCount) * 100) : 0
            }));

        // Active Lead Investors
        const invMap = new Map();
        weekDeals.forEach(c => {
            const invStr = c.lead_investor || c.funded_by || '';
            if (invStr && invStr !== 'Undisclosed' && invStr !== 'N/A' && invStr !== '-') {
                const list = invStr.split(/[,;&]+/).map(s => s.trim()).filter(s => s.length > 1 && s.toLowerCase() !== 'undisclosed');
                list.forEach(name => {
                    if (!invMap.has(name)) invMap.set(name, { name: name, count: 0 });
                    invMap.get(name).count += 1;
                });
            }
        });
        const topInvestors = Array.from(invMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Top 3 Showcase Deals
        const showcaseDeals = [...weekDeals]
            .sort((a, b) => (Number(b.funding_amount_usd) || 0) - (Number(a.funding_amount_usd) || 0))
            .slice(0, 3);

        const slug = `week-${wInfo.weekNo}-${wInfo.year}`;

        return {
            slug,
            weekInfo: wInfo,
            dealCount,
            totalCapital,
            medianCheck,
            avgRound,
            capitalDeltaPct,
            dealDeltaCount,
            prevGroup,
            topDeal,
            stageStats,
            topIndustries,
            topHubs,
            topInvestors,
            showcaseDeals,
            allWeekDeals: weekDeals
        };
    });

    // Generate static page for each week
    weekMetricsList.forEach((metric) => {
        const htmlContent = generateTrendPageHtml(metric, weekMetricsList);

        const weekFolder = path.join(TRENDS_DIR, metric.slug);
        ensureDir(weekFolder);
        fs.writeFileSync(path.join(weekFolder, 'index.html'), htmlContent, 'utf8');

        generatedUrls.push({
            url: `https://fundingly.in/trends/${metric.slug}/`,
            lastmod: metric.weekInfo.endDateISO || nowISO,
            priority: '0.9'
        });
    });

    // Update sitemap.xml with all static pages, company pages, and trends
    updateGlobalSitemap(generatedUrls, nowISO);

    console.log(`✅ Successfully generated ${weekMetricsList.length} static weekly trend report pages & updated sitemap.xml!`);
}

// Generate HTML for a single weekly trend report
function generateTrendPageHtml(trends, allWeekMetricsList) {
    const wInfo = trends.weekInfo;
    const weekNo = wInfo.weekNo;
    const year = wInfo.year;
    const rangeStr = wInfo.rangeStr;
    const weekTitle = `Week ${weekNo} of ${year}`;
    const totalCapitalFormatted = formatUSD(trends.totalCapital);
    const topDealName = trends.topDeal ? escapeHtml(trends.topDeal.company_name || 'Enterprise') : 'N/A';
    const topDealAmount = trends.topDeal ? formatUSD(trends.topDeal.funding_amount_usd) : 'N/A';
    const topDealSub = trends.topDeal ? `${topDealAmount} • ${escapeHtml(trends.topDeal.funding_round || 'Round')}` : 'N/A';

    // SEO Dynamic Content
    const pageTitle = `Week ${weekNo} (${year}) Indian Startup Funding Trends & Capital Report | Fundingly.in`;
    const pageDescription = `Indian startup funding intelligence report for Week ${weekNo}, ${year} (${rangeStr}). ${totalCapitalFormatted} deployed across ${trends.dealCount} announced rounds. Top deal: ${topDealName} (${topDealAmount}). Explore stage breakdowns, industry hotspots, and investor activity on Fundingly.in.`;
    const canonicalUrl = `https://fundingly.in/trends/${trends.slug}/`;

    // Social Sharing Text
    const shareText = `📊 Indian Startup Funding Intelligence — Week ${weekNo}, ${year} (${rangeStr})\n• Capital Deployed: ${totalCapitalFormatted} across ${trends.dealCount} deals\n• Median Check: ${formatUSD(trends.medianCheck)}\n• Top Deal: ${topDealName} (${topDealAmount})\n\nExplore the full weekly trends report on Fundingly.in:`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + canonicalUrl)}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(canonicalUrl)}&hashtags=IndianStartups,VentureCapital,WeeklyFunding,StartupIndia`;
    const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`;

    // KPI Subtitle texts
    let capitalSub = `<span class="trends-kpi-sub">Across ${trends.dealCount} rounds</span>`;
    if (trends.capitalDeltaPct !== null) {
        const isUp = trends.capitalDeltaPct >= 0;
        const deltaClass = isUp ? 'delta-up' : 'delta-down';
        const deltaIcon = isUp ? 'trending_up' : 'trending_down';
        const deltaSign = isUp ? '+' : '';
        capitalSub = `<span class="trends-kpi-sub ${deltaClass}"><span class="material-symbols-outlined" style="font-size: 12px;">${deltaIcon}</span>${deltaSign}${trends.capitalDeltaPct}% WoW</span>`;
    }

    let dealSub = `<span class="trends-kpi-sub">Avg ${formatUSD(trends.avgRound)} / round</span>`;
    if (trends.dealDeltaCount !== null) {
        const dealSign = trends.dealDeltaCount >= 0 ? '+' : '';
        dealSub = `<span class="trends-kpi-sub">${dealSign}${trends.dealDeltaCount} deals vs prior week</span>`;
    }

    // Markdown Digest String for Clipboard
    const digestLines = [
        `📊 *Weekly Venture Intelligence: Week ${weekNo} of ${year} (${rangeStr})*`,
        `• Total Capital Deployed: ${totalCapitalFormatted} across ${trends.dealCount} deals`,
        `• Median Check Size: ${formatUSD(trends.medianCheck)} | Avg Round: ${formatUSD(trends.avgRound)}`,
        trends.capitalDeltaPct !== null ? `• Capital Velocity: ${trends.capitalDeltaPct >= 0 ? '+' : ''}${trends.capitalDeltaPct}% WoW vs prior week` : null,
        trends.topDeal ? `• Top Funded Deal: ${trends.topDeal.company_name} (${topDealAmount}, ${trends.topDeal.funding_round || 'Round'})` : null,
        '',
        `💼 *Capital Allocation by Stage:*`,
        ...trends.stageStats.filter(s => s.count > 0).map(s => `• ${s.label}: ${formatUSD(s.amount)} (${s.count} deals • ${s.pct}%)`),
        '',
        `🚀 *Industry Hotspots:*`,
        ...trends.topIndustries.map((ind, idx) => `${idx + 1}. ${ind.name}: ${formatUSD(ind.amount)} (${ind.count} deals)`),
        '',
        `📍 *Top Regional Hubs:*`,
        ...trends.topHubs.map(h => `• ${h.city}: ${h.count} deals (${h.pct}%)`),
        '',
        `🏆 *Top Showcase Deals:*`,
        ...trends.showcaseDeals.map(d => `• ${d.company_name} — ${formatUSD(d.funding_amount_usd)} (${d.funding_round || 'Round'})${d.lead_investor ? ' | Lead: ' + d.lead_investor : ''}${d.company_website ? ' [' + d.company_website + ']' : ''}`)
    ].filter(item => item !== null);
    const digestText = digestLines.join('\n');

    // Archive / Navigation List (Other Available Weeks sorted reverse chronologically)
    const otherWeeks = [...allWeekMetricsList]
        .sort((a, b) => b.weekInfo.timestamp - a.weekInfo.timestamp);

    // JSON-LD Schemas
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Report",
                "@id": `${canonicalUrl}#report`,
                "headline": `Week ${weekNo} (${year}) Indian Startup Funding Trends & Capital Report`,
                "description": pageDescription,
                "url": canonicalUrl,
                "datePublished": wInfo.endDateISO || undefined,
                "author": {
                    "@type": "Person",
                    "name": "Kapil Pidhwani",
                    "url": "https://fundingly.in/founders-note/"
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Fundingly.in",
                    "url": "https://fundingly.in/",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "https://fundingly.in/assets/fundingly_logo.png"
                    }
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
                        "name": `Week ${weekNo}, ${year}`,
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
        .trends-page-wrapper {
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
        .trends-layout-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 320px;
            gap: 24px;
            align-items: start;
        }

        /* Main Trends Standalone Card (1:1 Modal Parity) */
        .trends-standalone-card {
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-sheet);
            padding: 32px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
            position: relative;
        }

        .trends-hero-header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--color-hairline);
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 12px;
        }

        .trends-hero-title {
            font-size: 26px;
            font-weight: 700;
            color: var(--color-text-primary);
            letter-spacing: -0.02em;
            margin: 0 0 4px 0;
        }

        .trends-hero-sub {
            font-size: 13.5px;
            color: var(--color-text-secondary);
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .trends-quarter-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            background: var(--color-primary-subtle);
            color: var(--color-primary);
            border: 1px solid var(--color-primary-tint);
            border-radius: var(--radius-pill);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        /* Right Sidebar Layout */
        .trends-sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
            position: sticky;
            top: 80px;
        }

        .ad-container-wrapper {
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-sheet);
            padding: 16px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
            overflow: hidden;
            min-height: 250px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        .ad-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
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
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--color-text-secondary);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .sidebar-widget-title .material-symbols-outlined {
            font-size: 16px;
            color: var(--color-primary);
        }

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
            border-radius: var(--radius-inner);
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
            border: 1px solid var(--color-hairline);
            background: var(--color-surface-secondary);
            color: var(--color-text-primary);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .share-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .share-btn.whatsapp:hover {
            background: #25D366;
            color: #ffffff;
            border-color: #25D366;
        }

        .share-btn.twitter:hover {
            background: #1DA1F2;
            color: #ffffff;
            border-color: #1DA1F2;
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

        /* Weekly Archives List */
        .sidebar-weeks-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-height: 280px;
            overflow-y: auto;
        }

        .sidebar-week-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            text-decoration: none;
            color: inherit;
            transition: all 0.15s ease;
            font-size: 12.5px;
        }

        .sidebar-week-item:hover {
            background: var(--color-surface-tertiary);
            transform: translateY(-1px);
        }

        .sidebar-week-item.active {
            background: var(--color-primary-subtle);
            border-color: var(--color-primary-tint);
            color: var(--color-primary);
            font-weight: 700;
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
        .trends-toast {
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

        .trends-toast.active {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
            pointer-events: auto;
        }

        [data-theme="dark"] .trends-toast {
            background: rgba(245, 245, 247, 0.94);
            color: #121215;
        }

        @media (max-width: 960px) {
            .trends-layout-grid {
                grid-template-columns: 1fr;
            }
            .trends-sidebar {
                position: static;
            }
            .trends-standalone-card {
                padding: 24px 18px;
            }
        }

        /* Print Optimization */
        @media print {
            .app-header,
            .page-nav-bar,
            .trends-sidebar,
            .bottom-ad-wrapper,
            .trends-toast,
            .app-main-footer,
            .trends-hero-actions,
            .modal-action-bar,
            .btn-trends-memo {
                display: none !important;
            }
            .trends-layout-grid {
                grid-template-columns: 1fr !important;
            }
            .trends-standalone-card {
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

    <main class="trends-page-wrapper" role="main">
        <!-- Top Navigation Bar -->
        <nav class="page-nav-bar" aria-label="Navigation">
            <a href="../../" class="page-nav-back">
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                <span>Back to Live Feed</span>
            </a>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn-detail" onclick="shareWeeklyReport()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Share Weekly Trends">
                    <span class="material-symbols-outlined" style="font-size: 16px;">share</span>
                    <span>Share</span>
                </button>
                <button type="button" class="btn-detail" onclick="window.print()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Print or save as PDF">
                    <span class="material-symbols-outlined" style="font-size: 16px;">print</span>
                    <span>Print PDF</span>
                </button>
            </div>
        </nav>

        <div class="trends-layout-grid">
            <!-- Main Column: Exact 1:1 Apple Sheet Trends Card -->
            <article class="trends-standalone-card">
                <!-- Header Identity & Actions -->
                <div class="trends-hero-header">
                    <div>
                        <h1 class="trends-hero-title">${escapeHtml(weekTitle)}</h1>
                        <div class="trends-hero-sub">
                            <span>${escapeHtml(rangeStr)}</span>
                            <span>•</span>
                            <span>${trends.dealCount} ${trends.dealCount === 1 ? 'Announced Deal' : 'Announced Deals'}</span>
                            <span class="trends-quarter-badge">${escapeHtml(wInfo.quarterTitle)}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="btn-pill-action" id="btnTrendsCopyDigest" onclick="copyWeeklyDigest()" title="Copy weekly briefing to clipboard" aria-label="Copy Weekly Digest">
                            <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
                            <span>Copy Digest</span>
                        </button>
                        <button type="button" class="btn-pill-action" onclick="window.print()" title="Print weekly report" aria-label="Print Weekly Report">
                            <span class="material-symbols-outlined" style="font-size: 14px;">print</span>
                            <span>Print</span>
                        </button>
                    </div>
                </div>

                <!-- Module A: 4-Tile Hero Velocity KPI Strip -->
                <div class="trends-kpi-grid">
                    <div class="trends-kpi-card">
                        <span class="trends-kpi-label">Total Capital</span>
                        <span class="trends-kpi-val">${totalCapitalFormatted}</span>
                        ${capitalSub}
                    </div>
                    <div class="trends-kpi-card">
                        <span class="trends-kpi-label">Deals Announced</span>
                        <span class="trends-kpi-val">${trends.dealCount} Deals</span>
                        ${dealSub}
                    </div>
                    <div class="trends-kpi-card">
                        <span class="trends-kpi-label">Median Check</span>
                        <span class="trends-kpi-val">${formatUSD(trends.medianCheck)}</span>
                        <span class="trends-kpi-sub">Mid-market baseline</span>
                    </div>
                    <div class="trends-kpi-card">
                        <span class="trends-kpi-label">Largest Deal</span>
                        <span class="trends-kpi-val" title="${topDealName}">${topDealName}</span>
                        <span class="trends-kpi-sub" title="${escapeHtml(topDealSub)}">${topDealSub}</span>
                    </div>
                </div>

                <!-- Module B: Capital Allocation by Stage (Continuous Segmented Bar + Legend) -->
                <div class="trends-section-card">
                    <div class="trends-section-title">Capital Allocation by Stage</div>
                    <div class="trends-segmented-bar">
                        ${trends.stageStats.filter(st => (trends.totalCapital > 0 ? st.amount : st.count) > 0).map(st => `
                            <div class="trends-bar-segment" style="flex: ${trends.totalCapital > 0 ? st.amount : st.count}; background-color: ${st.color};" title="${escapeHtml(st.label)}: ${formatUSD(st.amount)} (${st.pct}%)"></div>
                        `).join('')}
                    </div>
                    <div class="trends-stage-legend">
                        ${trends.stageStats.map(st => `
                            <div class="trends-stage-item">
                                <span class="trends-color-dot" style="background-color: ${st.color};"></span>
                                <span>${escapeHtml(st.label)}: <strong>${formatUSD(st.amount)}</strong> (${st.count} ${st.count === 1 ? 'deal' : 'deals'} • ${st.pct}%)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Module C: Industry Hotspots (3-Tier Hierarchical Drilldown) -->
                <div class="trends-section-card">
                    <div class="trends-section-title">
                        <span>Industry Hotspots</span>
                    </div>
                    <div id="trendsIndustryView" class="trends-progress-list">
                        ${renderDrilldownListHTML(trends.topIndustries)}
                    </div>
                </div>

                <!-- Modules D & E: 2-Column Split Grid (Regional Hubs & Active Lead Investors) -->
                <div class="trends-split-grid">
                    <div class="trends-section-card" style="margin-bottom: 0;">
                        <div class="trends-section-title">Regional Deal Hubs</div>
                        <div class="trends-hub-pills">
                            ${trends.topHubs.length > 0 ? trends.topHubs.map(h => `
                                <div class="trends-hub-pill">
                                    📍 ${escapeHtml(h.city)}: <strong>${h.count} ${h.count === 1 ? 'deal' : 'deals'}</strong> (${h.pct}%)
                                </div>
                            `).join('') : '<span style="color: var(--color-text-secondary); font-size: 11.5px;">No regional headquarters recorded.</span>'}
                        </div>
                    </div>
                    <div class="trends-section-card" style="margin-bottom: 0;">
                        <div class="trends-section-title">Active Lead Investors</div>
                        <div class="trends-investor-list">
                            ${trends.topInvestors.length > 0 ? trends.topInvestors.map(inv => `
                                <div class="trends-investor-item">
                                    <span class="trends-investor-name" title="${escapeHtml(inv.name)}">${escapeHtml(inv.name)}</span>
                                    <span class="trends-investor-count">${inv.count} ${inv.count === 1 ? 'deal' : 'deals'}</span>
                                </div>
                            `).join('') : '<span style="color: var(--color-text-secondary); font-size: 11.5px;">All investors undisclosed this week.</span>'}
                        </div>
                    </div>
                </div>

                <!-- Module F: Top Showcase Deals of the Week -->
                <div class="trends-section-card" style="margin-top: 14px;">
                    <div class="trends-section-title">Top Showcase Deals of the Week</div>
                    <div class="trends-deal-roster">
                        ${trends.showcaseDeals.map((deal) => {
                            const avatarHtml = renderCompanyAvatarHTML(deal);
                            const cDomain = extractDomain(deal.company_website) || slugify(deal.company_name);
                            const companyUrl = `../../company/${cDomain}/`;
                            return `
                                <div class="trends-deal-row">
                                    <div class="trends-deal-left">
                                        <a href="${companyUrl}" class="avatar-link" aria-label="View ${escapeHtml(deal.company_name || 'Enterprise')}">${avatarHtml}</a>
                                        <div style="min-width: 0;">
                                            <a href="${companyUrl}" class="company-title-link" style="text-decoration: none; color: inherit;"><div class="trends-deal-title">${escapeHtml(deal.company_name || 'Enterprise')}</div></a>
                                            <div class="trends-deal-meta">${escapeHtml(deal.funding_round || 'Round')}${deal.lead_investor ? ' • ' + escapeHtml(deal.lead_investor) : ''}</div>
                                        </div>
                                    </div>
                                    <div class="trends-deal-right">
                                        <div class="trends-deal-amount">${formatUSD(deal.funding_amount_usd)}</div>
                                        <a href="${companyUrl}" class="btn-trends-memo" aria-label="View details for ${escapeHtml(deal.company_name)}">
                                            <span>View Details</span>
                                            <span class="material-symbols-outlined" style="font-size: 13px;">arrow_outward</span>
                                        </a>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Action Bar -->
                <div class="modal-action-bar" style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-hairline); flex-wrap: wrap; gap: 12px;">
                    <a href="mailto:hello@fundingly.in?subject=Trend%20Report%20Feedback%3A%20Week%20${encodeURIComponent(weekNo)}%20(${encodeURIComponent(year)})&body=${encodeURIComponent('Hello Fundingly Team,\n\nI have feedback/insights regarding the Week ' + weekNo + ', ' + year + ' trends report:\n\n[Please describe your observations]\n\nThank you!')}" class="btn-suggest-correction" title="Report feedback or updated intelligence">
                        <span class="material-symbols-outlined" style="font-size: 16px;">edit_note</span>
                        <span>Feedback / Corrections</span>
                    </a>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="btn-detail" onclick="copyWeeklyDigest()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Copy markdown weekly digest">
                            <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            <span>Copy Digest</span>
                        </button>
                        <button type="button" class="btn-detail" onclick="copyPageUrl()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Copy canonical page URL">
                            <span class="material-symbols-outlined" style="font-size: 16px;">link</span>
                            <span>Copy Link</span>
                        </button>
                    </div>
                </div>
            </article>

            <!-- Right Sidebar: Sticky Ad Unit + Share Suite + Weekly Reports Archive -->
            <aside class="trends-sidebar">
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
                        <span>Share Weekly Report</span>
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
                        <button type="button" class="share-btn" onclick="copyWeeklyDigest()" style="width: 100%; justify-content: center;" title="Copy Markdown Digest for Slack/Teams">
                            <span class="material-symbols-outlined" style="font-size: 16px;">assignment</span>
                            <span>Copy Markdown Digest</span>
                        </button>
                    </div>
                </div>

                <!-- Other Weekly Reports Archive Widget -->
                <div class="sidebar-widget">
                    <h3 class="sidebar-widget-title">
                        <span class="material-symbols-outlined">history</span>
                        <span>Weekly Reports Archive</span>
                    </h3>
                    <div class="sidebar-weeks-list">
                        ${otherWeeks.map(ow => {
                            const isCurrent = ow.slug === trends.slug;
                            const owTitle = `Week ${ow.weekInfo.weekNo} (${ow.weekInfo.year})`;
                            return `
                                <a href="../${ow.slug}/" class="sidebar-week-item ${isCurrent ? 'active' : ''}">
                                    <span>${escapeHtml(owTitle)}</span>
                                    <span style="font-size: 11px; opacity: 0.8;">${formatUSD(ow.totalCapital)} • ${ow.dealCount}d</span>
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>
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
    <div id="trendsToast" class="trends-toast" role="status" aria-live="polite">
        <span class="material-symbols-outlined" id="toastIcon" style="font-size: 18px; color: #34c759;">check_circle</span>
        <span id="toastMessage">Copied to clipboard</span>
    </div>

    <script>
        // Unified Theme Switcher & Persistence Controller
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
            const toast = document.getElementById('trendsToast');
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
        function shareWeeklyReport() {
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

        // Copy Weekly Markdown Digest
        const weeklyDigestMarkdown = ${JSON.stringify(digestText)};
        function copyWeeklyDigest() {
            const btn = document.getElementById('btnTrendsCopyDigest');
            const showSuccess = () => {
                showToast('Weekly digest copied to clipboard!');
                if (btn) {
                    const origHtml = btn.innerHTML;
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-status-success);">check</span><span style="color: var(--color-status-success);">Copied!</span>';
                    setTimeout(() => { btn.innerHTML = origHtml; }, 2000);
                }
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(weeklyDigestMarkdown).then(showSuccess).catch(() => {
                    fallbackCopyText(weeklyDigestMarkdown, showSuccess);
                });
            } else {
                fallbackCopyText(weeklyDigestMarkdown, showSuccess);
            }
        }

        function fallbackCopyText(text, cb) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.top = '0';
            ta.style.left = '0';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try {
                document.execCommand('copy');
                if (cb) cb();
            } catch (err) {
                alert('Could not copy to clipboard. Please copy manually:\\n\\n' + text);
            }
            document.body.removeChild(ta);
        }

        // Native CSS-class toggler for venture drilldown tree
        function toggleTrendsDrilldown(headerEl) {
            if (!headerEl) return;
            const parent = headerEl.closest('.trends-drill-item, .trends-drill-sub-item');
            if (parent) {
                parent.classList.toggle('expanded');
            }
        }
    </script>
</body>

</html>
`;
}

// Update sitemap.xml to include static pages, all company pages, and all trends pages
function updateGlobalSitemap(trendUrls, nowISO) {
    const staticPages = [
        { url: 'https://fundingly.in/', priority: '1.0', changefreq: 'daily' },
        { url: 'https://fundingly.in/about/', priority: '0.6', changefreq: 'monthly' },
        { url: 'https://fundingly.in/contact/', priority: '0.6', changefreq: 'monthly' },
        { url: 'https://fundingly.in/privacy-policy/', priority: '0.5', changefreq: 'monthly' },
        { url: 'https://fundingly.in/terms/', priority: '0.5', changefreq: 'monthly' },
        { url: 'https://fundingly.in/founders-note/', priority: '0.8', changefreq: 'weekly' }
    ];

    // Gather company URLs from company directory if exists
    const companyUrls = [];
    if (fs.existsSync(COMPANY_DIR)) {
        const companyFolders = fs.readdirSync(COMPANY_DIR).filter(f => fs.statSync(path.join(COMPANY_DIR, f)).isDirectory());
        companyFolders.forEach(folder => {
            companyUrls.push({
                url: `https://fundingly.in/company/${folder}/`,
                lastmod: nowISO,
                priority: '0.8',
                changefreq: 'weekly'
            });
        });
    }

    const allUrls = [...staticPages, ...trendUrls, ...companyUrls];

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
buildStaticTrendPages();
