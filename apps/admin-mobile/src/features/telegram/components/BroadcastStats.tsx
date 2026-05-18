import React from 'react';
import { useTheme } from '../../../theme/ThemeProvider';
import { MetricGrid } from '../../analytics/components/Metrics';
import { MetricCard } from '../../system/components/SpecializedCards';

interface BroadcastStatsProps {
    sent: number;
    failed: number;
    skipped: number;
    total: number;
}

export const BroadcastStats = ({ sent, failed, skipped, total }: BroadcastStatsProps) => {
    const { currentTheme } = useTheme();
    return (
        <MetricGrid>
            <MetricCard label="Sent" value={sent} accent={currentTheme.colors.success} />
            <MetricCard label="Failed" value={failed} accent={currentTheme.colors.error} />
            <MetricCard label="Skipped" value={skipped} accent={currentTheme.colors.warning} />
            <MetricCard label="Total" value={total} accent={currentTheme.colors.primary} />
        </MetricGrid>
    );
};
