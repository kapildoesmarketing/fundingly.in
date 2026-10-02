/**
 * Fundingly.in — Dynamic Trends & Venture Intelligence Controller
 * Designed by Kapil Pidhwani: Exact 1:1 parity with weekly venture intelligence reports & live custom cohorts.
 */

(function() {
    'use strict';

    let allDeals = [];
    let currentFilteredDeals = [];
    let activePreset = '30d';
    let currentHotspotsView = 'vertical';

    // DOM Elements
    const elements = {
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeIcon: document.getElementById('themeIcon'),
        segmentedTabs: document.querySelectorAll('.timeline-nav-tab'),
        contextWeek: document.getElementById('contextWeek'),
        contextRolling: document.getElementById('contextRolling'),
        contextRollingText: document.getElementById('contextRollingText'),
        contextQuarter: document.getElementById('contextQuarter'),
        contextYear: document.getElementById('contextYear'),
        contextCustom: document.getElementById('contextCustom'),
        startDateInput: document.getElementById('trendsStartDate'),
        endDateInput: document.getElementById('trendsEndDate'),
        applyDateBtn: document.getElementById('applyTrendsDateBtn'),
        weekSelect: document.getElementById('trendsWeekSelect'),
        quarterSelect: document.getElementById('trendsQuarterSelect'),
        yearSelect: document.getElementById('trendsYearSelect'),
        reportTitle: document.getElementById('trendsReportTitle'),
        reportSub: document.getElementById('trendsReportSub'),
        dateRange: document.getElementById('trendsDateRange'),
        dealsCountBadge: document.getElementById('trendsDealsCountBadge'),
        quarterBadge: document.getElementById('trendsQuarterBadge'),
        kpiGrid: document.getElementById('trendsKpiGrid'),
        stageBar: document.getElementById('trendsStageBar'),
        stageLegend: document.getElementById('trendsStageLegend'),
        verticalView: document.getElementById('trendsVerticalView'),
        segmentView: document.getElementById('trendsSegmentView'),
        btnViewVertical: document.getElementById('btnViewVertical'),
        btnViewSegment: document.getElementById('btnViewSegment'),
        hubsList: document.getElementById('trendsHubsList'),
        investorsList: document.getElementById('trendsInvestorsList'),
        dealsRoster: document.getElementById('trendsDealsRoster'),
        sidebarWeeksList: document.getElementById('sidebarWeeksList'),
        toast: document.getElementById('trendsToast')
    };

    // Helper: Toast notification
    function showToast(message) {
        if (!elements.toast) return;
        elements.toast.textContent = message;
        elements.toast.classList.add('active');
        setTimeout(() => {
            elements.toast.classList.remove('active');
        }, 2200);
    }

    // Helper: Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Extract domain
    function extractDomain(url) {
        if (!url || typeof url !== 'string') return '';
        try {
            const cleanUrl = url.trim().toLowerCase();
            const fullUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') ? cleanUrl : `https://${cleanUrl}`;
            const parsed = new URL(fullUrl);
            return parsed.hostname.replace(/^www\./, '');
        } catch {
            return '';
        }
    }

    function slugify(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '') || 'startup';
    }

    function cleanCompanyName(name) {
        if (!name || typeof name !== 'string') return 'Enterprise';
        const cleaned = name.replace(/\s*\([^)]*(?:Pvt|Private|Limited|Ltd|Solutions|Enviro|Holdings|Group|Incorporated|Inc)[^)]*\)/i, '').trim();
        return cleaned || name;
    }

    function getMonogram(name) {
        if (!name) return '•';
        const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
        const words = cleaned.split(/\s+/).filter(Boolean);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return cleaned.substring(0, 2).toUpperCase() || '•';
    }

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

    // Theme Switcher Initialization
    function initTheme() {
        const savedTheme = localStorage.getItem('fundingly_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (elements.themeIcon) {
            elements.themeIcon.textContent = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
        }

        if (elements.themeToggleBtn) {
            elements.themeToggleBtn.addEventListener('click', () => {
                const curr = document.documentElement.getAttribute('data-theme') || 'light';
                const next = curr === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('fundingly_theme', next);
                if (elements.themeIcon) {
                    elements.themeIcon.textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
                }
            });
        }
    }

    // Set Active Filter Mode (Segmented Switcher + Context Sub-Control)
    function setFilterMode(mode, subParam) {
        activePreset = mode;

        // 1. Highlight active tab in segmented nav
        if (elements.segmentedTabs) {
            elements.segmentedTabs.forEach(tab => {
                const tabMode = tab.getAttribute('data-mode');
                const tabRange = tab.getAttribute('data-range');
                const isMatch = (mode === 'rolling' && tabRange === subParam) ||
                                (mode === 'rolling' && !subParam && tabRange === '30d') ||
                                (mode === tabMode);
                if (isMatch) {
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                } else {
                    tab.classList.remove('active');
                    tab.setAttribute('aria-selected', 'false');
                }
            });
        }

        // 2. Display the matching contextual sub-control on right
        const contextMap = {
            'week': elements.contextWeek,
            'rolling': elements.contextRolling,
            'quarter': elements.contextQuarter,
            'year': elements.contextYear,
            'custom': elements.contextCustom
        };

        Object.keys(contextMap).forEach(k => {
            const el = contextMap[k];
            if (el) {
                if (k === mode) {
                    el.style.display = 'inline-flex';
                } else {
                    el.style.display = 'none';
                }
            }
        });

        // 3. Update rolling velocity badge text
        if (mode === 'rolling' && elements.contextRollingText) {
            const rangeStr = (subParam || '30d').toUpperCase();
            elements.contextRollingText.textContent = `Rolling ${rangeStr} Velocity`;
        }
    }

    // Load Dataset (Quarterly JSONs)
    async function loadDataset() {
        try {
            const quarterFiles = ['../data/2026_q3.json', '../data/2026_q2.json'];
            const fetchPromises = quarterFiles.map(url =>
                fetch(url)
                    .then(res => res.ok ? res.json() : [])
                    .catch(err => {
                        console.warn(`Could not load ${url}:`, err);
                        return [];
                    })
            );

            const results = await Promise.all(fetchPromises);
            const combined = results.flat().filter(Boolean);

            // Deduplicate by company name + funding date
            const seen = new Set();
            allDeals = [];
            combined.forEach(deal => {
                const key = `${deal.company_name?.toLowerCase().trim()}_${deal.date_of_funding}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    allDeals.push(deal);
                }
            });

            // Populate all 5 selector controls dynamically
            const sortedWeeks = populateTimeframeSelectors();

            // Check URL parameters or default to Latest Week
            parseUrlAndRender(sortedWeeks);
        } catch (err) {
            console.error('Failed to load trends data:', err);
            if (elements.reportTitle) {
                elements.reportTitle.textContent = 'Failed to load live funding intelligence';
            }
        }
    }

    // Populate Timeframe Selectors Dynamically from Dataset
    function populateTimeframeSelectors() {
        const weekMap = new Map();
        const quarterSet = new Set();
        const yearSet = new Set();

        allDeals.forEach(deal => {
            const date = deal.date_of_funding;
            if (!date) return;

            // Week
            const w = FundinglyTrendsEngine.getWeekInfo(date);
            if (w && w.key) {
                if (!weekMap.has(w.key)) {
                    weekMap.set(w.key, { ...w, totalCapital: 0, dealCount: 0 });
                }
                const data = weekMap.get(w.key);
                data.dealCount++;
                const amt = Number(deal.funding_amount_usd);
                if (!isNaN(amt) && amt > 0) data.totalCapital += amt;
            }

            // Quarters & Years
            const parts = date.split('-');
            if (parts.length >= 2) {
                const yr = parts[0];
                const mo = parseInt(parts[1], 10);
                if (yr && mo) {
                    const qNum = Math.ceil(mo / 3);
                    quarterSet.add(`Q${qNum} ${yr}`);
                    yearSet.add(yr);
                }
            }
        });

        const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => b.key.localeCompare(a.key));

        // 1. Populate Weekly Dropdown
        if (elements.weekSelect) {
            elements.weekSelect.innerHTML = '<option value="">Select Week...</option>' +
                sortedWeeks.map((w, idx) => `<option value="${w.slug}">${w.title} ${idx === 0 ? '(Latest)' : ''} — ${FundinglyTrendsEngine.formatUSD(w.totalCapital)}</option>`).join('');
        }

        // 2. Populate Sidebar Weekly Archive Widget
        if (elements.sidebarWeeksList) {
            elements.sidebarWeeksList.innerHTML = sortedWeeks.map(w => `
                <a href="./${w.slug}/" class="sidebar-week-item">
                    <span>${escapeHtml(w.title)}</span>
                    <span style="font-size: 11px; opacity: 0.8;">${FundinglyTrendsEngine.formatUSD(w.totalCapital)} • ${w.dealCount}d</span>
                </a>
            `).join('');
        }

        // 3. Populate Quarter Dropdown
        if (elements.quarterSelect) {
            const sortedQuarters = Array.from(quarterSet).sort((a, b) => b.localeCompare(a));
            elements.quarterSelect.innerHTML = '<option value="">Select Quarter...</option>' +
                sortedQuarters.map(q => {
                    const [qPart, yrPart] = q.split(' ');
                    const val = `${qPart.toLowerCase()}-${yrPart}`;
                    return `<option value="${val}">${q} Venture Report</option>`;
                }).join('');
        }

        // 4. Populate Year Dropdown
        if (elements.yearSelect) {
            const sortedYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
            elements.yearSelect.innerHTML = '<option value="">Select Year...</option>' +
                sortedYears.map(yr => `<option value="${yr}">${yr} Full Year</option>`).join('') +
                '<option value="all">All 2026 Macroeconomic</option>';
        }

        return sortedWeeks;
    }

    // Parse URL Search Parameters with Latest Week Default
    function parseUrlAndRender(sortedWeeks = []) {
        const params = new URLSearchParams(window.location.search);
        const week = params.get('week');
        const range = params.get('range');
        const quarter = params.get('quarter');
        const year = params.get('year');
        const from = params.get('from');
        const to = params.get('to');

        if (week) {
            applyWeekFilter(week);
        } else if (range) {
            applyRollingFilter(range);
        } else if (quarter) {
            applyQuarterFilter(quarter);
        } else if (year) {
            applyYearFilter(year);
        } else if (from && to) {
            applyCustomDateFilter(from, to);
        } else if (sortedWeeks.length > 0) {
            // Default: Latest Available Funding Week
            applyWeekFilter(sortedWeeks[0].slug);
        } else {
            applyRollingFilter('30d');
        }
    }

    // Apply Week Filter (Option 1)
    function applyWeekFilter(weekSlug) {
        setFilterMode('week');
        if (elements.weekSelect) elements.weekSelect.value = weekSlug;

        currentFilteredDeals = FundinglyTrendsEngine.filterDeals(allDeals, { weekKey: weekSlug });

        // Update URL
        const url = new URL(window.location.href);
        url.search = `?week=${weekSlug}`;
        history.replaceState(null, '', url.toString());

        const firstDatedDeal = currentFilteredDeals.find(c => FundinglyTrendsEngine.getWeekInfo(c.date_of_funding) !== null);
        const weekInfo = firstDatedDeal ? FundinglyTrendsEngine.getWeekInfo(firstDatedDeal.date_of_funding) : null;
        const title = weekInfo ? `${weekInfo.title}` : `Weekly Report: ${weekSlug}`;
        const quarterTag = weekInfo ? `${weekInfo.year} Q${Math.floor(new Date(weekInfo.startTimestamp).getUTCMonth() / 3) + 1}` : 'Weekly Report';

        renderReport(title, quarterTag, weekInfo ? weekInfo.rangeStr : weekSlug);
    }

    // Apply Rolling Filter (Option 2: 7D / 14D / 30D)
    function applyRollingFilter(presetKey) {
        setFilterMode('rolling', presetKey);

        currentFilteredDeals = FundinglyTrendsEngine.filterDeals(allDeals, { range: presetKey });

        // Update URL
        const url = new URL(window.location.href);
        url.search = `?range=${presetKey}`;
        history.replaceState(null, '', url.toString());

        let title = 'Last 30 Days Funding Trends';
        let quarterTag = 'Rolling 30D';
        if (presetKey === '7d') { title = 'Last 7 Days Funding Trends'; quarterTag = 'Real-Time 7D'; }
        else if (presetKey === '14d') { title = 'Last 14 Days Funding Trends'; quarterTag = 'Real-Time 14D'; }
        else if (presetKey === '30d') { title = 'Last 30 Days Funding Trends'; quarterTag = 'Rolling 30D'; }

        renderReport(title, quarterTag);
    }

    // Apply Quarter Filter (Option 3: Q3 2026, Q2 2026)
    function applyQuarterFilter(qKey) {
        if (!qKey) return;
        setFilterMode('quarter');
        if (elements.quarterSelect) elements.quarterSelect.value = qKey;

        currentFilteredDeals = FundinglyTrendsEngine.filterDeals(allDeals, { range: qKey });

        // Update URL
        const url = new URL(window.location.href);
        url.search = `?quarter=${qKey}`;
        history.replaceState(null, '', url.toString());

        let title = 'Quarterly Venture Intelligence Report';
        let quarterTag = 'Quarterly Cohort';
        if (qKey === 'q3-2026') { title = 'Q3 2026 Venture Intelligence Report'; quarterTag = '2026 Q3'; }
        else if (qKey === 'q2-2026') { title = 'Q2 2026 Venture Intelligence Report'; quarterTag = '2026 Q2'; }

        renderReport(title, quarterTag);
    }

    // Apply Year Filter (Option 4: 2026, All)
    function applyYearFilter(yKey) {
        if (!yKey) return;
        setFilterMode('year');
        if (elements.yearSelect) elements.yearSelect.value = yKey;

        currentFilteredDeals = FundinglyTrendsEngine.filterDeals(allDeals, { range: yKey === '2026' ? 'all' : 'all' });

        // Update URL
        const url = new URL(window.location.href);
        url.search = `?year=${yKey}`;
        history.replaceState(null, '', url.toString());

        const title = yKey === 'all' ? 'All Macroeconomic Startup Funding Trends' : `${yKey} Annual Venture Intelligence Report`;
        const quarterTag = yKey === 'all' ? 'All Time' : `${yKey} Full Year`;

        renderReport(title, quarterTag);
    }

    // Apply Custom Date Filter (Option 5)
    function applyCustomDateFilter(startDate, endDate) {
        if (!startDate || !endDate) return;
        setFilterMode('custom');
        if (elements.startDateInput) elements.startDateInput.value = startDate;
        if (elements.endDateInput) elements.endDateInput.value = endDate;

        currentFilteredDeals = FundinglyTrendsEngine.filterDeals(allDeals, { startDate, endDate });

        // Update URL
        const url = new URL(window.location.href);
        url.search = `?from=${startDate}&to=${endDate}`;
        history.replaceState(null, '', url.toString());

        const title = `Custom Cohort Funding Trends`;
        const quarterTag = 'Custom Cohort';
        renderReport(title, quarterTag, `${startDate} – ${endDate}`);
    }

    // Render Drilldown List HTML
    function renderDrilldownItemsHTML(categories) {
        if (!categories || categories.length === 0) {
            return `<span style="color: var(--color-text-secondary); font-size: 11.5px; padding: 8px 0;">No sector activity recorded for this cohort.</span>`;
        }

        return categories.map(cat => {
            const subList = cat.subList || [];
            const subListHtml = subList.map(sub => {
                const comps = sub.deals || [];
                const companyListHtml = comps.map(comp => {
                    const avatarHtml = renderCompanyAvatarHTML(comp);
                    const cDomain = extractDomain(comp.company_website) || slugify(comp.company_name);
                    const companyUrl = `../deals/${cDomain}/`;
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
                                <div class="trends-deal-amount">${FundinglyTrendsEngine.formatUSD(comp.funding_amount_usd)}</div>
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
                        <div class="trends-drill-sub-header" role="button" tabindex="0" onclick="toggleTrendsDrilldown(this)">
                            <button type="button" class="trends-drill-chevron" aria-label="Toggle ${escapeHtml(sub.name)}" tabindex="-1">
                                <span class="material-symbols-outlined">chevron_right</span>
                            </button>
                            <div class="trends-drill-info">
                                <div class="trends-progress-labels">
                                    <span class="trends-sub-name" title="${escapeHtml(sub.name)}">${escapeHtml(sub.name)}</span>
                                    <span class="trends-progress-val">${FundinglyTrendsEngine.formatUSD(sub.amount)} • ${sub.count} ${sub.count === 1 ? 'deal' : 'deals'} (${sub.pctOfParent}%)</span>
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
                    <div class="trends-drill-header" role="button" tabindex="0" onclick="toggleTrendsDrilldown(this)">
                        <button type="button" class="trends-drill-chevron" aria-label="Toggle ${escapeHtml(cat.name)}" tabindex="-1">
                            <span class="material-symbols-outlined">chevron_right</span>
                        </button>
                        <div class="trends-drill-info">
                            <div class="trends-progress-labels">
                                <span class="trends-progress-name" title="${escapeHtml(cat.name)}">${escapeHtml(cat.name)}</span>
                                <span class="trends-progress-val">${FundinglyTrendsEngine.formatUSD(cat.amount)} • ${cat.count} ${cat.count === 1 ? 'deal' : 'deals'} (${cat.pct}%)</span>
                            </div>
                            <div class="trends-progress-track">
                                <div class="trends-progress-fill" style="width: ${Math.max(cat.pct, 3)}%;"></div>
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

    // Main Render Function
    function renderReport(reportTitle, quarterTag, explicitDateRange) {
        const metrics = FundinglyTrendsEngine.computeTrends(currentFilteredDeals, []);

        // 1. Header Identity
        if (elements.reportTitle) {
            elements.reportTitle.textContent = reportTitle;
        }
        if (elements.dateRange) {
            if (explicitDateRange) {
                elements.dateRange.textContent = explicitDateRange;
            } else if (currentFilteredDeals.length > 0) {
                const dates = currentFilteredDeals.map(d => d.date_of_funding).filter(Boolean).sort();
                elements.dateRange.textContent = `${dates[0]} – ${dates[dates.length - 1]}`;
            } else {
                elements.dateRange.textContent = 'Selected Timeframe';
            }
        }
        if (elements.dealsCountBadge) {
            elements.dealsCountBadge.textContent = `${metrics.kpis.dealCount} Announced Deals`;
        }
        if (elements.quarterBadge) {
            elements.quarterBadge.textContent = quarterTag || '2026';
        }

        // 2. 4-Tile Velocity KPI Strip
        if (elements.kpiGrid) {
            const topDealHTML = metrics.kpis.topDeal ? `
                <div class="trends-kpi-card">
                    <span class="trends-kpi-label">Largest Deal</span>
                    <span class="trends-kpi-val" title="${escapeHtml(metrics.kpis.topDeal.name)}">${escapeHtml(cleanCompanyName(metrics.kpis.topDeal.name))}</span>
                    <span class="trends-kpi-sub" title="${FundinglyTrendsEngine.formatUSD(metrics.kpis.topDeal.amount)} • ${escapeHtml(metrics.kpis.topDeal.round)}">${FundinglyTrendsEngine.formatUSD(metrics.kpis.topDeal.amount)} • ${escapeHtml(metrics.kpis.topDeal.round)}</span>
                </div>
            ` : `
                <div class="trends-kpi-card">
                    <span class="trends-kpi-label">Largest Deal</span>
                    <span class="trends-kpi-val">Undisclosed</span>
                    <span class="trends-kpi-sub">—</span>
                </div>
            `;

            elements.kpiGrid.innerHTML = `
                <div class="trends-kpi-card">
                    <span class="trends-kpi-label">Total Capital</span>
                    <span class="trends-kpi-val">${FundinglyTrendsEngine.formatUSD(metrics.kpis.totalCapital)}</span>
                    <span class="trends-kpi-sub">${FundinglyTrendsEngine.formatINR(metrics.kpis.totalCapital)} INR approx</span>
                </div>

                <div class="trends-kpi-card">
                    <span class="trends-kpi-label">Deals Announced</span>
                    <span class="trends-kpi-val">${metrics.kpis.dealCount} Deals</span>
                    <span class="trends-kpi-sub">Verified funding rounds</span>
                </div>

                <div class="trends-kpi-card">
                    <span class="trends-kpi-label">Median Check</span>
                    <span class="trends-kpi-val">${FundinglyTrendsEngine.formatUSD(metrics.kpis.medianCheck)}</span>
                    <span class="trends-kpi-sub">Avg ${FundinglyTrendsEngine.formatUSD(metrics.kpis.avgRound)} per round</span>
                </div>

                ${topDealHTML}
            `;
        }

        // 3. Stage Allocation Continuous Segmented Bar & Legend
        if (elements.stageBar) {
            elements.stageBar.innerHTML = metrics.stages.map(s => `
                <div class="trends-bar-segment" style="flex: ${Math.max(s.amount, 1)}; background-color: ${s.color};" title="${escapeHtml(s.label)}: ${FundinglyTrendsEngine.formatUSD(s.amount)} (${s.pct}%)"></div>
            `).join('');
        }

        if (elements.stageLegend) {
            elements.stageLegend.innerHTML = metrics.stages.map(s => `
                <div class="trends-stage-item">
                    <span class="trends-color-dot" style="background-color: ${s.color};"></span>
                    <span>${escapeHtml(s.label)}: <strong>${FundinglyTrendsEngine.formatUSD(s.amount)}</strong> (${s.count} ${s.count === 1 ? 'deal' : 'deals'} • ${s.pct}%)</span>
                </div>
            `).join('');
        }

        // 4. Sector & Sub-Industry Interactive Drilldown
        if (elements.verticalView) {
            elements.verticalView.innerHTML = renderDrilldownItemsHTML(metrics.sectors);
        }
        if (elements.segmentView) {
            elements.segmentView.innerHTML = renderDrilldownItemsHTML(metrics.segments);
        }

        // 5. Regional Deal Hubs
        if (elements.hubsList) {
            if (metrics.hubs.length === 0) {
                elements.hubsList.innerHTML = `<span style="color: var(--color-text-secondary); font-size: 11.5px;">No regional data recorded.</span>`;
            } else {
                elements.hubsList.innerHTML = metrics.hubs.map(h => `
                    <div class="trends-hub-pill">
                        📍 ${escapeHtml(h.city)}: <strong>${h.count} ${h.count === 1 ? 'deal' : 'deals'}</strong> (${h.pct}%)
                    </div>
                `).join('');
            }
        }

        // 6. Active Lead Investors (Sanitized)
        if (elements.investorsList) {
            if (metrics.investors.length === 0) {
                elements.investorsList.innerHTML = `<span style="color: var(--color-text-secondary); font-size: 11.5px;">No lead investor data recorded.</span>`;
            } else {
                elements.investorsList.innerHTML = metrics.investors.map(inv => `
                    <div class="trends-investor-item">
                        <span class="trends-investor-name" title="${escapeHtml(inv.name)}">${escapeHtml(inv.name)}</span>
                        <span class="trends-investor-count">${inv.count} ${inv.count === 1 ? 'deal' : 'deals'}</span>
                    </div>
                `).join('');
            }
        }

        // 7. Showcase Deals Roster
        if (elements.dealsRoster) {
            if (metrics.showcaseDeals.length === 0) {
                elements.dealsRoster.innerHTML = `<span style="color: var(--color-text-secondary); font-size: 12px; padding: 12px 0;">No deals recorded for this period.</span>`;
            } else {
                elements.dealsRoster.innerHTML = metrics.showcaseDeals.slice(0, 15).map(deal => {
                    const avatarHtml = renderCompanyAvatarHTML(deal);
                    const domain = extractDomain(deal.company_website) || slugify(deal.company_name);
                    const companyUrl = `../deals/${domain}/`;
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
                                <div class="trends-deal-amount">${FundinglyTrendsEngine.formatUSD(deal.funding_amount_usd)}</div>
                                <a href="${companyUrl}" class="btn-trends-memo" aria-label="View details for ${escapeHtml(deal.company_name)}">
                                    <span>View Details</span>
                                    <span class="material-symbols-outlined" style="font-size: 13px;">arrow_outward</span>
                                </a>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    // Toggle Collapsible Drilldown (90deg animation)
    window.toggleTrendsDrilldown = function(headerEl) {
        const parent = headerEl.closest('.trends-drill-item, .trends-drill-sub-item');
        if (parent) {
            parent.classList.toggle('expanded');
        }
    };

    // Switch Hotspots View (Vertical vs Segment)
    window.switchHotspotsView = function(view) {
        currentHotspotsView = view;
        if (elements.btnViewVertical && elements.btnViewSegment) {
            if (view === 'vertical') {
                elements.btnViewVertical.classList.add('active');
                elements.btnViewSegment.classList.remove('active');
                if (elements.verticalView) elements.verticalView.style.display = 'flex';
                if (elements.segmentView) elements.segmentView.style.display = 'none';
            } else {
                elements.btnViewSegment.classList.add('active');
                elements.btnViewVertical.classList.remove('active');
                if (elements.verticalView) elements.verticalView.style.display = 'none';
                if (elements.segmentView) elements.segmentView.style.display = 'flex';
            }
        }
    };

    // Copy Digest Markdown
    window.copyTrendsDigest = function() {
        if (!currentFilteredDeals || currentFilteredDeals.length === 0) return;
        const metrics = FundinglyTrendsEngine.computeTrends(currentFilteredDeals, []);

        const lines = [
            `*📊 Indian Startup Funding Intelligence Digest — ${elements.reportTitle?.textContent || 'Trends Report'}*`,
            `• *Total Capital Raised:* ${FundinglyTrendsEngine.formatUSD(metrics.kpis.totalCapital)} (~ ${FundinglyTrendsEngine.formatINR(metrics.kpis.totalCapital)})`,
            `• *Deals Announced:* ${metrics.kpis.dealCount} verified funding rounds`,
            `• *Median Check Size:* ${FundinglyTrendsEngine.formatUSD(metrics.kpis.medianCheck)} (Avg ${FundinglyTrendsEngine.formatUSD(metrics.kpis.avgRound)})`,
            metrics.kpis.topDeal ? `• *Largest Round:* ${metrics.kpis.topDeal.name} (${FundinglyTrendsEngine.formatUSD(metrics.kpis.topDeal.amount)} • ${metrics.kpis.topDeal.round})` : null,
            '',
            '*Key Sector Allocation:*',
            ...metrics.sectors.slice(0, 4).map(s => `  - ${s.name}: ${FundinglyTrendsEngine.formatUSD(s.amount)} (${s.pct}%, ${s.count} deals)`),
            '',
            '*Top Active Hubs:*',
            ...metrics.hubs.slice(0, 3).map(h => `  - ${h.city}: ${FundinglyTrendsEngine.formatUSD(h.amount)} (${h.count} deals)`),
            '',
            `*Full Interactive Intelligence Report:* ${window.location.href}`
        ].filter(Boolean);

        const digest = lines.join('\n');
        navigator.clipboard.writeText(digest).then(() => {
            showToast('Executive Trends digest copied for Slack/Teams!');
        }).catch(() => {
            showToast('Failed to copy digest');
        });
    };

    // Copy Share URL
    window.copyPageUrl = function() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('Shareable Trends report URL copied!');
        }).catch(() => {
            showToast('Failed to copy link');
        });
    };

    // Event Listeners Setup
    function initEvents() {
        // 1. Segmented Nav Tabs
        if (elements.segmentedTabs) {
            elements.segmentedTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const mode = tab.getAttribute('data-mode');
                    const range = tab.getAttribute('data-range');

                    if (range) {
                        applyRollingFilter(range);
                    } else if (mode === 'week') {
                        setFilterMode('week');
                        const val = elements.weekSelect?.value;
                        if (val) {
                            applyWeekFilter(val);
                        } else if (elements.weekSelect && elements.weekSelect.options.length > 1) {
                            elements.weekSelect.selectedIndex = 1;
                            applyWeekFilter(elements.weekSelect.value);
                        }
                    } else if (mode === 'quarter') {
                        setFilterMode('quarter');
                        const val = elements.quarterSelect?.value;
                        if (val) {
                            applyQuarterFilter(val);
                        } else if (elements.quarterSelect && elements.quarterSelect.options.length > 1) {
                            elements.quarterSelect.selectedIndex = 1;
                            applyQuarterFilter(elements.quarterSelect.value);
                        }
                    } else if (mode === 'year') {
                        setFilterMode('year');
                        const val = elements.yearSelect?.value;
                        if (val) {
                            applyYearFilter(val);
                        } else if (elements.yearSelect && elements.yearSelect.options.length > 1) {
                            elements.yearSelect.selectedIndex = 1;
                            applyYearFilter(elements.yearSelect.value);
                        }
                    } else if (mode === 'custom') {
                        setFilterMode('custom');
                    }
                });
            });
        }

        // 2. Weekly Select
        if (elements.weekSelect) {
            elements.weekSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val) {
                    applyWeekFilter(val);
                }
            });
        }

        // 3. Quarter Select
        if (elements.quarterSelect) {
            elements.quarterSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val) {
                    applyQuarterFilter(val);
                }
            });
        }

        // 4. Year Select
        if (elements.yearSelect) {
            elements.yearSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val) {
                    applyYearFilter(val);
                }
            });
        }

        // 5. Apply Custom Dates Button
        if (elements.applyDateBtn) {
            elements.applyDateBtn.addEventListener('click', () => {
                const start = elements.startDateInput?.value;
                const end = elements.endDateInput?.value;
                if (!start || !end) {
                    showToast('Please select both start and end dates');
                    return;
                }
                applyCustomDateFilter(start, end);
            });
        }
    }

    // DOM Ready Initialization
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initEvents();
        loadDataset();
    });
})();
