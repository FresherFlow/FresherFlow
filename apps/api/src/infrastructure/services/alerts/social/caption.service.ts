import { SocialPlatform } from '@prisma/client';

interface CaptionInput {
  title: string;
  company: string;
  type: string;
  locations: string[];
  applyLink: string;
  salaryRange?: string | null;
}

const HASHTAGS: Record<SocialPlatform, string> = {
  X: '#Hiring #Fresher #Jobs',
  LINKEDIN: '#Hiring #FresherJobs #Careers #JobOpening',
  FACEBOOK: '#Hiring #Jobs #FreshersHiring',
};

const MAX_CAPTION_LENGTH: Record<SocialPlatform, number> = {
  X: 260,
  LINKEDIN: 2800,
  FACEBOOK: 2000,
};

export function buildCaption(input: CaptionInput, platform: SocialPlatform): string {
  const { title, company, type, locations, applyLink, salaryRange } = input;

  const locationText = locations.slice(0, 3).join(' / ');
  const salary = salaryRange ? `💰 ${salaryRange}` : '';
  const tags = HASHTAGS[platform];

  const footer = `\n\n🔗 Apply: ${applyLink}\n\n${tags}`;
  const header = [
    `🚀 ${title} @ ${company}`,
    `📂 ${type} | 📍 ${locationText}`,
    salary,
  ].filter(Boolean).join('\n');

  const maxLen = MAX_CAPTION_LENGTH[platform];

  if (header.length + footer.length <= maxLen) {
    return header + footer;
  }

  // If too long, truncate the header (descriptive part)
  const availableHeaderLen = maxLen - footer.length - 3; // -3 for '...'
  if (availableHeaderLen > 20) {
    return header.slice(0, availableHeaderLen) + '...' + footer;
  }

  // Extreme case: footer itself is too long for platform (unlikely but possible with huge URLs/X)
  // Just ensure the link is there even if hashtags are cut
  const minimalFooter = `\n\n🔗 Apply: ${applyLink}`;
  const extremeHeaderLen = maxLen - minimalFooter.length - 3;
  if (extremeHeaderLen > 10) {
    return header.slice(0, extremeHeaderLen) + '...' + minimalFooter;
  }

  // Fallback: Just the link if even that is hitting limits
  return `🔗 Apply: ${applyLink}`.slice(0, maxLen);
}
