// import TelegramBroadcastPanel from "@/features/admin/components/TelegramBroadcastPanel";
// import SocialBroadcastPanel from "@/features/admin/components/SocialBroadcastPanel";
// import DeliveryControlsPanel from "@/features/admin/components/DeliveryControlsPanel";



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
            <div className="bg-warning/10 border border-warning/20 text-warning dark:text-warning p-4 rounded-lg">
                Broadcast panels are temporarily offline/disabled.
            </div>
        </div>
    );
}
