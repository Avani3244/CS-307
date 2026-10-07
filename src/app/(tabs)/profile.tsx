import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  header: '#211A15',
  page: '#F1E2D2',
  card: '#FFF9F2',
  cardSoft: '#FAEFE4',
  text: '#21160F',
  muted: '#9A816B',
  icon: '#A3876D',
  gold: '#C98A38',
  goldDark: '#A96F2D',
  goldSoft: '#F4DFC3',
  border: '#E2CCB8',
  divider: '#EAD7C6',
  white: '#FFFFFF',
  delete: '#A22B25',
  deleteBackground: '#F9DDD7',
};

const STUDY_STYLES = ['Quiet / Solo', 'Group Study', 'Coffee Shops', 'Late Night', 'Natural Light'];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile data
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [bio, setBio] = useState('');
  const [preferredStyle, setPreferredStyle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Form edit state
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editMajor, setEditMajor] = useState('');
  const [editGradYear, setEditGradYear] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPreferredStyle, setEditPreferredStyle] = useState('');
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setMajor(data.major || '');
        setGradYear(data.grad_year ? String(data.grad_year) : '');
        setBio(data.bio || '');
        setPreferredStyle(data.preferred_style || '');
        setAvatarUrl(data.avatar_url || null);

        setEditUsername(data.username || '');
        setEditFullName(data.full_name || '');
        setEditMajor(data.major || '');
        setEditGradYear(data.grad_year ? String(data.grad_year) : '');
        setEditBio(data.bio || '');
        setEditPreferredStyle(data.preferred_style || '');
      } else {
        setIsEditing(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading profile.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Photo library access is needed to select an avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setPreviewUri(result.assets[0].uri);
      if (result.assets[0].base64) {
        setNewImageBase64(result.assets[0].base64);
      }
    }
  };

  const uploadAvatarBase64 = async (base64Data: string): Promise<string> => {
    const fileName = `${user?.id}-${Date.now()}.jpg`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64Data), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const cleanUsername = editUsername.trim();

    if (!cleanUsername) {
      setErrorMessage('Username is required.');
      return;
    }
    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setErrorMessage('Username can only contain letters, numbers, and underscores.');
      return;
    }

    try {
      setSaving(true);

      // Check unique username excluding current user's profile
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', cleanUsername)
        .neq('user_id', user?.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) {
        setErrorMessage('This username is already taken. Please choose another.');
        setSaving(false);
        return;
      }

      let finalAvatarUrl = avatarUrl;
      if (newImageBase64) {
        finalAvatarUrl = await uploadAvatarBase64(newImageBase64);
      }

      const updates = {
        user_id: user?.id,
        username: cleanUsername,
        full_name: editFullName.trim(),
        major: editMajor.trim(),
        grad_year: editGradYear.trim(),
        bio: editBio.trim(),
        preferred_style: editPreferredStyle,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'user_id' });

      if (saveError) throw saveError;

      setUsername(cleanUsername);
      setFullName(editFullName.trim());
      setMajor(editMajor.trim());
      setGradYear(editGradYear.trim());
      setBio(editBio.trim());
      setPreferredStyle(editPreferredStyle);
      setAvatarUrl(finalAvatarUrl);
      setNewImageBase64(null);
      setPreviewUri(null);
      setIsEditing(false);
      setSuccessMessage('Profile saved successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.page }]}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  const currentDisplayPhoto = previewUri || avatarUrl;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: COLORS.page }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Math.max(insets.top + 20, 85), paddingBottom: insets.bottom + 40 },
      ]}
    >
      <View style={styles.topHeaderCard}>
        <View>
          <Text style={styles.appTitle}>STUDYSPOT PURDUE</Text>
          <Text style={styles.headerSubtitle}>Account & Preferences</Text>
        </View>

        {!isEditing ? (
          <Pressable
            style={({ pressed }) => [styles.editBadgeButton, pressed && styles.pressed]}
            onPress={() => {
              setEditUsername(username);
              setEditFullName(fullName);
              setEditMajor(major);
              setEditGradYear(gradYear);
              setEditBio(bio);
              setEditPreferredStyle(preferredStyle);
              setErrorMessage('');
              setSuccessMessage('');
              setIsEditing(true);
            }}
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.header} />
            <Text style={styles.editBadgeText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.delete} />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successBanner}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={COLORS.goldDark} />
          <Text style={styles.successBannerText}>{successMessage}</Text>
        </View>
      ) : null}

      <View style={styles.mainCard}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarOutline}>
            {currentDisplayPhoto ? (
              <Image source={{ uri: currentDisplayPhoto }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(fullName ? fullName.charAt(0) : username ? username.charAt(0) : 'P').toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {isEditing ? (
            <Pressable
              style={({ pressed }) => [styles.changePhotoBadge, pressed && styles.pressed]}
              onPress={pickImage}
            >
              <MaterialCommunityIcons name="camera" size={16} color={COLORS.header} />
              <Text style={styles.changePhotoBadgeText}>Upload Photo</Text>
            </Pressable>
          ) : null}
        </View>

        {isEditing ? (
          <View style={styles.formContainer}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Pete Boilermaker"
                placeholderTextColor={COLORS.muted}
                value={editFullName}
                onChangeText={setEditFullName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>USERNAME</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Choose unique username"
                placeholderTextColor={COLORS.muted}
                value={editUsername}
                onChangeText={setEditUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.twoColumnRow}>
              <View style={[styles.fieldGroup, { flex: 2 }]}>
                <Text style={styles.fieldLabel}>MAJOR</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Computer Science"
                  placeholderTextColor={COLORS.muted}
                  value={editMajor}
                  onChangeText={setEditMajor}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>CLASS OF</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="2027"
                  placeholderTextColor={COLORS.muted}
                  value={editGradYear}
                  onChangeText={setEditGradYear}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FAVORITE STUDY ENVIRONMENT</Text>
              <View style={styles.chipWrapper}>
                {STUDY_STYLES.map((style) => {
                  const isSelected = editPreferredStyle === style;
                  return (
                    <Pressable
                      key={style}
                      style={[styles.styleChip, isSelected && styles.styleChipSelected]}
                      onPress={() => setEditPreferredStyle(isSelected ? '' : style)}
                    >
                      <Text style={[styles.styleChipText, isSelected && styles.styleChipTextSelected]}>
                        {style}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>ABOUT ME / BIO</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Where do you get your best studying done on campus?"
                placeholderTextColor={COLORS.muted}
                value={editBio}
                onChangeText={setEditBio}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.actionsRow}>
              {username ? (
                <Pressable
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
                  onPress={() => {
                    setIsEditing(false);
                    setPreviewUri(null);
                    setNewImageBase64(null);
                    setErrorMessage('');
                  }}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, saving && styles.disabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Profile</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.displayContainer}>
            <Text style={styles.displayFullName}>{fullName || username || 'Boilermaker'}</Text>
            <Text style={styles.displayUsername}>{'@' + (username || 'set_username')}</Text>
            <Text style={styles.displayEmail}>{user?.email || ''}</Text>

            {major || gradYear ? (
              <View style={styles.academicBadgeRow}>
                {major ? (
                  <View style={styles.infoBadge}>
                    <MaterialCommunityIcons name="school-outline" size={14} color={COLORS.goldDark} />
                    <Text style={styles.infoBadgeText}>{major}</Text>
                  </View>
                ) : null}
                {gradYear ? (
                  <View style={styles.infoBadge}>
                    <MaterialCommunityIcons name="calendar-outline" size={14} color={COLORS.goldDark} />
                    <Text style={styles.infoBadgeText}>{"'" + gradYear.slice(-2)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {preferredStyle ? (
              <View style={styles.preferredStyleRow}>
                <MaterialCommunityIcons name="compass-outline" size={16} color={COLORS.goldDark} />
                <Text style={styles.preferredStyleLabel}>Prefers: </Text>
                <Text style={styles.preferredStyleVal}>{preferredStyle}</Text>
              </View>
            ) : null}

            <View style={styles.bioCard}>
              <View style={styles.bioHeadingRow}>
                <MaterialCommunityIcons name="text-account" size={16} color={COLORS.goldDark} />
                <Text style={styles.bioHeaderTitle}>ABOUT ME</Text>
              </View>
              <Text style={styles.bioBodyText}>
                {bio ? bio : 'No bio added yet. Tap "Edit" to tell classmates your study routine!'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
        onPress={signOut}
      >
        <MaterialCommunityIcons name="logout-variant" size={18} color={COLORS.delete} />
        <Text style={styles.logoutBtnText}>Log Out of Boilermaker Account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  topHeaderCard: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: COLORS.goldDark,
  },
  headerSubtitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.header,
  },
  editBadgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  editBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.header,
  },
  errorBanner: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.deleteBackground,
    borderColor: COLORS.delete,
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: COLORS.delete,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cardSoft,
    borderColor: COLORS.gold,
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  successBannerText: {
    color: COLORS.goldDark,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  mainCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    shadowColor: COLORS.header,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarOutline: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 3,
    borderColor: COLORS.gold,
    padding: 3,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: COLORS.cardSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.goldDark,
  },
  changePhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  changePhotoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.header,
  },
  displayContainer: {
    width: '100%',
    alignItems: 'center',
  },
  displayFullName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  displayUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.goldDark,
    marginBottom: 2,
  },
  displayEmail: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  academicBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 18,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.cardSoft,
    borderColor: COLORS.divider,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  preferredStyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  preferredStyleLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  preferredStyleVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  bioCard: {
    width: '100%',
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 14,
    padding: 14,
  },
  bioHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bioHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.goldDark,
  },
  bioBodyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.goldDark,
    marginBottom: 6,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  textInput: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,
  },
  styleChipSelected: {
    backgroundColor: COLORS.goldSoft,
    borderColor: COLORS.goldDark,
  },
  styleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  styleChipTextSelected: {
    color: COLORS.header,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.deleteBackground,
    borderWidth: 1,
    borderColor: COLORS.delete,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.delete,
  },
});