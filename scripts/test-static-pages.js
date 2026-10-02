const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEALS_DIR = path.join(REPO_ROOT, 'deals');
const TRENDS_DIR = path.join(REPO_ROOT, 'trends');
const SITEMAP_PATH = path.join(REPO_ROOT, 'sitemap.xml');

console.log('🧪 Starting self-check validation of generated canonical static deal pages and weekly trend reports...');

// 1. Check deals directory and deals/index.html exist
assert(fs.existsSync(DEALS_DIR), 'Deals directory must exist');
const dealsIndexHtml = path.join(DEALS_DIR, 'index.html');
assert(fs.existsSync(dealsIndexHtml), 'deals/index.html dashboard file must exist');
console.log('✓ Verified deals/index.html exists');

// 2. Discover weekly folders in trends/
assert(fs.existsSync(TRENDS_DIR), 'Trends directory must exist');
const weekFolders = fs.readdirSync(TRENDS_DIR).filter(f => f.startsWith('week-') && fs.statSync(path.join(TRENDS_DIR, f)).isDirectory());
assert(weekFolders.length > 0, 'Must have at least 1 week-* directory in trends/');
console.log(`✓ Found ${weekFolders.length} weekly directories in trends/: ${weekFolders.join(', ')}`);

// 3. Validate weekly trend report index.html in each week
let verifiedWeeklyReports = 0;

weekFolders.forEach(wFolder => {
    const reportHtmlPath = path.join(TRENDS_DIR, wFolder, 'index.html');
    assert(fs.existsSync(reportHtmlPath), `index.html must exist for weekly report at trends/${wFolder}/index.html`);
    const html = fs.readFileSync(reportHtmlPath, 'utf8');

    // Title & Meta
    assert(html.includes('<title>'), `Missing <title> in trends/${wFolder}`);
    assert(html.includes('name="description"'), `Missing meta description in trends/${wFolder}`);
    assert(html.includes('rel="canonical"'), `Missing canonical link in trends/${wFolder}`);
    assert(html.includes(`https://fundingly.in/trends/${wFolder}/`), `Canonical URL must match https://fundingly.in/trends/${wFolder}/`);
    assert(html.includes('application/ld+json'), `Missing JSON-LD in trends/${wFolder}`);

    // Trends Modules
    assert(html.includes('class="trends-kpi-grid"'), `Missing KPI strip in trends/${wFolder}`);
    assert(html.includes('class="trends-segmented-bar"'), `Missing stage segmented bar in trends/${wFolder}`);
    assert(html.includes('class="trends-stage-legend"'), `Missing stage legend in trends/${wFolder}`);
    assert(html.includes('id="trendsIndustryView"'), `Missing industry drilldown in trends/${wFolder}`);
    assert(html.includes('class="trends-split-grid"'), `Missing regional hubs & investors split grid in trends/${wFolder}`);
    assert(html.includes('class="trends-deal-roster"'), `Missing showcase deals roster in trends/${wFolder}`);

    // Sharing & UX Elements
    assert(html.includes('id="trendsToast"'), `Missing toast container in trends/${wFolder}`);
    assert(html.includes('copyWeeklyDigest()'), `Missing copyWeeklyDigest in trends/${wFolder}`);
    assert(html.includes('copyPageUrl()'), `Missing copyPageUrl in trends/${wFolder}`);
    assert(html.includes('sidebar-weeks-list'), `Missing sidebar weekly archive list in trends/${wFolder}`);

    // AdSense placeholders
    assert(html.includes('class="ad-container-wrapper"'), `Missing AdSense container in trends/${wFolder}`);
    assert(html.includes('class="adsbygoogle"'), `Missing adsbygoogle tag in trends/${wFolder}`);
    assert(html.includes('ca-pub-6148655095183291'), `Missing AdSense client ca-pub-6148655095183291 in trends/${wFolder}`);
    assert(html.includes('1876441959'), `Missing AdSense slot 1876441959 in trends/${wFolder}`);
    assert(html.includes('6069828671'), `Missing AdSense slot 6069828671 in trends/${wFolder}`);

    // Extract and parse JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(jsonLdMatch, `Failed to extract JSON-LD script from trends/${wFolder}`);
    const parsedSchema = JSON.parse(jsonLdMatch[1]);
    assert(parsedSchema['@graph'], `Missing @graph in schema for trends/${wFolder}`);
    const hasReport = parsedSchema['@graph'].some(node => node['@type'] === 'Report');
    const hasBreadcrumbs = parsedSchema['@graph'].some(node => node['@type'] === 'BreadcrumbList');
    assert(hasReport, `Missing Report schema in trends/${wFolder}`);
    assert(hasBreadcrumbs, `Missing BreadcrumbList schema in trends/${wFolder}`);

    verifiedWeeklyReports++;
});

console.log(`✓ Successfully verified all ${verifiedWeeklyReports} weekly report pages (HTML, SEO tags, JSON-LD Schema, Module KPI strip, Stage Bar, Industry Drilldown, Hubs, Investors, Showcase Roster, Sharing Suite, AdSense units)`);

