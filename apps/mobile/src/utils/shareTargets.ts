import { Linking, Share } from 'react-native';

type ShareTarget =
  | 'whatsapp'
  | 'linkedin'
  | 'twitter'
  | 'telegram'
  | 'discord'
  | 'instagram'
  | 'arattai';

type ShareTargetOptions = {
  target: ShareTarget;
  message: string;
  url: string;
};

const buildDeepLink = ({ target, message, url }: ShareTargetOptions): string => {
  switch (target) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(message)}`;
    case 'linkedin':
      return `linkedin://share?url=${encodeURIComponent(url)}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    case 'telegram':
      return `tg://msg_url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;
    case 'discord':
      return 'discord://';
    case 'instagram':
      return 'instagram://';
    case 'arattai':
      return 'arattai://';
  }
};

export function formatOpportunityShareText(
  opportunity: {
    title: string;
    company: string;
    locations?: string[];
    workMode?: string;
    salaryRange?: string;
    salaryMin?: number;
    salaryMax?: number;
    allowedPassoutYears?: number[];
  },
  shareUrl: string
): string {
  const parts: string[] = [];

  // Header line
  parts.push(`🚨 Hiring Alert: ${opportunity.title} at ${opportunity.company}`);

  // Location / Mode
  const locStr = opportunity.locations && opportunity.locations.length > 0
    ? opportunity.locations.join(', ')
    : (opportunity.workMode || 'India');
  parts.push(`📍 Location: ${locStr}${opportunity.workMode ? ` (${opportunity.workMode})` : ''}`);

  // Salary
  const sal = opportunity.salaryRange || (opportunity.salaryMin ? `₹${opportunity.salaryMin}${opportunity.salaryMax ? ` - ₹${opportunity.salaryMax}` : ''}` : null);
  if (sal) {
    parts.push(`💰 Package: ${sal}`);
  }

  // Batch Years
  if (opportunity.allowedPassoutYears && opportunity.allowedPassoutYears.length > 0) {
    parts.push(`🎓 Eligible Batches: ${opportunity.allowedPassoutYears.join(', ')}`);
  }

  // Apply Link
  parts.push(`\n👉 Apply via FresherFlow:\n${shareUrl}`);

  return parts.join('\n');
}

export async function shareToInstalledApp(options: ShareTargetOptions): Promise<void> {
  const deepLink = buildDeepLink(options);

  try {
    // Universal links (https://) will always attempt to open.
    // If the app is installed, the OS intercepts it. Otherwise, it opens the browser.
    // For custom schemes (discord://), if it fails, it will fall through to Share.share.
    await Linking.openURL(deepLink);
    return;
  } catch {
    // Fall through to the native share chooser if Linking fails.
  }

  await Share.share({
    message: options.message,
    url: options.url,
  });
}

