import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { FlatList, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Check, Moon, Sun, Edit2, Trash2, Plus, ArrowLeft } from 'lucide-react-native';
import ColorPicker from 'react-native-wheel-color-picker';

import { useTheme } from '../theme/ThemeProvider';
import ScreenHeader from '../components/common/ScreenHeader';
import { CustomSwitch, SettingsCard, SettingsHint } from '../components/settings/SettingsComponents';
import type { Theme } from '../theme';

const THEME_FILTERS = [
    { id: 'all', label: 'All Themes' },
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'custom', label: 'My Themes' },
];

type ColorKey = 'primary' | 'secondary' | 'darkBackground';

interface ThemeColorEditorProps {
    initialColors: { primary: string; secondary: string; darkBackground: string };
    initialName?: string;
    onSave: (colors: { primary: string; secondary: string; darkBackground: string; name: string }) => void;
    onCancel: () => void;
    colors: any;
}

const ThemeColorEditor: React.FC<ThemeColorEditorProps> = ({ initialColors, initialName, onSave, onCancel, colors }) => {
    const [themeName, setThemeName] = useState(initialName || 'Custom Theme');
    const [selectedColorKey, setSelectedColorKey] = useState<ColorKey>('primary');
    const [themeColors, setThemeColors] = useState({
        primary: initialColors.primary,
        secondary: initialColors.secondary,
        darkBackground: initialColors.darkBackground,
    });

    const handleColorChange = useCallback((color: string) => {
        setThemeColors(prev => ({ ...prev, [selectedColorKey]: color }));
    }, [selectedColorKey]);

    const handleSave = () => {
        if (!themeName.trim()) {
            Alert.alert('Invalid Name', 'Please enter a valid theme name');
            return;
        }
        onSave({ ...themeColors, name: themeName });
    };

    return (
        <View style={[stylesEditor.editorContainer, { backgroundColor: colors.background }]}>
            <View style={[stylesEditor.editorHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity style={stylesEditor.editorBackButton} onPress={onCancel}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <TextInput
                    style={[stylesEditor.editorTitleInput, { color: colors.text }]}
                    value={themeName}
                    onChangeText={setThemeName}
                    placeholder="Theme Name"
                    placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity style={[stylesEditor.editorSaveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
                    <Text style={stylesEditor.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={stylesEditor.editorBody} keyboardShouldPersistTaps="handled">
                <View style={stylesEditor.colorButtonsColumn}>
                    {(['primary', 'secondary', 'darkBackground'] as ColorKey[]).map(key => (
                        <TouchableOpacity
                            key={key}
                            style={[
                                stylesEditor.colorSelectorButton,
                                selectedColorKey === key && { borderColor: themeColors[key], borderWidth: 2 },
                                { backgroundColor: colors.surface }
                            ]}
                            onPress={() => setSelectedColorKey(key)}
                        >
                            <View style={[stylesEditor.colorIndicator, { backgroundColor: themeColors[key] }]} />
                            <Text style={[stylesEditor.colorButtonText, { color: colors.text }]}>
                                {key === 'darkBackground' ? 'Background' : key.charAt(0).toUpperCase() + key.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[stylesEditor.colorPickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ColorPicker
                        color={themeColors[selectedColorKey]}
                        onColorChange={handleColorChange}
                        thumbSize={30}
                        sliderSize={30}
                        noSnap={true}
                        row={false}
                    />
                </View>
            </ScrollView>
        </View>
    );
};

const ThemeCard = ({
    theme,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    colors
}: {
    theme: Theme;
    isSelected: boolean;
    onSelect: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    colors: any;
}) => {
    const surface = theme.colors.surface || colors.surface;
    const background = theme.colors.background || theme.colors.darkBackground || colors.background;
    const text = theme.colors.text || colors.text;

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSelect}
            style={[
                stylesStatic.themeCard,
                {
                    backgroundColor: surface,
                    borderColor: isSelected ? theme.colors.primary : colors.border,
                },
            ]}
        >
            <View style={stylesStatic.themeHeader}>
                <Text style={[stylesStatic.themeTitle, { color: text }]} numberOfLines={1}>{theme.name}</Text>
                {isSelected && <Check size={18} color={theme.colors.primary} />}
            </View>

            <View style={stylesStatic.swatchRow}>
                <View style={[stylesStatic.swatch, { backgroundColor: theme.colors.primary }]} />
                <View style={[stylesStatic.swatch, { backgroundColor: theme.colors.secondary }]} />
                <View style={[stylesStatic.swatch, { backgroundColor: background, borderWidth: 1, borderColor: colors.border }]} />
            </View>

            {theme.isEditable && (
                <View style={stylesStatic.actionRow}>
                    {onEdit && (
                        <TouchableOpacity style={[stylesStatic.actionBtn, { backgroundColor: colors.surface }]} onPress={onEdit}>
                            <Edit2 size={16} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity style={[stylesStatic.actionBtn, { backgroundColor: colors.surface }]} onPress={onDelete}>
                            <Trash2 size={16} color={colors.error || '#ef4444'} />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const ThemeSettingsScreen = () => {
    const navigation = useNavigation<any>();
    const { colors, currentTheme, availableThemes, setCurrentTheme, mode, toggle, addCustomTheme, updateCustomTheme, deleteCustomTheme } = useTheme();
    const [activeFilter, setActiveFilter] = useState('all');

    const [isEditMode, setIsEditMode] = useState(false);
    const [editingTheme, setEditingTheme] = useState<Theme | null>(null);

    const isLightTheme = currentTheme.id === 'slate_light' || mode === 'light';

    useEffect(() => {
        if (isEditMode) {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                setIsEditMode(false);
                setEditingTheme(null);
                return true;
            });
            return () => backHandler.remove();
        }
    }, [isEditMode]);

    const filteredThemes = useMemo(() => {
        return availableThemes.filter(theme => {
            if (activeFilter === 'dark') return theme.id !== 'slate_light' && !theme.isEditable;
            if (activeFilter === 'light') return theme.id === 'slate_light' && !theme.isEditable;
            if (activeFilter === 'custom') return theme.isEditable;
            return true;
        });
    }, [activeFilter, availableThemes]);

    const handleCreateTheme = useCallback(() => {
        setEditingTheme(null);
        setIsEditMode(true);
    }, []);

    const handleEditTheme = useCallback((theme: Theme) => {
        setEditingTheme(theme);
        setIsEditMode(true);
    }, []);

    const handleDeleteTheme = useCallback((theme: Theme) => {
        Alert.alert('Delete Theme', `Are you sure you want to delete "${theme.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteCustomTheme(theme.id) }
        ]);
    }, [deleteCustomTheme]);

    const handleSaveTheme = useCallback((themeData: any) => {
        if (editingTheme) {
            updateCustomTheme({ ...editingTheme, ...themeData });
        } else {
            addCustomTheme(themeData);
        }
        setIsEditMode(false);
        setEditingTheme(null);
    }, [editingTheme, updateCustomTheme, addCustomTheme]);

    if (isEditMode) {
        const initialColors = editingTheme ? {
            primary: editingTheme.colors.primary,
            secondary: editingTheme.colors.secondary,
            darkBackground: editingTheme.colors.darkBackground || editingTheme.colors.background || colors.background,
        } : {
            primary: currentTheme.colors.primary,
            secondary: currentTheme.colors.secondary,
            darkBackground: currentTheme.colors.darkBackground || currentTheme.colors.background || colors.background,
        };

        return (
            <View style={{ flex: 1 }}>
                <StatusBar barStyle={isLightTheme ? 'dark-content' : 'light-content'} />
                <ThemeColorEditor
                    initialColors={initialColors}
                    initialName={editingTheme?.name}
                    onSave={handleSaveTheme}
                    onCancel={() => { setIsEditMode(false); setEditingTheme(null); }}
                    colors={colors}
                />
            </View>
        );
    }

    return (
        <View style={[stylesStatic.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isLightTheme ? 'dark-content' : 'light-content'} />
            <ScreenHeader title="Theme" showBackButton onBackPress={() => navigation.goBack()} compact />

            <ScrollView contentContainerStyle={stylesStatic.content} showsVerticalScrollIndicator={false}>
                <SettingsCard title="Display Mode">
                    <View style={[stylesStatic.modeRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                        <View style={stylesStatic.modeTextWrap}>
                            <Text style={[stylesStatic.modeTitle, { color: colors.text }]}>Dark Mode</Text>
                            <Text style={[stylesStatic.modeDescription, { color: colors.textMuted }]}>
                                Use dark surfaces across the admin app.
                            </Text>
                        </View>
                        <CustomSwitch value={mode === 'dark'} onValueChange={toggle} />
                    </View>
                    <View style={stylesStatic.modeRow}>
                        <View style={stylesStatic.modeTextWrap}>
                            <Text style={[stylesStatic.modeTitle, { color: colors.text }]}>Current Theme</Text>
                            <Text style={[stylesStatic.modeDescription, { color: colors.textMuted }]}>
                                {currentTheme.name}
                            </Text>
                        </View>
                        {mode === 'dark' ? <Moon size={18} color={colors.primary} /> : <Sun size={18} color={colors.warning} />}
                    </View>
                </SettingsCard>

                <SettingsHint>
                    Create and customize your own personalized themes, just like in Nuvio!
                </SettingsHint>

                <FlatList
                    data={THEME_FILTERS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item.id}
                    contentContainerStyle={stylesStatic.filterList}
                    renderItem={({ item }) => {
                        const active = item.id === activeFilter;
                        return (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setActiveFilter(item.id)}
                                style={[
                                    stylesStatic.filterChip,
                                    {
                                        backgroundColor: active ? colors.primary : colors.surface,
                                        borderColor: active ? colors.primary : colors.border,
                                        marginRight: 8,
                                    },
                                ]}
                            >
                                <Text style={[stylesStatic.filterText, { color: active ? '#FFFFFF' : colors.textMuted }]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />

                <View style={stylesStatic.grid}>
                    {filteredThemes.map(theme => (
                        <View key={theme.id} style={{ width: '48%' }}>
                            <ThemeCard
                                theme={theme}
                                isSelected={theme.id === currentTheme.id}
                                onSelect={() => setCurrentTheme(theme.id)}
                                onEdit={theme.isEditable ? () => handleEditTheme(theme) : undefined}
                                onDelete={theme.isEditable ? () => handleDeleteTheme(theme) : undefined}
                                colors={colors}
                            />
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={[stylesStatic.createBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCreateTheme}
                >
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={stylesStatic.createBtnText}>Create Custom Theme</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const stylesEditor = StyleSheet.create({
    editorContainer: { flex: 1 },
    editorHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 48, borderBottomWidth: 1 },
    editorBackButton: { padding: 8, marginRight: 8 },
    editorTitleInput: { flex: 1, fontSize: 18, fontWeight: '600' },
    editorSaveButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    saveButtonText: { color: '#FFF', fontWeight: 'bold' },
    editorBody: { padding: 16, paddingBottom: 40 },
    colorButtonsColumn: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    colorSelectorButton: { flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'column' },
    colorIndicator: { width: 32, height: 32, borderRadius: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
    colorButtonText: { fontSize: 13, fontWeight: '500' },
    colorPickerContainer: { flex: 1, padding: 24, borderRadius: 16, borderWidth: 1, minHeight: 400 },
});

const stylesStatic = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 28 },
    filterList: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 8 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
    filterText: { fontSize: 12, fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, gap: 12 },
    themeCard: { borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 12 },
    themeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    themeTitle: { flex: 1, fontSize: 14, fontWeight: '700', marginRight: 8 },
    swatchRow: { flexDirection: 'row', gap: 8 },
    swatch: { width: 24, height: 24, borderRadius: 12 },
    modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
    modeTextWrap: { flex: 1, marginRight: 16 },
    modeTitle: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
    modeDescription: { fontSize: 13, lineHeight: 18 },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
    actionBtn: { padding: 6, borderRadius: 8 },
    createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, padding: 16, borderRadius: 12, marginTop: 8 },
    createBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});

export default ThemeSettingsScreen;
