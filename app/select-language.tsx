import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Check, Globe2, ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useI18n } from '../i18n';

export const LANGUAGE_CHOICE_KEY = '@eman:language:chosen:v1';

export default function SelectLanguage() {
  const { initial } = useLocalSearchParams<{ initial?: string }>();
  const { language, languages, setLanguage, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const choose = async (code: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await setLanguage(code);
      await AsyncStorage.setItem(LANGUAGE_CHOICE_KEY, '1');
      if (initial === '1') router.replace('/');
      else router.back();
    } finally { setBusy(false); }
  };
  return (
    <SafeAreaView style={styles.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.body}>
        {initial !== '1' ? (
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <ChevronLeft color="#111827" size={22} /><Text style={styles.backText}>{t('Back')}</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.icon}><Globe2 color="#047857" size={34} /></View>
        <Text style={styles.title}>{t('Choose your language')}</Text>
        <Text style={styles.subtitle}>{t('You can change this anytime from your profile.')}</Text>
        {languages.map(item => (
          <TouchableOpacity key={item.code} style={[styles.option, item.code === language && styles.selected]}
            disabled={busy} onPress={() => void choose(item.code)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nativeName}>{item.nativeName}</Text>
              <Text style={styles.englishName}>{item.name}</Text>
            </View>
            {item.code === language ? <Check color="#047857" size={24} /> : null}
          </TouchableOpacity>
        ))}
        {busy ? <ActivityIndicator color="#059669" style={{ marginTop: 16 }} /> : null}
        <Text style={styles.note}>{t('Unavailable translations will appear in the original language.')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  body: { padding: 24, paddingTop: 44, paddingBottom: 40 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  backText: { fontWeight: '700', color: '#111827' },
  icon: { width: 70, height: 70, borderRadius: 22, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 27, fontWeight: '900', color: '#111827', marginBottom: 8 },
  subtitle: { color: '#64748B', fontSize: 14, marginBottom: 27, lineHeight: 22 },
  option: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 17, marginBottom: 12 },
  selected: { borderColor: '#059669', backgroundColor: '#ECFDF5' },
  nativeName: { color: '#111827', fontSize: 20, fontWeight: '800' },
  englishName: { color: '#64748B', fontSize: 12, marginTop: 3 },
  note: { color: '#64748B', textAlign: 'center', marginTop: 19, fontSize: 12, lineHeight: 18 },
});
