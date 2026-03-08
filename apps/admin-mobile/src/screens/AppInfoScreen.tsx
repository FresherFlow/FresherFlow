import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Monitor, Info } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useOtaManager } from '../hooks/useOtaManager';
import { ThemeColors } from '../theme';

const createStyles = (c: ThemeColors) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: c.background,
    },
    content: {
        padding: 16,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
    },
    value: {
        fontSize: 15,
        fontFamily: 'monospace',
    },
});

export const AppInfoScreen = () => {
    const { colors: c } = useTheme();
    const s = createStyles(c);
    const ota = useOtaManager();

    return (
        <ScrollView style={s.screen} contentContainerStyle={s.content}>
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>

                <View style={[s.row, { borderBottomColor: c.border }]}>
                    <Monitor size={18} color={c.textMuted} />
                    <View style={s.textContainer}>
                        <Text style={[s.label, { color: c.text }]}>App Version</Text>
                    </View>
                    <Text style={[s.value, { color: c.textMuted }]}>{ota.state.appVersion}</Text>
                </View>

                <View style={[s.row, { borderBottomColor: c.border }]}>
                    <Info size={18} color={c.textMuted} />
                    <View style={s.textContainer}>
                        <Text style={[s.label, { color: c.text }]}>OTA Channel</Text>
                    </View>
                    <Text style={[s.value, { color: c.textMuted }]}>{ota.state.channel}</Text>
                </View>

                <View style={[s.row, { borderBottomColor: c.border, borderBottomWidth: 0 }]}>
                    <Monitor size={18} color={c.textMuted} />
                    <View style={s.textContainer}>
                        <Text style={[s.label, { color: c.text }]}>Update ID</Text>
                    </View>
                    <Text style={[s.value, { color: c.textMuted }]}>{ota.state.updateId}</Text>
                </View>
            </View>
        </ScrollView>
    );
};
