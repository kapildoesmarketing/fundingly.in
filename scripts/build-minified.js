/**
 * ============================================================================
 * FUNDINGLY.IN — ZERO-DEPENDENCY ASSET MINIFICATION PIPELINE
 * ============================================================================
 * Designed by Kapil Pidhwani: Pure Node.js Standard Library Minifier.
 * Compiles production-ready .min.css and .min.js bundles with 0 external packages.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CSS_DIR = path.join(REPO_ROOT, 'css');
const JS_DIR = path.join(REPO_ROOT, 'js');

// Helper: Lightweight CSS Minifier (Zero-Dependency)
function minifyCSS(rawCss) {
    return rawCss
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Remove space around selectors, properties, and symbols
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        // Remove trailing semicolons before closing braces
        .replace(/;}/g, '}')
        // Remove leading zeroes on fractions (e.g. 0.5px -> .5px) where safe
        .replace(/\b0px\b/g, '0')
        .replace(/\b0rem\b/g, '0')
        .replace(/\b0em\b/g, '0')
        // Trim leading and trailing whitespace
        .trim();
}

// Helper: Lightweight JS Minifier (Zero-Dependency)
function minifyJS(rawJs) {
    const lines = rawJs.split('\n');
    const processedLines = [];

    for (let line of lines) {
        const trimmed = line.trim();
        // Skip empty lines or pure comment lines
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            continue;
        }

        // Strip trailing single-line comments if not inside strings
        let cleanLine = line;
        const commentIdx = cleanLine.indexOf('//');
        if (commentIdx > 0 && !cleanLine.includes('http://') && !cleanLine.includes('https://') && !cleanLine.includes('"//"') && !cleanLine.includes("'//'")) {
            // Safe check for comment
            const beforeComment = cleanLine.substring(0, commentIdx);
            const quoteCount = (beforeComment.match(/['"`]/g) || []).length;
            if (quoteCount % 2 === 0) {
                cleanLine = beforeComment;
            }
        }

        processedLines.push(cleanLine.trimEnd());
    }

    // Join and collapse non-essential multiline spacing
    return processedLines.join('\n')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();
}

// Main Minification Build
function runMinification() {
    console.log('⚡ Starting Zero-Dependency Asset Minification...');

    // 1. Minify CSS
    const stylesPath = path.join(CSS_DIR, 'styles.css');
    const stylesMinPath = path.join(CSS_DIR, 'styles.min.css');

    if (fs.existsSync(stylesPath)) {
        const rawStyles = fs.readFileSync(stylesPath, 'utf8');
        const minStyles = minifyCSS(rawStyles);
        fs.writeFileSync(stylesMinPath, minStyles, 'utf8');

        const originalSize = Buffer.byteLength(rawStyles, 'utf8');
        const minSize = Buffer.byteLength(minStyles, 'utf8');
        const savings = (((originalSize - minSize) / originalSize) * 100).toFixed(1);

        console.log(`✅ css/styles.css (${(originalSize / 1024).toFixed(1)} KB) ➔ styles.min.css (${(minSize / 1024).toFixed(1)} KB) [Saved ${savings}%]`);
    }

    // 2. Minify JavaScript Files
    const jsFiles = ['app.js', 'trends.js', 'trends-engine.js', 'metaballs.js'];
    jsFiles.forEach(file => {
        const filePath = path.join(JS_DIR, file);
        const minFilePath = path.join(JS_DIR, file.replace('.js', '.min.js'));

        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const min = minifyJS(raw);
            fs.writeFileSync(minFilePath, min, 'utf8');

            const orig = Buffer.byteLength(raw, 'utf8');
            const mini = Buffer.byteLength(min, 'utf8');
            const save = (((orig - mini) / orig) * 100).toFixed(1);

            console.log(`✅ js/${file} (${(orig / 1024).toFixed(1)} KB) ➔ ${path.basename(minFilePath)} (${(mini / 1024).toFixed(1)} KB) [Saved ${save}%]`);
        }
    });

    console.log('🎉 Asset Minification Pipeline Complete!');
}

runMinification();
