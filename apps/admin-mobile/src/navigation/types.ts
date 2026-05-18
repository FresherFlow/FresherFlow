import { NavigatorScreenParams } from '@react-navigation/native';
import { OpportunitiesStackParamList } from './OpportunitiesNavigator';
import { AnalyticsStackParamList } from './AnalyticsNavigator';
import { OpsStackParamList } from './OpsNavigator';
import { SettingsStackParamList } from './SettingsNavigator';

export type AdminTabParamList = {
    Home: undefined;
    Signals: NavigatorScreenParams<OpportunitiesStackParamList> | undefined;
    Submissions: undefined;
    Identity: undefined;
    Post: undefined;
    Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

export type AdminStackParamList = {
    MainTabs: NavigatorScreenParams<AdminTabParamList>;
    Moderation: NavigatorScreenParams<OpsStackParamList>;
    Insights: NavigatorScreenParams<AnalyticsStackParamList>;
};
