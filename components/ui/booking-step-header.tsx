import { useI18n } from '../../i18n';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type StepProps = { step: number; totalSteps?: 3 | 4 };
export function BookingProgress({ step, totalSteps, showCount = false }: StepProps & { showCount?: boolean }) {
  const { t } = useI18n();
  if (!totalSteps) return null;
  return (
    <View>
      {showCount && <Text style={styles.progressCount}>{t('Step').trim()} {step}/{totalSteps}</Text>}
      <View style={styles.progressContainer} accessibilityLabel={`${t('Step').trim()} ${step}/${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(item => (
          <React.Fragment key={item}>
            {item > 1 && <View style={[styles.line, item <= step && styles.lineActive]} />}
            <View style={[styles.circle, item < step && styles.circleDone, item === step && styles.circleActive]}>
              <Text style={[styles.circleText, item < step && styles.circleTextDone, item === step && styles.circleTextActive]}>{item}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
export default function BookingStepHeader({ step, totalSteps, disabled = false }: StepProps & { disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} disabled={disabled} onPress={() => router.back()}>
          <ArrowLeft size={23} color="#16863A" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Book a Worker')}</Text>
        <Text style={styles.stepText}>{t('Step').trim()} {step}{totalSteps ? `/${totalSteps}` : ''}</Text>
      </View>
      <BookingProgress step={step} totalSteps={totalSteps} />
      <View style={styles.divider} />
    </>
  );
}
const styles = StyleSheet.create({
  header: { minHeight: 54, paddingHorizontal: 14, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#171717', paddingHorizontal: 4 },
  stepText: { minWidth: 65, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#16863A' },
  progressCount: { textAlign: 'right', marginHorizontal: 16, marginTop: 3, fontSize: 12, fontWeight: '800', color: '#16863A' },
  progressContainer: { minHeight: 44, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: 3, backgroundColor: '#E4E4E4' },
  lineActive: { backgroundColor: '#16863A' },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7E7E7' },
  circleDone: { backgroundColor: '#DDF4E5' },
  circleActive: { backgroundColor: '#16863A' },
  circleText: { fontSize: 13, fontWeight: '700', color: '#626262' },
  circleTextDone: { color: '#16863A' },
  circleTextActive: { color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#E7E7E7' },
});
