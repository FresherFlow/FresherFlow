export {
  AtsJob,
  AtsAdapter,
  sleep,
  fetchJson,
  extractExperience,
  extractSalary,
  markdownConverter,
  normalizeLocation,
  parseJsonLd
} from './base/BaseAdapter.js';

import { AtsAdapter } from './base/BaseAdapter.js';

// ATS Adapters
import { AshbyAdapter } from './adapters/ats/ashby/index.js';
import { BambooHRAdapter } from './adapters/ats/bamboohr/index.js';
import { BreezyHRAdapter } from './adapters/ats/breezyhr/index.js';
import { BullhornAdapter } from './adapters/ats/bullhorn/index.js';
import { CeipalAdapter } from './adapters/ats/ceipal/index.js';
import { DarwinboxAdapter } from './adapters/ats/darwinbox/index.js';
import { EightfoldAdapter } from './adapters/ats/eightfold/index.js';
import { FreshteamAdapter } from './adapters/ats/freshteam/index.js';
import { GreenhouseAdapter } from './adapters/ats/greenhouse/index.js';
import { GreythrAdapter } from './adapters/ats/greythr/index.js';
import { HROneAdapter } from './adapters/ats/hrone/index.js';
import { ICimsAdapter } from './adapters/ats/icims/index.js';
import { ISmartRecruitAdapter } from './adapters/ats/ismartrecruit/index.js';
import { JobviteAdapter } from './adapters/ats/jobvite/index.js';
import { KekaAdapter } from './adapters/ats/keka/index.js';
import { LeverAdapter } from './adapters/ats/lever/index.js';
import { MercorAdapter } from './adapters/ats/mercor/index.js';
import { OorwinAdapter } from './adapters/ats/oorwin/index.js';
import { OracleAdapter } from './adapters/ats/oracle/index.js';
import { PeoplestrongAdapter } from './adapters/ats/peoplestrong/index.js';
import { PersonioAdapter } from './adapters/ats/personio/index.js';
import { PhenomAdapter } from './adapters/ats/phenom/index.js';
import { PyjamaHRAdapter } from './adapters/ats/pyjamahr/index.js';
import { RecruitCrmAdapter } from './adapters/ats/recruitcrm/index.js';
import { RecruiteeAdapter } from './adapters/ats/recruitee/index.js';
import { RecruiterflowAdapter } from './adapters/ats/recruiterflow/index.js';
import { SmartRecruitersAdapter } from './adapters/ats/smartrecruiters/index.js';
import { SnaphuntAdapter } from './adapters/ats/snaphunt/index.js';
import { SuccessFactorsAdapter } from './adapters/ats/successfactors/index.js';
import { TaleoAdapter } from './adapters/ats/taleo/index.js';
import { TurboHireAdapter } from './adapters/ats/turbohire/index.js';
import { WorkableAdapter } from './adapters/ats/workable/index.js';
import { WorkdayAdapter } from './adapters/ats/workday/index.js';
import { ZimyoAdapter } from './adapters/ats/zimyo/index.js';
import { ZohoRecruitAdapter } from './adapters/ats/zohorecruit/index.js';
import { ZwayamAdapter } from './adapters/ats/zwayam/index.js';

// Job Boards
import { GlassdoorAdapter } from './adapters/board/glassdoor/index.js';
import { HackerNewsAdapter } from './adapters/board/hackernews/index.js';
import { HasjobAdapter } from './adapters/board/hasjob/index.js';
import { IndeedAdapter } from './adapters/board/indeed/index.js';
import { InternshalaAdapter } from './adapters/board/internshala/index.js';
import { LinkedinAdapter } from './adapters/board/linkedin/index.js';
import { NaukriAdapter } from './adapters/board/naukri/index.js';
import { RemoteOkAdapter } from './adapters/board/remoteok/index.js';
import { WellfoundAdapter } from './adapters/board/wellfound/index.js';
import { WeWorkRemotelyAdapter } from './adapters/board/weworkremotely/index.js';
import { BaytAdapter } from './adapters/board/bayt.js';

// Company Scrapers
import { GoogleAdapter } from './adapters/company/google/index.js';
import { AmazonAdapter } from './adapters/company/amazon/index.js';
import { MicrosoftAdapter } from './adapters/company/microsoft/index.js';
import { IbmAdapter } from './adapters/company/ibm/index.js';
import { AppleAdapter } from './adapters/company/apple/index.js';
import { UberAdapter } from './adapters/company/uber/index.js';
import { StripeAdapter } from './adapters/company/stripe/index.js';
import { MetaAdapter } from './adapters/company/meta/index.js';
import { NvidiaAdapter } from './adapters/company/nvidia.js';

