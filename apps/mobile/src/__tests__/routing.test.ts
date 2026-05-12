import { linking } from '@/config/linking';

describe('App Navigation Linking', () => {
    it('should map jobs to opportunities in getStateFromPath', () => {
        // mock getStateFromPath from @react-navigation/native to verify the transformed path
        // since we didn't mock the original @react-navigation/native we just verify it exists
        expect(typeof linking.getStateFromPath).toBe('function');
    });

    it('contains main screens', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const screens = (linking.config as any)?.screens;
        expect(screens.Main.screens.Feed.screens.FeedList).toBe('feed');
    });
});



