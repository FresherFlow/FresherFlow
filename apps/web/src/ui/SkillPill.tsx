'use client';

import { cn } from '@/lib/utils/utils';
import * as si from 'simple-icons';

// Canonical map: skill label → simple-icons slug
export const SKILL_ICON_MAP: Record<string, { icon: si.SimpleIcon; colorHex: string | null }> = {
  'React':             { icon: si.siReact,          colorHex: '#61DAFB' },
  'React Native':      { icon: si.siReact,          colorHex: '#61DAFB' },
  'TypeScript':        { icon: si.siTypescript,     colorHex: '#3178C6' },
  'JavaScript':        { icon: si.siJavascript,     colorHex: '#F7DF1E' },
  'Python':            { icon: si.siPython,         colorHex: '#3776AB' },
  'NodeJS':            { icon: si.siNodedotjs,      colorHex: '#339933' },
  'NextJS':            { icon: si.siNextdotjs,      colorHex: null },      // null = use foreground color
  'Angular':           { icon: si.siAngular,        colorHex: '#DD0031' },
  'VueJS':             { icon: si.siVuedotjs,       colorHex: '#4FC08D' },
  'Django':            { icon: si.siDjango,         colorHex: '#092E20' },
  'PHP':               { icon: si.siPhp,            colorHex: '#777BB4' },
  'Ruby':              { icon: si.siRuby,           colorHex: '#CC342D' },
  'Golang':            { icon: si.siGo,             colorHex: '#00ADD8' },
  '.NET':              { icon: si.siDotnet,         colorHex: '#512BD4' },
  'Kotlin':            { icon: si.siKotlin,         colorHex: '#7F52FF' },
  'Swift':             { icon: si.siSwift,          colorHex: '#F05138' },
  'Android':           { icon: si.siAndroid,        colorHex: '#3DDC84' },
  'iOS':               { icon: si.siIos,            colorHex: null },
  'Docker':            { icon: si.siDocker,         colorHex: '#2496ED' },
  'Kubernetes':        { icon: si.siKubernetes,     colorHex: '#326CE5' },
  'GraphQL':           { icon: si.siGraphql,        colorHex: '#E10098' },
  'PostgreSQL':        { icon: si.siPostgresql,     colorHex: '#4169E1' },
  'MySQL':             { icon: si.siMysql,          colorHex: '#4479A1' },
  'MongoDB':           { icon: si.siMongodb,        colorHex: '#47A248' },
  'Redis':             { icon: si.siRedis,          colorHex: '#DC382D' },
  'Linux':             { icon: si.siLinux,          colorHex: null },
  'Scala':             { icon: si.siScala,          colorHex: '#DC322F' },
  'Shopify':           { icon: si.siShopify,        colorHex: '#96BF48' },
  'GCP':               { icon: si.siGooglecloud,    colorHex: '#4285F4' },
  'Figma':             { icon: si.siFigma,          colorHex: '#F24E1E' },
  'Rust':              { icon: si.siRust,           colorHex: null },
  'SQL':               { icon: si.siMysql,          colorHex: '#4479A1' },
  'Vercel':            { icon: si.siVercel,         colorHex: null },
  'Tailwind':          { icon: si.siTailwindcss,    colorHex: '#06B6D4' },
  'Tailwind CSS':      { icon: si.siTailwindcss,    colorHex: '#06B6D4' },
  'Svelte':            { icon: si.siSvelte,         colorHex: '#FF3E00' },
  'NuxtJS':            { icon: si.siNuxt,           colorHex: '#00C58E' },
  'NestJS':            { icon: si.siNestjs,         colorHex: '#E0234E' },
  'Express':           { icon: si.siExpress,        colorHex: null },
  'Spring Boot':       { icon: si.siSpringboot,     colorHex: '#6DB33F' },
  'Laravel':           { icon: si.siLaravel,        colorHex: '#FF2D20' },
  'Ruby on Rails':     { icon: si.siRubyonrails,    colorHex: '#CC0000' },
  'Flask':             { icon: si.siFlask,          colorHex: null },
  'FastAPI':           { icon: si.siFastapi,        colorHex: '#009688' },
  'HTML5':             { icon: si.siHtml5,          colorHex: '#E34F26' },
  'CSS3':              { icon: si.siCss,            colorHex: '#1572B6' },
  'Sass':              { icon: si.siSass,           colorHex: '#CC6699' },
  'Less':              { icon: si.siLess,           colorHex: '#1D365D' },
  'Bootstrap':         { icon: si.siBootstrap,      colorHex: '#7952B3' },
  'Material UI':       { icon: si.siMui,            colorHex: '#007FFF' },
  'Chakra UI':         { icon: si.siChakraui,       colorHex: '#319795' },
  'Redux':             { icon: si.siRedux,          colorHex: '#764ABC' },
  'Zustand':           { icon: si.siReact,          colorHex: null },
  'MobX':              { icon: si.siMobx,           colorHex: '#FF9955' },
  'RxJS':              { icon: si.siReactivex,      colorHex: '#B7178C' },
  'Webpack':           { icon: si.siWebpack,        colorHex: '#8DD6F9' },
  'Vite':              { icon: si.siVite,           colorHex: '#646CFF' },
  'Rollup':            { icon: si.siRollupdotjs,    colorHex: '#EC4A3F' },
  'Babel':             { icon: si.siBabel,          colorHex: '#F9DC3E' },
  'Jest':              { icon: si.siJest,           colorHex: '#C21325' },
  'Cypress':           { icon: si.siCypress,        colorHex: '#17202C' },
  'Vitest':            { icon: si.siVite,           colorHex: '#FCC72B' },
  'Mocha':             { icon: si.siMocha,          colorHex: '#8D6748' },
  'Elasticsearch':     { icon: si.siElasticsearch,  colorHex: '#005571' },
  'Firebase':          { icon: si.siFirebase,       colorHex: '#FFCA28' },
  'Supabase':          { icon: si.siSupabase,       colorHex: '#3ECF8E' },
  'Prisma':            { icon: si.siPrisma,         colorHex: '#2D3748' },
  'Sequelize':         { icon: si.siSequelize,      colorHex: '#52B0E7' },
  'SQLite':            { icon: si.siSqlite,         colorHex: '#003B57' },
  'Cassandra':         { icon: si.siApachecassandra,colorHex: '#1287B1' },
  'Neo4j':             { icon: si.siNeo4j,          colorHex: '#008CC1' },
  'RabbitMQ':          { icon: si.siRabbitmq,       colorHex: '#FF6600' },
  'Kafka':             { icon: si.siApachekafka,    colorHex: '#231F20' },
  'Nginx':             { icon: si.siNginx,          colorHex: '#009639' },
  'Apache':            { icon: si.siApache,         colorHex: '#D22128' },
  'Jenkins':           { icon: si.siJenkins,        colorHex: '#D33833' },
  'GitHub Actions':    { icon: si.siGithubactions,  colorHex: '#2088FF' },
  'GitLab CI':         { icon: si.siGitlab,         colorHex: '#FC6D26' },
  'CircleCI':          { icon: si.siCircleci,       colorHex: '#343434' },
  'Travis CI':         { icon: si.siTravisci,       colorHex: '#3EAAAF' },
  'Terraform':         { icon: si.siTerraform,      colorHex: '#7B42BC' },
  'Ansible':           { icon: si.siAnsible,        colorHex: '#EE0000' },
  'Puppet':            { icon: si.siPuppet,         colorHex: '#FFAE1A' },
  'Chef':              { icon: si.siChef,           colorHex: '#F09820' },
  'Ubuntu':            { icon: si.siUbuntu,         colorHex: '#E95420' },
  'CentOS':            { icon: si.siCentos,         colorHex: '#262577' },
  'Debian':            { icon: si.siDebian,         colorHex: '#A81D33' },
  'macOS':             { icon: si.siApple,          colorHex: null },
  'Git':               { icon: si.siGit,            colorHex: '#F05032' },
  'GitHub':            { icon: si.siGithub,         colorHex: null },
  'GitLab':            { icon: si.siGitlab,         colorHex: '#FC6D26' },
  'Bitbucket':         { icon: si.siBitbucket,      colorHex: '#0052CC' },
  'Jira':              { icon: si.siJira,           colorHex: '#0052CC' },
  'Confluence':        { icon: si.siConfluence,     colorHex: '#172B4D' },
  'Discord':           { icon: si.siDiscord,        colorHex: '#5865F2' },
  'Notion':            { icon: si.siNotion,         colorHex: null },
  'Trello':            { icon: si.siTrello,         colorHex: '#0052CC' },
  'Asana':             { icon: si.siAsana,          colorHex: '#273347' },
  'Framer':            { icon: si.siFramer,         colorHex: '#0055FF' },
  'Sketch':            { icon: si.siSketch,         colorHex: '#F7B500' },
  'Blender':           { icon: si.siBlender,        colorHex: '#F5792A' },
  'Unity':             { icon: si.siUnity,          colorHex: null },
  'Unreal Engine':     { icon: si.siUnrealengine,   colorHex: null },
  'Data Structures':   { icon: si.siCodeblocks,     colorHex: null },
  'Testing':           { icon: si.siTestinglibrary, colorHex: null },
  'Junit':             { icon: si.siJunit5,         colorHex: null },
  'Snowflake':         { icon: si.siSnowflake,      colorHex: null },
  'Scikit-learn':      { icon: si.siScikitlearn,    colorHex: null },
  'NumPy':             { icon: si.siNumpy,          colorHex: null },
  'C++':               { icon: si.siCplusplus,      colorHex: '#00599C' },
  'C-plus-plus':       { icon: si.siCplusplus,      colorHex: '#00599C' },
  'Node.js':           { icon: si.siNodedotjs,      colorHex: '#339933' },
  'Node-js':           { icon: si.siNodedotjs,      colorHex: '#339933' },
  'HTML/CSS':          { icon: si.siHtml5,          colorHex: '#E34F26' },
  'HTML-CSS':          { icon: si.siHtml5,          colorHex: '#E34F26' },
};


