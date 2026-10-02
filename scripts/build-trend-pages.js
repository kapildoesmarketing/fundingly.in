/**
 * ============================================================================
 * FUNDINGLY.IN — STATIC WEEKLY TREND REPORT GENERATOR (Option A Architecture)
 * ============================================================================
 * Target: Generates 100% pre-rendered, static HTML pages at /trends/week-WW-YYYY/
 * matching the exact 1:1 Apple-style weekly intelligence trend modal UI, complete with:
 * - In-Card Live Timeframe Capsule (7D, 14D, 30D, Q3 2026, Q2 2026, All 2026 + Date Picker)
 * - 4-Tile Hero Velocity KPI Strip (Total Capital, Deals, Median Check, Top Deal)
 * - Stage Distribution Continuous Segmented Bar + Color Legend
 * - 3-Tier Hierarchical Industry Hotspot Drilldown (linking to /deals/{domain}/)
 * - 2-Column Regional Deal Hubs & Active Lead Investors Grid
 * - Top Showcase Deals Roster with Direct Links to Canonical Dossiers (/deals/{domain}/)
 * - Multi-Channel Sharing (Native Share, WhatsApp, X/Twitter, LinkedIn, Copy Digest, Print)
 * - Dynamic SEO meta tags, title tags, OpenGraph & Twitter Cards
 * - Schema.org JSON-LD Structured Data (Report, BreadcrumbList)
 * - Sidebar Weekly Archive Navigator (instant jumping between /trends/week-WW-YYYY/ reports)
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
const TRENDS_DIR = path.join(REPO_ROOT, 'trends');
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

    // Majority day (Thursday, d) determines the dominant ISO quarter
    const qNum = Math.floor(d.getUTCMonth() / 3) + 1;
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

// Helper: Clean company name for compact display while preserving full legal name in tooltip
function cleanCompanyName(name) {
    if (!name || typeof name !== 'string') return 'Enterprise';
    const cleaned = name.replace(/\s*\([^)]*(?:Pvt|Private|Limited|Ltd|Solutions|Enviro|Holdings|Group|Incorporated|Inc)[^)]*\)/i, '').trim();
    return cleaned || name;
}

// Helper: Parse and clean lead investor names from narrative PR strings
function parseLeadInvestors(invStr) {
    if (!invStr || typeof invStr !== 'string') return [];
    const trimmed = invStr.trim();
    if (!trimmed || trimmed === 'Undisclosed' || trimmed === 'N/A' || trimmed === '-' || trimmed === '–') return [];

    let clean = trimmed.replace(/^(?:co-led by|led by|jointly anchored by|anchored by|participated by)\s+/i, '');
    clean = clean.replace(/[.\s]+$/, '');

    const rawTokens = clean.split(/[,;&]|\s+(?:and|alongside|with)\s+/i);

    const results = [];
    rawTokens.forEach(token => {
        let t = token.trim();
        t = t.replace(/^(?:co-led by|led by|jointly anchored by|anchored by|alongside|with)\s+/i, '').trim();
        t = t.replace(/\.+$/, '').trim();
        t = t.replace(/\s*\([^)]*(?:co-led|alongside|participated)[^)]*\)/i, '').trim();
        if (t.length > 1 && !/^(?:undisclosed|n\/a|-|–)$/i.test(t)) {
            results.push(t);
        }
    });
    return results;
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
                const companyUrl = `../../deals/${cDomain}/`;
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
    console.log('🚀 Starting Fundingly.in Static Weekly Trend Reports Generation (/trends/week-WW-YYYY/)...');

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

    console.log(`📊 Loaded ${allDeals.length} verified deal records for trend reporting.`);

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
    ensureDir(DEALS_DIR);

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

        // 3-Tier Vertical Drilldown
        const vertMap = new Map();
        weekDeals.forEach(c => {
            const vert = (c.vertical && c.vertical.trim()) || (c.industry && c.industry.trim()) || 'General / Other';
            const subVert = (c.sub_vertical && c.sub_vertical.trim()) || (c.sub_industry && c.sub_industry.trim()) || 'Core / General';
            const amt = Number(c.funding_amount_usd) || 0;
            if (!vertMap.has(vert)) vertMap.set(vert, { name: vert, amount: 0, count: 0, subMap: new Map() });
            const item = vertMap.get(vert);
            item.amount += amt;
            item.count += 1;
            if (!item.subMap.has(subVert)) item.subMap.set(subVert, { name: subVert, amount: 0, count: 0, companies: [] });
            const subItem = item.subMap.get(subVert);
            subItem.amount += amt;
            subItem.count += 1;
            subItem.companies.push(c);
        });

        const topVerticals = Array.from(vertMap.values())
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

        // 3-Tier Segment Drilldown
        const segMap = new Map();
        weekDeals.forEach(c => {
            const seg = (c.segment && c.segment.trim()) || (c.industry && c.industry.trim()) || 'General / Other';
            const subSeg = (c.sub_segment && c.sub_segment.trim()) || (c.sub_industry && c.sub_industry.trim()) || 'Core / General';
            const amt = Number(c.funding_amount_usd) || 0;
            if (!segMap.has(seg)) segMap.set(seg, { name: seg, amount: 0, count: 0, subMap: new Map() });
            const item = segMap.get(seg);
            item.amount += amt;
            item.count += 1;
            if (!item.subMap.has(subSeg)) item.subMap.set(subSeg, { name: subSeg, amount: 0, count: 0, companies: [] });
            const subItem = item.subMap.get(subSeg);
            subItem.amount += amt;
            subItem.count += 1;
            subItem.companies.push(c);
        });

        const topSegments = Array.from(segMap.values())
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

        const topIndustries = topVerticals;

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
            const list = parseLeadInvestors(invStr);
            list.forEach(name => {
                if (!invMap.has(name)) invMap.set(name, { name: name, count: 0 });
                invMap.get(name).count += 1;
            });
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
            topVerticals,
            topSegments,
            topIndustries,
            topHubs,
            topInvestors,
            showcaseDeals,
            allWeekDeals: weekDeals
        };
    });

    // Generate static page for each week at /trends/week-WW-YYYY/
    weekMetricsList.forEach((metric) => {
        const htmlContent = generateTrendPageHtml(metric, weekMetricsList);

        // Primary Canonical Directory: trends/{slug}/index.html
        const weekFolder = path.join(TRENDS_DIR, metric.slug);
        ensureDir(weekFolder);
        fs.writeFileSync(path.join(weekFolder, 'index.html'), htmlContent, 'utf8');

        generatedUrls.push({
            url: `https://fundingly.in/trends/${metric.slug}/`,
            lastmod: metric.weekInfo.endDateISO || nowISO,
            priority: '0.9'
        });

        // Legacy Redirect Stub: deals/{slug}/index.html -> /trends/{slug}/
        const legacyDealsWeekFolder = path.join(DEALS_DIR, metric.slug);
        ensureDir(legacyDealsWeekFolder);
        const legacyRedirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=../../trends/${metric.slug}/">
    <link rel="canonical" href="https://fundingly.in/trends/${metric.slug}/">
    <title>Redirecting to ${escapeHtml(metric.weekInfo.title)} | Fundingly.in</title>
    <script>window.location.replace("../../trends/${metric.slug}/");</script>
</head>
<body>
    <p>Redirecting to <a href="../../trends/${metric.slug}/">${escapeHtml(metric.weekInfo.title)}</a>...</p>
</body>
</html>`;
        fs.writeFileSync(path.join(legacyDealsWeekFolder, 'index.html'), legacyRedirectHtml, 'utf8');
    });

    // Update sitemap.xml with all static pages, company pages, and trends
    updateGlobalSitemap(generatedUrls, nowISO);

    console.log(`✅ Successfully generated ${weekMetricsList.length} static weekly trend reports at /trends/week-WW-YYYY/ & updated sitemap.xml!`);
}

// Generate HTML for a single weekly trend report
function generateTrendPageHtml(trends, allWeekMetricsList) {
    const wInfo = trends.weekInfo;
    const weekNo = wInfo.weekNo;
    const year = wInfo.year;
    const rangeStr = wInfo.rangeStr;
    const weekTitle = `Week ${weekNo} of ${year}`;
    const totalCapitalFormatted = formatUSD(trends.totalCapital);
    const rawTopDealName = trends.topDeal ? (trends.topDeal.company_name || 'Enterprise') : 'N/A';
    const fullTopDealName = trends.topDeal ? escapeHtml(trends.topDeal.company_name || 'Enterprise') : 'N/A';
    const topDealName = trends.topDeal ? escapeHtml(cleanCompanyName(trends.topDeal.company_name)) : 'N/A';
    const topDealAmount = trends.topDeal ? formatUSD(trends.topDeal.funding_amount_usd) : 'N/A';
    const topDealSub = trends.topDeal ? `${topDealAmount} • ${escapeHtml(trends.topDeal.funding_round || 'Round')}` : 'N/A';

    // SEO Dynamic Content
    const pageTitle = `Week ${weekNo} (${year}) Indian Startup Funding Trends & Capital Report | Fundingly.in`;
    const pageDescription = `Indian startup funding intelligence report for Week ${weekNo}, ${year} (${rangeStr}). ${totalCapitalFormatted} deployed across ${trends.dealCount} announced rounds. Top deal: ${topDealName} (${topDealAmount}). Explore stage breakdowns, industry hotspots, and investor activity on Fundingly.in.`;
    const canonicalUrl = `https://fundingly.in/trends/${trends.slug}/`;

    // Social Sharing Text
    const shareText = `📊 Indian Startup Funding Intelligence — Week ${weekNo}, ${year} (${rangeStr})\n• Capital Deployed: ${totalCapitalFormatted} across ${trends.dealCount} deals\n• Median Check: ${formatUSD(trends.medianCheck)}\n• Top Deal: ${topDealName} (${topDealAmount})\n\nExplore the full weekly trends report on Fundingly.in:`;

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
                        "name": "Trends",
                        "item": "https://fundingly.in/trends/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
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

    <!-- Open Graph & Twitter Cards -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Fundingly.in">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="${escapeHtml(pageDescription)}">
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
        .trends-page-wrapper {
            max-width: 1140px;
            margin: 88px auto 80px auto;
            padding: 0 16px;
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
            min-width: 0;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            box-sizing: border-box;
        }

        /* Standalone Top Full-Width Timeframe Command Bar (Spanning Report + Sidebar) */
        .trends-top-command-bar {
            width: 100%;
            margin-bottom: 20px;
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-pill);
            padding: 6px 10px;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.03);
            box-sizing: border-box;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }

        .trends-command-bar-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            width: 100%;
            box-sizing: border-box;
        }

        /* Segmented Mode Switcher (Left Side) */
        .timeline-segmented-nav {
            display: inline-flex;
            align-items: center;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-pill);
            padding: 3px;
            gap: 2px;
            flex-shrink: 0;
        }

        .timeline-nav-tab {
            background: transparent;
            border: none;
            color: var(--color-text-secondary);
            font-size: 11.5px;
            font-weight: 600;
            padding: 5px 12px;
            border-radius: var(--radius-pill);
            cursor: pointer;
            transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            font-family: inherit;
        }

        .timeline-nav-tab:hover {
            color: var(--color-text-primary);
            background: rgba(0, 0, 0, 0.04);
        }

        [data-theme="dark"] .timeline-nav-tab:hover {
            background: rgba(255, 255, 255, 0.06);
        }

        .timeline-nav-tab.active {
            background: var(--color-surface);
            color: var(--color-primary);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--color-hairline);
            font-weight: 700;
        }

        [data-theme="dark"] .timeline-nav-tab.active {
            background: var(--color-surface);
            color: var(--color-primary);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--color-hairline-strong);
        }

        /* Dynamic Context Control (Right Side) */
        .timeline-context-control {
            display: inline-flex;
            align-items: center;
            justify-content: flex-end;
            min-height: 32px;
            flex-shrink: 0;
        }

        .context-sub-control {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-pill);
            padding: 4px 12px;
            animation: fadeInContext 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeInContext {
            from {
                opacity: 0;
                transform: translateX(4px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .selector-label {
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-text-tertiary);
            user-select: none;
            white-space: nowrap;
            transition: color 0.15s ease;
        }

        .selector-dropdown {
            border: none;
            background: transparent;
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-primary);
            cursor: pointer;
            outline: none;
            font-family: inherit;
            padding: 2px 4px 2px 0;
            max-width: 280px;
        }

        .selector-dropdown option {
            background: var(--color-surface);
            color: var(--color-text-primary);
        }

        .date-sep {
            color: var(--color-text-tertiary);
            font-size: 11px;
            font-weight: 500;
        }

        .custom-date-controls {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            flex-wrap: nowrap;
        }

        .trends-date-input {
            padding: 4px 8px;
            border-radius: var(--radius-pill);
            border: 1px solid var(--color-hairline);
            background: var(--color-surface);
            color: var(--color-text-primary);
            font-size: 11.5px;
            font-family: inherit;
            outline: none;
            transition: border-color 0.15s ease;
            max-width: 118px;
        }

        .trends-date-input:focus {
            border-color: var(--color-primary);
        }

        .custom-date-controls {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            flex-wrap: nowrap;
        }

        .trends-date-input {
            padding: 5px 10px;
            border-radius: var(--radius-pill);
            border: 1px solid var(--color-hairline);
            background: var(--color-surface-secondary);
            color: var(--color-text-primary);
            font-size: 11.5px;
            font-family: inherit;
            outline: none;
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
            font-size: 11.5px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: var(--radius-pill);
            background: var(--color-primary-subtle);
            color: var(--color-primary);
            border: 1px solid var(--color-primary-tint);
        }

        .trends-hero-actions {
            display: flex;
            gap: 6px;
            align-items: center;
            flex-wrap: wrap;
        }

        .btn-pill-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: var(--radius-pill);
            font-size: 12.5px;
            font-weight: 600;
            text-decoration: none;
            border: 1px solid var(--color-hairline);
            background: var(--color-surface-secondary);
            color: var(--color-text-primary);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-pill-action:hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
            background: var(--color-surface);
            transform: translateY(-1px);
        }

        .btn-pill-action.primary {
            background: var(--color-primary);
            color: #ffffff;
            border-color: var(--color-primary);
        }

        .btn-pill-action.primary:hover {
            background: var(--color-primary-hover);
        }

        /* 4-Tile Hero Velocity KPI Strip */
        .trends-kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }

        .trends-kpi-card {
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
        }

        .trends-kpi-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--color-text-tertiary);
        }

        .trends-kpi-val {
            font-size: 20px;
            font-weight: 700;
            color: var(--color-text-primary);
            letter-spacing: -0.02em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .trends-kpi-sub {
            font-size: 11.5px;
            color: var(--color-text-secondary);
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .trends-kpi-sub.delta-up {
            color: #188038;
            font-weight: 600;
        }

        .trends-kpi-sub.delta-down {
            color: #d93025;
            font-weight: 600;
        }

        /* Module Sections */
        .trends-section-card {
            background: var(--color-surface-secondary);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            padding: 20px;
            margin-bottom: 16px;
        }

        .trends-section-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
            flex-wrap: wrap;
            gap: 10px;
        }

        .trends-section-title {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-text-secondary);
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* Stage Allocation Bar */
        .trends-segmented-bar {
            height: 14px;
            border-radius: var(--radius-pill);
            display: flex;
            overflow: hidden;
            background: var(--color-hairline);
            margin-bottom: 14px;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .trends-bar-segment {
            height: 100%;
            transition: width 0.3s ease;
        }

        .trends-stage-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 12px 18px;
        }

        .trends-stage-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--color-text-primary);
        }

        .trends-color-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        /* Hotspots View Toggle */
        .trends-toggle-group {
            display: inline-flex;
            align-items: center;
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-pill);
            padding: 2px;
        }

        .trends-toggle-btn {
            background: transparent;
            border: none;
            color: var(--color-text-secondary);
            font-size: 11.5px;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: var(--radius-pill);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .trends-toggle-btn.active {
            background: var(--color-primary);
            color: #ffffff;
        }

        /* Drilldown Interactive Tree */
        .trends-progress-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .trends-drill-item {
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            background: var(--color-surface);
            overflow: hidden;
            transition: all 0.2s ease;
        }

        .trends-drill-header {
            padding: 12px 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            user-select: none;
        }

        .trends-drill-chevron {
            background: transparent;
            border: none;
            color: var(--color-text-tertiary);
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease;
        }

        .trends-drill-item.expanded > .trends-drill-header .trends-drill-chevron,
        .trends-drill-sub-item.expanded > .trends-drill-sub-header .trends-drill-chevron {
            transform: rotate(90deg);
            color: var(--color-primary);
        }

        .trends-drill-info {
            flex: 1;
            min-width: 0;
        }

        .trends-progress-labels {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 6px;
            font-size: 12.5px;
        }

        .trends-progress-name {
            font-weight: 600;
            color: var(--color-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .trends-progress-val {
            color: var(--color-text-secondary);
            font-size: 12px;
            white-space: nowrap;
            margin-left: 8px;
        }

        .trends-progress-track {
            height: 6px;
            border-radius: var(--radius-pill);
            background: var(--color-surface-secondary);
            overflow: hidden;
            border: 1px solid var(--color-hairline);
        }

        .trends-progress-track.sub-track {
            height: 5px;
        }

        .trends-progress-fill {
            height: 100%;
            background: var(--color-primary);
            border-radius: var(--radius-pill);
            transition: width 0.3s ease;
        }

        .trends-drill-sub-list {
            display: none;
            padding: 0 14px 12px 28px;
            border-top: 1px dashed var(--color-hairline);
            background: var(--color-surface-secondary);
            gap: 8px;
            flex-direction: column;
        }

        .trends-drill-item.expanded > .trends-drill-sub-list {
            display: flex;
        }

        .trends-drill-sub-item {
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            background: var(--color-surface);
            overflow: hidden;
        }

        .trends-drill-sub-header {
            padding: 10px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            user-select: none;
        }

        .trends-sub-name {
            font-weight: 600;
            color: var(--color-text-primary);
            font-size: 12px;
        }

        .trends-drill-company-list {
            display: none;
            padding: 6px 12px 10px 24px;
            border-top: 1px dashed var(--color-hairline);
            background: var(--color-surface-secondary);
            gap: 6px;
            flex-direction: column;
        }

        .trends-drill-sub-item.expanded > .trends-drill-company-list {
            display: flex;
        }

        .trends-drill-company-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            text-decoration: none;
            color: inherit;
        }

        /* Split Grid: Regional Hubs & Investors */
        .trends-split-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
        }

        .trends-hub-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .trends-hub-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-pill);
            font-size: 12px;
            color: var(--color-text-primary);
        }

        .trends-investor-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .trends-investor-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            font-size: 12px;
        }

        .trends-investor-name {
            font-weight: 600;
            color: var(--color-text-primary);
        }

        .trends-investor-count {
            color: var(--color-primary);
            font-weight: 600;
        }

        /* Showcase Deals Roster */
        .trends-deal-roster {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .trends-deal-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 14px;
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-inner);
            transition: border-color 0.15s ease, transform 0.15s ease;
        }

        .trends-deal-row:hover {
            border-color: var(--color-primary-subtle);
            transform: translateX(2px);
        }

        .trends-deal-left {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }

        .trends-deal-title {
            font-size: 13.5px;
            font-weight: 700;
            color: var(--color-text-primary);
            letter-spacing: -0.01em;
        }

        .trends-deal-meta {
            font-size: 11.5px;
            color: var(--color-text-secondary);
            margin-top: 2px;
        }

        .trends-deal-right {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
        }

        .trends-deal-amount {
            font-size: 14px;
            font-weight: 700;
            color: var(--color-text-primary);
        }

        .btn-trends-memo {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 5px 10px;
            border-radius: var(--radius-pill);
            background: var(--color-primary-subtle);
            color: var(--color-primary);
            font-size: 11.5px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.15s ease;
            border: 1px solid var(--color-primary-tint);
        }

        .btn-trends-memo:hover {
            background: var(--color-primary);
            color: #ffffff;
        }

        /* Sidebar Styling */
        .trends-sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
            position: sticky;
            top: 88px;
        }

        .sidebar-widget {
            background: var(--color-surface);
            border: 1px solid var(--color-hairline);
            border-radius: var(--radius-sheet);
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        }

        .support-sidebar-widget {
            background: linear-gradient(145deg, var(--color-surface), var(--color-primary-subtle));
            border: 1px solid rgba(0, 102, 204, 0.22);
            position: relative;
            overflow: hidden;
        }

        .support-widget-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }

        .support-widget-icon-wrap {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: var(--color-primary-subtle);
            color: var(--color-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .support-widget-heading {
            font-size: 13.5px;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0;
            line-height: 1.3;
        }

        .support-widget-subheading {
            font-size: 11px;
            color: var(--color-text-secondary);
            margin: 2px 0 0 0;
            line-height: 1.2;
        }

        .support-widget-desc {
            font-size: 12px;
            line-height: 1.5;
            color: var(--color-text-secondary);
            margin: 0 0 12px 0;
        }

        .btn-sidebar-support {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            padding: 9px 14px;
            border-radius: var(--radius-pill);
            background: var(--color-primary);
            color: #ffffff;
            font-size: 12.5px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
            box-shadow: 0 3px 10px rgba(0, 102, 204, 0.2);
            box-sizing: border-box;
        }

        .btn-sidebar-support:hover {
            background: var(--color-primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 5px 14px rgba(0, 102, 204, 0.28);
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
            color: var(--color-text-primary);
            font-size: 12px;
            font-weight: 600;
            transition: all 0.15s ease;
        }

        .sidebar-week-item:hover {
            background: var(--color-primary-subtle);
            color: var(--color-primary);
            border-color: var(--color-primary-tint);
            transform: translateX(2px);
        }

        .sidebar-week-item.active {
            background: var(--color-primary);
            color: #ffffff;
            border-color: var(--color-primary);
        }

        /* Floating Toast Notification */
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
                gap: 20px;
            }
            .trends-sidebar {
                position: static;
            }
            .trends-standalone-card {
                padding: 24px 18px;
            }
        }

        @media (max-width: 680px) {
            .trends-page-wrapper {
                margin: 10px auto 40px auto;
                padding: 0 10px;
                max-width: 100vw;
                overflow-x: hidden;
            }

            .trends-kpi-grid {
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }

            .trends-split-grid {
                grid-template-columns: 1fr;
                gap: 10px;
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
                        <li><a href="../../deals/" class="nav-link">Deals</a></li>
                        <li><a href="../../trends/" class="nav-link active">Trends</a></li>
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
                <li><a href="../../deals/" class="mobile-nav-link"><span class="material-symbols-outlined">payments</span><span>Deals</span></a></li>
                <li><a href="../../trends/" class="mobile-nav-link active"><span class="material-symbols-outlined">monitoring</span><span>Trends</span></a></li>
                <li><a href="../../support/" class="mobile-nav-link"><span class="material-symbols-outlined">volunteer_activism</span><span>Support</span></a></li>
                <li><a href="../../about/" class="mobile-nav-link"><span class="material-symbols-outlined">info</span><span>About</span></a></li>
            </ul>
        </div>
    </header>

    <main class="trends-page-wrapper" role="main">
        <!-- Standalone Top Full-Width Timeframe Command Bar (Spanning Report + Sidebar) -->
        <section class="trends-top-command-bar" role="toolbar" aria-label="Timeframe Filter Controls">
            <div class="trends-command-bar-inner">
                <!-- Left: Segmented Primary Mode Switcher -->
                <div class="timeline-segmented-nav" role="tablist" aria-label="Timeframe Mode Selection">
                    <a href="./" class="timeline-nav-tab active" role="tab" aria-selected="true">Weekly</a>
                    <a href="../../trends/?range=7d" class="timeline-nav-tab" role="tab" aria-selected="false">7D</a>
                    <a href="../../trends/?range=14d" class="timeline-nav-tab" role="tab" aria-selected="false">14D</a>
                    <a href="../../trends/?range=30d" class="timeline-nav-tab" role="tab" aria-selected="false">30D</a>
                    <a href="../../trends/?quarter=${wInfo.quarterKey.replace('_', '-')}" class="timeline-nav-tab" role="tab" aria-selected="false">Quarter</a>
                    <a href="../../trends/?year=${wInfo.year}" class="timeline-nav-tab" role="tab" aria-selected="false">Year</a>
                    <a href="../../trends/?from=2026-04-01&to=2026-10-31" class="timeline-nav-tab" role="tab" aria-selected="false">Custom</a>
                </div>

                <!-- Right: Dynamic Contextual Sub-Control (Week Dropdown) -->
                <div class="timeline-context-control">
                    <div class="context-sub-control">
                        <span class="material-symbols-outlined" style="font-size: 15px; color: var(--color-primary);">calendar_today</span>
                        <span class="selector-label">Week</span>
                        <select id="trendsWeekSelect" class="selector-dropdown" aria-label="Select funding week" onchange="if(this.value) window.location.href='../' + this.value + '/'">
                            ${allWeekMetricsList.map(w => `<option value="${w.slug}" ${w.slug === trends.slug ? 'selected' : ''}>${escapeHtml(w.weekInfo.title)} — ${formatUSD(w.totalCapital)}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        </section>

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
                    <div class="trends-hero-actions">
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
                        <span class="trends-kpi-val" title="${fullTopDealName}">${topDealName}</span>
                        <span class="trends-kpi-sub" title="${topDealSub}">${topDealSub}</span>
                    </div>
                </div>

                <!-- Module B: Capital Allocation by Stage (Continuous Segmented Bar + Legend) -->
                <div class="trends-section-card">
                    <div class="trends-section-title">Capital Allocation by Stage</div>
                    <div class="trends-segmented-bar">
                        ${trends.stageStats.map(s => `
                            <div class="trends-bar-segment" style="flex: ${Math.max(s.amount, 1)}; background-color: ${s.color};" title="${escapeHtml(s.label)}: ${formatUSD(s.amount)} (${s.pct}%)"></div>
                        `).join('')}
                    </div>
                    <div class="trends-stage-legend">
                        ${trends.stageStats.map(s => `
                            <div class="trends-stage-item">
                                <span class="trends-color-dot" style="background-color: ${s.color};"></span>
                                <span>${escapeHtml(s.label)}: <strong>${formatUSD(s.amount)}</strong> (${s.count} ${s.count === 1 ? 'deal' : 'deals'} • ${s.pct}%)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Module C: Industry Hotspots (3-Tier Hierarchical Drilldown with Dual View Toggle) -->
                <div class="trends-section-card">
                    <div class="trends-section-header-row">
                        <div class="trends-section-title" style="margin-bottom: 0;">
                            <span>Industry Hotspots</span>
                        </div>
                        <div class="trends-toggle-group" role="tablist" aria-label="Hotspots View Selection">
                            <button type="button" class="trends-toggle-btn active" id="btnViewVertical" role="tab" aria-selected="true" onclick="switchHotspotsView('vertical')">Vertical</button>
                            <button type="button" class="trends-toggle-btn" id="btnViewSegment" role="tab" aria-selected="false" onclick="switchHotspotsView('segment')">Segment</button>
                        </div>
                    </div>
                    <div id="trendsIndustryView">
                        <div id="trendsVerticalView" class="trends-progress-list">
                            ${renderDrilldownListHTML(trends.topVerticals)}
                        </div>
                        <div id="trendsSegmentView" class="trends-progress-list" style="display: none;">
                            ${renderDrilldownListHTML(trends.topSegments)}
                        </div>
                    </div>
                </div>

                <!-- Modules D & E: 2-Column Split Grid (Regional Deal Hubs & Active Lead Investors) -->
                <div class="trends-split-grid">
                    <div class="trends-section-card" style="margin-bottom: 0;">
                        <div class="trends-section-title">Regional Deal Hubs</div>
                        <div class="trends-hub-pills">
                            ${trends.topHubs.length === 0 ? '<span style="color: var(--color-text-secondary); font-size: 11.5px;">No regional data recorded.</span>' : trends.topHubs.map(h => `
                                <div class="trends-hub-pill">
                                    📍 ${escapeHtml(h.city)}: <strong>${h.count} ${h.count === 1 ? 'deal' : 'deals'}</strong> (${h.pct}%)
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="trends-section-card" style="margin-bottom: 0;">
                        <div class="trends-section-title">Active Lead Investors</div>
                        <div class="trends-investor-list">
                            ${trends.topInvestors.length === 0 ? '<span style="color: var(--color-text-secondary); font-size: 11.5px;">No lead investor data recorded.</span>' : trends.topInvestors.map(inv => `
                                <div class="trends-investor-item">
                                    <span class="trends-investor-name" title="${escapeHtml(inv.name)}">${escapeHtml(inv.name)}</span>
                                    <span class="trends-investor-count">${inv.count} ${inv.count === 1 ? 'deal' : 'deals'}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Module F: Top Showcase Deals of the Week -->
                <div class="trends-section-card" style="margin-top: 14px;">
                    <div class="trends-section-title">Top Showcase Deals of the Week</div>
                    <div class="trends-deal-roster">
                        ${trends.showcaseDeals.map(deal => {
                            const avatarHtml = renderCompanyAvatarHTML(deal);
                            const domain = extractDomain(deal.company_website) || slugify(deal.company_name);
                            const companyUrl = `../../deals/${domain}/`;
                            return `
                                <div class="trends-deal-row">
                                    <div class="trends-deal-left">
                                        <a href="${companyUrl}" class="avatar-link" aria-label="View ${escapeHtml(deal.company_name)}">${avatarHtml}</a>
                                        <div style="min-width: 0;">
                                            <a href="${companyUrl}" class="company-title-link" style="text-decoration: none; color: inherit;">
                                                <div class="trends-deal-title">${escapeHtml(deal.company_name)}</div>
                                            </a>
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
                    <a href="mailto:hello@fundingly.in?subject=Trends%20Intelligence%20Feedback&body=Hello%20Fundingly%20Team%2C%0A%0AI%20have%20feedback%2Finsights%20regarding%20${encodeURIComponent(weekTitle)}%3A%0A%0A%5BPlease%20describe%20your%20observations%5D%0A%0AThank%20you!" class="btn-suggest-correction" title="Report feedback or updated intelligence">
                        <span class="material-symbols-outlined" style="font-size: 16px;">edit_note</span>
                        <span>Feedback / Corrections</span>
                    </a>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="btn-detail" onclick="copyWeeklyDigest()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Copy markdown digest for Slack/Teams">
                            <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                            <span>Copy Digest</span>
                        </button>
                        <button type="button" class="btn-detail" onclick="copyPageUrl()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Copy report URL">
                            <span class="material-symbols-outlined" style="font-size: 16px;">link</span>
                            <span>Share Link</span>
                        </button>
                    </div>
                </div>
            </article>

            <!-- Right Sidebar: Ad Unit + Support + Other Weekly Reports Archive -->
            <aside class="trends-sidebar">
                <!-- Google AdSense Slot #1 (Sidebar Display Unit) -->
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

                <!-- Other Weekly Reports Archive Widget -->
                <div class="sidebar-widget">
                    <h3 class="sidebar-widget-title">
                        <span class="material-symbols-outlined">history</span>
                        <span>Weekly Reports Archive</span>
                    </h3>
                    <div class="sidebar-weeks-list">
                        ${otherWeeks.map(w => `
                            <a href="../${w.slug}/" class="sidebar-week-item ${w.slug === trends.slug ? 'active' : ''}">
                                <span>${escapeHtml(w.weekInfo.title)}</span>
                                <span style="font-size: 11px; opacity: 0.8;">${formatUSD(w.totalCapital)} • ${w.dealCount}d</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            </aside>
        </div>

        <!-- Google AdSense Slot #2 (Bottom Banner Unit) -->
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

    <!-- Floating Trends Mobile Bottom Dock (1-Thumb Ergonomics on <= 900px) -->
    <nav class="mobile-bottom-dock" id="mobileBottomDock" aria-label="Quick mobile navigation dock">
        <a href="../../" class="dock-btn" title="Home" aria-label="Home">
            <span class="material-symbols-outlined">home</span>
            <span class="dock-label">Home</span>
        </a>
        <a href="../../deals/" class="dock-btn" title="Deals" aria-label="Deals">
            <span class="material-symbols-outlined">work</span>
            <span class="dock-label">Deals</span>
        </a>
        <button type="button" class="dock-btn" id="dockTimeframeBtn" title="Timeframe" aria-label="Change timeframe">
            <span class="material-symbols-outlined">schedule</span>
            <span class="dock-label">Timeframe</span>
        </button>
        <button type="button" class="dock-btn" id="dockTopBtn" title="Scroll to top" aria-label="Scroll to top">
            <span class="material-symbols-outlined">arrow_upward</span>
            <span class="dock-label">Top</span>
        </button>
    </nav>

    <!-- Floating Toast Notification -->
    <div id="trendsToast" class="trends-toast" role="status" aria-live="polite"></div>

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

            // Timeframe and Top Dock Actions
            const dockTimeframeBtn = document.getElementById('dockTimeframeBtn');
            const dockTopBtn = document.getElementById('dockTopBtn');
            if (dockTimeframeBtn) {
                dockTimeframeBtn.addEventListener('click', () => {
                    const commandBar = document.querySelector('.trends-top-command-bar');
                    if (commandBar) {
                        const headerOffset = 84;
                        const elementPosition = commandBar.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        window.scrollTo({
                            top: Math.max(0, offsetPosition),
                            behavior: 'smooth'
                        });
                        commandBar.classList.add('focus-pulse');
                        setTimeout(() => commandBar.classList.remove('focus-pulse'), 1500);
                    }
                });
            }
            if (dockTopBtn) {
                dockTopBtn.addEventListener('click', () => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }
        })();

        // Toast Feedback Controller
        function showToast(message) {
            const toast = document.getElementById('trendsToast');
            if (!toast) return;
            toast.textContent = message;
            toast.classList.add('active');
            setTimeout(() => {
                toast.classList.remove('active');
            }, 2200);
        }

        // Copy Digest Action
        function copyWeeklyDigest() {
            const digest = ${JSON.stringify(digestText)};
            navigator.clipboard.writeText(digest).then(() => {
                showToast('Executive briefing copied for Slack/Teams!');
            }).catch(() => {
                showToast('Could not copy digest');
            });
        }

        // Copy Page URL
        function copyPageUrl() {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showToast('Link copied to clipboard!');
            }).catch(() => {
                showToast('Could not copy link');
            });
        }

        // Toggle Interactive Hotspot Accordions
        function toggleTrendsDrilldown(headerEl) {
            const parent = headerEl.closest('.trends-drill-item, .trends-drill-sub-item');
            if (parent) {
                parent.classList.toggle('expanded');
            }
        }

        // Switch Hotspots View (Vertical vs Segment)
        function switchHotspotsView(view) {
            const btnV = document.getElementById('btnViewVertical');
            const btnS = document.getElementById('btnViewSegment');
            const viewV = document.getElementById('trendsVerticalView');
            const viewS = document.getElementById('trendsSegmentView');

            if (view === 'vertical') {
                if (btnV) btnV.classList.add('active');
                if (btnS) btnS.classList.remove('active');
                if (viewV) viewV.style.display = 'flex';
                if (viewS) viewS.style.display = 'none';
            } else {
                if (btnS) btnS.classList.add('active');
                if (btnV) btnV.classList.remove('active');
                if (viewV) viewV.style.display = 'none';
                if (viewS) viewS.style.display = 'flex';
            }
        }

        // Custom Date Range Navigation
        function applyCustomDateRange() {
            const start = document.getElementById('trendsStartDate')?.value;
            const end = document.getElementById('trendsEndDate')?.value;
            if (!start || !end) {
                showToast('Please select both start and end dates');
                return;
            }
            window.location.href = '../../trends/?from=' + encodeURIComponent(start) + '&to=' + encodeURIComponent(end);
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

// Update sitemap.xml
function updateGlobalSitemap(weeklyUrls, nowISO) {
    let companyUrls = [];
    if (fs.existsSync(DEALS_DIR)) {
        const companyFolders = fs.readdirSync(DEALS_DIR).filter(f => !f.startsWith('week-') && f !== 'index.html' && fs.statSync(path.join(DEALS_DIR, f)).isDirectory());
        companyFolders.forEach(comp => {
            companyUrls.push({
                url: `https://fundingly.in/deals/${comp}/`,
                lastmod: nowISO,
                priority: '0.8',
                changefreq: 'weekly'
            });
        });
    }

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

    const allUrls = [...staticPages, ...weeklyUrls, ...companyUrls];

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
}

// Execute generator
buildStaticTrendPages();
