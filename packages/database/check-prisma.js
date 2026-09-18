try {
  const p = require('prisma');
  console.log('prisma keys:', Object.keys(p));
} catch(e) { console.log('prisma error:', e.message); }
try {
  const c = require('prisma/config');
  console.log('config keys:', Object.keys(c));
} catch(e) { console.log('config error:', e.message); }
