import { NavigatorScreenParams } from '@react-navigation/native';

export type AdminTabParamList = {
    Dashboard: undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Opportunities: NavigatorScreenParams<any> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Analytics: NavigatorScreenParams<any> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Ops: NavigatorScreenParams<any> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Settings: NavigatorScreenParams<any> | undefined;
};
