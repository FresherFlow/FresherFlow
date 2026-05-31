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
      return `whatsapp://send?text=${encodeURIComponent(message)}`;
    case 'linkedin':
      return `linkedin://shareActive?text=${encodeURIComponent(message)}`;
    case 'twitter':
      return `twitter://post?message=${encodeURIComponent(message)}`;
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
    if (await Linking.canOpenURL(deepLink)) {
      await Linking.openURL(deepLink);
      return;
    }
  } catch {
    // Fall through to the native share chooser.
  }

  await Share.share({
    message: options.message,
    url: options.url,
  });
}
