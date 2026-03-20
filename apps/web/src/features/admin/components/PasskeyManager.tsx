"use client";

import { useEffect, useState } from "react";
import { adminAuthApi } from "@/shared/api/client";
import { startRegistration } from "@simplewebauthn/browser";
import { Loader2, Plus, Trash2, Key } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/features/system/components/ui/Card";
import { Button } from "@/features/system/components/ui/Button";

interface Passkey {
    id: string;
    name: string;
}

export default function PasskeyManager() {
    const [keys, setKeys] = useState<Passkey[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        try {
            const data = await adminAuthApi.getPasskeys() as { keys: Passkey[] };
            setKeys(data.keys);
        } catch (error) {
            console.error("Failed to load passkeys:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPasskey = async () => {
        setRegistering(true);
        try {
            // 1. Get Options (we send a special 'bootstrap' email or rely on session)
            // Ideally we'd have a specific 'add-device' endpoint, but 'register/options' 
            // is smart enough to handle authenticated requests now if configured correctly.
            // For now, we will assume the admin email is available or stored.
            // A better approach is to not require email in body if already logged in.
            // But let's try with the hardcoded admin email or fetch it from context if avail.
            // Since I don't have the context here, I will fetch 'me' first or just prompt.

            // Actually, best specific route for adding a key while logged in:
            // The API route `register/options` expects `email` in body.
            // We can get it from the user.

            // Let's assume for this MVP we know the admin email or the API can infer it.
            // Wait - the API `register/options` strictly checks `req.body.email === ADMIN_EMAIL`.
            // So we must send it.
            const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL!;

            const options = await adminAuthApi.getRegistrationOptions(ADMIN_EMAIL);
            const credential = await startRegistration({ optionsJSON: options });
            const verification = await adminAuthApi.verifyRegistration(ADMIN_EMAIL, credential);

            if (verification.verified) {
                toast.success("New passkey added successfully!");
                loadKeys(); // Refresh list
            } else {
                toast.error("Verification failed");
            }
        } catch (error: unknown) {
            console.error("Passkey registration error:", error);
            const message = error instanceof Error ? error.message : "Failed to add passkey";
            toast.error(message);
        } finally {
            setRegistering(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to remove this passkey?")) return;

        try {
            await adminAuthApi.deletePasskey(id);
            toast.success("Passkey removed");
            setKeys(keys.filter(k => k.id !== id));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to remove passkey";
            toast.error(message);
        }
    };

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-primary" />
                            Passkeys
                        </CardTitle>
                        <CardDescription>
                            Manage your biometric and security key access.
                        </CardDescription>
                    </div>
                    <Button onClick={handleAddPasskey} disabled={registering} size="sm">
                        {registering ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Plus className="h-4 w-4 mr-2" />
                        )}
                        Add Key
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : keys.length === 0 ? (
                    <div className="text-center p-4 text-muted-foreground text-sm">
                        No passkeys found. Add one to secure your account.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {keys.map((key) => (
                            <div
                                key={key.id}
                                className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                        <Key className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{key.name}</p>
                                        <p className="text-xs text-muted-foreground">ID: {key.id.slice(0, 8)}...</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(key.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}






