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

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

interface ScreenHeaderProps {
    /**
     * The main title displayed in the header
     */
    title: string;
    /**
     * Optional custom right action component
     */
    rightActionComponent?: React.ReactNode;
    /**
     * Optional back button
     */
    showBackButton?: boolean;
    /**
     * Optional callback for back button press
     */
    onBackPress?: () => void;
    /**
     * Optional children to render below the title row
     */
    children?: React.ReactNode;
    /**
     * Whether to hide the header title row
     */
    hideTitleRow?: boolean;
    /**
     * Optional custom style for title
     */
    titleStyle?: object;
    /**
     * Whether to use a more compact layout
     */
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

    // Calculate header spacing following Nuvio implementation
    const topSpacing = Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT : insets.top;
    
    // Nuvio style heights: Android 80, iOS 60
    const headerBaseHeight = compact ? 50 : (Platform.OS === 'android' ? 80 : 60);

    return (
        <>
            {/* Fixed position header background - exact Nuvio logic */}
            <View
                style={[
                    styles.headerBackground,
                    {
                        backgroundColor: colors.background,
                        height: headerBaseHeight + topSpacing,
                    },
                ]}
            />

            {/* Header Section */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: topSpacing,
                        backgroundColor: 'transparent',
                    },
                ]}
            >
                {/* Title Row */}
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
                            {showBackButton ? (
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={onBackPress}
                                    activeOpacity={0.7}
                                >
                                    <ArrowLeft size={24} color={colors.text} />
                                </TouchableOpacity>
                            ) : null}

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

                            {/* Right Action */}
                            {rightActionComponent ? (
                                <View style={styles.rightActionContainer}>{rightActionComponent}</View>
                            ) : (
                                <View style={styles.rightActionPlaceholder} />
                            )}
                        </View>
                    </View>
                )}

                {/* Children (filters, search bar, etc.) */}
                {children}
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    headerBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        // No border by default in Nuvio to maintain clean glassmorphic/flat look
    },
    header: {
        paddingHorizontal: 20, // Increased padding to match Nuvio
        zIndex: 11,
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
        fontSize: 32, // Exact Nuvio Title Size
        fontWeight: '800',
        letterSpacing: 0.5,
        flex: 1,
    },
    headerTitleCompact: {
        fontSize: 24,
    },
    headerTitleWithBack: {
        fontSize: 24,
        flex: 1, // Allow title to take space but look better with back button
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


