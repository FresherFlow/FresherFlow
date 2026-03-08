const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('dist') && !fullPath.includes('.next')) {
                processDirectory(fullPath);
            }
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = content;

            // Replace catch (err: any) with catch (err: unknown)
            modified = modified.replace(/catch\s*\(\s*err:\s*any\s*\)/g, 'catch (err: unknown)');

            if (modified !== content) {
                fs.writeFileSync(fullPath, modified, 'utf8');
                console.log('Fixed:', fullPath);
            }
        }
    }
}

processDirectory(path.join(__dirname, 'apps'));
processDirectory(path.join(__dirname, 'packages'));
