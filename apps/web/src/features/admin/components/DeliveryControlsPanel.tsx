"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/Card";

type DeliveryControls = {
    socialAutoPostingEnabled: boolean;
    userAlertsEnabled: boolean;
    userEmailNotificationsEnabled: boolean;
};

const DEFAULT_CONTROLS: DeliveryControls = {
    socialAutoPostingEnabled: true,
    userAlertsEnabled: true,
    userEmailNotificationsEnabled: true,
};

function ToggleRow(props: {
    title: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}) {
    const { title, description, checked, disabled, onChange } = props;

    return (
        <label className="flex items-start justify-between gap-4 rounded-lg border p-4 cursor-pointer">
            <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground max-w-xl">{description}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${checked ? "bg-primary border-primary" : "bg-muted border-border"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
                />
            </button>
        </label>
    );
}

export default function DeliveryControlsPanel() {
    const [controls, setControls] = useState<DeliveryControls>(DEFAULT_CONTROLS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await adminApi.getDeliveryControls() as DeliveryControls;
                setControls({ ...DEFAULT_CONTROLS, ...data });
            } catch {
                toast.error("Failed to load delivery controls");
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, []);

    const updateControl = async (patch: Partial<DeliveryControls>) => {
        const previous = controls;
        const next = { ...controls, ...patch };
        setControls(next);
        setSaving(true);
        try {
            const data = await adminApi.updateDeliveryControls(patch) as DeliveryControls;
            setControls({ ...DEFAULT_CONTROLS, ...data });
            toast.success("Delivery controls updated");
        } catch {
            setControls(previous);
            toast.error("Failed to update delivery controls");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="max-w-4xl">
            <CardHeader>
                <CardTitle>Broadcast and Notification Controls</CardTitle>
                <CardDescription>
                    Turn global delivery flows on or off from one place. Telegram channel posting is intentionally not controlled here.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="py-6 flex items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : (
                    <>
                        <ToggleRow
                            title="Social auto-posting"
                            description="Controls automatic posting for X, LinkedIn, and Facebook when a job is published. Telegram is excluded."
                            checked={controls.socialAutoPostingEnabled}
                            disabled={saving}
                            onChange={(checked) => { void updateControl({ socialAutoPostingEnabled: checked }); }}
                        />
                        <ToggleRow
                            title="User job alerts"
                            description="Master switch for new-job notifications to users across app alerts, push, and email."
                            checked={controls.userAlertsEnabled}
                            disabled={saving}
                            onChange={(checked) => { void updateControl({ userAlertsEnabled: checked }); }}
                        />
                        <ToggleRow
                            title="User email notifications"
                            description="Controls email delivery for user notifications only. App and push alerts can still stay on if the master user alerts switch is enabled."
                            checked={controls.userEmailNotificationsEnabled}
                            disabled={saving || !controls.userAlertsEnabled}
                            onChange={(checked) => { void updateControl({ userEmailNotificationsEnabled: checked }); }}
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Changes save immediately.
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
