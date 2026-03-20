import { apiClient } from './apiClient';

export interface TelegramBroadcast {
    id: string;
    opportunityId: string | null;
    message: string;
    status: string;
    sentAt?: string | null;
    scheduledAt?: string | null;
    failedAt?: string | null;
    failureReason?: string | null;
    errorMessage?: string | null;
    retryCount: number;
    opportunity?: { title: string; company: string } | null;
}

export interface TelegramBroadcastSummary {
    sent: number;
    failed: number;
    skipped: number;
}

export const telegramsApi = {
    broadcasts: (limitOrParams?: number | { page?: number; limit?: number; status?: string; window?: '24h' | '7d' | '30d' | 'all' }) => {
        const query = new URLSearchParams();
        if (typeof limitOrParams === 'number') {
            query.append('limit', String(limitOrParams));
        } else if (limitOrParams) {
            Object.entries(limitOrParams).forEach(([key, value]) => {
                if (value !== undefined) {
                    query.append(key, String(value));
                }
            });
        }
        const queryString = query.toString();
        return apiClient<{ broadcasts: TelegramBroadcast[]; total?: number; count?: number; summary?: TelegramBroadcastSummary }>(
            `/api/admin/system/telegram-broadcasts${queryString ? `?${queryString}` : ''}`,
        );
    },

    retry: (id: string) =>
        apiClient<{ message: string }>(`/api/admin/system/telegram-broadcasts/${id}/retry`, {
            method: 'POST',
        }),
};
