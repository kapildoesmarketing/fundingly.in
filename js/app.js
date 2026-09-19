let rawDataset = [];
        let activeFilteredDataset = [];
        let driverObj = null;
        let visibleLimit = 30; // Item 1.3: Retained for fallback compatibility
        let isFetchingRemainingFromBackend = false;
        let bgRenderTimerId = null;
        let bgIdleCallbackId = null;
        const INITIAL_WEEKS_TO_RENDER = 2;
        const collapsedWeekKeys = new Set(); // Item 4.2: Accordion state
        const initializedWeekKeys = new Set(); // Tracks weeks that have received initial default collapse state
        let quarterManifest = null;
        const loadedQuarterFiles = new Set();
        let isFetchingQuarter = false;
        let activeViewMode = 'cards'; // 'cards' | 'table'
        let tableSortColumn = 'date'; // 'date' | 'amount' | 'company'
        let tableSortDirection = 'desc'; // 'asc' | 'desc'
        let searchDebounceTimer = null;

        // User Session Tracking (persisted across tab reloads via sessionStorage)
        let sessionId = '';
        try {
            sessionId = sessionStorage.getItem('fundingly_session_id');
            if (!sessionId) {
                sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
                    ? crypto.randomUUID()
                    : 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                sessionStorage.setItem('fundingly_session_id', sessionId);
            }
        } catch (e) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        }

        document.addEventListener('DOMContentLoaded', () => {
            initTheme();
            initSidebar();
            initFilterDimensionBar();
            initDatePopover();
            initSessionLogging();
            initViewSwitcher();
            fetchMasterData();

            document.getElementById('searchInput').addEventListener('input', handleSearchDebounced);
            document.getElementById('bulkAccordionBtn').addEventListener('click', toggleBulkAccordion);
            document.getElementById('loadMoreBtn').addEventListener('click', loadMoreDeals);
            document.getElementById('emptyStateClearBtn').addEventListener('click', clearAllFilters);

            // Floating Back-to-Top Button Handler (UX Polish)
            window.addEventListener('scroll', () => {
                const topBtn = document.getElementById('backToTopBtn');
                if (topBtn) {
                    topBtn.style.display = window.scrollY > 300 ? 'inline-flex' : 'none';
                }
            });
            document.getElementById('backToTopBtn').addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            document.getElementById('tourBtn').addEventListener('click', () => {
                initDriverTour();
                if (driverObj) {
                    driverObj.drive();
                }
            });

            document.getElementById('closeModal').addEventListener('click', closeModal);
            document.getElementById('modalOverlay').addEventListener('click', (e) => {
                if (e.target.id === 'modalOverlay') closeModal();
            });

            // About Modal Handlers
            const aboutBtn = document.getElementById('aboutBtn');
            if (aboutBtn) {
                aboutBtn.addEventListener('click', openAboutModal);
            }
            const closeAboutBtn = document.getElementById('closeAboutModalBtn');
            if (closeAboutBtn) {
                closeAboutBtn.addEventListener('click', closeAboutModal);
            }
            const aboutModalEl = document.getElementById('aboutModal');
            if (aboutModalEl) {
                aboutModalEl.addEventListener('click', (e) => {
                    if (e.target.id === 'aboutModal') closeAboutModal();
                });
            }

            // Trends Modal Handlers
            const closeTrendsBtn = document.getElementById('closeTrendsModalBtn');
            if (closeTrendsBtn) {
                closeTrendsBtn.addEventListener('click', closeTrendsModal);
            }
            const trendsModalEl = document.getElementById('trendsModal');
            if (trendsModalEl) {
                trendsModalEl.addEventListener('click', (e) => {
                    if (e.target.id === 'trendsModal') closeTrendsModal();
                });
            }

            // Global Keyboard Shortcuts (⌘K search, Esc close, G grid, T table, D dark mode)
            document.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    const search = document.getElementById('searchInput');
                    if (search) {
                        search.focus();
                        search.select();
                    }
                } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    const search = document.getElementById('searchInput');
                    if (search) {
                        search.focus();
                        search.select();
                    }
                } else if (e.key === 'Escape') {
                    closeModal();
                    closeDatePopover();
                    closeAboutModal();
                    closeTrendsModal();
                    if (document.activeElement && document.activeElement.id === 'searchInput') {
                        document.activeElement.blur();
                    }
                } else if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    if (e.key === 'g' || e.key === 'G') {
                        e.preventDefault();
                        setViewMode('cards');
                    } else if (e.key === 't' || e.key === 'T') {
                        e.preventDefault();
                        setViewMode('table');
                    } else if (e.key === 'd' || e.key === 'D') {
                        e.preventDefault();
                        toggleTheme();
                    }
                }
            });
        });

        function initSessionLogging() {
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withFailureHandler(err => console.warn('Session logging unavailable:', err))
                    .logUserSession(sessionId);
            }
        }

        // Deisgned by Kapil Pidhwani: True Apple OLED Dark Mode with system auto-detect and manual toggle. Ceiling: 2 appearance states (Light/Dark). Upgrade path: Accent tint color picker.
        function initTheme() {
            let savedTheme = 'auto';
            try {
                savedTheme = localStorage.getItem('fundingly_theme') || 'auto';
            } catch (e) { }

            applyTheme(savedTheme, false);

            const toggleBtn = document.getElementById('themeToggleBtn');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', toggleTheme);
            }

            try {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                    let current = 'auto';
                    try { current = localStorage.getItem('fundingly_theme') || 'auto'; } catch (e) { }
                    if (current === 'auto') {
                        applyTheme('auto', false);
                    }
                });
            } catch (e) { }
        }

        function applyTheme(theme, save = true) {
            const root = document.documentElement;
            const themeIcon = document.getElementById('themeIcon');
            const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

            if (theme === 'dark' || (theme === 'auto' && isSystemDark)) {
                root.setAttribute('data-theme', 'dark');
                if (themeIcon) themeIcon.textContent = 'light_mode';
            } else {
                root.setAttribute('data-theme', 'light');
                if (themeIcon) themeIcon.textContent = 'dark_mode';
            }

            if (save) {
                try {
                    localStorage.setItem('fundingly_theme', theme);
                } catch (e) { }
            }
        }

        function toggleTheme() {
            const root = document.documentElement;
            const isDark = root.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            applyTheme(newTheme, true);
        }

        // Suggestion 3.1: Multi-Dimensional Filter State
        let activeStage = 'all';
        let activeSector = 'all';
        let activeAmount = 'all';
        let activeGeo = 'all';

        // Deisgned by Kapil Pidhwani: Collapsible sidebar controller with edge rail toggle, header collapse button, and localStorage persistence. Ceiling: Static binary state. Upgrade path: Gesture swipe for mobile drawer.
        function initSidebar() {
            const sidebar = document.getElementById('appSidebar');
            const edgeToggleBtn = document.getElementById('sidebarEdgeToggleBtn');
            const edgeToggleIcon = document.getElementById('sidebarEdgeToggleIcon');
            const headerCollapseBtn = document.getElementById('sidebarHeaderCollapseBtn');
            const mobileToggleBtn = document.getElementById('mobileFilterToggleBtn');
            if (!sidebar) return;

            const updateToggleUI = (collapsed) => {
                if (edgeToggleIcon) {
                    edgeToggleIcon.textContent = collapsed ? 'chevron_right' : 'chevron_left';
                }
                if (edgeToggleBtn) {
                    edgeToggleBtn.setAttribute('title', collapsed ? 'Expand Filters' : 'Collapse Filters');
                    edgeToggleBtn.setAttribute('aria-label', collapsed ? 'Expand Filters' : 'Collapse Filters');
                }
                if (headerCollapseBtn) {
                    headerCollapseBtn.setAttribute('title', collapsed ? 'Expand Filters' : 'Collapse Filters');
                    headerCollapseBtn.setAttribute('aria-label', collapsed ? 'Expand Filters' : 'Collapse Filters');
                }
            };

            const isCollapsed = localStorage.getItem('fundingly_sidebar_collapsed') === 'true';
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
            }
            updateToggleUI(isCollapsed);

            const toggleSidebar = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                const currentlyCollapsed = sidebar.classList.toggle('collapsed');
                localStorage.setItem('fundingly_sidebar_collapsed', String(currentlyCollapsed));
                updateToggleUI(currentlyCollapsed);
            };

            if (edgeToggleBtn) edgeToggleBtn.addEventListener('click', toggleSidebar);
            if (headerCollapseBtn) headerCollapseBtn.addEventListener('click', toggleSidebar);
            if (mobileToggleBtn) mobileToggleBtn.addEventListener('click', toggleSidebar);
        }


        // Deisgned by Kapil Pidhwani: Multi-Dimensional Filter Controller. Ceiling: 4 dimensions (Stage, Sector, Amount, Geo). Upgrade path: Multi-select checkboxes per dimension.
        function initFilterDimensionBar() {
            const stageTrack = document.getElementById('stagePillTrack');
            if (stageTrack) {
                stageTrack.addEventListener('click', (e) => {
                    const pill = e.target.closest('.stage-pill');
                    if (!pill) return;
                    stageTrack.querySelectorAll('.stage-pill').forEach(p => {
                        p.classList.remove('active');
                        p.setAttribute('aria-checked', 'false');
                    });
                    pill.classList.add('active');
                    pill.setAttribute('aria-checked', 'true');
                    activeStage = pill.getAttribute('data-stage') || 'all';
                    applyFilters();
                });
            }

            const sectorSelect = document.getElementById('sectorFilterSelect');
            if (sectorSelect) {
                sectorSelect.addEventListener('change', () => {
                    activeSector = sectorSelect.value;
                    sectorSelect.classList.toggle('has-value', activeSector !== 'all');
                    applyFilters();
                });
            }

            const amountSelect = document.getElementById('amountFilterSelect');
            if (amountSelect) {
                amountSelect.addEventListener('change', () => {
                    activeAmount = amountSelect.value;
                    amountSelect.classList.toggle('has-value', activeAmount !== 'all');
                    applyFilters();
                });
            }

            const geoSelect = document.getElementById('geoFilterSelect');
            if (geoSelect) {
                geoSelect.addEventListener('change', () => {
                    activeGeo = geoSelect.value;
                    geoSelect.classList.toggle('has-value', activeGeo !== 'all');
                    applyFilters();
                });
            }
        }

        function populateSectorDropdown(records) {
            const sectorSelect = document.getElementById('sectorFilterSelect');
            if (!sectorSelect || !Array.isArray(records)) return;

            const sectorsSet = new Set();
            records.forEach(r => {
                if (r.industry && typeof r.industry === 'string') {
                    const trimmed = r.industry.trim();
                    if (trimmed && trimmed.toLowerCase() !== 'general') sectorsSet.add(trimmed);
                }
            });

            const sortedSectors = Array.from(sectorsSet).sort((a, b) => a.localeCompare(b));
            const currentVal = sectorSelect.value;

            sectorSelect.innerHTML = '<option value="all">All Sectors</option>' +
                sortedSectors.map(s => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>').join('');

            if (sortedSectors.includes(currentVal)) {
                sectorSelect.value = currentVal;
            }
        }

        // Deisgned by Kapil Pidhwani: Interactive walkthrough updated for sidebar architecture, 3-card feed, and contact intelligence.
        function initDriverTour() {
            if (typeof window.driver === 'undefined' || !window.driver.js || typeof window.driver.js.driver !== 'function') {
                return false;
            }

            // Ensure sidebar is expanded so tour steps targeting sidebar elements are in view
            const sidebar = document.getElementById('appSidebar');
            if (sidebar && sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                const edgeIcon = document.getElementById('sidebarEdgeToggleIcon');
                if (edgeIcon) edgeIcon.textContent = 'chevron_left';
            }

            driverObj = window.driver.js.driver({
                showProgress: true,
                animate: true,
                steps: [
                    {
                        element: '#tourSearch',
                        popover: {
                            title: 'Spotlight Search (⌘K)',
                            description: 'Quickly find deals by company name, founder, lead investor, sector, or keywords. Press ⌘K or / anytime to focus.'
                        }
                    },
                    {
                        element: '#tourDateFilter',
                        popover: {
                            title: 'Date Horizon Popover',
                            description: 'Slice deals across custom date intervals or one-click presets like Last 30 Days, 90 Days, or This Year.'
                        }
                    },
                    {
                        element: '#stagePillTrack',
                        popover: {
                            title: 'Funding Stage Filters',
                            description: 'Filter deals live by funding stage: Pre-Seed/Seed, Series A, Series B, Growth, or Debt rounds.'
                        }
                    },
                    {
                        element: '#sidebarEdgeToggleBtn',
                        popover: {
                            title: 'Collapsible Rail Toggle',
                            description: 'Click this sticky edge button anytime to collapse the sidebar for full-width browsing, or expand it to adjust filters.'
                        }
                    },
                    {
                        element: '#gridContainer',
                        popover: {
                            title: 'Weekly Feed (3 Cards / Row)',
                            description: 'Deals are grouped chronologically by week with weekly capital metrics. Click any card to open deep deal intelligence, copy domains, or export summaries.'
                        }
                    }
                ]
            });
            return true;
        }

        // Compact Date Popover Controller
        function initDatePopover() {
            const triggerBtn = document.getElementById('dateTriggerBtn');
            const popoverCard = document.getElementById('datePopoverCard');
            const backdrop = document.getElementById('datePopoverBackdrop');
            const startInput = document.getElementById('startDateInput');
            const endInput = document.getElementById('endDateInput');
            const applyBtn = document.getElementById('applyDateBtn');
            const resetBtn = document.getElementById('resetDateBtn');
            const clearBtn = document.getElementById('clearDateBtn');
            const presetChips = document.querySelectorAll('.chip-btn');

            triggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDatePopover();
            });

            popoverCard.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Backdrop click closes popover cleanly
            if (backdrop) {
                backdrop.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeDatePopover();
                });
            }

            // Close popover when clicking anywhere outside
            document.addEventListener('click', (e) => {
                if (!popoverCard.contains(e.target) && !triggerBtn.contains(e.target)) {
                    closeDatePopover();
                }
            });

            // Quick Preset Chips
            presetChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    presetChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');

                    const preset = chip.getAttribute('data-preset');
                    applyPresetDates(preset);
                });
            });

            // Custom date inputs
            startInput.addEventListener('change', () => {
                presetChips.forEach(c => c.classList.remove('active'));
                updateDateTriggerLabel();
                applyFilters();
            });

            endInput.addEventListener('change', () => {
                presetChips.forEach(c => c.classList.remove('active'));
                updateDateTriggerLabel();
                applyFilters();
            });

            applyBtn.addEventListener('click', () => {
                closeDatePopover();
                applyFilters();
            });

            resetBtn.addEventListener('click', () => {
                clearDateFilter();
                closeDatePopover();
            });

            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearDateFilter();
            });
        }

        function toggleDatePopover() {
            const card = document.getElementById('datePopoverCard');
            const btn = document.getElementById('dateTriggerBtn');
            const backdrop = document.getElementById('datePopoverBackdrop');
            const isOpen = card.classList.contains('open');
            if (isOpen) {
                closeDatePopover();
            } else {
                card.classList.add('open');
                btn.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
                if (backdrop) backdrop.classList.add('active');
            }
        }

        function closeDatePopover() {
            const card = document.getElementById('datePopoverCard');
            const btn = document.getElementById('dateTriggerBtn');
            const backdrop = document.getElementById('datePopoverBackdrop');
            if (card && btn) {
                card.classList.remove('open');
                btn.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            }
            if (backdrop) backdrop.classList.remove('active');
        }

        function applyPresetDates(preset) {
            const startInput = document.getElementById('startDateInput');
            const endInput = document.getElementById('endDateInput');

            if (preset === 'all') {
                startInput.value = '';
                endInput.value = '';
            } else {
                const today = new Date();
                const formatDate = (d) => d.toISOString().split('T')[0];
                endInput.value = formatDate(today);

                if (preset === '30d') {
                    const past = new Date(today);
                    past.setDate(past.getDate() - 30);
                    startInput.value = formatDate(past);
                } else if (preset === '90d') {
                    const past = new Date(today);
                    past.setDate(past.getDate() - 90);
                    startInput.value = formatDate(past);
                } else if (preset === 'year') {
                    const yearStart = new Date(today.getFullYear(), 0, 1);
                    startInput.value = formatDate(yearStart);
                }
            }

            updateDateTriggerLabel();
            applyFilters();
        }

        function updateDateTriggerLabel() {
            const start = document.getElementById('startDateInput').value;
            const end = document.getElementById('endDateInput').value;
            const label = document.getElementById('dateTriggerLabel');
            const clearBtn = document.getElementById('clearDateBtn');
            const triggerBtn = document.getElementById('dateTriggerBtn');

            if (start || end) {
                clearBtn.style.display = 'inline-flex';
                triggerBtn.classList.add('active');

                const formatShort = (dateStr) => {
                    if (!dateStr) return '';
                    const parts = dateStr.split('-');
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const m = months[parseInt(parts[1], 10) - 1] || '';
                    const d = parseInt(parts[2], 10) || '';
                    return `${m} ${d}`;
                };

                if (start && end) {
                    label.textContent = `${formatShort(start)} – ${formatShort(end)}`;
                } else if (start) {
                    label.textContent = `From ${formatShort(start)}`;
                } else {
                    label.textContent = `Until ${formatShort(end)}`;
                }
            } else {
                clearBtn.style.display = 'none';
                triggerBtn.classList.remove('active');
                label.textContent = 'Dates';
            }
        }

        function clearDateFilter() {
            document.getElementById('startDateInput').value = '';
            document.getElementById('endDateInput').value = '';
            document.querySelectorAll('.chip-btn').forEach(c => {
                if (c.getAttribute('data-preset') === 'all') c.classList.add('active');
                else c.classList.remove('active');
            });
            updateDateTriggerLabel();
            applyFilters();
        }

        // Deisgned by Kapil Pidhwani: Quarter-wise dynamic data loader. Fetches latest quarter via manifest with rolling 15-minute cache-busting. Ceiling: Sequential quarter pagination. Upgrade path: Concurrent multi-quarter prefetching on idle.
        function fetchMasterData() {
            if (typeof google !== 'undefined' && google.script && google.script.run && google.script.run.getFundingData) {
                google.script.run
                    .withSuccessHandler(renderApp)
                    .withFailureHandler(handleError)
                    .getFundingData({ mode: 'initial', weeks: INITIAL_WEEKS_TO_RENDER });
                return;
            }

            const cacheBuster = '?t=' + Math.floor(Date.now() / 900000);
            fetch('data/manifest.json' + cacheBuster)
                .then(response => {
                    if (!response.ok) return fetch('./data/manifest.json' + cacheBuster);
                    return response;
                })
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
                    return response.json();
                })
                .then(manifest => {
                    if (!manifest || (!manifest.latest_quarter && (!manifest.quarters || manifest.quarters.length === 0))) {
                        throw new Error('Invalid manifest: No quarters defined');
                    }
                    quarterManifest = manifest;
                    const latestQuarterFile = manifest.latest_quarter || manifest.quarters[0].file;
                    loadedQuarterFiles.add(latestQuarterFile);
                    return fetch('data/' + latestQuarterFile + cacheBuster)
                        .then(res => {
                            if (!res.ok) return fetch('./data/' + latestQuarterFile + cacheBuster);
                            return res;
                        })
                        .then(res => {
                            if (!res.ok) throw new Error(`Could not load quarter file: ${latestQuarterFile}`);
                            return res.json();
                        });
                })
                .then(data => {
                    if (data) {
                        renderApp(data);
                        updateQuarterPaginationUI();
                    }
                })
                .catch(err => {
                    console.error('Data fetch error:', err);
                    handleError(err);
                });
        }

        function handleError(error) {
            const loader = document.getElementById('loader');
            loader.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-status-error);">error</span>
        <p style="color: var(--color-status-error); margin-top: 10px; font-weight: 600; font-size: 14px;">Error loading dataset: ${escapeHtml(error.message)}</p>
      `;
        }

        function renderApp(data) {
            const dataset = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : []);
            rawDataset = dataset;
            document.getElementById('loader').style.display = 'none';

            const toolbar = document.getElementById('timelineToolbar');
            if (toolbar) toolbar.style.display = 'flex';

            const filterBar = document.getElementById('filterDimensionBar');
            if (filterBar) filterBar.style.display = 'flex';

            populateSectorDropdown(rawDataset);

            const hasMoreFromBackend = Boolean(data && data.hasMore);
            isFetchingRemainingFromBackend = hasMoreFromBackend;

            applyFilters(false);
            handleDomainDeepLink();
            updateQuarterPaginationUI();

            if (hasMoreFromBackend && typeof google !== 'undefined' && google.script && google.script.run) {
                const nextOffset = typeof data.nextOffset === 'number' ? data.nextOffset : dataset.length;
                google.script.run
                    .withSuccessHandler(handleRemainingData)
                    .withFailureHandler(err => {
                        console.warn('Background remaining data fetch warning:', err);
                        isFetchingRemainingFromBackend = false;
                        updateBackgroundLoadingUI(0);
                    })
                    .getFundingData({ mode: 'remaining', offset: nextOffset });
            }
        }

        // Deisgned by Kapil Pidhwani: Strict domain deep-link handler. Ceiling: Matches against extractDomain(company_website). Upgrade path: Multi-domain alias mapping.
        function handleDomainDeepLink() {
            const params = new URLSearchParams(window.location.search);
            const domainParam = params.get('domain');
            if (!domainParam) return;

            const cleanDomainQuery = domainParam.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
            if (!cleanDomainQuery) return;

            const match = rawDataset.find(item => {
                if (!item || !item.company_website) return false;
                const domain = extractDomain(item.company_website).toLowerCase();
                return domain === cleanDomainQuery;
            });

            if (match) {
                openModal(match);
                try {
                    window.history.replaceState({}, '', '/' + cleanDomainQuery);
                } catch (e) {
                    console.warn('History replaceState warning:', e);
                }
            }
        }

        function handleRemainingData(remData) {
            isFetchingRemainingFromBackend = false;
            const remRecords = Array.isArray(remData) ? remData : (remData && Array.isArray(remData.records) ? remData.records : []);
            if (remRecords.length > 0) {
                rawDataset = rawDataset.concat(remRecords);
                populateSectorDropdown(rawDataset);
                applyFilters(true);
            } else {
                updateBackgroundLoadingUI(0);
            }
        }

        // Deisgned by Kapil Pidhwani: Native Levenshtein distance matrix computation. Ceiling: O(m*n) memory/time suitable for single words <= 32 chars. Upgrade path: Bit-parallel Myers algorithm if matching long phrases.
        function levenshteinDistance(s1, s2) {
            if (s1 === s2) return 0;
            if (!s1.length) return s2.length;
            if (!s2.length) return s1.length;
            const v0 = new Array(s2.length + 1);
            const v1 = new Array(s2.length + 1);
            for (let i = 0; i <= s2.length; i++) v0[i] = i;
            for (let i = 0; i < s1.length; i++) {
                v1[0] = i + 1;
                for (let j = 0; j < s2.length; j++) {
                    const cost = s1[i] === s2[j] ? 0 : 1;
                    v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
                }
                for (let j = 0; j <= s2.length; j++) v0[j] = v1[j];
            }
            return v0[s2.length];
        }

        // Deisgned by Kapil Pidhwani: Typo-tolerant substring & token matching heuristic. Ceiling: Exact substring match first, then allows 1-2 char edits on words >= 4 chars. Upgrade path: Indexed search index (e.g. MiniSearch / FlexSearch) for >10,000 records.
        function matchesQueryFuzzy(text, query) {
            if (!text || !query) return false;
            const target = String(text).toLowerCase();
            const q = String(query).toLowerCase().trim();
            if (!q) return true;
            if (target.includes(q)) return true;
            if (q.length < 3) return false;

            const words = target.split(/[\s,./\-_|]+/);
            const maxDist = q.length <= 4 ? 1 : 2;
            for (const word of words) {
                if (!word) continue;
                if (word.includes(q)) return true;
                if (Math.abs(word.length - q.length) <= maxDist) {
                    if (levenshteinDistance(word, q) <= maxDist) return true;
                }
            }
            return false;
        }

        // Deisgned by Kapil Pidhwani: Compact USD currency formatting heuristic (K/M/B). Ceiling: Only handles standard USD scaling up to billions; does not format negative rounds or non-USD currencies. Upgrade path: Use Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).
        function formatUSD(num) {
            if (!num || isNaN(num) || num <= 0) return 'Undisclosed';
            const n = Number(num);
            if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
            if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
            if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
            return '$' + n.toLocaleString('en-US');
        }

        // Deisgned by Kapil Pidhwani: Standardizes date string to YYYY-MM-DD regardless of ISO timestamps or UTC offsets.
        function formatFundingDateDisplay(dateStr) {
            if (!dateStr || dateStr === 'N/A') return 'N/A';
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

        // Deisgned by Kapil Pidhwani: ISO week calculation, Monday-to-Sunday date range formatter, and Quarter identifier. Ceiling: Assumes Gregorian calendar. Upgrade path: Temporal API.
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
                timestamp: monday.getTime()
            };
        }

        function escapeHtml(str) {
            if (str == null) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        // Suggestion 4.1: Domain Favicon & Monogram Avatar Engine
        function extractDomain(url) {
            if (!url || typeof url !== 'string') return '';
            try {
                const cleanUrl = url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim();
                const parsed = new URL(cleanUrl);
                return parsed.hostname.replace(/^www\./, '');
            } catch (e) {
                return '';
            }
        }

        // Deisgned by Kapil Pidhwani: Deterministic 2-letter uppercase monogram generator. Ceiling: English alphanumeric parsing. Upgrade path: Unicode grapheme cluster segmentation for global scripts.
        function getMonogram(name) {
            if (!name) return '•';
            const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
            const words = cleaned.split(/\s+/).filter(Boolean);
            if (words.length >= 2) {
                return (words[0][0] + words[1][0]).toUpperCase();
            }
            return cleaned.substring(0, 2).toUpperCase() || '•';
        }

        // Deisgned by Kapil Pidhwani: Deterministic pastel palette picker based on string hash. Ceiling: 7 distinct Apple color hues. Upgrade path: Extract brand primary color directly from company favicon using canvas.
        function getMonogramStyle(name) {
            const palettes = [
                { bg: 'rgba(0, 102, 204, 0.08)', text: '#0066cc' },
                { bg: 'rgba(52, 199, 89, 0.08)', text: '#28a745' },
                { bg: 'rgba(88, 86, 214, 0.08)', text: '#5856d6' },
                { bg: 'rgba(255, 149, 0, 0.08)', text: '#d97706' },
                { bg: 'rgba(175, 82, 222, 0.08)', text: '#af52de' },
                { bg: 'rgba(255, 45, 85, 0.08)', text: '#e11d48' },
                { bg: 'rgba(0, 199, 190, 0.08)', text: '#0d9488' }
            ];
            let hash = 0;
            const str = String(name || '');
            for (let i = 0; i < str.length; i++) {
                hash = (hash << 5) - hash + str.charCodeAt(i);
                hash |= 0;
            }
            const index = Math.abs(hash) % palettes.length;
            return palettes[index];
        }

        // Deisgned by Kapil Pidhwani: Dynamic brand logo luminance detection. Samples 16x16 canvas to check if transparent logo is predominantly light or dark. Ceiling: CORS restriction on foreign canvas reads (gracefully falls back to pedestal). Upgrade path: Backend pre-extracted color luminance metadata.
        function detectLogoLuminance(img) {
            if (!img || !img.complete || img.naturalWidth === 0) return;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 16;
                canvas.height = 16;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, 16, 16);
                const data = ctx.getImageData(0, 0, 16, 16).data;
                let rSum = 0, gSum = 0, bSum = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    if (alpha > 40) {
                        rSum += data[i];
                        gSum += data[i + 1];
                        bSum += data[i + 2];
                        count++;
                    }
                }
                if (count > 0) {
                    const avgLuminance = (rSum * 0.299 + gSum * 0.587 + bSum * 0.114) / count;
                    if (avgLuminance > 210) {
                        img.classList.add('logo-light-mark');
                    } else if (avgLuminance < 50) {
                        img.classList.add('logo-dark-mark');
                    }
                }
            } catch (e) {
                // Cross-origin image read restriction - pedestal handles contrast cleanly
            }
        }

        // Deisgned by Kapil Pidhwani: Visual Deal Stage Color Coding System. Maps funding rounds to Apple-calibrated stage classes. Ceiling: 4 discrete stage buckets. Upgrade path: User-configurable color mapping.
        function getStageBadgeClass(stage) {
            if (!stage || typeof stage !== 'string') return 'stage-early';
            const s = stage.toLowerCase().trim();
            if (s.includes('seed') || s.includes('angel') || s.includes('grant') || s.includes('incub') || s.includes('pre-series a')) {
                return 'stage-early';
            }
            if (s === 'series a' || s === 'series b' || s.includes('venture')) {
                return 'stage-venture';
            }
            if (s.includes('series c') || s.includes('series d') || s.includes('series e') || s.includes('series f') || s.includes('growth') || s.includes('late')) {
                return 'stage-growth';
            }
            if (s.includes('debt') || s.includes('bridge') || s.includes('non-equity')) {
                return 'stage-debt';
            }
            return 'stage-venture';
        }

        // Deisgned by Kapil Pidhwani: Domain favicon with instant squircle monogram fallback. Ceiling: Google Favicon API sz=128 cache. Upgrade path: Dedicated SVG avatar sprite caching.
        function renderCompanyAvatarHTML(company, isLarge = false) {
            const domain = extractDomain(company && company.company_website);
            const name = (company && company.company_name) || 'Enterprise';
            const monogram = getMonogram(name);
            const color = getMonogramStyle(name);
            const avatarClass = isLarge ? 'modal-hero-avatar' : 'company-avatar';
            const monoClass = isLarge ? 'modal-hero-monogram' : 'company-monogram';
            const size = isLarge ? 44 : 32;

            if (domain) {
                const faviconUrl = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=128';
                const escapedName = escapeHtml(name);
                const imgTag = '<img src="' + faviconUrl + '" alt="' + escapedName + '" class="' + avatarClass + '" width="' + size + '" height="' + size + '" loading="lazy" onload="detectLogoLuminance(this)" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'inline-flex\';">';
                const fallbackTag = '<div class="' + monoClass + '" style="display:none;background-color:' + color.bg + ';color:' + color.text + ';">' + escapeHtml(monogram) + '</div>';
                return imgTag + fallbackTag;
            }
            return '<div class="' + monoClass + '" style="background-color:' + color.bg + ';color:' + color.text + ';">' + escapeHtml(monogram) + '</div>';
        }

        // Deisgned by Kapil Pidhwani: Inline SVG brand icons for LinkedIn and Google Search. Ceiling: Fixed 12x12 viewBox. Upgrade path: Centralized SVG sprite sheet.
        const ICON_LINKEDIN_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="#0a66c2" aria-hidden="true"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6Z"/></svg>';

        const ICON_GOOGLE_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.35 11.1h-9.17v2.98h5.27c-.23 1.23-.92 2.27-1.97 2.97v2.47h3.18c1.86-1.72 2.93-4.25 2.93-7.31 0-.71-.06-1.4-.24-2.11z" fill="#4285F4"/><path d="M12.18 21c2.65 0 4.87-.88 6.5-2.38l-3.18-2.47c-.88.59-2 .94-3.32.94-2.55 0-4.71-1.73-5.48-4.05H3.39v2.55C5.03 18.81 8.35 21 12.18 21z" fill="#34A853"/><path d="M6.7 13.04c-.2-.59-.31-1.22-.31-1.87s.11-1.28.31-1.87V6.75H3.39C2.71 8.1 2.32 9.63 2.32 11.23s.39 3.13 1.07 4.48l3.31-2.67z" fill="#FBBC05"/><path d="M12.18 5.76c1.44 0 2.74.5 3.76 1.47l2.82-2.82C17.04 2.82 14.83 2 12.18 2 8.35 2 5.03 4.19 3.39 7.42l3.31 2.55c.77-2.32 2.93-4.21 5.48-4.21z" fill="#EA4335"/></svg>';

        // Deisgned by Kapil Pidhwani: Generates LinkedIn & Google Search action buttons for queries. Ceiling: Query string encoding. Upgrade path: Dynamic search suggestion dropdown.
        function renderSearchMicroButtons(queryText, ariaPrefix) {
            if (!queryText) return '';
            const cleanQuery = String(queryText).trim();
            const liUrl = 'https://www.linkedin.com/search/results/all/?keywords=' + encodeURIComponent(cleanQuery);
            const gUrl = 'https://www.google.com/search?q=' + encodeURIComponent(cleanQuery);
            const prefix = ariaPrefix || 'Search';
            return `
        <a href="${liUrl}" target="_blank" rel="noopener noreferrer" class="search-micro-btn linkedin-btn" title="${prefix} on LinkedIn (${escapeHtml(cleanQuery)})" aria-label="${prefix} on LinkedIn">
          ${ICON_LINKEDIN_SVG}
        </a>
        <a href="${gUrl}" target="_blank" rel="noopener noreferrer" class="search-micro-btn google-btn" title="${prefix} on Google (${escapeHtml(cleanQuery)})" aria-label="${prefix} on Google">
          ${ICON_GOOGLE_SVG}
        </a>
      `;
        }

        // Deisgned by Kapil Pidhwani: Formats person names into an Apple bulleted list with LinkedIn & Google search actions. Ceiling: Comma/semicolon separation. Upgrade path: Name entity extractor for international honorifics.
        function renderPersonListWithSearch(namesStr, companyName) {
            if (!namesStr || typeof namesStr !== 'string' || namesStr.trim() === '' || namesStr.trim() === 'N/A') {
                return '<span style="color: var(--color-text-tertiary);">N/A</span>';
            }
            const names = namesStr.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
            if (names.length === 0) return '<span style="color: var(--color-text-tertiary);">N/A</span>';

            const companySuffix = companyName ? ' ' + String(companyName).trim() : '';

            const items = names.map(name => {
                const searchBtns = renderSearchMicroButtons(name + companySuffix, 'Search ' + name);
                return `<li class="person-bullet-item"><span>${escapeHtml(name)}</span>${searchBtns}</li>`;
            }).join('');

            return `<ul class="person-bullet-list">${items}</ul>`;
        }

        // Weekly Chronological Segmentation of Cards + Progressive Background Week Loader (Items 1.3 & 4.2)
        function cancelBackgroundWeekRender() {
            if (bgIdleCallbackId !== null && typeof cancelIdleCallback === 'function') {
                cancelIdleCallback(bgIdleCallbackId);
                bgIdleCallbackId = null;
            }
            if (bgRenderTimerId !== null) {
                clearTimeout(bgRenderTimerId);
                bgRenderTimerId = null;
            }
        }

        function updateBackgroundLoadingUI(pendingWeekCount) {
            const loadMoreContainer = document.getElementById('loadMoreContainer');
            const bgIndicator = document.getElementById('bgLoadingIndicator');
            const bgText = document.getElementById('bgLoadingText');
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (!loadMoreContainer) return;

            if (loadMoreBtn) loadMoreBtn.style.display = 'none';

            if (pendingWeekCount > 0 || isFetchingRemainingFromBackend) {
                loadMoreContainer.style.display = 'flex';
                if (bgIndicator) bgIndicator.style.display = 'inline-flex';
                if (bgText) {
                    bgText.textContent = pendingWeekCount > 0
                        ? `Loading earlier weeks in background... (${pendingWeekCount} ${pendingWeekCount === 1 ? 'week' : 'weeks'} remaining)`
                        : 'Loading earlier weeks in background...';
                }
            } else {
                loadMoreContainer.style.display = 'none';
                if (bgIndicator) bgIndicator.style.display = 'none';
            }
        }

        function groupDealsByWeek(data) {
            const groupsMap = new Map();
            data.forEach((company, globalIndex) => {
                const weekInfo = getWeekInfo(company.date_of_funding);
                const key = weekInfo ? weekInfo.key : 'undated';

                if (!groupsMap.has(key)) {
                    groupsMap.set(key, {
                        key: key,
                        weekInfo: weekInfo,
                        items: [],
                        totalUSD: 0
                    });
                }

                const group = groupsMap.get(key);
                group.items.push({ company, globalIndex });

                const amt = Number(company.funding_amount_usd);
                if (!isNaN(amt) && amt > 0) {
                    group.totalUSD += amt;
                }
            });

            const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => {
                if (a === 'undated') return 1;
                if (b === 'undated') return -1;
                return b.localeCompare(a);
            });

            return sortedKeys.map(key => groupsMap.get(key));
        }

        function createWeekSectionElement(group, animateCards) {
            const key = group.key;
            const weekSection = document.createElement('section');
            const isCollapsed = collapsedWeekKeys.has(key);
            weekSection.className = 'week-group' + (isCollapsed ? ' collapsed' : '');
            weekSection.dataset.weekKey = key;

            const dealCountText = `${group.items.length} ${group.items.length === 1 ? 'deal' : 'deals'}`;
            const totalCapitalText = group.totalUSD > 0 ? ` • ${formatUSD(group.totalUSD)} total` : '';

            const headerTitle = group.weekInfo ? group.weekInfo.title : 'Earlier / Undated Deals';
            const headerRange = group.weekInfo ? `<span class="week-date-range">${escapeHtml(group.weekInfo.rangeStr)}</span>` : '';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'week-header';
            headerDiv.setAttribute('role', 'button');
            headerDiv.setAttribute('tabindex', '0');
            headerDiv.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            headerDiv.setAttribute('title', 'Click to toggle week view');
            headerDiv.innerHTML = `
        <div class="week-title-row">
          <span class="material-symbols-outlined week-chevron" aria-hidden="true">expand_more</span>
          <h2 class="week-number">${escapeHtml(headerTitle)}</h2>
          ${headerRange}
          <span class="week-metrics-pill">${dealCountText}${totalCapitalText}</span>
        </div>
        <button type="button" class="btn-week-trends" title="View Trends for ${escapeHtml(headerTitle)}">
          <span class="material-symbols-outlined trends-icon">trending_up</span>
          <span>View Trends</span>
        </button>
      `;

            const trendsBtn = headerDiv.querySelector('.btn-week-trends');
            if (trendsBtn) {
                trendsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTrendsModal(key, headerTitle);
                });
            }

            headerDiv.addEventListener('click', () => {
                if (collapsedWeekKeys.has(key)) {
                    collapsedWeekKeys.delete(key);
                    weekSection.classList.remove('collapsed');
                    headerDiv.setAttribute('aria-expanded', 'true');
                } else {
                    collapsedWeekKeys.add(key);
                    weekSection.classList.add('collapsed');
                    headerDiv.setAttribute('aria-expanded', 'false');
                }
                updateBulkAccordionBtn();
            });

            headerDiv.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    headerDiv.click();
                }
            });

            weekSection.appendChild(headerDiv);

            const gridDiv = document.createElement('div');
            gridDiv.className = 'week-grid';

            group.items.forEach(({ company }) => {
                const card = document.createElement('article');
                card.className = 'company-card';
                if (!animateCards) {
                    card.style.opacity = '1';
                }
                card.setAttribute('role', 'button');
                card.setAttribute('tabindex', '0');
                card.setAttribute('aria-label', `View details for ${company.company_name || 'Enterprise'}`);
                card.addEventListener('click', (e) => {
                    if (e.target.closest('a') || e.target.closest('button')) return;
                    openModal(company);
                });
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        if (e.target.closest('a') || e.target.closest('button')) return;
                        e.preventDefault();
                        openModal(company);
                    }
                });

                const titleText = company.company_name || 'Unnamed Enterprise';
                const industry = company.industry || 'General';
                const subIndustry = company.sub_industry ? ' • ' + company.sub_industry : '';
                const fundingRound = company.funding_round || 'Funding';
                const amountFormatted = formatUSD(company.funding_amount_usd);
                const location = company.company_headquarters || 'N/A';
                const date = formatFundingDateDisplay(company.date_of_funding);
                const description = company.company_description || 'No description available.';
                const leadInvestor = company.lead_investor ? 'Led by ' + company.lead_investor : '';

                const avatarHTML = renderCompanyAvatarHTML(company, false);

                card.innerHTML = `
          <div>
            <div class="card-top-bar">
              ${avatarHTML}
              <span class="badge-round ${getStageBadgeClass(fundingRound)}">${escapeHtml(fundingRound)}</span>
            </div>
            <div class="company-name-wrap">
              <span class="company-name">${escapeHtml(titleText)}</span>
              <div class="industry-subtitle">${escapeHtml(industry)}${escapeHtml(subIndustry)}</div>
            </div>
            <p class="description">${escapeHtml(description)}</p>
          </div>

          <div>
            <div class="card-meta-box">
              <div class="meta-block">
                <span class="meta-label">Amount</span>
                <span class="meta-value">${amountFormatted}</span>
              </div>
              <div class="meta-block">
                <span class="meta-label">Date</span>
                <span class="meta-value">${escapeHtml(date)}</span>
              </div>
              <div class="meta-block" style="grid-column: span 2;">
                <span class="meta-label">Headquarters</span>
                <span class="meta-value">${escapeHtml(location)}</span>
              </div>
            </div>

            <div class="card-footer">
              <span class="lead-investor-text" title="${escapeHtml(leadInvestor)}">
                ${escapeHtml(leadInvestor)}
              </span>
              <button type="button" class="btn-detail" aria-label="View details for ${escapeHtml(titleText)}">
                <span>Details</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        `;

                const detailBtn = card.querySelector('.btn-detail');
                if (detailBtn) {
                    detailBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openModal(company);
                    });
                }

                gridDiv.appendChild(card);
            });

            weekSection.appendChild(gridDiv);
            return weekSection;
        }

        // Deisgned by Kapil Pidhwani: Smooth animated odometer ticker for numerical metrics. Ceiling: Micro-animation for aggregate counters. Upgrade path: Canvas/SVG odometer reels.
        function animateOdometerMetrics(metricsEl, totalDeals, totalUSD, duration = 280) {
            if (!metricsEl) return;
            if (totalDeals <= 0) {
                metricsEl.textContent = '';
                metricsEl.style.display = 'none';
                metricsEl.dataset.prevDeals = '0';
                metricsEl.dataset.prevUSD = '0';
                return;
            }

            metricsEl.style.display = 'inline-block';
            const prevDeals = Number(metricsEl.dataset.prevDeals) || 0;
            const prevUSD = Number(metricsEl.dataset.prevUSD) || 0;
            metricsEl.dataset.prevDeals = String(totalDeals);
            metricsEl.dataset.prevUSD = String(totalUSD);

            if (prevDeals === 0 && prevUSD === 0) {
                metricsEl.textContent = `${totalDeals} ${totalDeals === 1 ? 'deal' : 'deals'}` + (totalUSD > 0 ? ` • ${formatUSD(totalUSD)} total` : '');
                return;
            }

            const startTime = performance.now();
            const tick = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                const currentDeals = Math.round(prevDeals + (totalDeals - prevDeals) * ease);
                const currentUSD = prevUSD + (totalUSD - prevUSD) * ease;

                const text = `${currentDeals} ${currentDeals === 1 ? 'deal' : 'deals'}` + (currentUSD > 0 ? ` • ${formatUSD(currentUSD)} total` : '');
                metricsEl.textContent = text;

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    metricsEl.textContent = `${totalDeals} ${totalDeals === 1 ? 'deal' : 'deals'}` + (totalUSD > 0 ? ` • ${formatUSD(totalUSD)} total` : '');
                }
            };
            requestAnimationFrame(tick);
        }

        function updateQuarterToolbarBadge(allWeekGroups) {
            const titleEl = document.getElementById('toolbarQuarterTitle');
            const subEl = document.getElementById('toolbarQuarterSub');
            const metricsEl = document.getElementById('toolbarQuarterMetrics');
            if (!titleEl || !subEl) return;

            let totalDeals = 0;
            let totalUSD = 0;
            if (allWeekGroups && allWeekGroups.length > 0) {
                allWeekGroups.forEach(g => {
                    totalDeals += g.items.length;
                    totalUSD += g.totalUSD;
                });
            }

            if (allWeekGroups && allWeekGroups.length > 0 && allWeekGroups[0].weekInfo) {
                const info = allWeekGroups[0].weekInfo;
                titleEl.textContent = info.quarterTitle;
                const parts = info.quarterDateRange.split(' ');
                subEl.textContent = `${parts[0]} ${parts[1]} ${parts[2]}`;
            } else if (quarterManifest && quarterManifest.quarters && quarterManifest.quarters.length > 0) {
                const latest = quarterManifest.quarters[0];
                titleEl.textContent = `${latest.year} Q${latest.quarter}`;
                subEl.textContent = latest.label ? latest.label.replace(/^Q\d \d{4}\s*\((.+)\)$/, '$1') : 'Jul – Sep';
            } else {
                titleEl.textContent = '2026 Q3';
                subEl.textContent = 'Jul – Sep';
            }

            if (metricsEl) {
                animateOdometerMetrics(metricsEl, totalDeals, totalUSD);
            }
        }

        // Deisgned by Kapil Pidhwani: Idle-slice progressive DOM renderer. Appends 1 week section per idle frame after initial 2 weeks render so main thread stays 60fps. Ceiling: DOM node count for >5,000 deals. Upgrade path: Virtualized viewport windowing.
        function scheduleBackgroundWeekRender(groupsQueue) {
            cancelBackgroundWeekRender();
            if (!groupsQueue || groupsQueue.length === 0) {
                updateBackgroundLoadingUI(0);
                if (!isFetchingRemainingFromBackend) {
                    verifyBackgroundWeekRender();
                }
                return;
            }

            updateBackgroundLoadingUI(groupsQueue.length);

            const runStep = () => {
                bgIdleCallbackId = null;
                bgRenderTimerId = null;
                const container = document.getElementById('gridContainer');
                if (!container) return;

                const nextGroup = groupsQueue.shift();
                if (nextGroup) {
                    const existing = container.querySelector(`.week-group[data-week-key="${nextGroup.key}"]`);
                    if (!existing) {
                        const sectionEl = createWeekSectionElement(nextGroup, false);
                        container.appendChild(sectionEl);
                    }
                    updateBulkAccordionBtn();
                }

                if (groupsQueue.length > 0) {
                    updateBackgroundLoadingUI(groupsQueue.length);
                    if (typeof requestIdleCallback === 'function') {
                        bgIdleCallbackId = requestIdleCallback(runStep, { timeout: 120 });
                    } else {
                        bgRenderTimerId = setTimeout(runStep, 24);
                    }
                } else {
                    updateBackgroundLoadingUI(0);
                    if (!isFetchingRemainingFromBackend) {
                        verifyBackgroundWeekRender();
                    }
                }
            };

            if (typeof requestIdleCallback === 'function') {
                bgIdleCallbackId = requestIdleCallback(runStep, { timeout: 120 });
            } else {
                bgRenderTimerId = setTimeout(runStep, 24);
            }
        }

        // Deisgned by Kapil Pidhwani: Automated self-check assertion for progressive background loader. Verifies DOM card count equals filtered dataset count and no duplicate week keys exist.
        function verifyBackgroundWeekRender() {
            const container = document.getElementById('gridContainer');
            if (!container) return false;
            const renderedCards = container.querySelectorAll('.company-card').length;
            const expectedCards = activeFilteredDataset.length;
            const weekSections = Array.from(container.querySelectorAll('.week-group'));
            const weekKeys = weekSections.map(s => s.dataset.weekKey);
            const uniqueKeys = new Set(weekKeys);
            const passed = (renderedCards === expectedCards) && (weekKeys.length === uniqueKeys.size);
            console.assert(passed, `[Self-Check Failed] Expected ${expectedCards} cards (got ${renderedCards}) and unique week sections.`);
            if (passed) {
                console.log(`[Self-Check Passed] Background week loader verified: ${renderedCards}/${expectedCards} deals across ${uniqueKeys.size} weeks rendered seamlessly.`);
            }
            return passed;
        }

        function renderGrid(data, preserveExistingDOM) {
            cancelBackgroundWeekRender();
            const container = document.getElementById('gridContainer');
            const emptyState = document.getElementById('emptyState');

            if (!data || data.length === 0) {
                container.innerHTML = '';
                emptyState.style.display = 'block';
                updateBackgroundLoadingUI(0);
                updateQuarterToolbarBadge([]);
                return;
            }

            emptyState.style.display = 'none';
            const allWeekGroups = groupDealsByWeek(data);
            updateQuarterToolbarBadge(allWeekGroups);

            // Deisgned by Kapil Pidhwani: Initialize default collapse state. Only the single latest week across the whole dataset remains expanded by default (collapsed = false); all older weeks start collapsed unless explicitly toggled by the user. Ceiling: In-memory session state. Upgrade path: LocalStorage persistence.
            if (allWeekGroups.length > 0) {
                const latestWeekKey = allWeekGroups[0].key;
                if (!initializedWeekKeys.has(latestWeekKey)) {
                    collapsedWeekKeys.delete(latestWeekKey); // Latest week is open
                    initializedWeekKeys.add(latestWeekKey);
                }
                for (let i = 1; i < allWeekGroups.length; i++) {
                    const olderWeekKey = allWeekGroups[i].key;
                    if (!initializedWeekKeys.has(olderWeekKey)) {
                        collapsedWeekKeys.add(olderWeekKey); // Older weeks start collapsed
                        initializedWeekKeys.add(olderWeekKey);
                    }
                }
            }

            if (preserveExistingDOM === true) {
                const unrenderedGroups = [];
                allWeekGroups.forEach(group => {
                    const existing = container.querySelector(`.week-group[data-week-key="${group.key}"]`);
                    if (existing) {
                        const existingCardsCount = existing.querySelectorAll('.company-card').length;
                        if (existingCardsCount < group.items.length) {
                            const updatedSection = createWeekSectionElement(group, false);
                            container.replaceChild(updatedSection, existing);
                        }
                    } else {
                        unrenderedGroups.push(group);
                    }
                });
                updateBulkAccordionBtn();
                scheduleBackgroundWeekRender(unrenderedGroups);
                return;
            }

            container.innerHTML = '';
            const initialGroups = allWeekGroups.slice(0, INITIAL_WEEKS_TO_RENDER);
            const remainingGroups = allWeekGroups.slice(INITIAL_WEEKS_TO_RENDER);

            initialGroups.forEach(group => {
                const sectionEl = createWeekSectionElement(group, true);
                container.appendChild(sectionEl);
            });

            updateBulkAccordionBtn();

            // Quiet Anime.js staggered entrance animation on initial 2 weeks only (Apple motion guidance)
            const initialCards = container.querySelectorAll('.company-card');
            if (typeof anime !== 'undefined' && initialCards.length > 0) {
                anime({
                    targets: initialCards,
                    translateY: [16, 0],
                    opacity: [0, 1],
                    delay: anime.stagger(30),
                    duration: 250,
                    easing: 'easeOutCubic'
                });
            } else {
                initialCards.forEach(c => c.style.opacity = '1');
            }

            scheduleBackgroundWeekRender(remainingGroups);
        }

        // Item 4.2: Bulk Accordion Controls
        function toggleBulkAccordion() {
            const allSections = document.querySelectorAll('.week-group');
            if (allSections.length === 0) return;

            const anyExpanded = Array.from(allSections).some(s => !s.classList.contains('collapsed'));
            allSections.forEach(s => {
                const key = s.dataset.weekKey;
                if (anyExpanded) {
                    s.classList.add('collapsed');
                    if (key) collapsedWeekKeys.add(key);
                } else {
                    s.classList.remove('collapsed');
                    if (key) collapsedWeekKeys.delete(key);
                }
            });
            updateBulkAccordionBtn();
        }

        function updateBulkAccordionBtn() {
            const allSections = document.querySelectorAll('.week-group');
            const label = document.getElementById('bulkAccordionLabel');
            const icon = document.getElementById('bulkAccordionIcon');
            if (!label || !icon || allSections.length === 0) return;

            const anyExpanded = Array.from(allSections).some(s => !s.classList.contains('collapsed'));
            if (anyExpanded) {
                label.textContent = 'Collapse All';
                icon.textContent = 'unfold_less';
            } else {
                label.textContent = 'Expand All';
                icon.textContent = 'unfold_more';
            }
        }

        function getNextAvailableQuarter() {
            if (!quarterManifest || !Array.isArray(quarterManifest.quarters)) return null;
            return quarterManifest.quarters.find(q => !loadedQuarterFiles.has(q.file)) || null;
        }

        function updateQuarterPaginationUI() {
            const container = document.getElementById('loadMoreContainer');
            const btn = document.getElementById('loadMoreBtn');
            const bgIndicator = document.getElementById('bgLoadingIndicator');
            if (!container || !btn) return;

            const nextQuarter = getNextAvailableQuarter();
            if (nextQuarter) {
                container.style.display = 'flex';
                btn.style.display = 'inline-flex';
                btn.disabled = false;
                btn.innerHTML = `
                    <span class="material-symbols-outlined">expand_circle_down</span>
                    <span>Load Earlier Deals (${escapeHtml(nextQuarter.label || nextQuarter.file)})</span>
                `;
                if (bgIndicator) bgIndicator.style.display = 'none';
            } else if (quarterManifest && quarterManifest.quarters && quarterManifest.quarters.length > 1) {
                container.style.display = 'flex';
                btn.style.display = 'inline-flex';
                btn.disabled = true;
                btn.innerHTML = `
                    <span class="material-symbols-outlined">check_circle</span>
                    <span>All Historical Quarters Loaded</span>
                `;
                if (bgIndicator) bgIndicator.style.display = 'none';
            } else {
                container.style.display = 'none';
                btn.style.display = 'none';
            }
        }

        // Deisgned by Kapil Pidhwani: Quarter-wise pagination loader. Fetches next historical quarter JSON and merges non-duplicate records into feed. Ceiling: Sequential fetch. Upgrade path: Service Worker background cache.
        function loadMoreDeals() {
            const nextQuarter = getNextAvailableQuarter();
            if (nextQuarter && !isFetchingQuarter) {
                isFetchingQuarter = true;
                const bgIndicator = document.getElementById('bgLoadingIndicator');
                const bgText = document.getElementById('bgLoadingText');
                const btn = document.getElementById('loadMoreBtn');
                if (btn) btn.disabled = true;
                if (bgIndicator) {
                    bgIndicator.style.display = 'inline-flex';
                    if (bgText) bgText.textContent = `Loading ${nextQuarter.label || nextQuarter.file}...`;
                }

                const cacheBuster = '?t=' + Math.floor(Date.now() / 900000);
                fetch('data/' + nextQuarter.file + cacheBuster)
                    .then(res => {
                        if (!res.ok) return fetch('./data/' + nextQuarter.file + cacheBuster);
                        return res;
                    })
                    .then(res => {
                        if (!res.ok) throw new Error(`Could not load quarter file: ${nextQuarter.file}`);
                        return res.json();
                    })
                    .then(newRecords => {
                        isFetchingQuarter = false;
                        loadedQuarterFiles.add(nextQuarter.file);
                        const recordsToAdd = Array.isArray(newRecords) ? newRecords : (newRecords && Array.isArray(newRecords.records) ? newRecords.records : []);
                        
                        const existingSignatures = new Set(rawDataset.map(d => `${(d.company_name||'').trim().toLowerCase()}_${d.date_of_funding||''}`));
                        const filteredNew = recordsToAdd.filter(d => !existingSignatures.has(`${(d.company_name||'').trim().toLowerCase()}_${d.date_of_funding||''}`));
                        
                        rawDataset = rawDataset.concat(filteredNew);
                        populateSectorDropdown(rawDataset);
                        applyFilters(false);
                        updateQuarterPaginationUI();
                        console.log(`[Fundingly] Loaded quarter ${nextQuarter.file}: added ${filteredNew.length} deals. Total deals: ${rawDataset.length}`);
                    })
                    .catch(err => {
                        console.error('Error loading previous quarter:', err);
                        isFetchingQuarter = false;
                        if (btn) btn.disabled = false;
                        if (bgIndicator) bgIndicator.style.display = 'none';
                        alert(`Unable to load ${nextQuarter.label || nextQuarter.file}. Please check your connection.`);
                    });
                return;
            }

            // Fallback manual loader for unrendered weeks
            cancelBackgroundWeekRender();
            const container = document.getElementById('gridContainer');
            if (!container) return;
            const allWeekGroups = groupDealsByWeek(activeFilteredDataset);
            allWeekGroups.forEach(group => {
                if (!container.querySelector(`.week-group[data-week-key="${group.key}"]`)) {
                    container.appendChild(createWeekSectionElement(group, false));
                }
            });
            updateBulkAccordionBtn();
            updateBackgroundLoadingUI(0);
            verifyBackgroundWeekRender();
        }

        // Item 3.2 & 3.3: Filters & Multi-Criteria Sorting + Active Filter Bar (UX Polish) + Suggestion 3.1: Multi-Dimensional Filter Bar
        function applyFilters(preserveExistingDOM) {
            const shouldPreserveDOM = (preserveExistingDOM === true);
            const search = document.getElementById('searchInput').value.trim();
            const startDate = document.getElementById('startDateInput').value;
            const endDate = document.getElementById('endDateInput').value;
            const filtered = rawDataset.filter(item => {
                const matchesSearch = !search ||
                    matchesQueryFuzzy(item.company_name, search) ||
                    matchesQueryFuzzy(item.company_description, search) ||
                    matchesQueryFuzzy(item.founders, search) ||
                    matchesQueryFuzzy(item.funded_by, search) ||
                    matchesQueryFuzzy(item.lead_investor, search) ||
                    matchesQueryFuzzy(item.industry, search) ||
                    matchesQueryFuzzy(item.sub_industry, search) ||
                    matchesQueryFuzzy(item.funding_round, search) ||
                    matchesQueryFuzzy(item.company_headquarters, search);

                let matchesDate = true;
                if (item.date_of_funding) {
                    const itemDate = item.date_of_funding;
                    if (startDate && itemDate < startDate) matchesDate = false;
                    if (endDate && itemDate > endDate) matchesDate = false;
                }

                // Suggestion 3.1: Stage Filter
                let matchesStage = true;
                if (activeStage !== 'all') {
                    const r = (item.funding_round || '').toLowerCase();
                    if (activeStage === 'Seed') {
                        matchesStage = r.includes('seed') || r.includes('angel') || r.includes('pre-seed');
                    } else if (activeStage === 'Series A') {
                        matchesStage = r.includes('series a');
                    } else if (activeStage === 'Series B') {
                        matchesStage = r.includes('series b') || r.includes('series c');
                    } else if (activeStage === 'Growth') {
                        matchesStage = r.includes('growth') || r.includes('series d') || r.includes('series e') || r.includes('series f') || r.includes('late');
                    } else if (activeStage === 'Debt') {
                        matchesStage = r.includes('debt') || r.includes('bridge') || r.includes('credit');
                    }
                }

                // Suggestion 3.1: Sector Filter
                let matchesSector = true;
                if (activeSector !== 'all') {
                    matchesSector = (item.industry === activeSector) || (item.sub_industry === activeSector);
                }

                // Suggestion 3.1: Amount Bracket Filter
                let matchesAmount = true;
                if (activeAmount !== 'all') {
                    const amt = Number(item.funding_amount_usd) || 0;
                    if (activeAmount === 'under-1m') matchesAmount = amt > 0 && amt < 1000000;
                    else if (activeAmount === '1m-5m') matchesAmount = amt >= 1000000 && amt <= 5000000;
                    else if (activeAmount === '5m-20m') matchesAmount = amt > 5000000 && amt <= 20000000;
                    else if (activeAmount === 'over-20m') matchesAmount = amt > 20000000;
                }

                // Suggestion 3.1: Geography Filter
                let matchesGeo = true;
                if (activeGeo !== 'all') {
                    const hq = (item.company_headquarters || '').toLowerCase();
                    const isIndia = hq.includes('india') || hq.includes('bengaluru') || hq.includes('bangalore') || hq.includes('delhi') || hq.includes('mumbai') || hq.includes('gurugram') || hq.includes('hyderabad') || hq.includes('pune') || hq.includes('chennai');
                    const isUS = hq.includes('united states') || hq.includes('usa') || hq.includes('san francisco') || hq.includes('new york') || hq.includes('california') || hq.includes('austin') || hq.includes('seattle') || hq.includes('boston');
                    if (activeGeo === 'india') matchesGeo = isIndia;
                    else if (activeGeo === 'us') matchesGeo = isUS;
                    else if (activeGeo === 'global') matchesGeo = !isIndia && !isUS && hq.length > 0;
                }

                return matchesSearch && matchesDate && matchesStage && matchesSector && matchesAmount && matchesGeo;
            });

            // Deisgned by Kapil Pidhwani: Default chronological sorting (latest funding first) with name secondary fallback. Ceiling: O(N log N) client-side sort.
            filtered.sort((a, b) => {
                const dateA = a.date_of_funding || '1970-01-01';
                const dateB = b.date_of_funding || '1970-01-01';
                if (dateB !== dateA) return dateB.localeCompare(dateA);
                return (a.company_name || '').localeCompare(b.company_name || '');
            });

            // UX Polish: Update active filter chips bar
            renderActiveFiltersBar(search, startDate, endDate);

            activeFilteredDataset = filtered;
            if (activeViewMode === 'table') {
                renderTableView(filtered);
            } else {
                renderGrid(filtered, shouldPreserveDOM);
            }
        }

        function handleSearchDebounced() {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                applyFilters();
            }, 100);
        }

        function initViewSwitcher() {
            const cardsBtn = document.getElementById('viewCardsBtn');
            const tableBtn = document.getElementById('viewTableBtn');
            if (cardsBtn) {
                cardsBtn.addEventListener('click', () => setViewMode('cards'));
            }
            if (tableBtn) {
                tableBtn.addEventListener('click', () => setViewMode('table'));
            }
        }

        function setViewMode(mode) {
            if (activeViewMode === mode) return;
            activeViewMode = mode;
            const cardsBtn = document.getElementById('viewCardsBtn');
            const tableBtn = document.getElementById('viewTableBtn');
            if (cardsBtn) {
                cardsBtn.classList.toggle('active', mode === 'cards');
                cardsBtn.setAttribute('aria-checked', mode === 'cards' ? 'true' : 'false');
            }
            if (tableBtn) {
                tableBtn.classList.toggle('active', mode === 'table');
                tableBtn.setAttribute('aria-checked', mode === 'table' ? 'true' : 'false');
            }

            const gridContainer = document.getElementById('gridContainer');
            const tableContainer = document.getElementById('tableContainer');

            if (mode === 'table') {
                if (gridContainer) gridContainer.style.display = 'none';
                if (tableContainer) tableContainer.style.display = 'block';
                renderTableView(activeFilteredDataset);
            } else {
                if (tableContainer) tableContainer.style.display = 'none';
                if (gridContainer) gridContainer.style.display = 'flex';
                renderGrid(activeFilteredDataset, false);
            }
        }

        function renderTableView(data) {
            const container = document.getElementById('tableContainer');
            const emptyState = document.getElementById('emptyState');
            if (!container) return;

            if (!data || data.length === 0) {
                container.innerHTML = '';
                if (emptyState) emptyState.style.display = 'block';
                return;
            }

            if (emptyState) emptyState.style.display = 'none';

            const sortedData = [...data].sort((a, b) => {
                let valA, valB;
                if (tableSortColumn === 'amount') {
                    valA = Number(a.funding_amount_usd) || 0;
                    valB = Number(b.funding_amount_usd) || 0;
                    return tableSortDirection === 'asc' ? valA - valB : valB - valA;
                } else if (tableSortColumn === 'company') {
                    valA = (a.company_name || '').toLowerCase();
                    valB = (b.company_name || '').toLowerCase();
                    return tableSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else {
                    valA = a.date_of_funding || '1970-01-01';
                    valB = b.date_of_funding || '1970-01-01';
                    return tableSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
            });

            const getSortIcon = (col) => {
                if (tableSortColumn !== col) return '<span class="material-symbols-outlined sort-icon">unfold_more</span>';
                return tableSortDirection === 'asc'
                    ? '<span class="material-symbols-outlined sort-icon">expand_less</span>'
                    : '<span class="material-symbols-outlined sort-icon">expand_more</span>';
            };

            const rowsHTML = sortedData.map((company, idx) => {
                const avatar = renderCompanyAvatarHTML(company, false);
                const name = escapeHtml(company.company_name || 'Enterprise');
                const date = escapeHtml(formatFundingDateDisplay(company.date_of_funding));
                const stage = escapeHtml(company.funding_round || 'Round');
                const amountUsd = formatUSD(company.funding_amount_usd);
                const amountInr = company.funding_amount_inr ? `• ₹${(Number(company.funding_amount_inr) / 10000000).toFixed(1)} Cr` : '';
                const lead = escapeHtml(company.lead_investor || company.funded_by || 'Undisclosed');
                const sector = escapeHtml(company.industry || 'General');
                const hq = escapeHtml(company.company_headquarters || 'N/A');

                return `
                    <tr class="table-row-deal" data-row-index="${idx}">
                        <td>
                            <div class="table-company-cell">
                                ${avatar}
                                <span class="table-company-name">${name}</span>
                            </div>
                        </td>
                        <td>${date}</td>
                        <td><span class="table-stage-pill ${getStageBadgeClass(stage)}">${stage}</span></td>
                        <td>
                            <span class="table-amount-val">${amountUsd}</span>
                            <span class="table-amount-inr">${amountInr}</span>
                        </td>
                        <td title="${lead}">${lead}</td>
                        <td>${sector}</td>
                        <td>${hq}</td>
                        <td style="text-align: right;">
                            <button type="button" class="btn-table-action" data-btn-index="${idx}">
                                View
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            container.innerHTML = `
                <div class="table-responsive-wrapper">
                    <table class="dense-deals-table">
                        <thead>
                            <tr>
                                <th class="th-sortable ${tableSortColumn === 'company' ? 'sorted' : ''}" id="thSortCompany">
                                    Company ${getSortIcon('company')}
                                </th>
                                <th class="th-sortable ${tableSortColumn === 'date' ? 'sorted' : ''}" id="thSortDate">
                                    Date ${getSortIcon('date')}
                                </th>
                                <th>Stage</th>
                                <th class="th-sortable ${tableSortColumn === 'amount' ? 'sorted' : ''}" id="thSortAmount">
                                    Amount ${getSortIcon('amount')}
                                </th>
                                <th>Lead / Backers</th>
                                <th>Sector</th>
                                <th>HQ</th>
                                <th style="text-align: right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHTML}
                        </tbody>
                    </table>
                </div>
            `;

            const thComp = document.getElementById('thSortCompany');
            if (thComp) thComp.addEventListener('click', () => toggleTableSort('company'));
            const thDate = document.getElementById('thSortDate');
            if (thDate) thDate.addEventListener('click', () => toggleTableSort('date'));
            const thAmt = document.getElementById('thSortAmount');
            if (thAmt) thAmt.addEventListener('click', () => toggleTableSort('amount'));

            container.querySelectorAll('.table-row-deal').forEach(tr => {
                const idx = Number(tr.dataset.rowIndex);
                const company = sortedData[idx];
                if (company) {
                    tr.addEventListener('click', () => openModal(company));
                }
            });

            container.querySelectorAll('.btn-table-action').forEach(btn => {
                const idx = Number(btn.dataset.btnIndex);
                const company = sortedData[idx];
                if (company) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openModal(company);
                    });
                }
            });
        }

        function toggleTableSort(col) {
            if (tableSortColumn === col) {
                tableSortDirection = tableSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                tableSortColumn = col;
                tableSortDirection = col === 'amount' || col === 'date' ? 'desc' : 'asc';
            }
            renderTableView(activeFilteredDataset);
        }

        // UX Polish: Active Filter Chips Bar Renderer
        function renderActiveFiltersBar(searchQuery, startDate, endDate) {
            const bar = document.getElementById('activeFilterBar');
            if (!bar) return;

            const chips = [];
            if (searchQuery) {
                chips.push(`
          <div class="filter-chip-pill">
            <span>Query: "${escapeHtml(searchQuery)}"</span>
            <button type="button" class="filter-chip-remove" onclick="removeSearchFilter()" aria-label="Remove search filter" title="Remove filter">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        `);
            }

            const dateLabel = (document.getElementById('dateTriggerLabel') || {}).textContent || '';
            if ((startDate || endDate) && dateLabel && dateLabel !== 'Dates') {
                chips.push(`
          <div class="filter-chip-pill">
            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-primary);">calendar_today</span>
            <span>${escapeHtml(dateLabel)}</span>
            <button type="button" class="filter-chip-remove" onclick="clearDateFilter()" aria-label="Remove date filter" title="Clear date filter">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        `);
            }

            // Suggestion 3.1: Active Stage Chip
            if (activeStage !== 'all') {
                const stageLabel = activeStage === 'Seed' ? 'Pre-Seed / Seed' : (activeStage === 'Debt' ? 'Debt / Bridge' : activeStage);
                chips.push(`
          <div class="filter-chip-pill">
            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-primary);">layers</span>
            <span>Stage: ${escapeHtml(stageLabel)}</span>
            <button type="button" class="filter-chip-remove" onclick="resetStageFilter()" aria-label="Remove stage filter" title="Remove stage filter">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        `);
            }

            // Suggestion 3.1: Active Sector Chip
            if (activeSector !== 'all') {
                chips.push(`
          <div class="filter-chip-pill">
            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-primary);">category</span>
            <span>Sector: ${escapeHtml(activeSector)}</span>
            <button type="button" class="filter-chip-remove" onclick="resetSectorFilter()" aria-label="Remove sector filter" title="Remove sector filter">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        `);
            }

            // Suggestion 3.1: Active Amount Chip
            if (activeAmount !== 'all') {
                const amountLabels = {
                    'under-1m': '< $1M',
                    '1m-5m': '$1M – $5M',
                    '5m-20m': '$5M – $20M',
                    'over-20m': '$20M+'
                };
                chips.push(`
          <div class="filter-chip-pill">
            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-primary);">payments</span>
            <span>Amount: ${escapeHtml(amountLabels[activeAmount] || activeAmount)}</span>
            <button type="button" class="filter-chip-remove" onclick="resetAmountFilter()" aria-label="Remove amount filter" title="Remove amount filter">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        `);
            }

            // Suggestion 3.1: Active Geo Chip
            if (activeGeo !== 'all') {
                const geoLabels = {
                    'india': 'India',
                    'us': 'United States',
                    'global': 'Global / Other'
                };
                chips.push(`
          <div class="filter-chip-pill">
            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-primary);">public</span>
            <span>Geo: ${escapeHtml(geoLabels[activeGeo] || activeGeo)}</span>
            <button type="button" class="filter-chip-remove" onclick="resetGeoFilter()" aria-label="Remove geography filter" title="Remove geography filter">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        `);
            }

            if (chips.length > 0) {
                bar.innerHTML = `
          <span class="active-filter-label">Active Filters:</span>
          ${chips.join('')}
          <button type="button" class="filter-clear-all-btn" onclick="clearAllFilters()">Clear All</button>
        `;
                bar.style.display = 'flex';
            } else {
                bar.innerHTML = '';
                bar.style.display = 'none';
            }
        }

        function removeSearchFilter() {
            document.getElementById('searchInput').value = '';
            applyFilters();
        }

        function resetStageFilter() {
            activeStage = 'all';
            const stageTrack = document.getElementById('stagePillTrack');
            if (stageTrack) {
                stageTrack.querySelectorAll('.stage-pill').forEach((p, idx) => {
                    if (idx === 0) { p.classList.add('active'); p.setAttribute('aria-checked', 'true'); }
                    else { p.classList.remove('active'); p.setAttribute('aria-checked', 'false'); }
                });
            }
            applyFilters();
        }

        function resetSectorFilter() {
            activeSector = 'all';
            const s = document.getElementById('sectorFilterSelect');
            if (s) { s.value = 'all'; s.classList.remove('has-value'); }
            applyFilters();
        }

        function resetAmountFilter() {
            activeAmount = 'all';
            const a = document.getElementById('amountFilterSelect');
            if (a) { a.value = 'all'; a.classList.remove('has-value'); }
            applyFilters();
        }

        function resetGeoFilter() {
            activeGeo = 'all';
            const g = document.getElementById('geoFilterSelect');
            if (g) { g.value = 'all'; g.classList.remove('has-value'); }
            applyFilters();
        }

        function clearAllFilters() {
            document.getElementById('searchInput').value = '';
            activeStage = 'all';
            const stageTrack = document.getElementById('stagePillTrack');
            if (stageTrack) {
                stageTrack.querySelectorAll('.stage-pill').forEach((p, idx) => {
                    if (idx === 0) { p.classList.add('active'); p.setAttribute('aria-checked', 'true'); }
                    else { p.classList.remove('active'); p.setAttribute('aria-checked', 'false'); }
                });
            }
            activeSector = 'all';
            const s = document.getElementById('sectorFilterSelect');
            if (s) { s.value = 'all'; s.classList.remove('has-value'); }

            activeAmount = 'all';
            const a = document.getElementById('amountFilterSelect');
            if (a) { a.value = 'all'; a.classList.remove('has-value'); }

            activeGeo = 'all';
            const g = document.getElementById('geoFilterSelect');
            if (g) { g.value = 'all'; g.classList.remove('has-value'); }

            clearDateFilter();
        }

        // Enhanced Apple Sheet Modal with Shareable Deal Snippet (Item 5.3), Print (Item 5.2) & Session Logging
        let currentModalCompany = null;

        function openModal(indexOrCompany) {
            let company;
            let index = -1;
            if (typeof indexOrCompany === 'object' && indexOrCompany !== null) {
                company = indexOrCompany;
                index = activeFilteredDataset.indexOf(company);
                if (index === -1) index = rawDataset.indexOf(company);
            } else {
                index = indexOrCompany;
                company = activeFilteredDataset[index] || rawDataset[index];
            }
            if (!company) return;
            currentModalCompany = company;

            // User Session Logging: Record viewed company in Sheets
            if (typeof google !== 'undefined' && google.script && google.script.run && company && company.company_name) {
                google.script.run
                    .withFailureHandler(err => console.warn('Logging company view failed:', err))
                    .logCompanyView(sessionId, company.company_name);
            }

            const modalBody = document.getElementById('modalBody');
            const companyDomain = extractDomain(company.company_website);
            const dateFormatted = escapeHtml(formatFundingDateDisplay(company.date_of_funding));
            const companyName = company.company_name || '';

            // 1. Google LinkedIn C-Level Search URL
            const linkedinQuery = `site:linkedin.com/in/ "${companyName}" ("CEO" OR "CFO" OR "COO" OR "CTO" OR "CMO" OR "CHRO" OR "CIO" OR "CISO" OR "CRO" OR "Chief" OR "President" OR "Managing Director")`;
            const linkedinSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(linkedinQuery)}`;

            // 2. ChatGPT Leadership Research Pre-Prompt URL
            const chatgptPrompt = `Research the current C-level and senior executive leadership of ${companyName}. Identify the CEO, CTO, CFO, COO, CMO, founders, and other key decision-makers where publicly verifiable. For each person, provide their name, current title, responsibilities, professional background, and LinkedIn profile if publicly available. Prioritize current and authoritative sources, distinguish confirmed C-suite roles from board/director positions, and flag any information that cannot be independently verified. Include the sources used and the date the information was verified.`;
            const chatgptPromptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatgptPrompt)}`;

            const rawSources = company.sources || company.source_url || '';
            let sourceLink = '';
            if (rawSources) {
                const links = (Array.isArray(rawSources) ? rawSources : String(rawSources).split(/[,|\n]/))
                    .map(s => s.trim())
                    .filter(Boolean);
                if (links.length > 0) {
                    const linksAnchors = links.map((link) => {
                        const cleanDisplay = link.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
                        const host = cleanDisplay.split('/')[0];
                        return `<a href="${encodeURI(link)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color); text-decoration: underline; margin-right: 8px;">[${escapeHtml(host)}]</a>`;
                    }).join(' ');
                    sourceLink = `<div class="modal-source-footer" style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:12px; color:var(--text-muted); padding-top:12px; border-top:1px solid var(--border-subtle);"><strong>Sources:</strong> ${linksAnchors}</div>`;
                }
            }

            const modalAvatarHTML = renderCompanyAvatarHTML(company, true);

            modalBody.innerHTML = `
        <div class="modal-hero">
          <!-- Tier 1: Top Bar (Avatar on Left, Round Pill Badge on Right) matching closed card -->
          <div class="modal-hero-top-bar">
            ${modalAvatarHTML}
            <span class="modal-hero-badge ${getStageBadgeClass(company.funding_round)}">${escapeHtml(company.funding_round || 'Funding')}</span>
          </div>

          <!-- Tier 2: 100% Full-Width Identity Block -->
          <div class="modal-hero-identity">
            <div class="modal-hero-title-wrap">
              <h2 class="modal-hero-title">${escapeHtml(company.company_name || 'Enterprise Details')}</h2>
              ${company.company_name ? renderSearchMicroButtons(company.company_name, 'Search ' + company.company_name) : ''}
            </div>
            <div class="modal-hero-subtitle">
              ${escapeHtml(company.industry || 'General')}${company.sub_industry ? ' • ' + escapeHtml(company.sub_industry) : ''}
            </div>
          </div>

          <!-- Tier 3: Unified Actions Toolbar -->
          <div class="modal-hero-toolbar">
            <div class="modal-hero-action-row">
              ${companyDomain ? `
                <a href="${encodeURI(company.company_website)}" target="_blank" rel="noopener noreferrer" class="modal-domain-chip" title="Visit: ${escapeHtml(company.company_website)}">
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
              <button type="button" class="modal-micro-btn" id="copySummaryBtn" onclick="copyDealSummary()" title="Copy Markdown deal summary for Slack/Email" aria-label="Copy Deal Summary">
                <span class="material-symbols-outlined" id="copySummaryIcon">assignment</span>
              </button>
              <button type="button" class="modal-micro-btn" onclick="window.print()" title="Print One-Pager Deal Memo" aria-label="Print One-Pager Deal Memo">
                <span class="material-symbols-outlined">print</span>
              </button>
            </div>
          </div>

          <!-- Tier 4: Deal Snapshot Meta Tile (Matching .card-meta-box in closed card) -->
          <div class="modal-stats-strip">
            <div class="stat-pill-block">
              <span class="stat-pill-label">Amount Raised</span>
              <span class="stat-pill-value">${formatUSD(company.funding_amount_usd)}</span>
            </div>
            <div class="stat-pill-block">
              <span class="stat-pill-label">Funding Date</span>
              <span class="stat-pill-value">${dateFormatted}</span>
            </div>
            <div class="stat-pill-block">
              <span class="stat-pill-label">Headquarters</span>
              <span class="stat-pill-value">${escapeHtml(company.company_headquarters || 'N/A')}</span>
            </div>
          </div>
        </div>

        <div class="modal-section-card">
          <div class="modal-section-title">
            <span class="material-symbols-outlined" style="font-size: 15px;">info</span>
            <span>Overview & Mission</span>
          </div>
          <p class="modal-desc-body">${escapeHtml(company.company_description || 'No description available for this entity.')}</p>
        </div>

        <div class="modal-section-card">
          <div class="modal-section-title">
            <span class="material-symbols-outlined" style="font-size: 15px;">paid</span>
            <span>Deal Terms & Syndicate</span>
          </div>
          <div class="inspector-grid">
            <div class="inspector-row"><span class="inspector-label">Funding Round</span><div class="inspector-val highlight">${escapeHtml(company.funding_round || 'N/A')}</div></div>
            <div class="inspector-row"><span class="inspector-label">Amount Raised (USD)</span><div class="inspector-val highlight">${formatUSD(company.funding_amount_usd)}</div></div>
            <div class="inspector-row"><span class="inspector-label">Date of Funding</span><div class="inspector-val">${dateFormatted}</div></div>
            <div class="inspector-row"><span class="inspector-label">Lead Investor</span><div class="inspector-val highlight">${escapeHtml(company.lead_investor || 'N/A')}</div></div>
            <div class="inspector-row" style="grid-column: span 2;"><span class="inspector-label">Syndicate / All Investors</span><div class="inspector-val">${escapeHtml(company.funded_by || 'N/A')}</div></div>
          </div>
        </div>

        <div class="modal-section-card">
          <div class="modal-section-title">
            <span class="material-symbols-outlined" style="font-size: 15px;">business</span>
            <span>Company & Market Profile</span>
          </div>
          <div class="inspector-grid">
            <div class="inspector-row"><span class="inspector-label">Industry</span><div class="inspector-val highlight">${escapeHtml(company.industry || 'N/A')}</div></div>
            <div class="inspector-row"><span class="inspector-label">Sub-Industry</span><div class="inspector-val">${escapeHtml(company.sub_industry || 'N/A')}</div></div>
            <div class="inspector-row"><span class="inspector-label">Business Model</span><div class="inspector-val">${escapeHtml(company.business_model || 'N/A')}</div></div>
            <div class="inspector-row"><span class="inspector-label">Year Founded</span><div class="inspector-val">${escapeHtml(company.year_founded || 'N/A')}</div></div>
            <div class="inspector-row"><span class="inspector-label">Team Size Range</span><div class="inspector-val">${escapeHtml(company.employee_count_range || 'N/A')}</div></div>
            <div class="inspector-row"><span class="inspector-label">Headquarters</span><div class="inspector-val">${escapeHtml(company.company_headquarters || 'N/A')}</div></div>
            <div class="inspector-row" style="grid-column: span 2;"><span class="inspector-label">India Offices</span><div class="inspector-val">${escapeHtml(company.company_india_offices || 'N/A')}</div></div>
          </div>
        </div>

        <div class="modal-section-card">
          <div class="modal-section-title">
            <span class="material-symbols-outlined" style="font-size: 15px;">groups</span>
            <span>Leadership & Executive Intelligence</span>
          </div>
          <div class="inspector-grid">
            <div class="inspector-row" style="grid-column: span 2;">
              <span class="inspector-label">Founders</span>
              <div class="inspector-val highlight">${renderPersonListWithSearch(company.founders, company.company_name)}</div>
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

        ${sourceLink}

        <div class="modal-action-bar" style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-hairline); flex-wrap: wrap; gap: 12px;">
            <a href="mailto:connectkapilpidhwani@gmail.com?subject=Data%20Correction%3A%20${encodeURIComponent(company.company_name || 'Company')}%20(${encodeURIComponent(company.date_of_funding || '')})&body=${encodeURIComponent('Hello Kapil,\n\nI noticed an inaccuracy regarding ' + (company.company_name || 'this company') + ':\n- Date: ' + (company.date_of_funding || 'N/A') + '\n- Amount: ' + formatUSD(company.funding_amount_usd) + '\n- Round: ' + (company.funding_round || 'N/A') + '\n\nSuggested Correction:\n[Please describe corrected information and press link here]\n\nThank you!')}" class="btn-suggest-correction" title="Report an inaccuracy or suggest updated deal information">
                <span class="material-symbols-outlined" style="font-size: 16px;">edit_note</span>
                <span>Suggest Correction</span>
            </a>
            <button type="button" class="btn-detail" onclick="copyDealSummary()" style="background: var(--color-surface-secondary); color: var(--color-text-primary); border: 1px solid var(--color-hairline);" title="Copy markdown deal memo">
                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                <span>Copy Memo</span>
            </button>
        </div>
      `;

            const overlay = document.getElementById('modalOverlay');
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');

            // Apple Sheet entrance animation (180ms ease-out)
            if (typeof anime !== 'undefined') {
                anime({
                    targets: '#modalOverlay',
                    opacity: [0, 1],
                    duration: 180,
                    easing: 'easeOutQuad'
                });
                anime({
                    targets: '#modalContent',
                    scale: [0.96, 1],
                    opacity: [0, 1],
                    duration: 220,
                    easing: 'easeOutCubic'
                });
            } else {
                overlay.style.opacity = '1';
            }
        }

        // Item 5.3: Pre-formatted Markdown generator for Slack/Teams/Email
        function copyDealSummary(indexOrCompany) {
            let company;
            if (typeof indexOrCompany === 'object' && indexOrCompany !== null) {
                company = indexOrCompany;
            } else if (typeof indexOrCompany === 'number' && indexOrCompany >= 0) {
                company = activeFilteredDataset[indexOrCompany] || rawDataset[indexOrCompany];
            } else {
                company = currentModalCompany;
            }
            if (!company) return;

            const lines = [
                `*${company.company_name || 'Company'} — ${company.funding_round || 'Funding Round'}*`,
                `• Amount Raised: ${formatUSD(company.funding_amount_usd)}`,
                `• Date: ${company.date_of_funding || 'N/A'}`,
                `• Lead Investor: ${company.lead_investor || 'Undisclosed'}`,
                `• Syndicate: ${company.funded_by || 'Undisclosed'}`,
                `• Sector: ${company.industry || 'General'}${company.sub_industry ? ' (' + company.sub_industry + ')' : ''}`,
                `• Headquarters: ${company.company_headquarters || 'N/A'}`,
                company.company_website ? `• Website: ${company.company_website}` : null,
                company.company_description ? `• Overview: ${company.company_description}` : null
            ].filter(Boolean);

            const markdown = lines.join('\n');

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(markdown).then(() => {
                    showCopyFeedback();
                }).catch(() => {
                    fallbackCopyText(markdown);
                });
            } else {
                fallbackCopyText(markdown);
            }
        }

        // Deisgned by Kapil Pidhwani: One-click domain copy with transient checkmark micro-interaction. Ceiling: Clipboard API permission boundary. Upgrade path: Toast notification queue.
        function copyDomainText(domain, btn) {
            if (!domain) return;
            const onSuccess = () => {
                if (btn) {
                    const icon = btn.querySelector('.material-symbols-outlined');
                    const prevIcon = icon ? icon.textContent : 'content_copy';
                    const prevTitle = btn.getAttribute('title') || '';
                    if (icon) icon.textContent = 'check';
                    btn.classList.add('copied');
                    btn.setAttribute('title', 'Copied ' + domain + '!');
                    setTimeout(() => {
                        if (icon) icon.textContent = prevIcon;
                        btn.classList.remove('copied');
                        btn.setAttribute('title', prevTitle);
                    }, 2000);
                }
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(domain).then(onSuccess).catch(() => {
                    fallbackCopyText(domain, onSuccess);
                });
            } else {
                fallbackCopyText(domain, onSuccess);
            }
        }

        function showCopyFeedback() {
            const btn = document.getElementById('copySummaryBtn');
            const icon = document.getElementById('copySummaryIcon');
            const label = document.getElementById('copySummaryLabel');
            if (label && icon) {
                const prevLabel = label.textContent;
                const prevIcon = icon.textContent;
                label.textContent = 'Copied!';
                icon.textContent = 'check';
                if (btn) btn.classList.add('copied');
                setTimeout(() => {
                    label.textContent = prevLabel;
                    icon.textContent = prevIcon;
                    if (btn) btn.classList.remove('copied');
                }, 2000);
            } else if (icon) {
                const prevIcon = icon.textContent;
                icon.textContent = 'check';
                if (btn) {
                    btn.classList.add('copied');
                    btn.setAttribute('title', 'Copied Deal Summary!');
                }
                setTimeout(() => {
                    icon.textContent = prevIcon;
                    if (btn) {
                        btn.classList.remove('copied');
                        btn.setAttribute('title', 'Copy Markdown deal summary for Slack/Email');
                    }
                }, 2000);
            }
        }

        function fallbackCopyText(text, onSuccess) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try {
                document.execCommand('copy');
                if (typeof onSuccess === 'function') {
                    onSuccess();
                } else {
                    showCopyFeedback();
                }
            } catch (e) {
                alert('Could not copy to clipboard. Please copy manually:\n\n' + text);
            }
            document.body.removeChild(ta);
        }

        function closeModal() {
            const overlay = document.getElementById('modalOverlay');
            if (!overlay) return;
            currentModalCompany = null;
            overlay.setAttribute('aria-hidden', 'true');

            const resetDeepLinkUrl = () => {
                try {
                    const currentPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
                    if (currentPath && currentPath !== 'index.html') {
                        window.history.replaceState({}, '', '/');
                    }
                } catch (e) {}
            };

            if (typeof anime !== 'undefined') {
                anime({
                    targets: '#modalOverlay',
                    opacity: [1, 0],
                    duration: 140,
                    easing: 'easeInQuad',
                    complete: () => {
                        overlay.classList.remove('active');
                        resetDeepLinkUrl();
                    }
                });
            } else {
                overlay.classList.remove('active');
                resetDeepLinkUrl();
            }
        }

        // Deisgned by Kapil Pidhwani: Weekly Venture Intelligence aggregation engine. Ceiling: In-memory single-week aggregation of rawDataset. Upgrade path: Multi-week comparative cohort analysis.
        function calculateWeekTrends(weekKey) {
            if (!rawDataset || rawDataset.length === 0) return null;

            // 1. Filter all deals in rawDataset belonging to this weekKey
            const weekDeals = rawDataset.filter(c => {
                const w = getWeekInfo(c.date_of_funding);
                const k = w ? w.key : 'undated';
                return k === weekKey;
            });

            if (weekDeals.length === 0) return null;

            const firstDatedDeal = weekDeals.find(c => getWeekInfo(c.date_of_funding) !== null);
            const weekInfo = firstDatedDeal ? getWeekInfo(firstDatedDeal.date_of_funding) : null;
            const rangeStr = weekInfo ? weekInfo.rangeStr : 'Earlier / Undated Deals';
            const weekTitle = weekInfo ? weekInfo.title : 'Earlier / Undated Deals';

            // 2. Discover all chronological weeks to determine prior week for WoW velocity
            const weekMap = new Map();
            rawDataset.forEach(c => {
                const w = getWeekInfo(c.date_of_funding);
                if (w && w.key && w.key !== 'undated') {
                    if (!weekMap.has(w.key)) {
                        weekMap.set(w.key, w);
                    }
                }
            });

            const sortedWeekList = Array.from(weekMap.values()).sort((a, b) => a.key.localeCompare(b.key));
            const currIdx = sortedWeekList.findIndex(w => w.key === weekKey);
            let prevWeekDeals = [];
            let prevWeekInfo = null;
            if (currIdx > 0) {
                prevWeekInfo = sortedWeekList[currIdx - 1];
                prevWeekDeals = rawDataset.filter(c => {
                    const w = getWeekInfo(c.date_of_funding);
                    return w && w.key === prevWeekInfo.key;
                });
            }

            // 3. Module A: Core KPIs (Total Capital, Deals Announced, Median Check, Top Deal)
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

            // Prior Week Comparison (WoW Delta)
            let prevTotalCapital = 0;
            let prevDealCount = prevWeekDeals.length;
            prevWeekDeals.forEach(c => {
                const amt = Number(c.funding_amount_usd);
                if (!isNaN(amt) && amt > 0) prevTotalCapital += amt;
            });

            let capitalDeltaPct = null;
            if (currIdx > 0 && prevTotalCapital > 0) {
                capitalDeltaPct = Math.round(((totalCapital - prevTotalCapital) / prevTotalCapital) * 100);
            }

            let dealDeltaCount = null;
            if (currIdx > 0) {
                dealDeltaCount = dealCount - prevDealCount;
            }

            // Largest Funded Deal of the Week
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

            // 4. Module B: Capital Allocation by Stage
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

            // 5. Module C: Industry Hotspots (3-Tier Hierarchical Drilldown)
            // Deisgned by Kapil Pidhwani: 3-tier venture hierarchy aggregation (Industry -> Sub-Industry -> Companies). Ceiling: O(N) single-pass Map grouping. Upgrade path: Pre-aggregated weekly cube.
            const indMap = new Map();
            weekDeals.forEach(c => {
                const ind = (c.industry && c.industry.trim()) || 'General / Other';
                const subInd = (c.sub_industry && c.sub_industry.trim()) || 'Core / General';
                const amt = Number(c.funding_amount_usd) || 0;
                const rawIdx = rawDataset.indexOf(c);
                if (!indMap.has(ind)) indMap.set(ind, { name: ind, amount: 0, count: 0, subMap: new Map() });
                const item = indMap.get(ind);
                item.amount += amt;
                item.count += 1;
                if (!item.subMap.has(subInd)) item.subMap.set(subInd, { name: subInd, amount: 0, count: 0, companies: [] });
                const subItem = item.subMap.get(subInd);
                subItem.amount += amt;
                subItem.count += 1;
                subItem.companies.push({ ...c, rawIdx });
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

            // 6. Modules D & E: Regional Deal Hubs & Active Investors
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

            // 7. Module F: Top 3 Showcase Deals
            const showcaseDeals = [...weekDeals]
                .sort((a, b) => (Number(b.funding_amount_usd) || 0) - (Number(a.funding_amount_usd) || 0))
                .slice(0, 3);

            return {
                weekKey,
                weekTitle,
                rangeStr,
                dealCount,
                totalCapital,
                medianCheck,
                avgRound,
                capitalDeltaPct,
                dealDeltaCount,
                prevWeekInfo,
                topDeal,
                stageStats,
                topIndustries,
                topHubs,
                topInvestors,
                showcaseDeals
            };
        }

        // Deisgned by Kapil Pidhwani: 3-tier venture drilldown renderer for primary verticals, sub-categories, and company deals. Ceiling: In-DOM DOM-string rendering. Upgrade path: Virtualized DOM for >500 deals.
        function renderDrilldownList(categories, isCsVertical) {
            if (!categories || categories.length === 0) {
                return `<span style="color: var(--color-text-secondary); font-size: 11.5px;">No ${isCsVertical ? 'CS vertical' : 'sector'} data recorded.</span>`;
            }
            return categories.map(v => {
                const subCats = v.subCategories || [];
                const subListHtml = subCats.map(sub => {
                    const comps = sub.companies || [];
                    const companyListHtml = comps.map(comp => {
                        const avatarHtml = renderCompanyAvatarHTML(comp, false);
                        return `
              <div class="trends-drill-company-row">
                <div class="trends-deal-left">
                  ${avatarHtml}
                  <div style="min-width: 0;">
                    <div class="trends-deal-title" title="${escapeHtml(comp.company_name || 'Enterprise')}">${escapeHtml(comp.company_name || 'Enterprise')}</div>
                    <div class="trends-deal-meta" title="${escapeHtml(comp.funding_round || 'Round')}${comp.lead_investor ? ' • ' + escapeHtml(comp.lead_investor) : ''}">${escapeHtml(comp.funding_round || 'Round')}${comp.lead_investor ? ' • ' + escapeHtml(comp.lead_investor) : ''}</div>
                  </div>
                </div>
                <div class="trends-deal-right">
                  <div class="trends-deal-amount">${formatUSD(comp.funding_amount_usd)}</div>
                  <button type="button" class="btn-trends-memo" onclick="event.stopPropagation(); viewCompanyFromDrilldown(${comp.rawIdx})" aria-label="View details for ${escapeHtml(comp.company_name || 'Enterprise')}">
                    <span>View Details</span>
                    <span class="material-symbols-outlined" style="font-size: 13px;">arrow_outward</span>
                  </button>
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
                    <div class="trends-progress-fill" style="width: ${Math.max(sub.pctOfParent, 3)}%; ${isCsVertical ? 'background: #ea4335;' : ''}"></div>
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
                  <div class="trends-progress-fill" style="width: ${Math.max(v.pct, 3)}%; ${isCsVertical ? 'background: #ea4335;' : ''}"></div>
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

        // Deisgned by Kapil Pidhwani: Native CSS-class toggler for venture drilldown tree. Ceiling: Single class toggle. Upgrade path: Stateful persistence across modal opens.
        function toggleTrendsDrilldown(headerEl) {
            if (!headerEl) return;
            const parent = headerEl.closest('.trends-drill-item, .trends-drill-sub-item');
            if (parent) {
                parent.classList.toggle('expanded');
            }
        }

        // Deisgned by Kapil Pidhwani: Renders executive Weekly Trends Intelligence modal with 100% native platform visualizers. Ceiling: DOM innerHTML rebuild per week view. Upgrade path: Incremental Virtual DOM node patching.
        let currentWeekTrends = null;

        function renderTrendsModal(weekKey, weekTitle) {
            const titleEl = document.getElementById('trendsModalTitle');
            const subtitleEl = document.getElementById('trendsModalSubtitle');
            const actionsEl = document.getElementById('trendsHeaderActions');
            const bodyEl = document.getElementById('trendsModalBody');

            if (!bodyEl) return;

            const trends = calculateWeekTrends(weekKey);
            currentWeekTrends = trends;

            if (!trends) {
                if (titleEl) titleEl.textContent = weekTitle ? `Trends: ${weekTitle}` : 'Weekly Trends';
                if (subtitleEl) subtitleEl.textContent = '';
                if (actionsEl) actionsEl.innerHTML = '';
                bodyEl.innerHTML = `
          <div class="trends-placeholder">
            <span class="material-symbols-outlined trends-placeholder-icon">insights</span>
            <p class="trends-placeholder-title">No Recorded Activity</p>
            <p class="trends-placeholder-sub">No funding deals are recorded for this timeframe.</p>
          </div>
        `;
                return;
            }

            const displayTitle = weekTitle || trends.weekTitle;
            if (titleEl) titleEl.textContent = `Trends: ${displayTitle}`;
            if (subtitleEl) {
                subtitleEl.textContent = `${trends.rangeStr ? trends.rangeStr + ' • ' : ''}${trends.dealCount} ${trends.dealCount === 1 ? 'Announced Deal' : 'Announced Deals'}`;
            }

            if (actionsEl) {
                actionsEl.innerHTML = `
          <button type="button" class="btn-pill-action" id="btnTrendsCopyDigest" onclick="copyWeeklyTrendsDigest('${trends.weekKey}', '${escapeHtml(displayTitle)}')" title="Copy weekly briefing to clipboard" aria-label="Copy Weekly Digest">
            <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
            <span>Copy Digest</span>
          </button>
          <button type="button" class="btn-pill-action" onclick="printWeeklyTrends()" title="Print weekly report" aria-label="Print Weekly Report">
            <span class="material-symbols-outlined" style="font-size: 14px;">print</span>
            <span>Print</span>
          </button>
        `;
            }

            // Delta formatting for KPI strip
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

            const topDealName = trends.topDeal ? escapeHtml(trends.topDeal.company_name || 'Enterprise') : 'N/A';
            const topDealSub = trends.topDeal ? `${formatUSD(trends.topDeal.funding_amount_usd)} • ${escapeHtml(trends.topDeal.funding_round || 'Round')}` : 'N/A';

            bodyEl.innerHTML = `
        <!-- Module A: 4-Tile Hero Velocity KPI Strip -->
        <div class="trends-kpi-grid">
          <div class="trends-kpi-card">
            <span class="trends-kpi-label">Total Capital</span>
            <span class="trends-kpi-val">${formatUSD(trends.totalCapital)}</span>
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
            ${renderDrilldownList(trends.topIndustries, false)}
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
        <div class="trends-section-card">
          <div class="trends-section-title">Top Showcase Deals of the Week</div>
          <div class="trends-deal-roster">
            ${trends.showcaseDeals.map((deal, dealIdx) => {
                const avatarHtml = renderCompanyAvatarHTML(deal, false);
                return `
                <div class="trends-deal-row">
                  <div class="trends-deal-left">
                    ${avatarHtml}
                    <div style="min-width: 0;">
                      <div class="trends-deal-title">${escapeHtml(deal.company_name || 'Enterprise')}</div>
                      <div class="trends-deal-meta">${escapeHtml(deal.funding_round || 'Round')}${deal.lead_investor ? ' • ' + escapeHtml(deal.lead_investor) : ''}</div>
                    </div>
                  </div>
                  <div class="trends-deal-right">
                    <div class="trends-deal-amount">${formatUSD(deal.funding_amount_usd)}</div>
                    <button type="button" class="btn-trends-memo" onclick="viewDetailsFromTrends(${dealIdx})" aria-label="View details for ${escapeHtml(deal.company_name)}">
                      <span>View Details</span>
                      <span class="material-symbols-outlined" style="font-size: 13px;">arrow_outward</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
        }

        // Deisgned by Kapil Pidhwani: Formats executive markdown digest for Slack/Teams/Email. Ceiling: Plain text clipboard copy. Upgrade path: Rich HTML formatted clipboard payload.
        function copyWeeklyTrendsDigest(weekKey, weekTitle) {
            const trends = calculateWeekTrends(weekKey);
            if (!trends) return;

            const btn = document.getElementById('btnTrendsCopyDigest');
            const lines = [
                `📊 *Weekly Venture Intelligence: ${weekTitle || trends.weekTitle}*`,
                `• Total Capital Deployed: ${formatUSD(trends.totalCapital)} across ${trends.dealCount} deals`,
                `• Median Check Size: ${formatUSD(trends.medianCheck)} | Avg Round: ${formatUSD(trends.avgRound)}`,
                trends.capitalDeltaPct !== null ? `• Capital Velocity: ${trends.capitalDeltaPct >= 0 ? '+' : ''}${trends.capitalDeltaPct}% WoW vs prior week` : null,
                trends.topDeal ? `• Top Funded Deal: ${trends.topDeal.company_name} (${formatUSD(trends.topDeal.funding_amount_usd)}, ${trends.topDeal.funding_round || 'Round'})` : null,
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

            const digestText = lines.join('\n');
            const showSuccess = () => {
                if (btn) {
                    const origHtml = btn.innerHTML;
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-status-success);">check</span><span style="color: var(--color-status-success);">Copied!</span>';
                    setTimeout(() => { btn.innerHTML = origHtml; }, 2000);
                }
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(digestText).then(showSuccess).catch(() => {
                    fallbackCopyText(digestText, showSuccess);
                });
            } else {
                fallbackCopyText(digestText, showSuccess);
            }
        }

        function printWeeklyTrends() {
            document.body.classList.add('printing-trends');
            window.print();
            setTimeout(() => {
                document.body.classList.remove('printing-trends');
            }, 1000);
        }

        function viewDetailsFromTrends(dealIdx) {
            closeTrendsModal();
            if (currentWeekTrends && currentWeekTrends.showcaseDeals && currentWeekTrends.showcaseDeals[dealIdx]) {
                const targetCompany = currentWeekTrends.showcaseDeals[dealIdx];
                setTimeout(() => {
                    openModal(targetCompany);
                }, 160);
            }
        }

        // Backwards-compatible alias
        function viewMemoFromTrends(dealIdx) {
            viewDetailsFromTrends(dealIdx);
        }

        // Deisgned by Kapil Pidhwani: Direct deal navigation from 3-tier concentration drilldown to Apple deal sheet. Ceiling: Raw index pointer lookup. Upgrade path: Unique venture ID lookup.
        function viewCompanyFromDrilldown(rawIdx) {
            closeTrendsModal();
            if (typeof rawIdx === 'number' && rawIdx >= 0 && rawIdx < rawDataset.length) {
                const targetCompany = rawDataset[rawIdx];
                setTimeout(() => {
                    openModal(targetCompany);
                }, 160);
            }
        }

        function openTrendsModal(weekKey, weekTitle) {
            renderTrendsModal(weekKey, weekTitle);
            const modal = document.getElementById('trendsModal');
            if (modal) {
                modal.classList.add('active');
                modal.setAttribute('aria-hidden', 'false');
                if (typeof anime !== 'undefined') {
                    anime({
                        targets: '#trendsModal',
                        opacity: [0, 1],
                        duration: 180,
                        easing: 'easeOutQuad'
                    });
                    anime({
                        targets: '#trendsModal .modal-content',
                        scale: [0.96, 1],
                        opacity: [0, 1],
                        duration: 220,
                        easing: 'easeOutCubic'
                    });
                }
            }
        }

        function closeTrendsModal() {
            const modal = document.getElementById('trendsModal');
            if (modal) {
                modal.setAttribute('aria-hidden', 'true');
                if (typeof anime !== 'undefined') {
                    anime({
                        targets: '#trendsModal',
                        opacity: [1, 0],
                        duration: 140,
                        easing: 'easeInQuad',
                        complete: () => modal.classList.remove('active')
                    });
                } else {
                    modal.classList.remove('active');
                }
            }
        }

        function openAboutModal() {
            const modal = document.getElementById('aboutModal');
            if (modal) {
                modal.classList.add('active');
                modal.setAttribute('aria-hidden', 'false');
                if (typeof anime !== 'undefined') {
                    anime({
                        targets: '#aboutModal',
                        opacity: [0, 1],
                        duration: 180,
                        easing: 'easeOutQuad'
                    });
                    anime({
                        targets: '#aboutModal .modal-content',
                        scale: [0.96, 1],
                        opacity: [0, 1],
                        duration: 220,
                        easing: 'easeOutCubic'
                    });
                }
            }
        }

        function closeAboutModal() {
            const modal = document.getElementById('aboutModal');
            if (modal) {
                modal.setAttribute('aria-hidden', 'true');
                if (typeof anime !== 'undefined') {
                    anime({
                        targets: '#aboutModal',
                        opacity: [1, 0],
                        duration: 140,
                        easing: 'easeInQuad',
                        complete: () => modal.classList.remove('active')
                    });
                } else {
                    modal.classList.remove('active');
                }
            }
        }
