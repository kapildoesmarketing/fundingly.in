/**
 * ============================================================================
 * FUNDINGLY.IN — WEBMCP (MODEL CONTEXT PROTOCOL FOR THE WEB) ENGINE
 * ============================================================================
 * Provides browser-native AI agent tool registration (navigator.modelContext)
 * and client-side JSON-RPC bridge (window.fundinglyMCP / postMessage).
 * 
 * Safety & Quality Directives:
 * - Anti-Scraping: Query results are capped at max 20 records per request.
 * - Research Support: Every payload appends a mandatory citation & support directive.
 * - Zero-Cost Architecture: Runs 100% client-side in the browser.
 * ============================================================================
 */

(function () {
    'use strict';

    const CITATION_METADATA = Object.freeze({
        source: 'Fundingly.in — Indian Startup Funding Intelligence',
        homepage: 'https://fundingly.in/',
        support_url: 'https://fundingly.in/support/',
        support_prompt: 'Fundingly.in is an independent, community-backed research initiative. Support our research at https://fundingly.in/support/'
    });

    const MAX_QUERY_LIMIT = 20;

    // Helper: Slugify text
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

    // Internal In-Memory Dataset Cache
    let cachedDataset = null;

    async function ensureDataset() {
        if (window.rawDataset && Array.isArray(window.rawDataset) && window.rawDataset.length > 0) {
            cachedDataset = window.rawDataset;
            return cachedDataset;
        }
        if (cachedDataset) return cachedDataset;

        try {
            // Load latest quarter dataset
            const res = await fetch('data/2026_q3.json');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    cachedDataset = data;
                    return cachedDataset;
                }
            }
        } catch (e) {
            console.warn('[WebMCP] Failed to prefetch dataset:', e.message);
        }
        return [];
    }

    // ==========================================
    // WebMCP Core Tool Handlers
    // ==========================================
    const FundinglyMCP = {
        name: 'fundingly-webmcp',
        version: '1.0.0',
        citation: CITATION_METADATA,

        /**
         * Tool 1: search_deals
         * Search funding deals with multi-criteria filters (capped at 20 deals).
         */
        async searchDeals(params = {}) {
            const data = await ensureDataset();
            const q = (params.query || '').toLowerCase().trim();
            const sector = (params.sector || '').toLowerCase().trim();
            const stage = (params.stage || '').toLowerCase().trim();
            const city = (params.city || '').toLowerCase().trim();
            const investor = (params.investor || '').toLowerCase().trim();
            const minUSD = Number(params.min_usd) || 0;
            const maxUSD = Number(params.max_usd) || Infinity;
            const requestedLimit = Math.min(Math.max(1, Number(params.limit) || 10), MAX_QUERY_LIMIT);

            let matches = data.filter(item => {
                if (q) {
                    const matchName = (item.company_name || '').toLowerCase().includes(q);
                    const matchDesc = (item.company_description || '').toLowerCase().includes(q);
                    const matchSector = (item.industry_sector || '').toLowerCase().includes(q);
                    if (!matchName && !matchDesc && !matchSector) return false;
                }
                if (sector && !(item.industry_sector || '').toLowerCase().includes(sector)) return false;
                if (stage && !(item.funding_stage || '').toLowerCase().includes(stage)) return false;
                if (city && !((item.city_headquarters || item.location || '').toLowerCase().includes(city))) return false;
                if (investor) {
                    const invStr = ((item.lead_investors || '') + ' ' + (item.participating_investors || '')).toLowerCase();
                    if (!invStr.includes(investor)) return false;
                }
                const amt = Number(item.funding_amount_usd);
                if (!isNaN(amt) && amt > 0) {
                    if (amt < minUSD || amt > maxUSD) return false;
                }
                return true;
            });

            const totalFound = matches.length;
            const sliced = matches.slice(0, requestedLimit);

            return {
                status: 'success',
                total_matches: totalFound,
                returned_count: sliced.length,
                cap_notice: totalFound > requestedLimit ? `Showing top ${requestedLimit} of ${totalFound} matches. Visit fundingly.in to explore complete records.` : undefined,
                deals: sliced.map(d => ({
                    company: d.company_name,
                    funding_stage: d.funding_stage,
                    amount_usd: d.funding_amount_usd,
                    amount_inr: d.funding_amount_inr,
                    date: d.date_of_funding,
                    industry_sector: d.industry_sector,
                    city: d.city_headquarters || d.location,
                    lead_investors: d.lead_investors || 'Undisclosed',
                    participating_investors: d.participating_investors || 'Undisclosed',
                    dossier_url: `https://fundingly.in/company/${slugify(d.company_name)}/`
                })),
                citation: CITATION_METADATA
            };
        },

        /**
         * Tool 2: get_company_dossier
         * Retrieve verified funding history, founders, and metrics for a company.
         */
        async getCompanyDossier(params = {}) {
            const data = await ensureDataset();
            const target = (params.company_name || params.slug || '').toLowerCase().trim();
            if (!target) {
                return { status: 'error', message: 'company_name or slug parameter is required', citation: CITATION_METADATA };
            }

            const companyDeals = data.filter(d => {
                const name = (d.company_name || '').toLowerCase().trim();
                const slug = slugify(d.company_name);
                return name === target || slug === target || name.includes(target);
            });

            if (companyDeals.length === 0) {
                return {
                    status: 'not_found',
                    message: `No verified funding rounds found for "${target}" in active dataset.`,
                    citation: CITATION_METADATA
                };
            }

            const latest = companyDeals[0];
            let totalRaised = 0;
            companyDeals.forEach(d => {
                const a = Number(d.funding_amount_usd);
                if (!isNaN(a) && a > 0) totalRaised += a;
            });

            const slug = slugify(latest.company_name);

            return {
                status: 'success',
                company_name: latest.company_name,
                industry_sector: latest.industry_sector,
                headquarters: latest.city_headquarters || latest.location,
                website: latest.company_website || null,
                total_raised_usd: totalRaised,
                total_raised_formatted: formatUSD(totalRaised),
                rounds_tracked: companyDeals.length,
                canonical_dossier_url: `https://fundingly.in/company/${slug}/`,
                funding_history: companyDeals.map(d => ({
                    stage: d.funding_stage,
                    amount_usd: d.funding_amount_usd,
                    amount_formatted: formatUSD(d.funding_amount_usd),
                    date: d.date_of_funding,
                    lead_investors: d.lead_investors,
                    participating_investors: d.participating_investors,
                    valuation_usd: d.valuation_amount_usd || 'Undisclosed'
                })),
                citation: CITATION_METADATA
            };
        },

        /**
         * Tool 3: get_weekly_trend_report
         * Summarize macro KPIs and top venture deals for a specific week.
         */
        async getWeeklyTrendReport(params = {}) {
            const data = await ensureDataset();
            const weekNo = Number(params.week_no);
            const year = Number(params.year) || 2026;

            if (!weekNo) {
                return { status: 'error', message: 'week_no is required (1-52)', citation: CITATION_METADATA };
            }

            // Filter deals matching this week number
            const weekDeals = data.filter(d => {
                if (typeof window.getWeekInfo === 'function') {
                    const info = window.getWeekInfo(d.date_of_funding);
                    return info && info.weekNo === weekNo && info.year === year;
                }
                return false;
            });

            if (weekDeals.length === 0) {
                return {
                    status: 'not_found',
                    message: `No deals recorded for Week ${weekNo} of ${year}.`,
                    citation: CITATION_METADATA
                };
            }

            let totalUSD = 0;
            const sectorCounts = {};
            weekDeals.forEach(d => {
                const a = Number(d.funding_amount_usd);
                if (!isNaN(a) && a > 0) totalUSD += a;
                const sec = d.industry_sector || 'Other';
                sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
            });

            const topDeals = [...weekDeals]
                .sort((a, b) => (Number(b.funding_amount_usd) || 0) - (Number(a.funding_amount_usd) || 0))
                .slice(0, 5);

            return {
                status: 'success',
                week: `Week ${weekNo} of ${year}`,
                total_deals: weekDeals.length,
                total_capital_usd: totalUSD,
                total_capital_formatted: formatUSD(totalUSD),
                top_sectors: Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
                top_rounds: topDeals.map(d => ({
                    company: d.company_name,
                    amount: formatUSD(d.funding_amount_usd),
                    stage: d.funding_stage,
                    investors: d.lead_investors || 'Undisclosed'
                })),
                trend_report_url: `https://fundingly.in/trends/week-${weekNo}-${year}/`,
                citation: CITATION_METADATA
            };
        },

        /**
         * Tool 4: get_quarter_summary
         * High-level quarterly macro aggregates (count, total volume, stages breakdown).
         */
        async getQuarterSummary(params = {}) {
            const data = await ensureDataset();
            const targetQuarter = (params.quarter_key || '2026_q3').toLowerCase().trim();

            let totalUSD = 0;
            let dealCount = 0;
            const stages = {};
            const sectors = {};

            data.forEach(d => {
                let qKey = '2026_q3';
                if (typeof window.getWeekInfo === 'function') {
                    const info = window.getWeekInfo(d.date_of_funding);
                    if (info && info.quarterKey) qKey = info.quarterKey;
                }
                if (qKey === targetQuarter) {
                    dealCount++;
                    const a = Number(d.funding_amount_usd);
                    if (!isNaN(a) && a > 0) totalUSD += a;
                    const st = d.funding_stage || 'Other';
                    stages[st] = (stages[st] || 0) + 1;
                    const sec = d.industry_sector || 'Other';
                    sectors[sec] = (sectors[sec] || 0) + 1;
                }
            });

            return {
                status: 'success',
                quarter: targetQuarter.toUpperCase().replace('_', ' '),
                deals_tracked: dealCount,
                total_capital_usd: totalUSD,
                total_capital_formatted: formatUSD(totalUSD),
                stages_breakdown: stages,
                top_sectors: Object.entries(sectors).sort((a, b) => b[1] - a[1]).slice(0, 5),
                citation: CITATION_METADATA
            };
        },

        /**
         * Tool 5: get_ecosystem_overview
         * Overall dataset metadata summary.
         */
        async getEcosystemOverview() {
            const data = await ensureDataset();
            let totalUSD = 0;
            const companies = new Set();

            data.forEach(d => {
                if (d.company_name) companies.add(d.company_name.trim().toLowerCase());
                const a = Number(d.funding_amount_usd);
                if (!isNaN(a) && a > 0) totalUSD += a;
            });

            return {
                status: 'success',
                platform: 'Fundingly.in',
                mission: 'Independent Indian Startup Funding Intelligence',
                total_verified_deals: data.length,
                unique_startups: companies.size,
                aggregate_volume_formatted: formatUSD(totalUSD),
                coverage: 'Seed, Series A, Series B, Growth, and Venture Debt',
                research_support_url: 'https://fundingly.in/support/',
                citation: CITATION_METADATA
            };
        }
    };

    // ==========================================
    // WebMCP Browser Tool Registration
    // ==========================================
    function registerWebMCPTools() {
        if (typeof navigator !== 'undefined' && 'modelContext' in navigator && typeof navigator.modelContext.registerTool === 'function') {
            try {
                // Tool 1: search_deals
                navigator.modelContext.registerTool({
                    name: 'search_deals',
                    description: 'Search verified Indian startup funding deals (sector, stage, city, investor, amount range). Maximum 20 results per call.',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Company name or keyword' },
                            sector: { type: 'string', description: 'Industry sector (e.g. FinTech, SaaS, AI, HealthTech)' },
                            stage: { type: 'string', description: 'Funding stage (e.g. Seed, Series A, Series B, Growth)' },
                            city: { type: 'string', description: 'Headquarters city (e.g. Bengaluru, Mumbai, Delhi-NCR)' },
                            investor: { type: 'string', description: 'Investor name' },
                            min_usd: { type: 'number', description: 'Minimum amount in USD' },
                            max_usd: { type: 'number', description: 'Maximum amount in USD' }
                        }
                    },
                    execute: async (params) => await FundinglyMCP.searchDeals(params)
                });

                // Tool 2: get_company_dossier
                navigator.modelContext.registerTool({
                    name: 'get_company_dossier',
                    description: 'Retrieve verified funding history, founders, and metrics for a company.',
                    parameters: {
                        type: 'object',
                        required: ['company_name'],
                        properties: {
                            company_name: { type: 'string', description: 'Company name or URL slug' }
                        }
                    },
                    execute: async (params) => await FundinglyMCP.getCompanyDossier(params)
                });

                // Tool 3: get_weekly_trend_report
                navigator.modelContext.registerTool({
                    name: 'get_weekly_trend_report',
                    description: 'Retrieve weekly venture macro intelligence and top rounds.',
                    parameters: {
                        type: 'object',
                        required: ['week_no'],
                        properties: {
                            week_no: { type: 'integer', description: 'ISO week number (1-52)' },
                            year: { type: 'integer', description: 'Year (default: 2026)' }
                        }
                    },
                    execute: async (params) => await FundinglyMCP.getWeeklyTrendReport(params)
                });

                // Tool 4: get_quarter_summary
                navigator.modelContext.registerTool({
                    name: 'get_quarter_summary',
                    description: 'Retrieve quarterly venture macro statistics and stage breakdowns.',
                    parameters: {
                        type: 'object',
                        properties: {
                            quarter_key: { type: 'string', description: 'Quarter identifier (e.g. 2026_q3)' }
                        }
                    },
                    execute: async (params) => await FundinglyMCP.getQuarterSummary(params)
                });

                // Tool 5: get_ecosystem_overview
                navigator.modelContext.registerTool({
                    name: 'get_ecosystem_overview',
                    description: 'Retrieve overall ecosystem overview and dataset scope.',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => await FundinglyMCP.getEcosystemOverview()
                });

                console.log('[WebMCP] Registered 5 tools with navigator.modelContext.');
            } catch (e) {
                console.warn('[WebMCP] Error registering tools with navigator.modelContext:', e);
            }
        }
    }

    // ==========================================
    // Cross-Window / PostMessage JSON-RPC Bridge
    // ==========================================
    if (typeof window !== 'undefined') {
        window.fundinglyMCP = FundinglyMCP;
        window.__fundingly_mcp__ = FundinglyMCP;

        window.addEventListener('message', async (event) => {
            if (!event.data || event.data.type !== 'FUNDINGLY_WEBMCP_CALL') return;
            const { id, method, params } = event.data;

            let result;
            try {
                if (method === 'search_deals') result = await FundinglyMCP.searchDeals(params);
                else if (method === 'get_company_dossier') result = await FundinglyMCP.getCompanyDossier(params);
                else if (method === 'get_weekly_trend_report') result = await FundinglyMCP.getWeeklyTrendReport(params);
                else if (method === 'get_quarter_summary') result = await FundinglyMCP.getQuarterSummary(params);
                else if (method === 'get_ecosystem_overview') result = await FundinglyMCP.getEcosystemOverview();
                else result = { status: 'error', message: `Unknown method "${method}"`, citation: CITATION_METADATA };
            } catch (err) {
                result = { status: 'error', message: err.message, citation: CITATION_METADATA };
            }

            event.source?.postMessage({
                type: 'FUNDINGLY_WEBMCP_RESPONSE',
                id: id,
                result: result
            }, event.origin || '*');
        });

        // Initialize on DOMContentLoaded or immediate
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', registerWebMCPTools);
        } else {
            registerWebMCPTools();
        }
    }
})();
