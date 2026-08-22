export type { AtsJob, AtsAdapter } from './base/BaseAdapter.js';
export {
  sleep,
  fetchJson,
  htmlToPlainText,
  extractExperience,
  extractSalary,
  markdownConverter,
  normalizeLocation,
  parseJsonLd,
  toAtsJob
} from './base/BaseAdapter.js';
export type { IScraper } from './base/models/index.js';
export { ScraperInputDto, JobResponseDto, JobPostDto } from './base/models/index.js';
export { Site } from './base/models/index.js';

import type { AtsAdapter as IAtsAdapter } from './base/BaseAdapter.js';
import type { IScraper } from './base/models/index.js';

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
import { RipplingAdapter } from './adapters/ats/rippling/index.js';
import { TeamtailorAdapter } from './adapters/ats/teamtailor/index.js';
import { JobsoidAdapter } from './adapters/ats/jobsoid/index.js';
import { ComeetAdapter } from './adapters/ats/comeet/index.js';
import { HibobAdapter } from './adapters/ats/hibob/index.js';

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
  RipplingAdapter,
  TeamtailorAdapter,
  JobsoidAdapter,
  ComeetAdapter,
  HibobAdapter,
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

export const PLUGIN_REGISTRY: Record<string, IAtsAdapter> = {
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
  'rippling': new RipplingAdapter(),
  'teamtailor': new TeamtailorAdapter(),
  'jobsoid': new JobsoidAdapter(),
  'comeet': new ComeetAdapter(),
  'hibob': new HibobAdapter(),
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

export const BOARD_SET = new Set([
  'glassdoor', 'hackernews', 'hasjob', 'indeed', 'internshala',
  'linkedin', 'naukri', 'remoteok', 'wellfound', 'weworkremotely', 'bayt'
]);

export const COMPANY_PROVIDER_SET = new Set([
  'google', 'amazon', 'microsoft', 'ibm', 'apple', 'uber', 'stripe', 'meta', 'nvidia'
]);

export function getPluginCategories() {
  const all = Object.keys(PLUGIN_REGISTRY);
  const boards = all.filter((key) => BOARD_SET.has(key));
  const companies = all.filter((key) => COMPANY_PROVIDER_SET.has(key));
  const atsAdapters = all.filter((key) => !BOARD_SET.has(key) && !COMPANY_PROVIDER_SET.has(key));

  return {
    atsAdapters,
    boards,
    companies,
    total: all.length
  };
}

// ─── IScraper Registry (raw services, not AtsAdapter wrappers) ─────
// Maps site keys to IScraper instances, like ever-jobs PluginRegistry.
// Used by SearchService for concurrent fan-out search.
import { AshbyService } from './adapters/ats/ashby/index.js';
import { BambooHRService } from './adapters/ats/bamboohr/index.js';
import { BreezyHRService } from './adapters/ats/breezyhr/index.js';
import { BullhornService } from './adapters/ats/bullhorn/index.js';
import { CeipalService } from './adapters/ats/ceipal/index.js';
import { DarwinboxService } from './adapters/ats/darwinbox/index.js';
import { EightfoldService } from './adapters/ats/eightfold/index.js';
import { FreshteamService } from './adapters/ats/freshteam/index.js';
import { GreenhouseService } from './adapters/ats/greenhouse/index.js';
import { GreytHrService } from './adapters/ats/greythr/index.js';
import { HrOneService } from './adapters/ats/hrone/index.js';
import { IcimsService } from './adapters/ats/icims/index.js';
import { ISmartRecruitService } from './adapters/ats/ismartrecruit/index.js';
import { JobviteService } from './adapters/ats/jobvite/index.js';
import { KekaService } from './adapters/ats/keka/index.js';
import { LeverService } from './adapters/ats/lever/index.js';
import { MercorService } from './adapters/ats/mercor/index.js';
import { OorwinService } from './adapters/ats/oorwin/index.js';
import { OracleService } from './adapters/ats/oracle/index.js';
import { PeopleStrongService } from './adapters/ats/peoplestrong/index.js';
import { PersonioService } from './adapters/ats/personio/index.js';
import { PhenomService } from './adapters/ats/phenom/index.js';
import { PyjamaHrService } from './adapters/ats/pyjamahr/index.js';
import { RecruitCrmService } from './adapters/ats/recruitcrm/index.js';
import { RecruiteeService } from './adapters/ats/recruitee/index.js';
import { RecruiterflowService } from './adapters/ats/recruiterflow/index.js';
import { SmartRecruitersService } from './adapters/ats/smartrecruiters/index.js';
import { SnaphuntService } from './adapters/ats/snaphunt/index.js';
import { SuccessFactorsService } from './adapters/ats/successfactors/index.js';
import { TaleoService } from './adapters/ats/taleo/index.js';
import { TurboHireService } from './adapters/ats/turbohire/index.js';
import { WorkableService } from './adapters/ats/workable/index.js';
import { WorkdayService } from './adapters/ats/workday/index.js';
import { ZimyoService } from './adapters/ats/zimyo/index.js';
import { ZohoRecruitService } from './adapters/ats/zohorecruit/index.js';
import { ZwayamService } from './adapters/ats/zwayam/index.js';
// import { RipplingService } from './adapters/ats/rippling/index.js';
// import { TeamtailorService } from './adapters/ats/teamtailor/index.js';
// import { JobsoidService } from './adapters/ats/jobsoid/index.js';
// import { ComeetService } from './adapters/ats/comeet/index.js';
// import { HibobService } from './adapters/ats/hibob/index.js';

import { GlassdoorService } from './adapters/board/glassdoor/index.js';
import { HackerNewsService } from './adapters/board/hackernews/index.js';
import { HasJobService } from './adapters/board/hasjob/index.js';
import { IndeedService } from './adapters/board/indeed/index.js';
import { InternshalaService } from './adapters/board/internshala/index.js';
import { LinkedInService } from './adapters/board/linkedin/index.js';
import { NaukriService } from './adapters/board/naukri/index.js';
import { RemoteOkService } from './adapters/board/remoteok/index.js';
import { WellfoundService } from './adapters/board/wellfound/index.js';
import { WeWorkRemotelyService } from './adapters/board/weworkremotely/index.js';

export const ATS_SCRAPER_REGISTRY: Record<string, IScraper> = {
  ashby: new AshbyService(),
  bamboohr: new BambooHRService(),
  breezyhr: new BreezyHRService(),
  bullhorn: new BullhornService(),
  ceipal: new CeipalService(),
  darwinbox: new DarwinboxService(),
  eightfold: new EightfoldService(),
  freshteam: new FreshteamService(),
  greenhouse: new GreenhouseService(),
  greythr: new GreytHrService(),
  hrone: new HrOneService(),
  icims: new IcimsService(),
  ismartrecruit: new ISmartRecruitService(),
  jobvite: new JobviteService(),
  keka: new KekaService(),
  lever: new LeverService(),
  mercor: new MercorService(),
  oorwin: new OorwinService(),
  oracle: new OracleService(),
  peoplestrong: new PeopleStrongService(),
  personio: new PersonioService(),
  phenom: new PhenomService(),
  pyjamahr: new PyjamaHrService(),
  recruitcrm: new RecruitCrmService(),
  recruitee: new RecruiteeService(),
  recruiterflow: new RecruiterflowService(),
  smartrecruiters: new SmartRecruitersService(),
  snaphunt: new SnaphuntService(),
  successfactors: new SuccessFactorsService(),
  taleo: new TaleoService(),
  turbohire: new TurboHireService(),
  workable: new WorkableService(),
  workday: new WorkdayService(),
  zimyo: new ZimyoService(),
  zohorecruit: new ZohoRecruitService(),
  zwayam: new ZwayamService(),
  // rippling: new RipplingService(),
  // teamtailor: new TeamtailorService(),
  // jobsoid: new JobsoidService(),
  // comeet: new ComeetService(),
  // hibob: new HibobService(),
};

export const BOARD_SCRAPER_REGISTRY: Record<string, IScraper> = {
  glassdoor: new GlassdoorService(),
  hackernews: new HackerNewsService(),
  hasjob: new HasJobService(),
  indeed: new IndeedService(),
  internshala: new InternshalaService(),
  linkedin: new LinkedInService(),
  naukri: new NaukriService(),
  remoteok: new RemoteOkService(),
  wellfound: new WellfoundService(),
  weworkremotely: new WeWorkRemotelyService(),
};

export const SCRAPER_REGISTRY: Record<string, IScraper> = {
  ...ATS_SCRAPER_REGISTRY,
  ...BOARD_SCRAPER_REGISTRY,
};

export * from './common/experience.js';
export * from './common/browser.js';
export * from './common/html-utils.js';


