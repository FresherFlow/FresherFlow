import * as Linking from 'expo-linking';
import { LinkingOptions, getStateFromPath } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/AppNavigator';
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
    }
    return getStateFromPath(rewrittenPath, options);
  },
};
