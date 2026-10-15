// src/components/CrowdReportSheet.tsx
// Story #17: report current crowd, seating, and noise conditions. Owner: Neha
// Opens from the Discover card now; reusable from the detail page later.

import { useAuth } from '@/context/AuthContext';
import {
  CROWD_LEVELS,
  NOISE_LEVELS,
  SEATING_LEVELS,
  submitCrowdReport,
  type CrowdReportInput,
} from '@/lib/crowd';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Props {
  locationId: string | null;
  locationName?: string;
  onClose: () => void;
}

const GROUPS: {
  key: keyof CrowdReportInput;
  label: string;
  options: readonly string[];
}[] = [
  {
    key: 'crowd_level',
    label: 'How crowded is it?',
    options: CROWD_LEVELS,
  },
  {
    key: 'seating_level',
    label: 'Seating availability',
    options: SEATING_LEVELS,
  },
  {
    key: 'noise_level',
    label: 'Noise level',
    options: NOISE_LEVELS,
  },
];

export default function CrowdReportSheet({
  locationId,
  locationName,
  onClose,
}: Props) {
  const { user } = useAuth();

  const [values, setValues] = useState<Partial<CrowdReportInput>>({});
  const [state, setState] = useState<
    'idle' | 'saving' | 'done' | 'error'
  >('idle');
  const [validationError, setValidationError] = useState('');

  const complete = GROUPS.every((group) => values[group.key]);

  const submit = async () => {
    if (!user || !locationId) return;

    if (!complete) {
      setValidationError(
        'Please select crowd level, seating availability, and noise level.'
      );
      return;
    }

    setValidationError('');
    setState('saving');

    try {
      await submitCrowdReport(
        user.id,
        locationId,
        values as CrowdReportInput
      );

      setState('done');

      setTimeout(() => {
        setValues({});
        setValidationError('');
        setState('idle');
        onClose();
      }, 900);
    } catch {
      setState('error');
    }
  };

  const handleClose = () => {
    if (state === 'saving') return;

    setValues({});
    setValidationError('');
    setState('idle');
    onClose();
  };

  return (
    <Modal
      visible={locationId !== null}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Report Current Conditions</Text>

          {!!locationName && (
            <Text style={styles.subtitle}>{locationName}</Text>
          )}

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
                      style={[
                        styles.chip,
                        selected && styles.chipSelected,
                      ]}
                      onPress={() => {
                        setValues((current) => ({
                          ...current,
                          [group.key]: option,
                        }));

                        setValidationError('');
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {!!validationError && (
            <Text style={styles.error}>{validationError}</Text>
          )}

          {state === 'error' && (
            <Text style={styles.error}>
              Could not submit your report. Please try again.
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={state === 'saving'}
            style={[
              styles.submit,
              state === 'saving' && styles.submitDisabled,
            ]}
            onPress={submit}
          >
            <Text style={styles.submitText}>
              {state === 'done'
                ? 'Reported ✓'
                : state === 'saving'
                  ? 'Submitting...'
                  : 'Submit report'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={state === 'saving'}
            style={styles.cancel}
            onPress={handleClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(33, 22, 15, 0.45)',
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: '#FFF9F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 36,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
    color: '#21160F',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9A816B',
    marginTop: 6,
    marginBottom: 5,
  },

  group: {
    marginTop: 22,
  },

  groupLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#21160F',
    marginBottom: 11,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  chip: {
    flexGrow: 1,
    minWidth: 80,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: '#F1E2D2',
    borderWidth: 1,
    borderColor: '#E2CCB8',
  },

  chipSelected: {
    backgroundColor: '#A96F2D',
    borderColor: '#A96F2D',
  },

  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#21160F',
    textAlign: 'center',
  },

  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  error: {
    marginTop: 14,
    fontSize: 13,
    color: '#A22B25',
    fontWeight: '600',
  },

  submit: {
    marginTop: 26,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#A96F2D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitDisabled: {
    opacity: 0.5,
  },

  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  cancel: {
    marginTop: 10,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  cancelText: {
    color: '#9A816B',
    fontSize: 15,
    fontWeight: '700',
  },
});