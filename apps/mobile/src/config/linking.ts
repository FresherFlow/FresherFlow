import * as Linking from 'expo-linking';
import { LinkingOptions, getStateFromPath } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import { MOBILE_LINKING_PREFIXES } from '@/utils/runtime';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'fresherflow://', ...MOBILE_LINKING_PREFIXES],
  config: {
    screens: {
      Main: {
        screens: {
          Feed: {
            screens: {
              FeedList: 'feed',
            },
          },
          Explore: {
            screens: {
              ExploreMain: 'explore',
            },
          },
          Share: {
            screens: {
              ShareMain: 'share',
            },
          },
          Saved: {
            screens: {
              SavedList: 'saved',
            },
          },
          Profile: {
            screens: {
              ProfileMain: 'profile',
              EditEducation: 'profile/education',
              EditSkills: 'profile/skills',
              EditPreferences: 'profile/preferences',
            },
          },
        },
      },
      JobDetail: 'opportunities/:opportunityId',
      Auth: 'join',
    },
  },
  getStateFromPath(path, options) {
    let rewrittenPath = path;
    if (rewrittenPath && !rewrittenPath.startsWith('/')) {
      rewrittenPath = '/' + rewrittenPath;
    }

    // Parse query params for referral codes/IDs (e.g. ?ref=XYZ, ?referral=XYZ, ?referralId=XYZ, ?referralCode=XYZ)
    if (rewrittenPath.includes('?')) {
      try {
        const queryStr = rewrittenPath.split('?')[1];
        if (queryStr) {
          const params = queryStr.split('&');
          let foundCode: string | null = null;
          for (const param of params) {
            const [key, val] = param.split('=');
            if (key === 'ref' || key === 'referral' || key === 'referralId' || key === 'referralCode') {
              foundCode = val;
              break;
            }
          }
          if (foundCode) {
            import('@/store/useAuthStore').then(({ useAuthStore }) => {
              useAuthStore.getState().setReferralCode(foundCode.toUpperCase());
            });
          }
        }
      } catch (err) {
        console.warn('[Linking] Failed to parse query params for referral:', err);
      }
    }

    const cleanPath = rewrittenPath.split('?')[0].replace(/^\/+/, '');
    const firstSegment = cleanPath.split('/')[0];
    
    // Check if it's a web-only page and open in browser
    const WEB_ONLY_ROUTES = [
      'about',
      'contact',
      'blog',
      'companies',
      'deadlines',
      'feedback',
      'privacy',
      'terms',
      'api',
      'dev',
      'government-jobs',
      'walk-ins',
      'walkins'
    ];

    if (WEB_ONLY_ROUTES.includes(firstSegment)) {
      // Exclude detail subpaths like /walk-ins/details/xyz or /walkins/details/xyz from being treated as web-only
      const segments = cleanPath.split('/');
      const isWalkinDetail = (firstSegment === 'walk-ins' || firstSegment === 'walkins') && segments[1] === 'details';

      if (!isWalkinDetail) {
        console.log('[Linking] Web-only route detected. Opening in WebBrowser:', rewrittenPath);
        const appEnv = process.env.EXPO_PUBLIC_APP_ENV || Constants.expoConfig?.extra?.appEnv || 'development';
        const host = appEnv === 'staging' ? 'staging.fresherflow.in' : 'fresherflow.in';
        void WebBrowser.openBrowserAsync(`https://${host}/${cleanPath}`);
        return undefined;
      }
    }

    // Normalize share links
    if (rewrittenPath.startsWith('/jobs/')) {
      rewrittenPath = rewrittenPath.replace('/jobs/', '/opportunities/');
    } else if (rewrittenPath.startsWith('/internships/')) {
      rewrittenPath = rewrittenPath.replace('/internships/', '/opportunities/');
    } else if (rewrittenPath.startsWith('/walk-ins/details/')) {
      rewrittenPath = rewrittenPath.replace('/walk-ins/details/', '/opportunities/');
    } else if (rewrittenPath.startsWith('/walkins/details/')) {
      rewrittenPath = rewrittenPath.replace('/walkins/details/', '/opportunities/');
    } else if (rewrittenPath.startsWith('/r/')) {
      // Capture referral code
      const code = rewrittenPath.split('/r/')[1]?.split('?')[0];
      if (code) {
        import('@/store/useAuthStore').then(({ useAuthStore }) => {
          useAuthStore.getState().setReferralCode(code.toUpperCase());
        });
      }
      // Redirect to Feed or Auth depending on where we want the user to land
      rewrittenPath = '/feed'; 
    } else if (['opportunities', 'jobs', 'internships', 'walk-ins', 'walkins'].includes(cleanPath)) {
      rewrittenPath = '/feed';
    } else {
      // Handle simplified canonical paths (e.g. /amazon-job -> /opportunities/amazon-job)
      const reservedRoutes = [
        'feed',
        'explore',
        'share',
        'saved',
        'profile',
        'join',
        'r',
        'jobs',
        'internships',
        'walk-ins',
        'walkins',
        'opportunities'
      ];

      if (cleanPath && !cleanPath.includes('/') && !reservedRoutes.includes(cleanPath)) {
        rewrittenPath = `/opportunities/${cleanPath}` + (rewrittenPath.includes('?') ? '?' + rewrittenPath.split('?')[1] : '');
        console.log('[Linking] Simplified path rewritten to:', rewrittenPath);
      }
    }

    const state = getStateFromPath(rewrittenPath, options);
    if (state && state.routes) {
      const hasMain = state.routes.some(r => r.name === 'Main');
      if (!hasMain) {
        state.routes.unshift({
          name: 'Main'
        } as any);
      }
    }
    return state;
  },
};
