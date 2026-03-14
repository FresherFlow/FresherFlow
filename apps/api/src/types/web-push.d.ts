/* eslint-disable @typescript-eslint/no-unused-vars */
declare module 'web-push' {
    type PushSubscription = {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    };

    type VapidDetails = {
        subject: string;
        publicKey: string;
        privateKey: string;
    };

    function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    function sendNotification(
        subscription: PushSubscription,
        payload?: string,
        options?: Record<string, unknown>
    ): Promise<void>;
    function generateVAPIDKeys(): { publicKey: string; privateKey: string };

    const webpush: {
        setVapidDetails: typeof setVapidDetails;
        sendNotification: typeof sendNotification;
        generateVAPIDKeys: typeof generateVAPIDKeys;
    };

    export default webpush;
}

