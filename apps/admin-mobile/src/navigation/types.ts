import { NavigatorScreenParams } from '@react-navigation/native';
import { OpportunitiesStackParamList } from './OpportunitiesNavigator';
import { AnalyticsStackParamList } from './AnalyticsNavigator';
import { ModerationStackParamList } from './ModerationNavigator';
import { SettingsStackParamList } from './SettingsNavigator';

export type AdminTabParamList = {
    Dashboard: NavigatorScreenParams<AnalyticsStackParamList> | undefined;
    Opportunities: NavigatorScreenParams<OpportunitiesStackParamList> | undefined;
    PostNew: undefined;
    Feedback: NavigatorScreenParams<ModerationStackParamList> | undefined;
    Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

export type AdminStackParamList = {
    MainTabs: NavigatorScreenParams<AdminTabParamList>;
    Moderation: NavigatorScreenParams<ModerationStackParamList>;
    Insights: NavigatorScreenParams<AnalyticsStackParamList>;
    PostOpportunityModal: undefined;
};
