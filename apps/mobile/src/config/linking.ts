import * as Linking from 'expo-linking';
import { LinkingOptions, getStateFromPath } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';
import { MOBILE_LINKING_PREFIXES } from '@/config/runtime';

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
    }
    return getStateFromPath(rewrittenPath, options);
  },
};
