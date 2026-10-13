import { SocialPlatform } from '@prisma/client';
import { buildSocialCaption } from '@fresherflow/utils';

interface CaptionInput {
  title: string;
  company: string;
  type: string;
  locations: string[];
  applyLink: string;
  salaryRange?: string | null;
}

// Single-job post captions share one voice across every bot
// (@fresherflow/utils/social). Stored SocialPost text follows it too —
// salary/type lines from the old format are intentionally retired.
const PLATFORM_MAP: Record<SocialPlatform, 'x' | 'linkedin' | 'facebook'> = {
  X: 'x',
  LINKEDIN: 'linkedin',
  FACEBOOK: 'facebook',
};

export function buildCaption(input: CaptionInput, platform: SocialPlatform): string {
  return buildSocialCaption(
    {
      title: input.title,
      company: input.company,
      locations: input.locations,
      applyLink: input.applyLink,
    },
    PLATFORM_MAP[platform],
  );
}
