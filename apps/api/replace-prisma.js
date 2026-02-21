const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // 1. Remove "import { PrismaClient } from '@prisma/client';" BUT keep others like OpportunityStatus
            content = content.replace(/import\s+\{\s*([^}]*?)\bPrismaClient\b([^}]*?)\s*\}\s+from\s+['"]@prisma\/client['"];/g, (match, prefix, suffix) => {
                const parts = [
                    ...(prefix ? prefix.split(',').map(s => s.trim()).filter(Boolean) : []),
                    ...(suffix ? suffix.split(',').map(s => s.trim()).filter(Boolean) : [])
                ];
                if (parts.length === 0) return '';
                return `import { ${parts.join(', ')} } from '@prisma/client';`;
            });

            // If we still have an empty import like `import {  } from '@prisma/client';` drop it
            content = content.replace(/import\s+\{\s*\}\s+from\s+['"]@prisma\/client['"];\n?/g, '');

            // 2. Remove instances of `const prisma = new PrismaClient();`
            content = content.replace(/const\s+prisma\s+=\s+new\s+PrismaClient\(\)?;?/g, '');

            // 3. Inject new singleton import at the top of the file
            if (originalContent !== content) {
                // Find where to put the new import. Usually right after other imports or at top.
                // Or just put it right after the first line. For safety, let's put it on top.
                if (!content.includes(`import prisma from '../lib/prisma';`) && !content.includes(`import prisma from '../../lib/prisma';`)) {
                    // Quick hack to figure out depth
                    const depth = fullPath.split(path.sep).length - fullPath.indexOf('src') - 2;
                    let relPath = '../lib/prisma';
                    if (fullPath.includes('src\\routes\\admin') || fullPath.includes('src/routes/admin')) {
                        relPath = '../../lib/prisma';
                    } else if (fullPath.includes('src\\routes\\public') || fullPath.includes('src/routes/public')) {
                        relPath = '../../lib/prisma';
                    }
                    content = `import prisma from '${relPath}';\n` + content;
                }

                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    });
}

const baseDirs = [
    path.join(__dirname, 'src', 'routes'),
    path.join(__dirname, 'src', 'services'),
    path.join(__dirname, 'src', 'utils')
];

baseDirs.forEach(d => {
    if (fs.existsSync(d)) processDir(d);
});
console.log('Done replacing Prisma client instances.');
