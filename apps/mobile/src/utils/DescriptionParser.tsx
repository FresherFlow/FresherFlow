import React from 'react';
import { Text, View, StyleSheet, TextStyle } from 'react-native';
import { AppTheme } from '../contexts/ThemeContext';

interface ParserOptions {
  theme: AppTheme;
  baseStyle?: TextStyle;
}

export const renderFormattedDescription = (text: string, options: ParserOptions) => {
  if (!text) return null;

  const { theme, baseStyle } = options;

  // Normalize newlines
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();

  const lines = normalized.split('\n');
  const elements: React.ReactNode[] = [];
  
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = (key: string) => {
    if (paragraphBuffer.length === 0) return;
    elements.push(
      <View key={`p-${key}`} style={styles.paragraph}>
        <Text style={[styles.text, { color: theme.colors.textMuted }, baseStyle]}>
          {renderInlineFormatting(paragraphBuffer.join(' '))}
        </Text>
      </View>
    );
    paragraphBuffer = [];
  };

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    elements.push(
      <View key={`ul-${key}`} style={styles.list}>
        {listBuffer.map((item, idx) => (
          <View key={`li-${key}-${idx}`} style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.text, { color: theme.colors.textMuted }, baseStyle, { flex: 1 }]}>
            {renderInlineFormatting(item)}
            </Text>
          </View>
        ))}
      </View>
    );
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph(`line-${i}`);
      flushList(`line-${i}`);
      continue;
    }

    // Heading check: **Title**:?
    const headingMatch = line.match(/^\*\*(.+?)\*\*:?$/);
    if (headingMatch) {
      flushParagraph(`h-${i}`);
      flushList(`h-${i}`);
      elements.push(
        <Text key={`h-${i}`} style={[styles.heading, { color: theme.colors.text }]}>
          {headingMatch[1].trim()}
        </Text>
      );
      continue;
    }

    // List check: - Item or * Item
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph(`b-${i}`);
      listBuffer.push(bulletMatch[1].trim());
      continue;
    }

    // Colon heading check (short line ending in colon)
    const colonHeading = line.endsWith(':') && line.length <= 60 && !line.includes('.')
      ? line.slice(0, -1).trim()
      : '';
    if (colonHeading) {
      flushParagraph(`ch-${i}`);
      flushList(`ch-${i}`);
      elements.push(
        <Text key={`ch-${i}`} style={[styles.heading, { color: theme.colors.text }]}>
          {colonHeading}
        </Text>
      );
      continue;
    }

    // Normal line
    flushList(`nl-${i}`);
    paragraphBuffer.push(line);
  }

  flushParagraph('final');
  flushList('final');

  return elements;
};

const renderInlineFormatting = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
};

const styles = StyleSheet.create({
  paragraph: {
    marginBottom: 12,
  },
  list: {
    marginBottom: 16,
    paddingLeft: 4,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 16,
    fontSize: 18,
    lineHeight: 22,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
  },
  heading: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 10,
    opacity: 0.9,
  },
  bold: {
    fontWeight: '800',
  },
});
