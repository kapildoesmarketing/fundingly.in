const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '..');

console.log('🧪 Starting Site-Wide Theme & Navigation Parity Test...');

const pagesToCheck = [
    path.join(REPO_ROOT, 'index.html'),
    path.join(REPO_ROOT, 'founders-note', 'index.html'),
    path.join(REPO_ROOT, 'about', 'index.html'),
    path.join(REPO_ROOT, 'contact', 'index.html'),
    path.join(REPO_ROOT, 'privacy-policy', 'index.html'),
    path.join(REPO_ROOT, 'terms', 'index.html'),
    path.join(REPO_ROOT, '404.html')
];

// Also sample generated company pages
const companyDir = path.join(REPO_ROOT, 'company');
if (fs.existsSync(companyDir)) {
    const companies = fs.readdirSync(companyDir).filter(f => fs.statSync(path.join(companyDir, f)).isDirectory());
    companies.slice(0, 10).forEach(comp => {
        pagesToCheck.push(path.join(companyDir, comp, 'index.html'));
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

    // 2. Theme Switcher Button & Icon
    assert(html.includes('id="themeToggleBtn"'), `Missing themeToggleBtn in ${relPath}`);
    assert(html.includes('id="themeIcon"'), `Missing themeIcon in ${relPath}`);

    // 3. Navigation Header
    assert(html.includes('class="app-header"'), `Missing app-header in ${relPath}`);
    assert(html.includes('Fundingly.in'), `Missing brand name in ${relPath}`);

    // 4. Semantic Footer
    assert(html.includes('class="app-main-footer"'), `Missing app-main-footer in ${relPath}`);
    assert(html.includes('https://www.linkedin.com/company/fundingly-in'), `Missing LinkedIn social link in ${relPath}`);
    assert(html.includes('https://www.instagram.com/fundingly.in/'), `Missing Instagram social link in ${relPath}`);

    // 5. 404 specific checks
    if (relPath === '404.html') {
        assert(html.includes('fundingly_look.png'), `404 must display mascot fundingly_look.png`);
        assert(html.includes('notfound-mascot-halo'), `404 must have mascot halo styling`);
    }

    verifiedPages++;
    console.log(`✓ Verified: ${relPath}`);
});

console.log(`\n🎉 ALL ${verifiedPages} CHECKED PAGES PASSED THEME & NAVIGATION PARITY VALIDATION!`);
