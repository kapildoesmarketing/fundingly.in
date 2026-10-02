/**
 * Fundingly.in — Universal Venture Intelligence Aggregation Engine
 * Designed by Kapil Pidhwani: Pure JS aggregation engine for startup funding data.
 * Compatible with Node.js SSG build scripts and client-side browser execution.
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.FundinglyTrendsEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    // Format USD amount
    function formatUSD(amount) {
        if (amount === null || amount === undefined || amount === '' || amount === 'Undisclosed' || amount === 'undisclosed') return 'Undisclosed';
        const num = Number(amount);
        if (isNaN(num) || num <= 0) return 'Undisclosed';
        if (num >= 1000000000) return '$' + (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
        if (num >= 1000000) return '$' + (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
        return '$' + num.toLocaleString('en-US');
    }

    // Format INR amount approximate conversion (1 USD ~ 83.5 INR)
    function formatINR(amountUsd, originalAmount, originalCurrency) {
        if (originalCurrency === 'INR' && originalAmount && !isNaN(originalAmount)) {
            const inr = Number(originalAmount);
            if (inr >= 10000000) return `₹${(inr / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
            if (inr >= 100000) return `₹${(inr / 100000).toFixed(1).replace(/\.0$/, '')} Lakh`;
            return `₹${Math.round(inr).toLocaleString('en-IN')}`;
        }
        if (!amountUsd || isNaN(amountUsd) || amountUsd === 0) return '';
        const inr = Number(amountUsd) * 83.5;
        if (inr >= 10000000) return `₹${(inr / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
        if (inr >= 100000) return `₹${(inr / 100000).toFixed(1).replace(/\.0$/, '')} Lakh`;
        return `₹${Math.round(inr).toLocaleString('en-IN')}`;
    }

    // Format date string YYYY-MM-DD
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

    // Stage CSS Class mapping
    function getStageBadgeClass(stage) {
        if (!stage) return 'stage-other';
        const s = String(stage).toLowerCase().trim();
        if (s.includes('pre-seed') || s.includes('pre seed') || s.includes('angel') || s.includes('grant')) return 'stage-pre-seed';
        if (s.includes('seed')) return 'stage-seed';
        if (s.includes('pre-series a') || s.includes('series a') || s.includes('venture')) return 'stage-series-a';
        if (s.includes('series b') || s.includes('series c') || s.includes('series d') || s.includes('growth') || s.includes('late')) return 'stage-growth';
        if (s.includes('debt') || s.includes('venture debt')) return 'stage-debt';
        return 'stage-other';
    }

    // Standard ISO Week Calculation
    function getWeekInfo(dateStr) {
        if (!dateStr || dateStr === 'N/A') return null;
        let dateObj;
        if (typeof dateStr === 'string') {
            const match = dateStr.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
            if (match) {
                dateObj = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
            } else {
                dateObj = new Date(dateStr);
            }
        } else {
            dateObj = new Date(dateStr);
        }

        if (isNaN(dateObj.getTime())) return null;

        const target = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
        const dayNr = (target.getUTCDay() + 6) % 7;
        target.setUTCDate(target.getUTCDate() - dayNr + 3);
        const firstThursday = target.getTime();
        target.setUTCMonth(0, 1);
        if (target.getUTCDay() !== 4) {
            target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
        }
        const weekNo = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
        const year = new Date(firstThursday).getUTCFullYear();

        const weekStart = new Date(firstThursday);
        weekStart.setUTCDate(weekStart.getUTCDate() - 3);
        const weekEnd = new Date(firstThursday);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 3);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const startStr = `${monthNames[weekStart.getUTCMonth()]} ${weekStart.getUTCDate()}`;
        const endStr = `${monthNames[weekEnd.getUTCMonth()]} ${weekEnd.getUTCDate()}, ${year}`;
        const rangeStr = `${startStr} – ${endStr}`;
        const title = `Week ${weekNo} of ${year}`;
        const key = `${year}-w${String(weekNo).padStart(2, '0')}`;
        const slug = `week-${weekNo}-${year}`;

        return { weekNo, year, rangeStr, title, key, slug, startTimestamp: weekStart.getTime(), endTimestamp: weekEnd.getTime() };
    }

    // Clean investor parsing
    function parseLeadInvestors(invStr) {
        if (!invStr || typeof invStr !== 'string') return [];
        const trimmed = invStr.trim();
        if (!trimmed || /^(?:undisclosed|n\/a|-|–)$/i.test(trimmed)) return [];

        // Remove narrative lead-in prefixes
        let clean = trimmed.replace(/^(?:co-led by|led by|jointly anchored by|anchored by|participated by)\s+/i, '');
        clean = clean.replace(/[.\s]+$/, '');

        // Split on standard separators: commas, semicolons, or " and ", " alongside ", " with "
        const rawTokens = clean.split(/[,;&•]|\s+(?:and|alongside|with)\s+/i);

        const results = [];
        const noisePatterns = [
            /along with/i,
            /participating/i,
            /existing backers/i,
            /angel networks/i,
            /strategic angel/i,
            /family office/i,
            /undisclosed/i,
            /various angels/i,
            /prominent angel/i,
            /other backers/i,
            /^others$/i,
            /^and$/i
        ];

        rawTokens.forEach(token => {
            let t = token.trim();
            t = t.replace(/^(?:co-led by|led by|jointly anchored by|anchored by|alongside|with)\s+/i, '').trim();
            t = t.replace(/\.+$/, '').trim();
            t = t.replace(/\s*\([^)]*(?:co-led|alongside|participated|existing)[^)]*\)/i, '').trim();

            if (t.length > 1 && t.length <= 65 && !/^(?:undisclosed|n\/a|-|–)$/i.test(t)) {
                const isNoise = noisePatterns.some(p => p.test(t));
                if (!isNoise) {
                    results.push(t);
                }
            }
        });
        return results;
    }

    // Core Trends Aggregation Logic
    function computeTrends(deals, prevDeals) {
        if (!deals || !Array.isArray(deals)) deals = [];
        if (!prevDeals || !Array.isArray(prevDeals)) prevDeals = [];

        let totalCapital = 0;
        let capitalDealCount = 0;
        const validAmounts = [];
        let topDeal = null;
        let topDealAmount = 0;

        deals.forEach(deal => {
            const amt = Number(deal.funding_amount_usd);
            if (!isNaN(amt) && amt > 0) {
                totalCapital += amt;
                capitalDealCount++;
                validAmounts.push(amt);
                if (amt > topDealAmount) {
                    topDealAmount = amt;
                    topDeal = deal;
                }
            }
        });

        const dealCount = deals.length;
        validAmounts.sort((a, b) => a - b);

        let medianCheck = 0;
        if (validAmounts.length > 0) {
            const mid = Math.floor(validAmounts.length / 2);
            medianCheck = validAmounts.length % 2 !== 0 ? validAmounts[mid] : (validAmounts[mid - 1] + validAmounts[mid]) / 2;
        }

        const avgRound = capitalDealCount > 0 ? totalCapital / capitalDealCount : 0;

        // Prior period deltas
        let prevTotalCapital = 0;
        let prevDealCount = prevDeals.length;
        prevDeals.forEach(d => {
            const amt = Number(d.funding_amount_usd);
            if (!isNaN(amt) && amt > 0) prevTotalCapital += amt;
        });

        const capitalDeltaPct = prevTotalCapital > 0 ? ((totalCapital - prevTotalCapital) / prevTotalCapital) * 100 : null;
        const dealsDelta = dealCount - prevDealCount;

        // 1. Stage Allocation
        const stageOrder = [
            { key: 'pre-seed', label: 'Seed / Angel', color: '#34a853' },
            { key: 'series-a', label: 'Series A', color: '#1a73e8' },
            { key: 'growth', label: 'Series B / C', color: '#8e24aa' },
            { key: 'late', label: 'Growth / Late', color: '#e37400' },
            { key: 'debt', label: 'Debt / Other', color: '#5f6368' }
        ];

        const stageMap = {};
        stageOrder.forEach(s => {
            stageMap[s.key] = { key: s.key, label: s.label, color: s.color, amount: 0, count: 0, deals: [] };
        });

        deals.forEach(deal => {
            const round = String(deal.funding_round || '').toLowerCase();
            let bucket = 'debt';
            if (round.includes('pre-seed') || round.includes('pre seed') || round.includes('angel') || round.includes('grant') || round.includes('seed')) {
                bucket = 'pre-seed';
            } else if (round.includes('series a') || round.includes('pre-series a') || round.includes('venture')) {
                bucket = 'series-a';
            } else if (round.includes('series b') || round.includes('series c')) {
                bucket = 'growth';
            } else if (round.includes('series d') || round.includes('series e') || round.includes('growth') || round.includes('late') || round.includes('private equity')) {
                bucket = 'late';
            } else if (round.includes('debt') || round.includes('bridge') || round.includes('convertible') || round.includes('credit')) {
                bucket = 'debt';
            }

            const amt = Number(deal.funding_amount_usd) || 0;
            stageMap[bucket].amount += amt;
            stageMap[bucket].count++;
            stageMap[bucket].deals.push(deal);
        });

        const stages = stageOrder.map(s => {
            const data = stageMap[s.key];
            const pct = totalCapital > 0 ? Math.round((data.amount / totalCapital) * 100) : 0;
            return { ...data, pct };
        });

        // 2. Sector Verticals Drilldown
        const verticalMap = {};
        deals.forEach(deal => {
            const vName = deal.vertical || deal.industry || 'Technology & Software';
            const subName = deal.sub_vertical || deal.sub_industry || deal.segment || 'General Innovation';
            const amt = Number(deal.funding_amount_usd) || 0;

            if (!verticalMap[vName]) {
                verticalMap[vName] = { name: vName, amount: 0, count: 0, subMap: {} };
            }
            verticalMap[vName].amount += amt;
            verticalMap[vName].count++;

            if (!verticalMap[vName].subMap[subName]) {
                verticalMap[vName].subMap[subName] = { name: subName, amount: 0, count: 0, deals: [] };
            }
            verticalMap[vName].subMap[subName].amount += amt;
            verticalMap[vName].subMap[subName].count++;
            verticalMap[vName].subMap[subName].deals.push(deal);
        });

        const sectors = Object.values(verticalMap).map(v => {
            const pct = totalCapital > 0 ? Math.round((v.amount / totalCapital) * 100) : 0;
            const subList = Object.values(v.subMap).map(sub => {
                const subPctOfParent = v.amount > 0 ? Math.round((sub.amount / v.amount) * 100) : 0;
                return { ...sub, pctOfParent: subPctOfParent };
            }).sort((a, b) => b.amount - a.amount || b.count - a.count);
            return { ...v, pct, subList };
        }).sort((a, b) => b.amount - a.amount || b.count - a.count);

        // 2b. Segment Drilldown (Dual View)
        const segmentMap = {};
        deals.forEach(deal => {
            const segName = deal.sub_vertical || deal.sub_industry || deal.segment || 'General Innovation';
            const vName = deal.vertical || deal.industry || 'Technology & Software';
            const amt = Number(deal.funding_amount_usd) || 0;

            if (!segmentMap[segName]) {
                segmentMap[segName] = { name: segName, amount: 0, count: 0, subMap: {} };
            }
            segmentMap[segName].amount += amt;
            segmentMap[segName].count++;

            if (!segmentMap[segName].subMap[vName]) {
                segmentMap[segName].subMap[vName] = { name: vName, amount: 0, count: 0, deals: [] };
            }
            segmentMap[segName].subMap[vName].amount += amt;
            segmentMap[segName].subMap[vName].count++;
            segmentMap[segName].subMap[vName].deals.push(deal);
        });

        const segments = Object.values(segmentMap).map(s => {
            const pct = totalCapital > 0 ? Math.round((s.amount / totalCapital) * 100) : 0;
            const subList = Object.values(s.subMap).map(sub => {
                const subPctOfParent = s.amount > 0 ? Math.round((sub.amount / s.amount) * 100) : 0;
                return { ...sub, pctOfParent: subPctOfParent };
            }).sort((a, b) => b.amount - a.amount || b.count - a.count);
            return { ...s, pct, subList };
        }).sort((a, b) => b.amount - a.amount || b.count - a.count);

        // 3. Regional Hubs
        const hubMap = {};
        deals.forEach(deal => {
            let hq = deal.company_headquarters || deal.headquarters || 'Bengaluru, Karnataka, India';
            let city = hq.split(',')[0].trim();
            if (city.toLowerCase().includes('bangalore')) city = 'Bengaluru';
            if (city.toLowerCase().includes('delhi') || city.toLowerCase().includes('ncr') || city.toLowerCase().includes('gurgaon') || city.toLowerCase().includes('noida')) city = 'Delhi-NCR';

            const amt = Number(deal.funding_amount_usd) || 0;
            if (!hubMap[city]) hubMap[city] = { city, count: 0, amount: 0 };
            hubMap[city].count++;
            hubMap[city].amount += amt;
        });

        const hubs = Object.values(hubMap).map(h => {
            const pct = dealCount > 0 ? Math.round((h.count / dealCount) * 100) : 0;
            return { ...h, pct };
        }).sort((a, b) => b.amount - a.amount || b.count - a.count).slice(0, 6);

        // 4. Investor Leaderboard (Sanitized)
        const investorMap = {};
        deals.forEach(deal => {
            const rawInv = deal.lead_investor || deal.investors || deal.funded_by;
            const parsed = parseLeadInvestors(rawInv);
            parsed.forEach(invName => {
                if (!investorMap[invName]) investorMap[invName] = { name: invName, count: 0, deals: [] };
                investorMap[invName].count++;
                investorMap[invName].deals.push(deal.company_name);
            });
        });

        const investors = Object.values(investorMap).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 8);

        // 5. Showcase Deals
        const showcaseDeals = [...deals].sort((a, b) => {
            const amtA = Number(a.funding_amount_usd) || 0;
            const amtB = Number(b.funding_amount_usd) || 0;
            return amtB - amtA;
        });

        return {
            kpis: {
                totalCapital,
                dealCount,
                medianCheck,
                avgRound,
                capitalDeltaPct,
                dealsDelta,
                topDeal: topDeal ? {
                    name: topDeal.company_name,
                    amount: Number(topDeal.funding_amount_usd) || 0,
                    round: topDeal.funding_round || 'Round',
                    website: topDeal.company_website
                } : null
            },
            stages,
            sectors,
            segments,
            hubs,
            investors,
            showcaseDeals
        };
    }

    // Filter deals by preset or date range
    function filterDeals(allDeals, options) {
        if (!allDeals || !Array.isArray(allDeals)) return [];
        options = options || {};

        // Parse reference now (latest deal date in dataset or current time)
        let maxDateTimestamp = 0;
        allDeals.forEach(d => {
            const dt = new Date(d.date_of_funding);
            if (!isNaN(dt.getTime()) && dt.getTime() > maxDateTimestamp) {
                maxDateTimestamp = dt.getTime();
            }
        });
        if (maxDateTimestamp === 0) maxDateTimestamp = Date.now();

        const range = options.range || '30d';

        if (options.weekKey) {
            return allDeals.filter(d => {
                const w = getWeekInfo(d.date_of_funding);
                return w && (w.key === options.weekKey || w.slug === options.weekKey);
            });
        }

        if (options.startDate && options.endDate) {
            const start = new Date(options.startDate).getTime();
            const end = new Date(options.endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
            return allDeals.filter(d => {
                const dt = new Date(d.date_of_funding).getTime();
                return !isNaN(dt) && dt >= start && dt <= end;
            });
        }

        let days = 30;
        if (range === '7d') days = 7;
        else if (range === '14d') days = 14;
        else if (range === '30d') days = 30;
        else if (range === '90d') days = 90;
        else if (range === 'q3-2026') {
            return allDeals.filter(d => {
                const s = String(d.date_of_funding || '');
                return s.startsWith('2026-07') || s.startsWith('2026-08') || s.startsWith('2026-09');
            });
        } else if (range === 'q2-2026') {
            return allDeals.filter(d => {
                const s = String(d.date_of_funding || '');
                return s.startsWith('2026-04') || s.startsWith('2026-05') || s.startsWith('2026-06');
            });
        } else if (range === 'all') {
            return allDeals;
        }

        const cutoff = maxDateTimestamp - (days * 24 * 60 * 60 * 1000);
        return allDeals.filter(d => {
            const dt = new Date(d.date_of_funding).getTime();
            return !isNaN(dt) && dt >= cutoff && dt <= maxDateTimestamp;
        });
    }

    return {
        formatUSD,
        formatINR,
        formatFundingDateDisplay,
        getStageBadgeClass,
        getWeekInfo,
        computeTrends,
        filterDeals
    };
}));
