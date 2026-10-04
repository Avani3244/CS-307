import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile data
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Form edit state
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Fetch Profile Data on Load
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is code for "no rows returned" (new user)
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || null);
        setEditUsername(data.username || '');
        setEditBio(data.bio || '');
      } else {
        // New user without a profile yet -> open edit mode
        setIsEditing(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading profile.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Pick an Image from Device
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Photo library access is needed to select an avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setNewImageUri(result.assets[0].uri);
    }
  };

  // 3. Upload Image to Supabase Storage
  const uploadAvatar = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          upsert: true,
          contentType: blob.type || 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: any) {
      console.error('Upload avatar error:', err);
      throw new Error('Failed to upload profile image.');
    }
  };

  // 4. Save/Update Profile
  const handleSave = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const cleanUsername = editUsername.trim();

    // Client-side username validation
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

      // Check for duplicate username (used by another user)
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', user?.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) {
        setErrorMessage('This username is already taken. Please choose another.');
        setSaving(false);
        return;
      }

      // Upload new avatar if chosen
      let finalAvatarUrl = avatarUrl;
      if (newImageUri) {
        finalAvatarUrl = await uploadAvatar(newImageUri);
      }

      // Upsert profile record
      const updates = {
        id: user?.id,
        username: cleanUsername,
        bio: editBio.trim(),
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase.from('profiles').upsert(updates);
      if (saveError) throw saveError;

      // Update local state
      setUsername(cleanUsername);
      setBio(editBio.trim());
      setAvatarUrl(finalAvatarUrl);
      setNewImageUri(null);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CEB888" />
      </View>
    );
  }

  const currentDisplayPhoto = newImageUri || avatarUrl;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Top Gold Accent Bar */}
      <View style={styles.topAccentBar} />

      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>BOILER PROFILE</Text>
        {!isEditing && (
          <TouchableOpacity
            style={styles.editHeaderButton}
            onPress={() => {
              setEditUsername(username);
              setEditBio(bio);
              setErrorMessage('');
              setSuccessMessage('');
              setIsEditing(true);
            }}
          >
            <Text style={styles.editHeaderButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {/* Main Profile Card */}
      <View style={styles.card}>
        {/* Avatar Section */}
        <View style={styles.avatarWrapper}>
          {currentDisplayPhoto ? (
            <Image source={{ uri: currentDisplayPhoto }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {username ? username.charAt(0).toUpperCase() : 'P'}
              </Text>
            </View>
          )}

          {isEditing && (
            <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* View vs Edit Mode */}
        {isEditing ? (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>USERNAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor="#666"
                value={editUsername}
                onChangeText={setEditUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BIO</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Tell other Boilermakers about your study habits..."
                placeholderTextColor="#666"
                value={editBio}
                onChangeText={setEditBio}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.editActionRow}>
              {username ? (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setNewImageUri(null);
                    setErrorMessage('');
                  }}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.displayContainer}>
            <Text style={styles.displayUsername}>@{username || 'No Username'}</Text>
            <Text style={styles.displayEmail}>{user?.email}</Text>

            <View style={styles.bioContainer}>
              <Text style={styles.bioHeading}>ABOUT ME</Text>
              <Text style={styles.displayBio}>
                {bio ? bio : 'No bio added yet. Tap "Edit" to share where you like to study!'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Logout Button (User Story #2 Task 2.2) */}
      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topAccentBar: {
    height: 4,
    backgroundColor: '#CEB888',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    color: '#CEB888',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  editHeaderButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  editHeaderButtonText: {
    color: '#CEB888',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    width: '100%',
    maxWidth: 480,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#CEB888',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#CEB888',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#CEB888',
    fontSize: 38,
    fontWeight: '900',
  },
  changePhotoButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  changePhotoText: {
    color: '#CEB888',
    fontSize: 13,
    fontWeight: '600',
  },
  displayContainer: {
    width: '100%',
    alignItems: 'center',
  },
  displayUsername: {
    color: '#F4F4F4',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  displayEmail: {
    color: '#8C92AC',
    fontSize: 13,
    marginBottom: 20,
  },
  bioContainer: {
    width: '100%',
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  bioHeading: {
    color: '#CEB888',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  displayBio: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#CEB888',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 14,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  cancelButtonText: {
    color: '#A0A0A0',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#CEB888',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#121212',
    fontWeight: '800',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
    width: '100%',
    maxWidth: 480,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
  },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
    width: '100%',
    maxWidth: 480,
  },
  successText: {
    color: '#86EFAC',
    fontSize: 13,
  },
  logoutButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutButtonText: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});