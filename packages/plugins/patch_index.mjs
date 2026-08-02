/* global console */
import fs from 'fs';
import path from 'path';

const srcDir = 'c:/Projects/FresherFlow/packages/plugins/src';
const indexFile = path.join(srcDir, 'index.ts');

let indexContent = fs.readFileSync(indexFile, 'utf8');

// Replace ATS Adapters
indexContent = indexContent.replace(/import { ([^ ]+) } from '\.\/adapters\/(ashby|greenhouse|icims|jobvite|lever|oorwin|oracle|smartrecruiters|successfactors|taleo|workable|workday|recruitee|darwinbox|keka|greythr|hrone|freshteam|peoplestrong|zimyo|zohorecruit|turbohire|zwayam|ismartrecruit|pyjamahr|ceipal|recruitcrm|recruiterflow|snaphunt|mercor|eightfold|phenom|bamboohr|personio|breezyhr|bullhorn)\.js';/g, (match, className, name) => {
  let mappedClassName = className;
  if (className.endsWith('Adapter')) {
    mappedClassName = className.replace('Adapter', 'Service');
    // Special cases based on grep output
    if (name === 'hrone') mappedClassName = 'HrOneService';
    if (name === 'greythr') mappedClassName = 'GreytHrService';
  }
  return `import { ${mappedClassName} as ${className} } from './adapters/ats/${name}/index.js';`;
});

// Replace Board Adapters
indexContent = indexContent.replace(/import { ([^ ]+) } from '\.\/adapters\/boards\/(naukri|internshala|hasjob|indeed|linkedin|glassdoor|wellfound|hackernews|remoteok|weworkremotely)\.js';/g, (match, className, name) => {
  let mappedClassName = className;
  if (className.endsWith('Adapter')) {
    mappedClassName = className.replace('Adapter', 'Service');
    // Special cases
    if (name === 'linkedin') mappedClassName = 'LinkedInService';
    if (name === 'hasjob') mappedClassName = 'HasJobService';
  }
  return `import { ${mappedClassName} as ${className} } from './adapters/board/${name}/index.js';`;
});

fs.writeFileSync(indexFile, indexContent);
console.log('Successfully updated index.ts');
