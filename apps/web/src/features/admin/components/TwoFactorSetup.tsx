"use client";

import { useState, useEffect } from "react";
import { adminAuthApi } from "@/shared/api/client";
import { toast } from "sonner";
import { Button } from "@/features/system/components/ui/Button";
import { Input } from "@/features/system/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/features/system/components/ui/Card";
import { ShieldCheck, Loader2, Smartphone } from "lucide-react";
import Image from "next/image";

export default function TwoFactorSetup() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [setupStep, setSetupStep] = useState<"initial" | "qr" | "verify">("initial");
    const [qrCode, setQrCode] = useState<string>("");
    const [secret, setSecret] = useState<string>("");
    const [verificationCode, setVerificationCode] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const { admin } = await adminAuthApi.me();
            setIsEnabled(admin?.isTwoFactorEnabled || false);
        } catch {
            console.error("Failed to check 2FA status");
        } finally {
            setLoading(false);
        }
    };

    const handleEnable = async () => {
        setSubmitting(true);
        try {
            const data = await adminAuthApi.generateTotp() as { qrCode: string; secret: string };
            setQrCode(data.qrCode);
            setSecret(data.secret);
            setSetupStep("qr");
        } catch {
            toast.error("Failed to generate 2FA secret");
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerify = async () => {
        if (!verificationCode) return;
        setSubmitting(true);
        try {
            await adminAuthApi.verifyTotp(verificationCode);
            toast.success("Two-factor authentication enabled successfully");
            setIsEnabled(true);
            setSetupStep("initial");
        } catch {
            toast.error("Invalid verification code");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDisable = async () => {
        if (!confirm("Are you sure you want to disable 2FA? This will reduce your account security.")) return;
        setSubmitting(true);
        try {
            await adminAuthApi.disableTotp();
            toast.success("Two-factor authentication disabled");
            setIsEnabled(false);
        } catch {
            toast.error("Failed to disable 2FA");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Card className="max-w-xl">
                <CardContent className="p-6 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className={`h-5 w-5 ${isEnabled ? "text-green-500" : "text-muted-foreground"}`} />
                            Two-Factor Authentication
                        </CardTitle>
                        <CardDescription>
                            Secure your account with an authenticator app (Google Authenticator, Authy).
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isEnabled ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-500/10 border-green-500/20">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500/20 p-2 rounded-full">
                                <ShieldCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-sm text-green-700">2FA is enabled</p>
                                <p className="text-xs text-green-600/80">Your account is protected.</p>
                            </div>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDisable}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable"}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {setupStep === "initial" && (
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                        <Smartphone className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Authenticator App</p>
                                        <p className="text-xs text-muted-foreground">Use an app to generate codes.</p>
                                    </div>
                                </div>
                                <Button onClick={handleEnable} disabled={submitting} size="sm">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Enable"}
                                </Button>
                            </div>
                        )}

                        {setupStep === "qr" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-white">
                                    {qrCode && (
                                        <Image
                                            src={qrCode}
                                            alt="QR Code"
                                            width={192}
                                            height={192}
                                            className="mb-4"
                                        />
                                    )}
                                    <p className="text-xs text-center text-muted-foreground break-all max-w-[200px]">
                                        Secret: <span className="font-mono select-all">{secret}</span>
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Enter verification code</p>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="123456"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            maxLength={6}
                                            className="font-mono tracking-widest text-center text-lg"
                                        />
                                        <Button onClick={handleVerify} disabled={submitting || verificationCode.length !== 6}>
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-muted-foreground"
                                        onClick={() => setSetupStep("initial")}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}






