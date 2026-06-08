import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { resourcesApi } from '@fresherflow/api-client';
import { queueShare } from '@/utils/shareQueue';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ShareResourceModal: React.FC<Props> = ({ visible, onClose }) => {
  const { currentTheme } = useTheme();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid = /^https?:\/\/.+\..+/.test(url.trim());

  const handleClose = () => {
    setUrl('');
    setError('');
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid) { setError('Please paste a valid link'); return; }
    setSubmitting(true);
    setError('');
    try {
      try {
        await resourcesApi.submit(url.trim());
      } catch (apiErr: unknown) {
        if ((apiErr as { status?: number }).status === 409) {
          handleClose(); return;
        }
        await queueShare('RESOURCE', { url: url.trim() });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[styles.card, { backgroundColor: currentTheme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: currentTheme.colors.text }]}>Share a Resource</Text>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.06) }]}>
              <X size={16} color={currentTheme.colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.hint, { color: currentTheme.colors.textMuted }]}>
            Paste a YouTube, PDF, blog, or any link. Our team will review it.
          </Text>

          {/* URL Field */}
          <View style={[styles.inputRow, { backgroundColor: alpha(currentTheme.colors.text, 0.04), borderColor: error ? alpha(currentTheme.colors.error, 0.5) : alpha(currentTheme.colors.border, 0.1) }]}>
            <Link2 size={16} color={currentTheme.colors.textMuted} />
            <TextInput
              style={[styles.input, { color: currentTheme.colors.text }]}
              placeholder="https://..."
              placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
              value={url}
              onChangeText={t => { setUrl(t); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
            />
            {url.length > 0 && (
              <TouchableOpacity onPress={() => { setUrl(''); setError(''); }}>
                <X size={14} color={alpha(currentTheme.colors.textMuted, 0.5)} />
              </TouchableOpacity>
            )}
          </View>

          {!!error && <Text style={[styles.error, { color: currentTheme.colors.error }]}>{error}</Text>}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: currentTheme.colors.primary, opacity: (!isValid || submitting) ? 0.5 : 1 }]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator size="small" color={currentTheme.colors.background} />
              : <Text style={[styles.btnText, { color: currentTheme.colors.background }]}>Submit</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  error: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  btn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
