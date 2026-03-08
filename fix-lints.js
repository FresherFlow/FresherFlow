const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const { search, replace } of replacements) {
        content = content.replace(search, replace);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed:', filePath);
    }
}

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

            // 1. Fix implicit any for (err) -> (err: any) in catch blocks or functions
            modified = modified.replace(/catch\s*\(\s*err\s*\)/g, 'catch (err: any)');
            modified = modified.replace(/\(\s*err\s*\)\s*=>/g, '(err: any) =>');

            // 2. Fix implicit any for (l) -> (l: any) or (l: string)
            modified = modified.replace(/\.map\(\s*\(\s*l\s*\)\s*=>/g, '.map((l: string) =>');
            modified = modified.replace(/\.some\(\s*\(\s*l\s*\)\s*=>/g, '.some((l: string) =>');

            // 3. Fix implicit any for (d) -> (d: any)
            modified = modified.replace(/\.map\(\s*\(\s*d\s*\)\s*=>/g, '.map((d: any) =>');
            modified = modified.replace(/\.find\(\s*\(\s*d\s*\)\s*=>/g, '.find((d: any) =>');
            modified = modified.replace(/\.filter\(\s*\(\s*d\s*\)\s*=>/g, '.filter((d: any) =>');
            modified = modified.replace(/=>\s*toggle\([^,]+,\s*[^,]+,\s*d\s*\)/g, '=> toggle(selectedDegrees, setSelectedDegrees, d as string)');
            modified = modified.replace(/key=\{d\}\s*label=\{d\}/g, 'key={d as string} label={d as string}');

            // 4. Fix Prisma imports for OpportunityStatus and OpportunityType
            if (modified.includes('OpportunityStatus') || modified.includes('OpportunityType')) {
                // If imported from @prisma/client, remove them and add import from @fresherflow/types
                const prismaImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@prisma\/client['"];?/;
                const match = modified.match(prismaImportRegex);
                if (match) {
                    let imports = match[1].split(',').map(s => s.trim());
                    const toMove = imports.filter(i => i === 'OpportunityStatus' || i === 'OpportunityType');

                    if (toMove.length > 0) {
                        // Remove them from prisma imports
                        imports = imports.filter(i => i !== 'OpportunityStatus' && i !== 'OpportunityType');

                        let newPrismaImport = '';
                        if (imports.length > 0) {
                            newPrismaImport = `import { ${imports.join(', ')} } from '@prisma/client';\n`;
                        }

                        // Check if @fresherflow/types import exists
                        const typesRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@fresherflow\/types['"];?/;
                        const typesMatch = modified.match(typesRegex);

                        if (typesMatch) {
                            // Add to existing
                            let existingTypes = typesMatch[1].split(',').map(s => s.trim());
                            for (const tm of toMove) {
                                if (!existingTypes.includes(tm)) existingTypes.push(tm);
                            }
                            modified = modified.replace(typesRegex, `import { ${existingTypes.join(', ')} } from '@fresherflow/types';`);
                            modified = modified.replace(match[0], newPrismaImport);
                        } else {
                            // Add new import
                            modified = modified.replace(match[0], `${newPrismaImport}import { ${toMove.join(', ')} } from '@fresherflow/types';`);
                        }
                    }
                }
            }

            if (modified !== content) {
                fs.writeFileSync(fullPath, modified, 'utf8');
                console.log('Fixed:', fullPath);
            }
        }
    }
}

processDirectory(path.join(__dirname, 'apps'));
processDirectory(path.join(__dirname, 'packages'));
