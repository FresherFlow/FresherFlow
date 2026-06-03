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
