import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/utils/error';
import { feedbackApi } from '@/lib/api/client';
import { type Opportunity } from '@fresherflow/types';

export function useOpportunityReport(opp: Opportunity | null, user: any) {
    const router = useRouter();
    const [showReports, setShowReports] = useState(false);

    const handleReport = async (reason: string) => {
        if (!user || !opp) {
            toastError(new Error('Identity required to file report.'));
            if (!user) router.push('/login');
            return;
        }

        const loadingToast = toast.loading('Submitting report...');
        try {
            const data = await feedbackApi.submit(opp.id, reason) as { success: boolean; message?: string };
            if (data.success) {
                toast.success('Thank you for your feedback', { id: loadingToast });
                setShowReports(false);
            } else {
                toastError(new Error(data.message || 'Unknown error'), 'Report failed.', { id: loadingToast });
            }
        } catch (err: unknown) {
            toastError(err, 'Report failed.', { id: loadingToast });
        }
    };

    return {
        showReports,
        setShowReports,
        handleReport
    };
}
