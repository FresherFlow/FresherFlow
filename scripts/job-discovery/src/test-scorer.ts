import { scoreJobDescription } from './filters/scorer.js';

const text = `CAREER ADVANCEMENT 
With no forced hierarchy at Capco, everyone has the opportunity to grow as we grow, taking their career into their own hands. 

DIVERSITY & INCLUSION 
We believe that diversity of people and perspective gives us a competitive advantage.  Role Description
Location - Mumbai
Experience – 5+ years`;

const result = scoreJobDescription("Software Engineer", text);
console.log(JSON.stringify(result, null, 2));
