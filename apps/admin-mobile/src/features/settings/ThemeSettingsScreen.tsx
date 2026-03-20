import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  BackHandler,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  Check, 
  Moon, 
  Sun, 
  Edit2, 
  Trash2, 
  Plus, 
  ArrowLeft,
} from 'lucide-react-native';
import ColorPicker from 'react-native-wheel-color-picker';

import { useTheme } from '../../theme/ThemeProvider';
import ScreenHeader from '../system/components/ScreenHeader';
import { CustomSwitch, SettingsCard, SettingsHint } from './components/SettingsComponents';
import type { Theme } from '../../theme';

const { width } = Dimensions.get('window');
const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

const THEME_FILTERS = [
  { id: 'all', label: 'All Themes' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'custom', label: 'My Themes' },
];

type ColorKey = 'primary' | 'secondary' | 'darkBackground';

// --- Components from Nuvio Implementation ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ThemePreview = ({ themeColors }: { themeColors: any }) => (
  <View style={[styles.previewContainer, { backgroundColor: themeColors.darkBackground }]}>
    <View style={styles.previewContent}>
      {/* App header */}
      <View style={styles.previewHeader}>
        <View style={styles.previewHeaderTitle} />
        <View style={styles.previewIconGroup}>
          <View style={styles.previewIcon} />
          <View style={styles.previewIcon} />
        </View>
      </View>

      {/* Content area */}
      <View style={styles.previewBody}>
        {/* Featured content poster */}
        <View style={styles.previewFeatured}>
          <View style={styles.previewPosterGradient} />
          <View style={styles.previewTitle} />
          <View style={styles.previewButtonRow}>
            <View style={[styles.previewPlayButton, { backgroundColor: themeColors.primary }]} />
            <View style={styles.previewActionButton} />
          </View>
        </View>

        {/* Content row */}
        <View style={styles.previewSectionHeader}>
          <View style={styles.previewSectionTitle} />
        </View>
        <View style={styles.previewPosterRow}>
          <View style={styles.previewPoster} />
          <View style={styles.previewPoster} />
          <View style={styles.previewPoster} />
        </View>
      </View>
    </View>
  </View>
);

interface ThemeColorEditorProps {
  initialColors: { primary: string; secondary: string; darkBackground: string };
  initialName?: string;
  onSave: (colors: { primary: string; secondary: string; darkBackground: string; name: string }) => void;
  onCancel: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colors: any;
}

const ThemeColorEditor: React.FC<ThemeColorEditorProps> = ({ 
  initialColors, 
  initialName, 
  onSave, 
  onCancel, 
  colors 
}) => {
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
    <View style={styles.editorContainer}>
      <View style={[styles.editorHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.editorBackButton} onPress={onCancel}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <TextInput
          style={[styles.editorTitleInput, { color: colors.text }]}
          value={themeName}
          onChangeText={setThemeName}
          placeholder="Theme Name"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity style={[styles.editorSaveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.editorBody}>
        <View style={styles.colorSectionRow}>
          <ThemePreview themeColors={themeColors} />

          <View style={styles.colorButtonsColumn}>
            <TouchableOpacity
              style={[
                styles.colorSelectorButton,
                selectedColorKey === 'primary' && styles.selectedColorButton,
                { backgroundColor: themeColors.primary }
              ]}
              onPress={() => setSelectedColorKey('primary')}
            >
              <Text style={styles.colorButtonText}>Primary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.colorSelectorButton,
                selectedColorKey === 'secondary' && styles.selectedColorButton,
                { backgroundColor: themeColors.secondary }
              ]}
              onPress={() => setSelectedColorKey('secondary')}
            >
              <Text style={styles.colorButtonText}>Secondary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.colorSelectorButton,
                selectedColorKey === 'darkBackground' && styles.selectedColorButton,
                { backgroundColor: themeColors.darkBackground }
              ]}
              onPress={() => setSelectedColorKey('darkBackground')}
            >
              <Text style={styles.colorButtonText}>Background</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.colorPickerContainer, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
          <ColorPicker
            color={themeColors[selectedColorKey]}
            onColorChange={handleColorChange}
            thumbSize={22}
            sliderSize={22}
            noSnap={true}
            row={false}
          />
        </View>
      </View>
    </View>
  );
};