interface SkillPillProps {
  skill: string;
  className?: string;
  size?: 'sm' | 'xs';
}

export function SkillPill({ skill, className, size = 'sm' }: SkillPillProps) {
  const normalizedSkill = skill.toLowerCase();
  
  // 1. Exact match
  let entry = Object.entries(SKILL_ICON_MAP).find(([key]) => key.toLowerCase() === normalizedSkill)?.[1];
  
  // 2. Partial match fallback
  if (!entry) {
    entry = Object.entries(SKILL_ICON_MAP).find(([key]) => normalizedSkill.includes(key.toLowerCase()))?.[1];
  }

  if (entry) {
    const { icon, colorHex } = entry;
    const color = colorHex || 'currentColor';
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-transparent font-medium whitespace-nowrap',
          size === 'xs' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]',
          'bg-muted/60 text-foreground/80',
          className
        )}
      >
        <svg
          role="img"
          viewBox="0 0 24 24"
          className={size === 'xs' ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'}
          style={{ fill: color }}
          aria-label={icon.title}
        >
          <path d={icon.path} />
        </svg>
        {skill}
      </span>
    );
  }

  // Fallback: no icon, just text pill
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border/50 font-medium whitespace-nowrap bg-muted/40 text-muted-foreground',
        size === 'xs' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]',
        className
      )}
    >
      {skill}
    </span>
  );
}
