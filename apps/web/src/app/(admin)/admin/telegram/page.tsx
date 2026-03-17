import TelegramBroadcastPanel from "@/components/admin/TelegramBroadcastPanel";
import SocialBroadcastPanel from "@/components/admin/SocialBroadcastPanel";

export const metadata = {
    title: "Broadcasts | FresherFlow Admin",
    description: "Monitor Telegram and social channel posts, and retry failed posts."
};

export default function AdminTelegramPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Channel Broadcasts</h1>
                <p className="text-muted-foreground">
                    Telegram and Social channel posting status, failures, and retry controls.
                </p>
            </div>

            <div className="bg-card border rounded-lg p-5 max-w-3xl">
                <p className="text-sm text-muted-foreground">
                    Admin alerts use <code>TELEGRAM_ADMIN_CHAT_ID</code>. Public job posts use <code>TELEGRAM_PUBLIC_CHANNEL</code>.
                </p>
            </div>

            <TelegramBroadcastPanel />
            <div className="pt-6 border-t">
                <SocialBroadcastPanel />
            </div>
        </div>
    );
}
