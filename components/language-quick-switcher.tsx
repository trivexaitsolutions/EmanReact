import React, { useState } from 'react';
import { Check, ChevronDown, Globe2, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useI18n } from '../i18n';
import type { AppLanguage } from '../i18n/I18nProvider';

/**
 * Navigation language switcher, shared by Customer, Worker and the role chooser.
 * All supported languages come from the Admin-managed active-language API.
 * No changes to the booking/session state are made when switching languages.
 */
export default function LanguageQuickSwitcher({ onDark = false }: { onDark?: boolean }) {
  const { language, languages, setLanguage, t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasMore = languages.length > 3;
  // Keep English and Hindi handy when more languages are activated.
  const directLanguages = hasMore
    ? [languages.find(item => item.code === 'en'), languages.find(item => item.code === 'hi')]
        .filter(Boolean) as AppLanguage[]
    : languages;
  const displayedLanguages = hasMore && directLanguages.length < 2
    ? [...directLanguages, ...languages.filter(item => !directLanguages.includes(item)).slice(0, 2 - directLanguages.length)]
    : directLanguages;

  const choose = async (code: string) => {
    if (busy || code === language) {
      setMoreOpen(false);
      return;
    }
    setBusy(true);
    try {
      await setLanguage(code);
      setMoreOpen(false);
    } catch (error) {
      console.warn('[i18n] Could not save language selection', error);
    } finally {
      setBusy(false);
    }
  };

  const shortLabel = (item: AppLanguage): string => {
    if (item.code === 'en') return 'En';
    if (item.code === 'hi') return 'हि';
    if (item.code === 'mr') return 'म';
    return item.code.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.pills, onDark && styles.pillsDark]}>
        {displayedLanguages.map(item => {
          const selected = item.code === language;
          return (
            <TouchableOpacity
              key={item.code}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ${t('Language')}`}
              accessibilityState={{ selected, disabled: busy }}
              disabled={busy}
              onPress={() => void choose(item.code)}
              activeOpacity={0.8}
              style={[styles.pill, selected && styles.pillSelected]}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{shortLabel(item)}</Text>
            </TouchableOpacity>
          );
        })}
        {hasMore && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('More languages')}
            onPress={() => setMoreOpen(true)}
            disabled={busy}
            style={[styles.morePill, !displayedLanguages.some(item => item.code === language) && styles.moreSelected]}
          >
            <Globe2 size={14} color={!displayedLanguages.some(item => item.code === language) ? '#FFFFFF' : '#475569'} />
            <ChevronDown size={11} color={!displayedLanguages.some(item => item.code === language) ? '#FFFFFF' : '#475569'} />
          </TouchableOpacity>
        )}
      </View>
      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMoreOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Globe2 color="#087C49" size={20} />
                <Text style={styles.modalTitle}>{t('Choose your language')}</Text>
              </View>
              <TouchableOpacity accessibilityLabel={t('Close')} onPress={() => setMoreOpen(false)} style={styles.closeButton}>
                <X color="#334155" size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.options} contentContainerStyle={{ paddingBottom: 8 }}>
              {languages.map(item => {
                const selected = item.code === language;
                return (
                  <TouchableOpacity
                    key={item.code}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    accessibilityState={{ selected }}
                    disabled={busy}
                    onPress={() => void choose(item.code)}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nativeName}>{item.nativeName}</Text>
                      <Text style={styles.englishName}>{item.name}</Text>
                    </View>
                    {selected && <Check size={22} color="#087C49" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {busy && <ActivityIndicator color="#087C49" style={{ marginBottom: 12 }} />}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  pills: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DBE5E2', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 3, gap: 2 },
  pillsDark: { backgroundColor: '#FFFFFF', borderColor: '#D9EDE2' },
  pill: { minWidth: 30, height: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 9 },
  pillSelected: { backgroundColor: '#087C49' },
  pillText: { color: '#334155', fontSize: 12, fontWeight: '800' },
  pillTextSelected: { color: '#FFFFFF' },
  morePill: { minWidth: 32, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 9, gap: 1 },
  moreSelected: { backgroundColor: '#087C49' },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.46)', padding: 24 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 17, maxHeight: '75%', width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  closeButton: { padding: 6 },
  options: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, marginVertical: 3, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: 'transparent' },
  optionSelected: { borderColor: '#86D4AF', backgroundColor: '#EAF7F0' },
  nativeName: { color: '#111827', fontSize: 16, fontWeight: '700' },
  englishName: { color: '#64748B', fontSize: 12, marginTop: 3 },
});
