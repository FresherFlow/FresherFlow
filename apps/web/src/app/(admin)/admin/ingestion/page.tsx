import IngestionPanel from "@/components/admin/IngestionPanel";
import { notFound } from "next/navigation";

const isIngestionEnabled =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_ADMIN_INGESTION === "true";

export const metadata = {
    title: "Ingestion | FresherFlow Admin",
    description: "Manage ATS feed sources and monitor the fresher job ingestion pipeline.",
};

export default function AdminIngestionPage() {
    if (!isIngestionEnabled) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Ingestion</h1>
                <p className="text-muted-foreground">
                    ATS feeds -&gt; Supabase staging -&gt; fresher filter -&gt; Neon drafts.
                </p>
            </div>
            <IngestionPanel />
        </div>
    );
}
