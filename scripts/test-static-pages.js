const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '..');
const COMPANY_DIR = path.join(REPO_ROOT, 'company');
const TRENDS_DIR = path.join(REPO_ROOT, 'trends');
const SITEMAP_PATH = path.join(REPO_ROOT, 'sitemap.xml');

console.log('🧪 Starting self-check validation of generated static deal and trend report pages...');

// 1. Check company directory exists
assert(fs.existsSync(COMPANY_DIR), 'Company directory must exist');
const companies = fs.readdirSync(COMPANY_DIR).filter(f => fs.statSync(path.join(COMPANY_DIR, f)).isDirectory());
assert(companies.length > 0, 'Must have at least 1 company folder');
console.log(`✓ Found ${companies.length} generated company folders`);

// 2. Validate HTML and JSON-LD schema in each company page
let checkedCompCount = 0;
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
    assert(html.includes('ca-pub-6148655095183291'), `Missing AdSense client ca-pub-6148655095183291 in ${comp}`);
    assert(html.includes('1876441959'), `Missing AdSense slot 1876441959 in ${comp}`);
    assert(html.includes('6069828671'), `Missing AdSense slot 6069828671 in ${comp}`);

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

    checkedCompCount++;
});
console.log(`✓ Successfully verified all ${checkedCompCount} company pages (HTML, SEO tags, JSON-LD Schema, Sharing Suite, AdSense blocks)`);

// 3. Check trends directory exists and validate each weekly report page
assert(fs.existsSync(TRENDS_DIR), 'Trends directory must exist');
const trendWeeks = fs.readdirSync(TRENDS_DIR).filter(f => fs.statSync(path.join(TRENDS_DIR, f)).isDirectory());
assert(trendWeeks.length > 0, 'Must have at least 1 weekly trends report folder');
console.log(`✓ Found ${trendWeeks.length} generated weekly trend folders: ${trendWeeks.join(', ')}`);

let checkedTrendCount = 0;
trendWeeks.forEach(weekSlug => {
    const htmlPath = path.join(TRENDS_DIR, weekSlug, 'index.html');
    assert(fs.existsSync(htmlPath), `index.html must exist in trends/${weekSlug}`);
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Title & Meta
    assert(html.includes('<title>'), `Missing <title> in trends/${weekSlug}`);
    assert(html.includes('name="description"'), `Missing meta description in trends/${weekSlug}`);
    assert(html.includes('rel="canonical"'), `Missing canonical link in trends/${weekSlug}`);
    assert(html.includes('application/ld+json'), `Missing JSON-LD in trends/${weekSlug}`);

    // Trends Modules
    assert(html.includes('class="trends-kpi-grid"'), `Missing KPI strip in trends/${weekSlug}`);
    assert(html.includes('class="trends-segmented-bar"'), `Missing stage segmented bar in trends/${weekSlug}`);
    assert(html.includes('class="trends-stage-legend"'), `Missing stage legend in trends/${weekSlug}`);
    assert(html.includes('id="trendsIndustryView"'), `Missing industry drilldown in trends/${weekSlug}`);
    assert(html.includes('class="trends-split-grid"'), `Missing regional hubs & investors split grid in trends/${weekSlug}`);
    assert(html.includes('class="trends-deal-roster"'), `Missing showcase deals roster in trends/${weekSlug}`);

    // Sharing & UX Elements
    assert(html.includes('id="trendsToast"'), `Missing toast container in trends/${weekSlug}`);
    assert(html.includes('shareWeeklyReport()'), `Missing shareWeeklyReport in trends/${weekSlug}`);
    assert(html.includes('copyWeeklyDigest()'), `Missing copyWeeklyDigest in trends/${weekSlug}`);
    assert(html.includes('share-btn whatsapp'), `Missing WhatsApp share button in trends/${weekSlug}`);
    assert(html.includes('share-btn twitter'), `Missing Twitter share button in trends/${weekSlug}`);
    assert(html.includes('share-btn linkedin'), `Missing LinkedIn share button in trends/${weekSlug}`);
    assert(html.includes('sidebar-weeks-list'), `Missing sidebar weekly archive list in trends/${weekSlug}`);

    // AdSense placeholders
    assert(html.includes('class="ad-container-wrapper"'), `Missing AdSense container in trends/${weekSlug}`);
    assert(html.includes('class="adsbygoogle"'), `Missing adsbygoogle tag in trends/${weekSlug}`);
    assert(html.includes('ca-pub-6148655095183291'), `Missing AdSense client ca-pub-6148655095183291 in trends/${weekSlug}`);
    assert(html.includes('1876441959'), `Missing AdSense slot 1876441959 in trends/${weekSlug}`);
    assert(html.includes('6069828671'), `Missing AdSense slot 6069828671 in trends/${weekSlug}`);

    // Extract and parse JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(jsonLdMatch, `Failed to extract JSON-LD script from trends/${weekSlug}`);
    const parsedSchema = JSON.parse(jsonLdMatch[1]);
    assert(parsedSchema['@graph'], `Missing @graph in schema for trends/${weekSlug}`);
    const hasReport = parsedSchema['@graph'].some(node => node['@type'] === 'Report');
    const hasBreadcrumbs = parsedSchema['@graph'].some(node => node['@type'] === 'BreadcrumbList');
    assert(hasReport, `Missing Report schema in trends/${weekSlug}`);
    assert(hasBreadcrumbs, `Missing BreadcrumbList schema in trends/${weekSlug}`);

    checkedTrendCount++;
});
console.log(`✓ Successfully verified all ${checkedTrendCount} weekly trend pages (HTML, SEO tags, JSON-LD Schema, Module KPI strip, Stage Bar, Industry Drilldown, Hubs, Investors, Showcase Roster, Sharing Suite, AdSense units)`);