const ThemeCard = ({
  theme,
  isSelected,
  onSelect,
  onEdit,
  onDelete
}: {
  theme: Theme;
  isSelected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        isSelected && styles.selectedThemeCard,
        {
          borderColor: isSelected ? theme.colors.primary : 'transparent',
          backgroundColor: Platform.OS === 'ios'
            ? `${theme.colors.background || theme.colors.darkBackground}60`
            : 'rgba(255, 255, 255, 0.07)'
        }
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.themeCardHeader}>
        <Text style={[styles.themeCardTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {theme.name}
        </Text>
        {isSelected && (
          <Check size={16} color={theme.colors.primary} />
        )}
      </View>

      <View style={styles.colorPreviewContainer}>
        <View style={[styles.colorPreview, { backgroundColor: theme.colors.primary }, styles.colorPreviewShadow]} />
        <View style={[styles.colorPreview, { backgroundColor: theme.colors.secondary }, styles.colorPreviewShadow]} />
        <View style={[styles.colorPreview, { backgroundColor: theme.colors.background || theme.colors.darkBackground }, styles.colorPreviewShadow]} />
      </View>

      {theme.isEditable && (
        <View style={styles.themeCardActions}>
          {onEdit && (
            <TouchableOpacity
              style={[styles.themeCardAction, styles.buttonShadow]}
              onPress={onEdit}
            >
              <Edit2 size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.themeCardAction, styles.buttonShadow]}
              onPress={onDelete}
            >
              <Trash2 size={14} color={theme.colors.error || '#CF6679'} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// --- Main Screen ---

const ThemeSettingsScreen = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const { 
    colors, 
    currentTheme, 
    availableThemes, 
    setCurrentTheme, 
    mode, 
    toggle, 
    addCustomTheme, 
    updateCustomTheme, 
    deleteCustomTheme 
  } = useTheme();
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);

  const isLightTheme = currentTheme.mode === 'light' || mode === 'light';

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
      if (activeFilter === 'dark') return theme.mode === 'dark' && !theme.isEditable;
      if (activeFilter === 'light') return theme.mode === 'light' && !theme.isEditable;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      darkBackground: editingTheme.colors.background || (editingTheme.colors as any).darkBackground || colors.background,
    } : {
      primary: currentTheme.colors.primary,
      secondary: currentTheme.colors.secondary,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      darkBackground: currentTheme.colors.background || (currentTheme.colors as any).darkBackground || colors.background,
    };

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isLightTheme ? 'dark-content' : 'light-content'} />
      <ScreenHeader title="Theme" showBackButton onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsCard title="Display Mode">
          <View style={[styles.modeRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <View style={styles.modeTextWrap}>
              <Text style={[styles.modeTitle, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.modeDescription, { color: colors.textMuted }]}>
                Use dark surfaces across the admin app.
              </Text>
            </View>
            <CustomSwitch value={mode === 'dark'} onValueChange={toggle} />
          </View>
          <View style={styles.modeRow}>
            <View style={styles.modeTextWrap}>
              <Text style={[styles.modeTitle, { color: colors.text }]}>Current Theme</Text>
              <Text style={[styles.modeDescription, { color: colors.textMuted }]}>
                {currentTheme.name}
              </Text>
            </View>
            {mode === 'dark' ? <Moon size={18} color={colors.primary} /> : <Sun size={18} color={colors.warning} />}
          </View>
        </SettingsCard>

        <SettingsHint>
          Create and customize your own personalized themes with exact control over primary, secondary, and background colors.
        </SettingsHint>

        <View style={styles.filterContainer}>
          <FlatList
            data={THEME_FILTERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  activeFilter === item.id && { backgroundColor: colors.primary },
                  styles.buttonShadow
                ]}
                onPress={() => setActiveFilter(item.id)}
              >
                <Text style={[styles.filterTabText, activeFilter === item.id && { color: '#FFFFFF' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.themeGrid}>
          {filteredThemes.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isSelected={currentTheme.id === theme.id}
              onSelect={() => setCurrentTheme(theme.id)}
              onEdit={theme.isEditable ? () => handleEditTheme(theme) : undefined}
              onDelete={theme.isEditable ? () => handleDeleteTheme(theme) : undefined}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }, styles.buttonShadow]}
          onPress={handleCreateTheme}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create Custom Theme</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modeTextWrap: {
    flex: 1,
    marginRight: 16,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  modeDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  filterContainer: {
    marginVertical: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  themeCard: {
    width: (width - 44) / 2,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedThemeCard: {
    borderWidth: 2,
  },
  themeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  themeCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
  },
  colorPreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorPreviewShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  themeCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  themeCardAction: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  buttonShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },

  // Editor specific styles
  editorContainer: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 16 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  editorBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  editorTitleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  editorSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  editorBody: {
    flex: 1,
    padding: 16,
  },
  colorSectionRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  colorButtonsColumn: {
    width: width * 0.4 - 24,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  previewContainer: {
    width: width * 0.6 - 16,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewContent: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewHeader: {
    height: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  previewHeaderTitle: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  previewIconGroup: {
    flexDirection: 'row',
  },
  previewIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginLeft: 4,
  },
  previewBody: {
    flex: 1,
    padding: 4,
  },
  previewFeatured: {
    height: 60,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginBottom: 6,
    justifyContent: 'flex-end',
    padding: 6,
  },
  previewPosterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  previewTitle: {
    width: 80,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  previewButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewPlayButton: {
    width: 50,
    height: 14,
    borderRadius: 4,
    marginRight: 6,
  },
  previewActionButton: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  previewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewSectionTitle: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  previewPosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewPoster: {
    width: '30%',
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  colorSelectorButton: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColorButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  colorButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  colorPickerContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 350,
  },
});

export default ThemeSettingsScreen;


