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
              JobDetail: 'opportunities/:opportunityId',
            },
          },
          Explore: {
            screens: {
              ExploreMain: 'explore',
              JobDetail: 'explore/:opportunityId',
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
              JobDetail: 'saved/:opportunityId',
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
      Auth: 'join',
    },
  },
  getStateFromPath(path, options) {
    let rewrittenPath = path;
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