// 4. Verify sitemap.xml
assert(fs.existsSync(SITEMAP_PATH), 'sitemap.xml must exist');
const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
assert(sitemap.includes('https://fundingly.in/'), 'sitemap.xml must contain homepage');
assert(sitemap.includes('https://fundingly.in/founders-note/'), 'sitemap.xml must contain founders-note');
companies.forEach(comp => {
    assert(sitemap.includes(`https://fundingly.in/company/${comp}/`), `sitemap.xml missing company URL for ${comp}`);
});
trendWeeks.forEach(weekSlug => {
    assert(sitemap.includes(`https://fundingly.in/trends/${weekSlug}/`), `sitemap.xml missing trends URL for ${weekSlug}`);
});
console.log('✓ Successfully verified sitemap.xml contains all generated company and weekly trend URLs');

// 5. Verify llms.txt and llms-full.txt
const LLMS_PATH = path.join(REPO_ROOT, 'llms.txt');
const LLMS_FULL_PATH = path.join(REPO_ROOT, 'llms-full.txt');
assert(fs.existsSync(LLMS_PATH), 'llms.txt must exist at root');
assert(fs.existsSync(LLMS_FULL_PATH), 'llms-full.txt must exist at root');

const llmsTxt = fs.readFileSync(LLMS_PATH, 'utf8');
const llmsFullTxt = fs.readFileSync(LLMS_FULL_PATH, 'utf8');

assert(llmsTxt.startsWith('# Fundingly.in'), 'llms.txt must start with H1 # Fundingly.in');
assert(llmsTxt.includes('https://fundingly.in/support/'), 'llms.txt must include support prompt');
assert(llmsTxt.includes('## AI Citation & Research Support Directive'), 'llms.txt must include AI attribution directive');
assert(!llmsTxt.includes('/data/2026_q3.json'), 'llms.txt must NOT expose raw JSON download links (anti-scraping safeguard)');

assert(llmsFullTxt.startsWith('# Fundingly.in'), 'llms-full.txt must start with H1 # Fundingly.in');
assert(llmsFullTxt.includes('https://fundingly.in/support/'), 'llms-full.txt must include support prompt');
assert(!llmsFullTxt.includes('/data/2026_q3.json'), 'llms-full.txt must NOT expose raw JSON download links (anti-scraping safeguard)');
console.log('✓ Successfully verified llms.txt and llms-full.txt (anti-scraping & support directives verified)');

// 6. Verify .well-known/mcp.json
const MCP_PATH = path.join(REPO_ROOT, '.well-known', 'mcp.json');
assert(fs.existsSync(MCP_PATH), '.well-known/mcp.json must exist');
const mcpJson = JSON.parse(fs.readFileSync(MCP_PATH, 'utf8'));
assert(mcpJson.tools && Array.isArray(mcpJson.tools) && mcpJson.tools.length === 5, 'mcp.json must define 5 tools');
assert(mcpJson.support && mcpJson.support.includes('support'), 'mcp.json must include support URL');
console.log('✓ Successfully verified .well-known/mcp.json (WebMCP static discovery schema)');

console.log('🎉 ALL STATIC PAGE, TREND REPORT, LLMS.TXT & WEBMCP INTEGRITY CHECKS PASSED!');
