const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '..');

console.log('🧪 Starting Site-Wide Theme & Navigation Parity Test...');

const pagesToCheck = [
    path.join(REPO_ROOT, 'index.html'),
    path.join(REPO_ROOT, 'deals', 'index.html'),
    path.join(REPO_ROOT, 'trends', 'index.html'),
    path.join(REPO_ROOT, 'founders-note', 'index.html'),
    path.join(REPO_ROOT, 'about', 'index.html'),
    path.join(REPO_ROOT, 'support', 'index.html'),
    path.join(REPO_ROOT, 'contact', 'index.html'),
    path.join(REPO_ROOT, 'privacy-policy', 'index.html'),
    path.join(REPO_ROOT, 'terms', 'index.html'),
    path.join(REPO_ROOT, '404.html')
];

// Sample generated week trend pages from trends/week-* and canonical company dossiers from deals/*
const trendsDir = path.join(REPO_ROOT, 'trends');
if (fs.existsSync(trendsDir)) {
    const weekFolders = fs.readdirSync(trendsDir).filter(f => f.startsWith('week-') && fs.statSync(path.join(trendsDir, f)).isDirectory());
    weekFolders.forEach(week => {
        const weekIndexPath = path.join(trendsDir, week, 'index.html');
        if (fs.existsSync(weekIndexPath)) {
            pagesToCheck.push(weekIndexPath);
        }
    });
}

const dealsDir = path.join(REPO_ROOT, 'deals');
if (fs.existsSync(dealsDir)) {
    const compFolders = fs.readdirSync(dealsDir).filter(f => !f.startsWith('week-') && fs.statSync(path.join(dealsDir, f)).isDirectory());
    // Sample up to 10 company pages
    compFolders.slice(0, 10).forEach(comp => {
        const compIndexPath = path.join(dealsDir, comp, 'index.html');
        if (fs.existsSync(compIndexPath)) {
            pagesToCheck.push(compIndexPath);
        }
    });
}

let verifiedPages = 0;

pagesToCheck.forEach(filePath => {
    const relPath = path.relative(REPO_ROOT, filePath);
    assert(fs.existsSync(filePath), `File must exist: ${relPath}`);
    const html = fs.readFileSync(filePath, 'utf8');

    // 1. Instant Theme Synchronization in Head
    assert(html.includes("localStorage.getItem('fundingly_theme')"), `Missing head theme sync in ${relPath}`);
    assert(html.includes("document.documentElement.setAttribute('data-theme'"), `Missing data-theme set in ${relPath}`);

    // 2. Theme Switcher Button & Icon (Glassmorphic Pill)
    assert(html.includes('id="themeToggleBtn"'), `Missing themeToggleBtn in ${relPath}`);
    assert(html.includes('id="themeIcon"'), `Missing themeIcon in ${relPath}`);
    assert(html.includes('btn-icon-pill') || html.includes('btn-theme-toggle'), `Missing glassmorphic pill theme button in ${relPath}`);

    // 3. Navigation Header & Glass Capsule
    assert(html.includes('class="app-header"'), `Missing app-header in ${relPath}`);
    assert(html.includes('Fundingly'), `Missing brand name in ${relPath}`);
    assert(html.includes('nav-glass-capsule'), `Missing Policy Guard inspired nav-glass-capsule in ${relPath}`);
    assert(html.includes('>Home<'), `Missing Home link in ${relPath}`);
    assert(html.includes('>Deals<'), `Missing Deals link in ${relPath}`);
    assert(html.includes('>Trends<'), `Missing Trends link in ${relPath}`);
    assert(html.includes('>Support<'), `Missing Support link in ${relPath}`);
    assert(html.includes('>About<'), `Missing About link in ${relPath}`);

    // 3b. Mobile Hamburger & Slide-Down Drawer
    assert(html.includes('btn-mobile-menu') || html.includes('id="mobileMenuBtn"'), `Missing mobile hamburger button in ${relPath}`);
    assert(html.includes('mobile-nav-drawer') || html.includes('id="mobileNavDrawer"'), `Missing mobile-nav-drawer in ${relPath}`);

    // 4. 3D WebGL Background Metaballs Canvas & Script
    assert(html.includes('id="hero-metaballs"'), `Missing hero-metaballs canvas container in ${relPath}`);
    assert(html.includes('metaballs.js'), `Missing metaballs.js script in ${relPath}`);

    // 5. Deals Page In-Page Controls & Filter Box Check
    if (relPath === path.join('deals', 'index.html')) {
        assert(html.includes('deals-sidebar-box'), `Missing deals-sidebar-box in ${relPath}`);
        assert(html.includes('id="searchInput"'), `Missing searchInput in ${relPath}`);
        assert(html.includes('id="dealSortSelect"'), `Missing dealSortSelect in ${relPath}`);
        assert(html.includes('id="stageFilterSelect"'), `Missing stageFilterSelect in ${relPath}`);
        assert(html.includes('id="sectorFilterSelect"'), `Missing sectorFilterSelect in ${relPath}`);
        assert(html.includes('id="geoFilterSelect"'), `Missing geoFilterSelect in ${relPath}`);
        assert(html.includes('id="amountFilterSelect"'), `Missing amountFilterSelect in ${relPath}`);
        assert(html.includes('id="startDateInput"'), `Missing startDateInput in ${relPath}`);
        assert(html.includes('id="endDateInput"'), `Missing endDateInput in ${relPath}`);
        assert(html.includes('id="timelineToolbar"'), `Missing timelineToolbar in ${relPath}`);
        assert(html.includes('id="mobileFilterToggleBtn"'), `Missing mobileFilterToggleBtn in ${relPath}`);
        assert(!html.includes('driver.js'), `Driver.js script should be removed from ${relPath}`);
        assert(!html.includes('deals-page-controls'), `deals-page-controls should be removed from ${relPath}`);
    }

    // 6. Homepage Hero Template & Glass CTAs Check
    if (relPath === 'index.html') {
        assert(html.includes('class="hero-section"'), `Missing hero-section in index.html`);
        assert(html.includes('btn-glass-primary'), `Missing btn-glass-primary in index.html`);
        assert(html.includes('btn-ghost-secondary') || html.includes('btn-glass-secondary'), `Missing secondary CTA in index.html`);
        assert(html.includes('Browse the Feed') || html.includes('Explore Deals') || html.includes('Explore Latest Deals'), `Missing primary CTA in index.html`);
        assert(html.includes('View Insights') || html.includes('See Trends') || html.includes('Support Fundingly'), `Missing secondary CTA in index.html`);
    }

    // 7. Semantic Footer
    assert(html.includes('class="app-main-footer"'), `Missing app-main-footer in ${relPath}`);
    assert(html.includes('footer-support-btn'), `Missing footer-support-btn link in ${relPath}`);
    assert(html.includes('https://www.linkedin.com/company/fundingly-in'), `Missing LinkedIn social link in ${relPath}`);
    assert(html.includes('https://www.instagram.com/fundingly.in/'), `Missing Instagram social link in ${relPath}`);

    // 8. 404 specific checks
    if (relPath === '404.html') {
        assert(html.includes('fundingly_look.png'), `404 must display mascot fundingly_look.png`);
        assert(html.includes('notfound-mascot-halo'), `404 must have mascot halo styling`);
    }

    verifiedPages++;
    console.log(`✓ Verified: ${relPath}`);
});

console.log(`\n🎉 ALL ${verifiedPages} CHECKED PAGES PASSED THEME & NAVIGATION PARITY VALIDATION!`);
