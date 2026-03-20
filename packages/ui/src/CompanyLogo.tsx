import React, { useState } from 'react';
import { View, Image, Text } from 'react-native';
import { useUITheme } from './theme';

interface Props {
    /** Company website URL, e.g. "https://google.com" */
    website?: string | null;
    /** Company name — used to generate initials fallback */
    name: string;
    size?: number;
}

function extractDomain(url?: string | null): string | null {
    if (!url) return null;
    try {
        const { hostname } = new URL(url.startsWith('http') ? url : `https://${url}`);
        return hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return null;
    }
}

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');
}

/** Deterministic pastel colour from company name */
function avatarColor(name: string): string {
    const COLORS = ['#6366F1', '#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#3B82F6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
    return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * CompanyLogo
 * Tries logo.clearbit.com first; falls back to coloured initials avatar.
 */
export const CompanyLogo = ({ website, name, size = 40 }: Props) => {
    const { colors } = useUITheme();
    const [failed, setFailed] = useState(false);
    const domain = extractDomain(website);
    const logoUrl = domain && !failed ? `https://logo.clearbit.com/${domain}` : null;
    const initials = getInitials(name || '?');
    const bg = avatarColor(name || '?');
    const fontSize = Math.round(size * 0.38);
    const radius = Math.round(size * 0.25);

    const containerStyle = {
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: logoUrl ? colors.surface : bg,
        overflow: 'hidden' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        borderWidth: 1,
        borderColor: colors.border,
    };

    if (logoUrl) {
        return (
            <View style={containerStyle}>
                <Image
                    source={{ uri: logoUrl }}
                    style={{ width: size, height: size }}
                    resizeMode="contain"
                    onError={() => setFailed(true)}
                />
            </View>
        );
    }

    return (
        <View style={[containerStyle, { backgroundColor: bg }]}>
            <Text style={{ fontSize, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>
                {initials}
            </Text>
        </View>
    );
};


