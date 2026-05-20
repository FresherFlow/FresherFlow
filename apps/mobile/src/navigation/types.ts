import { Opportunity } from '@fresherflow/types';

export type RootStackParamList = {
  // Tab Roots
  Feed: undefined;
  Explore: undefined;
  Share: { url?: string } | undefined;
  Saved: undefined;
  Profile: undefined;

  // Stack Screens
  FeedList: undefined;
  ExploreMain: undefined;
  ShareMain: { url?: string } | undefined;
  SavedList: undefined;
  ProfileMain: undefined;
  JobDetail: { opportunity?: Opportunity; job?: Opportunity; opportunityId?: string };
  Auth: { prefilledEmail?: string } | undefined;
  Main: undefined;
  EditEducation: { startInEditMode?: boolean } | undefined;
  EditSkills: { startInEditMode?: boolean } | undefined;
  EditPreferences: { startInEditMode?: boolean } | undefined;
  CareerProfile: undefined;
  MyShares: undefined;
  Dashboard: undefined;
  Invite: undefined;
  Appearance: undefined;
  AccountManage: undefined;
  Notifications: undefined;
  ContributorProfile: { userId: string };
  About: undefined;
  CompanyDetail: { companyName: string; companyLogoUrl?: string; website?: string; currentJob?: Opportunity };
  AlertSettings: undefined;
  ApplicationTracker: undefined;
  Feedback: undefined;
  Legal: undefined;
  ChooseUsername: undefined;
  OTAUpdates: undefined;
};
