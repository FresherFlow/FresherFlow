
import { MergeCategory } from './types';

/**
 * Default Site → {@link MergeCategory} lookup used by
 * {@link MergeDefaultService}. Mirrors the categorisation of each source
 * plugin's folder name under `packages/plugins/`:
 *
 *  - `source-ats-<x>`     → `'ats'`
 *  - `source-company-<x>` → `'company'`
 *  - government / regional / remote / niche / freelance fall out by name.
 *
 * Sites that this map does NOT cover fall back to
 * `MergeDefaultOptions.fallbackCategory` (default `'job-board'`).
 *
 * NOTE: the map is intentionally **explicit** rather than derived at
 * runtime from the plugin registry. The resolver runs on the dedup hot
 * path; we want a zero-IO lookup.
 */
const PAIRS: ReadonlyArray<readonly [string, MergeCategory]> = [
  // ─── ATS (precedence tier #1) ───────────────────────────────────────
  ['ashby', 'ats'],
  ['greenhouse', 'ats'],
  ['lever', 'ats'],
  ['workable', 'ats'],
  ['smartrecruiters', 'ats'],
  ['rippling', 'ats'],
  ['workday', 'ats'],
  ['recruitee', 'ats'],
  ['teamtailor', 'ats'],
  ['bamboohr', 'ats'],
  ['personio', 'ats'],
  ['jazzhr', 'ats'],
  ['icims', 'ats'],
  ['taleo', 'ats'],
  ['successfactors', 'ats'],
  ['jobvite', 'ats'],
  ['adp', 'ats'],
  ['ukg', 'ats'],
  ['breezyhr', 'ats'],
  ['comeet', 'ats'],
  ['pinpoint', 'ats'],
  ['manatal', 'ats'],
  ['paylocity', 'ats'],
  ['freshteam', 'ats'],
  ['bullhorn', 'ats'],
  ['trakstar', 'ats'],
  ['hiringthing', 'ats'],
  ['loxo', 'ats'],
  ['fountain', 'ats'],
  ['deel', 'ats'],
  ['phenom', 'ats'],
  ['jobylon', 'ats'],
  ['homerun', 'ats'],
  ['jobscore', 'ats'],
  ['talentlyft', 'ats'],
  ['crelate', 'ats'],
  ['ismartrecruit', 'ats'],
  ['recruiterflow', 'ats'],

  // ─── Company-direct (precedence tier #2) ────────────────────────────
  ['amazon', 'company'],
  ['apple', 'company'],
  ['microsoft', 'company'],
  ['nvidia', 'company'],
  ['tiktok', 'company'],
  ['uber', 'company'],
  ['cursor', 'company'],
  ['google_careers', 'company'],
  ['meta', 'company'],
  ['netflix', 'company'],
  ['stripe', 'company'],
  ['openai', 'company'],
  ['ibm', 'company'],
  ['boeing', 'company'],
  ['zoom', 'company'],

  // ─── Government / public-sector (between board and remote) ──────────
  ['usajobs', 'government'],
  ['careeronestop', 'government'],
  ['arbeitsagentur', 'government'],
  ['navjobs', 'government'],
  ['jobtechdev', 'government'],
  ['francetravail', 'government'],
  ['canadajobbank', 'government'],
  ['reliefweb', 'government'],
  ['undpjobs', 'government'],

  // ─── Regional boards (locale-bound general boards) ──────────────────
  ['stepstone', 'regional'],
  ['swissdevjobs', 'regional'],
  ['germantechjobs', 'regional'],
  ['eurojobs', 'regional'],
  ['jobsch', 'regional'],
  ['duunitori', 'regional'],
  ['jobindex', 'regional'],
  ['berlinstartupjobs', 'regional'],
  ['jobsacuk', 'regional'],
  ['guardianjobs', 'regional'],
  ['jobsdb', 'regional'],
  ['jobstreet', 'regional'],
  ['mycareersfuture', 'regional'],
  ['jobsinjapan', 'regional'],
  ['bayt', 'regional'],
  ['naukri', 'regional'],
  ['bdjobs', 'regional'],
  ['internshala', 'regional'],
  ['infojobs', 'regional'],
  ['getonboard', 'regional'],
  ['habrcareer', 'regional'],
  ['headhunter', 'regional'],
  ['djinni', 'regional'],

  // ─── Remote-only boards ─────────────────────────────────────────────
  ['jobicy', 'remote'],
  ['himalayas', 'remote'],
  ['remoteok', 'remote'],
  ['remotive', 'remote'],
  ['arbeitnow', 'remote'],
  ['weworkremotely', 'remote'],
  ['workingnomads', 'remote'],
  ['fourdayweek', 'remote'],
  ['nodesk', 'remote'],
  ['realworkfromanywhere', 'remote'],
  ['remotefirstjobs', 'remote'],
  ['virtualvocations', 'remote'],
  ['nofluffjobs', 'remote'],

  // ─── Freelance / talent marketplaces ────────────────────────────────
  ['upwork', 'freelance'],
  ['freelancercom', 'freelance'],

  // ─── Niche / vertical boards ────────────────────────────────────────
  ['hackernews', 'niche'],
  ['landingjobs', 'niche'],
  ['findwork', 'niche'],
  ['jobdataapi', 'niche'],
  ['authenticjobs', 'niche'],
  ['cryptojobslist', 'niche'],
  ['jobspresso', 'niche'],
  ['higheredjobs', 'niche'],
  ['fossjobs', 'niche'],
  ['larajobs', 'niche'],
  ['pythonjobs', 'niche'],
  ['drupaljobs', 'niche'],
  ['golangjobs', 'niche'],
  ['wordpressjobs', 'niche'],
  ['talroo', 'niche'],
  ['joinrise', 'niche'],
  ['devitjobs', 'niche'],
  ['pyjobs', 'niche'],
  ['vuejobs', 'niche'],
  ['conservationjobs', 'niche'],
  ['coroflot', 'niche'],
  ['railsjobs', 'niche'],
  ['elixirjobs', 'niche'],
  ['crunchboard', 'niche'],
  ['cryptocurrencyjobs', 'niche'],
  ['hasjob', 'niche'],
  ['greenjobsboard', 'niche'],
  ['opensourcedesignjobs', 'niche'],
  ['academiccareers', 'niche'],
  ['androidjobs', 'niche'],
  ['iosdevjobs', 'niche'],
  ['devopsjobs', 'niche'],
  ['functionalworks', 'niche'],
  ['powertofly', 'niche'],
  ['clojurejobs', 'niche'],
  ['ecojobs', 'niche'],
  ['echojobs', 'niche'],
  ['startupjobs', 'niche'],
  ['web3career', 'niche'],
  ['builtin', 'niche'],
  ['snagajob', 'niche'],
  ['dribbble', 'niche'],
  ['themuse', 'niche'],
  ['wellfound', 'niche'],
  ['dice', 'niche'],
  ['icrunchdata', 'niche'],
  ['techcareers', 'niche'],

  // ─── General job boards (fallback tier) ─────────────────────────────
  ['linkedin', 'job-board'],
  ['indeed', 'job-board'],
  ['zip_recruiter', 'job-board'],
  ['glassdoor', 'job-board'],
  ['google', 'job-board'],
  ['simplyhired', 'job-board'],
  ['monster', 'job-board'],
  ['careerbuilder', 'job-board'],
  ['adzuna', 'job-board'],
  ['reed', 'job-board'],
  ['jooble', 'job-board'],
  ['careerjet', 'job-board'],
  ['exa', 'job-board'],
];

/**
 * Frozen Site → MergeCategory map (~150 entries). Sites not present here
 * fall back to `'job-board'` per `MergeDefaultOptions.fallbackCategory`.
 */
export const SITE_CATEGORY_DEFAULTS: ReadonlyMap<string, MergeCategory> = new Map(PAIRS);
