import TwoFactorSetup from "@/components/admin/TwoFactorSetup";
import PasskeyManager from "@/components/admin/PasskeyManager";
import { Badge } from "@/features/system/components/ui/Badge";

export const metadata = {
    title: "Admin Settings | FresherFlow",
    description: "Manage admin account settings and security."
};

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin settings</h1>
                <p className="text-muted-foreground">
                    Manage security, notifications, and account preferences.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Left Column: Two-Factor Setup */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold tracking-tight">Two-factor authentication</h2>
                            <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 text-[9px] font-bold tracking-wider uppercase">TOTP</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-normal max-w-md">
                            Secure your admin account using dynamic time-based one-time passcodes from apps like Google Authenticator or Authy.
                        </p>
                    </div>
                    <TwoFactorSetup />
                </div>

                {/* Right Column: Passkey Manager */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold tracking-tight">Passkeys</h2>
                            <Badge variant="outline" className="border-indigo-500/50 text-indigo-500 text-[9px] font-bold tracking-wider uppercase">FIDO2</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-normal max-w-md">
                            Log in securely using biometric authentication (Face ID, Touch ID, Windows Hello) or physical security keys.
                        </p>
                    </div>
                    <PasskeyManager />
                </div>
            </div>
        </div>
    );
}






