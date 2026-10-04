// src/components/CrowdReportSheet.tsx
// Story #17: report current crowd, seating, and noise conditions. Owner: Neha
// Opens from the Discover card now; reusable from the detail page later.

import { useAuth } from '@/context/AuthContext';
import {
  CROWD_LEVELS, NOISE_LEVELS, SEATING_LEVELS,
  submitCrowdReport, type CrowdReportInput,
} from '@/lib/crowd';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  locationId: string | null; // null = closed
  locationName?: string;
  onClose: () => void;
}

const GROUPS: { key: keyof CrowdReportInput; label: string; options: readonly string[] }[] = [
  { key: 'crowd_level', label: 'How crowded is it?', options: CROWD_LEVELS },
  { key: 'seating_level', label: 'Seating availability', options: SEATING_LEVELS },
  { key: 'noise_level', label: 'Noise level', options: NOISE_LEVELS },
];

export default function CrowdReportSheet({ locationId, locationName, onClose }: Props) {
  const { user } = useAuth();
  const [values, setValues] = useState<Partial<CrowdReportInput>>({});
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  const complete = GROUPS.every((g) => values[g.key]);

  const submit = async () => {
    if (!user || !locationId || !complete) return;
    setState('saving');
    try {
      await submitCrowdReport(user.id, locationId, values as CrowdReportInput);
      setState('done');
      setTimeout(() => { setValues({}); setState('idle'); onClose(); }, 900);
    } catch {
      setState('error');
    }
  };

  return (
    <Modal visible={locationId !== null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Report conditions</Text>
          {!!locationName && <Text style={styles.subtitle}>{locationName}</Text>}

          {GROUPS.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.chipRow}>
                {group.options.map((option) => {
                  const selected = values[group.key] === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setValues((v) => ({ ...v, [group.key]: option }))}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {state === 'error' && (
            <Text style={styles.error}>Could not submit your report. Please try again.</Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={!complete || state === 'saving'}
            style={[styles.submit, (!complete || state === 'saving') && styles.submitDisabled]}
            onPress={submit}>
            <Text style={styles.submitText}>
              {state === 'done' ? 'Reported \u2713' : state === 'saving' ? 'Submitting...' : 'Submit report'}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#60646C', marginTop: 2 },
  group: { marginTop: 14 },
  groupLabel: { fontSize: 14, fontWeight: '600', color: '#60646C', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#F0F0F3' },
  chipSelected: { backgroundColor: '#208AEF' },
  chipText: { fontSize: 14, color: '#000' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  error: { marginTop: 12, color: '#C62828' },
  submit: { marginTop: 18, minHeight: 48, borderRadius: 12, backgroundColor: '#208AEF', alignItems: 'center', justifyContent: 'center' },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel: { marginTop: 8, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#60646C', fontSize: 15 },
});
