const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '..');
const COMPANY_DIR = path.join(REPO_ROOT, 'company');
const SITEMAP_PATH = path.join(REPO_ROOT, 'sitemap.xml');

console.log('🧪 Starting self-check validation of generated static deal pages...');

// 1. Check company directory exists
assert(fs.existsSync(COMPANY_DIR), 'Company directory must exist');
const companies = fs.readdirSync(COMPANY_DIR).filter(f => fs.statSync(path.join(COMPANY_DIR, f)).isDirectory());
assert(companies.length > 0, 'Must have at least 1 company folder');
console.log(`✓ Found ${companies.length} generated company folders`);

// 2. Validate HTML and JSON-LD schema in each page
let checkedCount = 0;
companies.forEach(comp => {
    const htmlPath = path.join(COMPANY_DIR, comp, 'index.html');
    assert(fs.existsSync(htmlPath), `index.html must exist in company/${comp}`);
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Title & Meta
    assert(html.includes('<title>'), `Missing <title> in ${comp}`);
    assert(html.includes('name="description"'), `Missing meta description in ${comp}`);
    assert(html.includes('rel="canonical"'), `Missing canonical link in ${comp}`);
    assert(html.includes('application/ld+json'), `Missing JSON-LD in ${comp}`);

    // Sharing & UX Elements
    assert(html.includes('id="dossierToast"'), `Missing toast container in ${comp}`);
    assert(html.includes('shareDossier()'), `Missing shareDossier function call in ${comp}`);
    assert(html.includes('share-btn whatsapp'), `Missing WhatsApp share button in ${comp}`);
    assert(html.includes('share-btn twitter'), `Missing Twitter share button in ${comp}`);
    assert(html.includes('share-btn linkedin'), `Missing LinkedIn share button in ${comp}`);
    assert(html.includes('copyDealSummary()'), `Missing copyDealSummary in ${comp}`);

    // AdSense placeholders
    assert(html.includes('class="ad-container-wrapper"'), `Missing AdSense container in ${comp}`);
    assert(html.includes('class="adsbygoogle"'), `Missing adsbygoogle tag in ${comp}`);

    // Extract and parse JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(jsonLdMatch, `Failed to extract JSON-LD script from ${comp}`);
    const parsedSchema = JSON.parse(jsonLdMatch[1]);
    assert(parsedSchema['@graph'], `Missing @graph in schema for ${comp}`);
    const hasOrg = parsedSchema['@graph'].some(node => node['@type'] === 'Organization');
    const hasInvestment = parsedSchema['@graph'].some(node => node['@type'] === 'InvestmentOrGrant');
    const hasBreadcrumbs = parsedSchema['@graph'].some(node => node['@type'] === 'BreadcrumbList');
    assert(hasOrg, `Missing Organization schema in ${comp}`);
    assert(hasInvestment, `Missing InvestmentOrGrant schema in ${comp}`);
    assert(hasBreadcrumbs, `Missing BreadcrumbList schema in ${comp}`);

    checkedCount++;
});
console.log(`✓ Successfully verified all ${checkedCount} company pages (HTML, SEO tags, JSON-LD Schema, Sharing Suite, AdSense blocks)`);

// 3. Verify sitemap.xml
assert(fs.existsSync(SITEMAP_PATH), 'sitemap.xml must exist');
const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
assert(sitemap.includes('https://fundingly.in/'), 'sitemap.xml must contain homepage');
assert(sitemap.includes('https://fundingly.in/founders-note/'), 'sitemap.xml must contain founders-note');
companies.forEach(comp => {
    assert(sitemap.includes(`https://fundingly.in/company/${comp}/`), `sitemap.xml missing company URL for ${comp}`);
});
console.log('✓ Successfully verified sitemap.xml contains all generated URLs');

console.log('🎉 ALL STATIC PAGE INTEGRITY CHECKS PASSED!');
