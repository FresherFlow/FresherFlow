import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Platform,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { mScale, SPACING } from '../../../theme/dimensions';

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
    const { currentTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const { colors } = currentTheme;

    const topSpacing = Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT : insets.top;
    const headerBaseHeight = compact ? 50 : (Platform.OS === 'android' ? 80 : 60);

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.headerBackground,
                    {
                        backgroundColor: colors.background,
                        height: headerBaseHeight + topSpacing,
                    },
                ]}
            />

            <View
                style={[
                    styles.header,
                    {
                        paddingTop: topSpacing,
                    },
                ]}
            >
                {!hideTitleRow && (
                    <View
                        style={[
                            styles.titleRow,
                            {
                                height: headerBaseHeight,
                            },
                        ]}
                    >
                        <View style={styles.headerContent}>
                            {showBackButton && (
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={onBackPress}
                                    activeOpacity={0.7}
                                >
                                    <ArrowLeft size={24} color={colors.text} />
                                </TouchableOpacity>
                            )}

                            <Text
                                style={[
                                    styles.headerTitle,
                                    { color: colors.text },
                                    showBackButton && styles.headerTitleWithBack,
                                    compact && styles.headerTitleCompact,
                                    titleStyle,
                                ]}
                                numberOfLines={1}
                            >
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        zIndex: 10,
    },
    headerBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    header: {
        paddingHorizontal: SPACING.lg,
    },
    titleRow: {
        justifyContent: 'flex-end',
        paddingBottom: 8,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: mScale(30),
        fontWeight: '900',
        letterSpacing: -1,
        flex: 1,
    },
    headerTitleCompact: {
        fontSize: mScale(20),
    },
    headerTitleWithBack: {
        fontSize: mScale(22),
    },
    rightActionContainer: {
        minWidth: 40,
        alignItems: 'flex-end',
    },
    rightActionPlaceholder: {
        width: 40,
    },
});

export default ScreenHeader;