export {
  AshbyAdapter,
  BambooHRAdapter,
  BreezyHRAdapter,
  BullhornAdapter,
  CeipalAdapter,
  DarwinboxAdapter,
  EightfoldAdapter,
  FreshteamAdapter,
  GreenhouseAdapter,
  GreythrAdapter,
  HROneAdapter,
  ICimsAdapter,
  ISmartRecruitAdapter,
  JobviteAdapter,
  KekaAdapter,
  LeverAdapter,
  MercorAdapter,
  OorwinAdapter,
  OracleAdapter,
  PeoplestrongAdapter,
  PersonioAdapter,
  PhenomAdapter,
  PyjamaHRAdapter,
  RecruitCrmAdapter,
  RecruiteeAdapter,
  RecruiterflowAdapter,
  SmartRecruitersAdapter,
  SnaphuntAdapter,
  SuccessFactorsAdapter,
  TaleoAdapter,
  TurboHireAdapter,
  WorkableAdapter,
  WorkdayAdapter,
  ZimyoAdapter,
  ZohoRecruitAdapter,
  ZwayamAdapter,
  GlassdoorAdapter,
  HackerNewsAdapter,
  HasjobAdapter,
  IndeedAdapter,
  InternshalaAdapter,
  LinkedinAdapter,
  NaukriAdapter,
  RemoteOkAdapter,
  WellfoundAdapter,
  WeWorkRemotelyAdapter,
  BaytAdapter,
  GoogleAdapter,
  AmazonAdapter,
  MicrosoftAdapter,
  IbmAdapter,
  AppleAdapter,
  UberAdapter,
  StripeAdapter,
  MetaAdapter,
  NvidiaAdapter
};

export const PLUGIN_REGISTRY: Record<string, AtsAdapter> = {
  'ashby': new AshbyAdapter(),
  'bamboohr': new BambooHRAdapter(),
  'breezyhr': new BreezyHRAdapter(),
  'bullhorn': new BullhornAdapter(),
  'ceipal': new CeipalAdapter(),
  'darwinbox': new DarwinboxAdapter(),
  'eightfold': new EightfoldAdapter(),
  'freshteam': new FreshteamAdapter(),
  'greenhouse': new GreenhouseAdapter(),
  'greythr': new GreythrAdapter(),
  'hrone': new HROneAdapter(),
  'icims': new ICimsAdapter(),
  'ismartrecruit': new ISmartRecruitAdapter(),
  'jobvite': new JobviteAdapter(),
  'keka': new KekaAdapter(),
  'lever': new LeverAdapter(),
  'mercor': new MercorAdapter(),
  'oorwin': new OorwinAdapter(),
  'oracle': new OracleAdapter(),
  'peoplestrong': new PeoplestrongAdapter(),
  'personio': new PersonioAdapter(),
  'phenom': new PhenomAdapter(),
  'pyjamahr': new PyjamaHRAdapter(),
  'recruitcrm': new RecruitCrmAdapter(),
  'recruitee': new RecruiteeAdapter(),
  'recruiterflow': new RecruiterflowAdapter(),
  'smartrecruiters': new SmartRecruitersAdapter(),
  'snaphunt': new SnaphuntAdapter(),
  'successfactors': new SuccessFactorsAdapter(),
  'taleo': new TaleoAdapter(),
  'turbohire': new TurboHireAdapter(),
  'workable': new WorkableAdapter(),
  'workday': new WorkdayAdapter(),
  'zimyo': new ZimyoAdapter(),
  'zohorecruit': new ZohoRecruitAdapter(),
  'zwayam': new ZwayamAdapter(),
  'glassdoor': new GlassdoorAdapter(),
  'hackernews': new HackerNewsAdapter(),
  'hasjob': new HasjobAdapter(),
  'indeed': new IndeedAdapter(),
  'internshala': new InternshalaAdapter(),
  'linkedin': new LinkedinAdapter(),
  'naukri': new NaukriAdapter(),
  'remoteok': new RemoteOkAdapter(),
  'wellfound': new WellfoundAdapter(),
  'weworkremotely': new WeWorkRemotelyAdapter(),
  'bayt': new BaytAdapter(),
  'google': new GoogleAdapter(),
  'amazon': new AmazonAdapter(),
  'microsoft': new MicrosoftAdapter(),
  'ibm': new IbmAdapter(),
  'apple': new AppleAdapter(),
  'uber': new UberAdapter(),
  'stripe': new StripeAdapter(),
  'meta': new MetaAdapter(),
  'nvidia': new NvidiaAdapter()
};
