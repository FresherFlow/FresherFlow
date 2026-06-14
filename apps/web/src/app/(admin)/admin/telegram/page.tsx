// import TelegramBroadcastPanel from "@/features/admin/components/TelegramBroadcastPanel";
// import SocialBroadcastPanel from "@/features/admin/components/SocialBroadcastPanel";
// import DeliveryControlsPanel from "@/features/admin/components/DeliveryControlsPanel";

export const metadata = {
    title: "Broadcasts | FresherFlow Admin",
    description: "Monitor Telegram and social channel posts, and retry failed posts."
};

export default function AdminTelegramPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Channel Broadcasts</h1>
                <p className="text-sm text-muted-foreground hidden md:block">
                    Telegram and Social channel posting status, failures, and retry controls.
                </p>
            </div>

            <div className="bg-card border rounded-lg p-5 max-w-3xl">
                <p className="text-sm text-muted-foreground">
                    Admin alerts use <code>TELEGRAM_ADMIN_CHAT_ID</code>. Public job posts use <code>TELEGRAM_PUBLIC_CHANNEL</code>.
                </p>
            </div>

            {/* <DeliveryControlsPanel /> */}
            {/* <TelegramBroadcastPanel /> */}
            {/* <div className="pt-6 border-t"> */}
            {/*     <SocialBroadcastPanel /> */}
            {/* </div> */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 p-4 rounded-lg">
                Broadcast panels are temporarily offline/disabled.
            </div>
        </div>
    );
}
