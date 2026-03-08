import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Info, Monitor, MessageSquare, ChevronRight, ExternalLink, RefreshCw, Server, Send } from 'lucide-react-native';
import { ThemeColors } from '../../theme';
import { OtaState } from '../../hooks/useOtaManager';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../navigation/SettingsNavigator';

type BuildInfoSectionProps = {
    colors: ThemeColors;
    otaState: OtaState;
    onCheckUpdate: () => void;
};

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList>;

export const BuildInfoSection = React.memo(({ colors: c, otaState, onCheckUpdate: _onCheckUpdate }: BuildInfoSectionProps) => {
    const navigation = useNavigation<NavigationProp>();

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Info size={16} color={c.textMuted} />
                <Text style={[styles.sectionTitle, { color: c.textMuted }]}>APP & BUILD</Text>
            </View>

            <View style={[styles.listCard, { backgroundColor: c.surface, borderColor: c.border }]}>

                {/* System Ops */}
                <TouchableOpacity
                    style={[styles.listRow]}
                    onPress={() => navigation.navigate('SystemOverview')}
                >
                    <Server size={18} color={c.textMuted} />
                    <View style={styles.listTextContainer}>
                        <Text style={[styles.listLabel, { color: c.text }]}>System Status</Text>
                        <Text style={[styles.listDesc, { color: c.textMuted }]}>View ops and server health</Text>
                    </View>
                    <ChevronRight size={20} color={c.textMuted} />
                </TouchableOpacity>

                {/* Telegram */}
                <TouchableOpacity
                    style={[styles.listRow, { borderTopWidth: 1, borderTopColor: c.border }]}
                    onPress={() => navigation.navigate('TelegramBroadcasts')}
                >
                    <Send size={18} color={c.textMuted} />
                    <View style={styles.listTextContainer}>
                        <Text style={[styles.listLabel, { color: c.text }]}>Telegram Broadcasts</Text>
                    </View>
                    <ChevronRight size={20} color={c.textMuted} />
                </TouchableOpacity>

                {/* App Info */}
                <TouchableOpacity
                    style={[styles.listRow, { borderTopWidth: 1, borderTopColor: c.border }]}
                    onPress={() => navigation.navigate('AppInfo')}
                >
                    <Monitor size={18} color={c.textMuted} />
                    <View style={styles.listTextContainer}>
                        <Text style={[styles.listLabel, { color: c.text }]}>App Information</Text>
                        <Text style={[styles.listDesc, { color: c.textMuted }]}>Version {otaState.appVersion}</Text>
                    </View>
                    <ChevronRight size={20} color={c.textMuted} />
                </TouchableOpacity>

                {/* OTA Check Action */}
                <TouchableOpacity
                    style={[styles.listRow, { borderTopWidth: 1, borderTopColor: c.border }]}
                    onPress={() => navigation.navigate('OTAUpdates')}
                >
                    <RefreshCw size={18} color={c.textMuted} />
                    <View style={styles.listTextContainer}>
                        <Text style={[styles.listLabel, { color: c.text }]}>Check for Updates</Text>
                        <Text style={[styles.listDesc, { color: c.textMuted }]}>
                            {otaState.statusText || 'Manage OTA updates'}
                        </Text>
                    </View>
                    <ChevronRight size={20} color={c.textMuted} />
                </TouchableOpacity>

                {/* Feedback Link */}
                <TouchableOpacity
                    style={[styles.listRow, { borderTopWidth: 1, borderTopColor: c.border }]}
                    onPress={() => Linking.openURL('mailto:admin@fresherflow.in?subject=Admin App Feedback')}
                >
                    <MessageSquare size={18} color={c.textMuted} />
                    <View style={styles.listTextContainer}>
                        <Text style={[styles.listLabel, { color: c.text }]}>Send Feedback</Text>
                        <Text style={[styles.listDesc, { color: c.textMuted }]}>Report issues or suggest features</Text>
                    </View>
                    <ExternalLink size={16} color={c.textMuted} />
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginLeft: 8,
    },
    listCard: {
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    listTextContainer: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    listLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    listDesc: {
        fontSize: 13,
        marginTop: 2,
    },
});
