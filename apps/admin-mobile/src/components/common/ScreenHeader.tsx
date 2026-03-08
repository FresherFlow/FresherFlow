import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

interface ScreenHeaderProps {
    title: string;
    rightActionComponent?: React.ReactNode;
    showBackButton?: boolean;
    onBackPress?: () => void;
    children?: React.ReactNode;
    hideTitleRow?: boolean;
    titleStyle?: object;
    compact?: boolean;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
    title,
    rightActionComponent,
    showBackButton = false,
    onBackPress,
    children,
    hideTitleRow = false,
    titleStyle,
    compact = false,
}) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const topSpacing = Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT : insets.top;
    const headerBaseHeight = compact ? (Platform.OS === 'android' ? 56 : 48) : (Platform.OS === 'android' ? 78 : 68);

    return (
        <>
            <View style={[styles.headerBackground, { backgroundColor: colors.background }]} />
            <View style={[styles.header, { paddingTop: topSpacing, backgroundColor: 'transparent' }]}>
                {!hideTitleRow && (
                    <View style={[styles.titleRow, { height: headerBaseHeight }]}>
                        <View style={styles.headerContent}>
                            {showBackButton ? (
                                <TouchableOpacity style={styles.backButton} onPress={onBackPress} activeOpacity={0.7}>
                                    <ArrowLeft size={24} color={colors.text} />
                                </TouchableOpacity>
                            ) : null}

                            <Text style={[
                                styles.headerTitle,
                                { color: colors.text },
                                compact && styles.headerTitleCompact,
                                showBackButton && styles.headerTitleWithBack,
                                titleStyle,
                            ]}>
                                {title}
                            </Text>

                            {rightActionComponent ? (
                                <View style={styles.rightActionContainer}>{rightActionComponent}</View>
                            ) : (
                                <View style={styles.rightActionPlaceholder} />
                            )}
                        </View>
                    </View>
                )}
                {children}
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    header: { paddingHorizontal: 20, zIndex: 11 },
    titleRow: { justifyContent: 'flex-end', paddingBottom: 10 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { padding: 8, marginLeft: -8, marginRight: 8 },
    headerTitle: { fontSize: 32, fontWeight: '800', letterSpacing: 0.2, flex: 1 },
    headerTitleCompact: { fontSize: 28 },
    headerTitleWithBack: { fontSize: 24, flex: 0, letterSpacing: 0.1 },
    rightActionContainer: { minWidth: 40, alignItems: 'flex-end' },
    rightActionPlaceholder: { width: 40 },
});

export default ScreenHeader;
