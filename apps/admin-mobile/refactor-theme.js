const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function refactorFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalFormat = content;

    // Check if file uses static theme import
    if (content.includes('import { theme } from') || content.includes('import { theme,') || content.includes(', theme } from')) {
        console.log("Refactoring: " + filePath);

        // 1. Determine correct path to ThemeProvider based on depth
        // relative depth from filePath to src/theme/ThemeProvider
        const relativeDir = path.dirname(filePath);
        const relPathToSrc = path.relative(relativeDir, srcDir);
        const themeProviderPath = (relPathToSrc ? relPathToSrc + '/' : './') + 'theme/ThemeProvider';

        // 2. Replace static import with hook import
        content = content.replace(/import\s*\{([^}]*)\btheme\b([^}]*)\}\s*from\s*['"](.*?)['"];?/, (match, p1, p2, p3) => {
            const others = [p1, p2].join(',').split(',').map(s => s.trim()).filter(Boolean).join(', ');
            let res = '';
            if (others) {
                res += `import { ${others} } from '${p3}';\n`;
            }
            res += `import { useTheme } from '${themeProviderPath}';`;
            return res;
        });

        // 3. Inject `const { colors, roundness, spacing } = useTheme();`
        // We need to inject it inside the component body.
        // Look for `export const ComponentName = ` or `export function ComponentName` or `const ComponentName = `
        // Or inject it just after `return (` ? No, it has to be hook level.
        // Safer way: `const theme = { colors, roundness, spacing };` inside the component so we don't need to change `theme.colors...`

        // Let's find the main component declaration
        // const Name = () => {
        // function Name() {
        const compMatch = content.match(/(export\s+)?(default\s+)?(const|function)\s+([A-Z][a-zA-Z0-9_]*)\s*=?\s*(\(.*?\))?\s*(=>)?\s*\{/);

        if (compMatch) {
            const injection = `\n    const { colors, roundness, spacing } = useTheme();\n    const theme = { colors, roundness, spacing };\n`;
            content = content.slice(0, compMatch.index + compMatch[0].length) + injection + content.slice(compMatch.index + compMatch[0].length);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("  Successfully injected useTheme into " + (compMatch[4] || "component"));
        } else {
            console.log("  FAILED to find component body in " + filePath);
        }
    }
}

walkDir(srcDir, function (filePath) {
    refactorFile(filePath);
});