// 4. Validate canonical company deal dossier pages
const companyDirs = fs.readdirSync(DEALS_DIR).filter(f => !f.startsWith('week-') && fs.statSync(path.join(DEALS_DIR, f)).isDirectory());
assert(companyDirs.length > 0, 'Must have at least 1 canonical company dossier in deals/');
console.log(`✓ Found ${companyDirs.length} canonical company deal dossiers in deals/`);

let verifiedCompanyDossiers = 0;
companyDirs.forEach(domain => {
    const compPath = path.join(DEALS_DIR, domain, 'index.html');
    assert(fs.existsSync(compPath), `index.html must exist at ${compPath}`);
    const html = fs.readFileSync(compPath, 'utf8');

    // Title & Meta
    assert(html.includes('<title>'), `Missing <title> in deals/${domain}`);
    assert(html.includes('name="description"'), `Missing meta description in deals/${domain}`);
    assert(html.includes('rel="canonical"'), `Missing canonical link in deals/${domain}`);
    assert(html.includes(`https://fundingly.in/deals/${domain}/`), `Canonical URL must match https://fundingly.in/deals/${domain}/`);
    assert(html.includes('application/ld+json'), `Missing JSON-LD in deals/${domain}`);

    // Sharing & UX Elements
    assert(html.includes('id="dossierToast"'), `Missing toast container in deals/${domain}`);
    assert(html.includes('shareDossier()'), `Missing shareDossier function call in deals/${domain}`);
    assert(html.includes('copyPageUrl()'), `Missing copyPageUrl function call in deals/${domain}`);
    assert(html.includes('copyDealSummary()'), `Missing copyDealSummary in deals/${domain}`);
    assert(html.includes('switchDealRound'), `Missing switchDealRound timeline switcher in deals/${domain}`);

    // AdSense placeholders
    assert(html.includes('class="ad-container-wrapper"'), `Missing AdSense container in deals/${domain}`);
    assert(html.includes('class="adsbygoogle"'), `Missing adsbygoogle tag in deals/${domain}`);
    assert(html.includes('ca-pub-6148655095183291'), `Missing AdSense client in deals/${domain}`);
    assert(html.includes('1876441959'), `Missing AdSense slot 1876441959 in deals/${domain}`);
    assert(html.includes('6069828671'), `Missing AdSense slot 6069828671 in deals/${domain}`);

    // Extract and parse JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(jsonLdMatch, `Failed to extract JSON-LD script from deals/${domain}`);
    const parsedSchema = JSON.parse(jsonLdMatch[1]);
    assert(parsedSchema['@graph'], `Missing @graph in schema for deals/${domain}`);
    const hasOrg = parsedSchema['@graph'].some(node => node['@type'] === 'Organization');
    const hasInvestment = parsedSchema['@graph'].some(node => node['@type'] === 'InvestmentOrGrant');
    const hasBreadcrumbs = parsedSchema['@graph'].some(node => node['@type'] === 'BreadcrumbList');
    assert(hasOrg, `Missing Organization schema in deals/${domain}`);
    assert(hasInvestment, `Missing InvestmentOrGrant schema in deals/${domain}`);
    assert(hasBreadcrumbs, `Missing BreadcrumbList schema in deals/${domain}`);

    verifiedCompanyDossiers++;
});

console.log(`✓ Successfully verified all ${verifiedCompanyDossiers} canonical company deal dossiers`);

// 5. Verify sitemap.xml
assert(fs.existsSync(SITEMAP_PATH), 'sitemap.xml must exist');
const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
assert(sitemap.includes('https://fundingly.in/'), 'sitemap.xml must contain homepage');
assert(sitemap.includes('https://fundingly.in/deals/'), 'sitemap.xml must contain deals dashboard');
assert(fs.existsSync(path.join(REPO_ROOT, 'trends', 'index.html')), 'trends/index.html must exist');
assert(sitemap.includes('https://fundingly.in/trends/'), 'sitemap.xml must contain trends hub');
assert(sitemap.includes('https://fundingly.in/founders-note/'), 'sitemap.xml must contain founders-note');
weekFolders.forEach(wFolder => {
    assert(sitemap.includes(`https://fundingly.in/trends/${wFolder}/`), `sitemap.xml missing weekly trends URL for ${wFolder}`);
});
companyDirs.forEach(domain => {
    assert(sitemap.includes(`https://fundingly.in/deals/${domain}/`), `sitemap.xml missing company URL for deals/${domain}`);
});
console.log('✓ Successfully verified sitemap.xml contains all homepage, deals, weekly reports, and canonical company deal URLs');

// 6. Verify llms.txt and llms-full.txt
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

// 7. Verify .well-known/mcp.json
const MCP_PATH = path.join(REPO_ROOT, '.well-known', 'mcp.json');
assert(fs.existsSync(MCP_PATH), '.well-known/mcp.json must exist');
const mcpJson = JSON.parse(fs.readFileSync(MCP_PATH, 'utf8'));
assert(mcpJson.tools && Array.isArray(mcpJson.tools) && mcpJson.tools.length === 5, 'mcp.json must define 5 tools');
assert(mcpJson.support && mcpJson.support.includes('support'), 'mcp.json must include support URL');
console.log('✓ Successfully verified .well-known/mcp.json (WebMCP static discovery schema)');

console.log('🎉 ALL STATIC PAGE, TREND REPORT, LLMS.TXT & WEBMCP INTEGRITY CHECKS PASSED!');

