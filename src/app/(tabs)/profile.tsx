import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
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
  success: '#2E7D32',
  successBackground: '#E8F5E9',
  star: '#E6A122',
  heart: '#D9534F',
};

const STUDY_STYLES = ['Quiet / Solo', 'Group Study', 'Coffee Shops', 'Late Night', 'Natural Light'];

type FilterType = 'all' | 'reviews' | 'favorites';
type FriendsTab = 'friends' | 'requests' | 'add';

export interface FeedActivityItem {
  id: string;
  type: 'review' | 'favorite';
  created_at: string;
  location_id: string;
  location_name: string;
  location_category: string;
  rating?: number;
  comment?: string;
}

export interface FriendProfile {
  user_id: string;
  username: string;
  full_name: string | null;
  major: string | null;
  avatar_url: string | null;
}

export interface FriendshipEntry {
  friendship_id: string;
  status: 'pending' | 'accepted' | 'declined';
  sender_id: string;
  receiver_id: string;
  created_at: string;
  friend: FriendProfile;
}

function formatRelativeTime(dateIso: string) {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  // Form edit fields
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editMajor, setEditMajor] = useState('');
  const [editGradYear, setEditGradYear] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPreferredStyle, setEditPreferredStyle] = useState('');
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // Activity Feed state
  const [feedItems, setFeedItems] = useState<FeedActivityItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Friends state (Story #31)
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [isFriendsModalVisible, setIsFriendsModalVisible] = useState<boolean>(false);
  const [friendsActiveTab, setFriendsActiveTab] = useState<FriendsTab>('friends');
  const [acceptedFriends, setAcceptedFriends] = useState<FriendshipEntry[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendshipEntry[]>([]);
  const [friendsModalLoading, setFriendsModalLoading] = useState<boolean>(false);
  const [searchUsername, setSearchUsername] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [friendsFeedback, setFriendsFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [user?.id]);

  const loadAllData = async () => {
    try {
      await Promise.all([fetchProfile(), fetchActivityFeed(), fetchFriendsSummary()]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchActivityFeed(), fetchFriendsSummary()]);
    setRefreshing(false);
  };

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      setErrorMessage('');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

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
    }
  };

  const fetchFriendsSummary = async () => {
    if (!user?.id) return;
    try {
      const [acceptedRes, pendingRes] = await Promise.all([
        supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'accepted')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
        supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('receiver_id', user.id),
      ]);

      if (acceptedRes.error && acceptedRes.error.code !== '42P01') {
        console.error('Accepted count error:', acceptedRes.error.message);
      } else {
        setFriendsCount(acceptedRes.count ?? 0);
      }

      if (pendingRes.error && pendingRes.error.code !== '42P01') {
        console.error('Pending count error:', pendingRes.error.message);
      } else {
        setPendingRequestsCount(pendingRes.count ?? 0);
      }
    } catch (err: any) {
      console.warn('Friends summary fetch error:', err.message);
    }
  };

  const loadFriendsModalData = async () => {
    if (!user?.id) return;
    try {
      setFriendsModalLoading(true);
      setFriendsFeedback(null);

      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) {
        if (error.code === '42P01') {
          setFriendsFeedback({
            message: 'Please create the friendships table in Supabase first.',
            isError: true,
          });
          return;
        }
        throw error;
      }

      const otherUserIds = Array.from(
        new Set(
          (friendships || []).map((f: any) =>
            f.sender_id === user.id ? f.receiver_id : f.sender_id
          )
        )
      );

      let profilesMap: Record<string, FriendProfile> = {};
      if (otherUserIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, major, avatar_url')
          .in('user_id', otherUserIds);

        if (!profError && profiles) {
          profiles.forEach((p: any) => {
            profilesMap[p.user_id] = p;
          });
        }
      }

      const acceptedList: FriendshipEntry[] = [];
      const pendingList: FriendshipEntry[] = [];

      (friendships || []).forEach((f: any) => {
        const otherId = f.sender_id === user.id ? f.receiver_id : f.sender_id;
        const friendProfile: FriendProfile = profilesMap[otherId] || {
          user_id: otherId,
          username: 'boilermaker',
          full_name: 'StudySpot Student',
          major: null,
          avatar_url: null,
        };

        const entry: FriendshipEntry = {
          friendship_id: f.id,
          status: f.status,
          sender_id: f.sender_id,
          receiver_id: f.receiver_id,
          created_at: f.created_at,
          friend: friendProfile,
        };

        if (f.status === 'accepted') {
          acceptedList.push(entry);
        } else if (f.status === 'pending' && f.receiver_id === user.id) {
          pendingList.push(entry);
        }
      });

      setAcceptedFriends(acceptedList);
      setIncomingRequests(pendingList);
      setFriendsCount(acceptedList.length);
      setPendingRequestsCount(pendingList.length);
    } catch (err: any) {
      setFriendsFeedback({ message: err.message || 'Error loading friends list.', isError: true });
    } finally {
      setFriendsModalLoading(false);
    }
  };

  const handleOpenFriendsModal = () => {
    setIsFriendsModalVisible(true);
    loadFriendsModalData();
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;
      setFriendsFeedback({ message: 'Friend request accepted!', isError: false });
      await loadFriendsModalData();
    } catch (err: any) {
      setFriendsFeedback({ message: err.message || 'Failed to accept request.', isError: true });
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (error) throw error;
      setFriendsFeedback({ message: 'Request declined.', isError: false });
      await loadFriendsModalData();
    } catch (err: any) {
      setFriendsFeedback({ message: err.message || 'Failed to decline request.', isError: true });
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
              if (error) throw error;
              setFriendsFeedback({ message: 'Friend removed.', isError: false });
              await loadFriendsModalData();
            } catch (err: any) {
              setFriendsFeedback({ message: err.message || 'Could not remove friend.', isError: true });
            }
          },
        },
      ]
    );
  };

  const handleSearchUsers = async () => {
    const query = searchUsername.trim().replace(/^@/, '');
    if (!query) return;

    try {
      setIsSearching(true);
      setFriendsFeedback(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, major, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('user_id', user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
      if ((data || []).length === 0) {
        setFriendsFeedback({ message: 'No Boilermakers found matching that username.', isError: false });
      }
    } catch (err: any) {
      setFriendsFeedback({ message: err.message || 'Error searching users.', isError: true });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user?.id) return;
    try {
      setFriendsFeedback(null);

      const { data: existing, error: checkError } = await supabase
        .from('friendships')
        .select('id, status')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`
        )
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existing) {
        if (existing.status === 'accepted') {
          setFriendsFeedback({ message: 'You are already friends with this user.', isError: true });
          return;
        }
        if (existing.status === 'pending') {
          setFriendsFeedback({ message: 'A friend request is already pending with this user.', isError: true });
          return;
        }
      }

      const { error: insertError } = await supabase.from('friendships').insert({
        sender_id: user.id,
        receiver_id: targetUserId,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setFriendsFeedback({ message: 'Friend request sent successfully!', isError: false });
      setSearchUsername('');
      setSearchResults([]);
    } catch (err: any) {
      setFriendsFeedback({ message: err.message || 'Failed to send request.', isError: true });
    }
  };

  const fetchActivityFeed = async () => {
    if (!user?.id) return;
    try {
      setActivityLoading(true);
      setActivityError(null);

      const [reviewsRes, favsRes, locationsRes] = await Promise.all([
        supabase
          .from('reviews')
          .select('id, overall_rating, review_text, created_at, location_id')
          .eq('user_id', user.id),
        supabase
          .from('favorites')
          .select('user_id, location_id, created_at')
          .eq('user_id', user.id),
        supabase
          .from('study_locations')
          .select('id, name, category, building'),
      ]);

      if (reviewsRes.error) throw new Error(reviewsRes.error.message);
      if (favsRes.error) throw new Error(favsRes.error.message);
      if (locationsRes.error) throw new Error(locationsRes.error.message);

      const locationMap = new Map<string, { name: string; category: string }>();
      (locationsRes.data || []).forEach((loc: any) => {
        locationMap.set(String(loc.id), {
          name: loc.name || 'Campus Location',
          category: loc.category || 'Study Spot',
        });
      });

      const reviewEntries: FeedActivityItem[] = (reviewsRes.data || []).map((r: any) => {
        const strId = String(r.location_id);
        const spot = locationMap.get(strId);
        return {
          id: `rev-${r.id}`,
          type: 'review',
          created_at: r.created_at,
          location_id: strId,
          location_name: spot?.name || 'Purdue Study Spot',
          location_category: spot?.category || 'Study Spot',
          rating: r.overall_rating,
          comment: r.review_text,
        };
      });

      const favoriteEntries: FeedActivityItem[] = (favsRes.data || []).map((f: any) => {
        const strId = String(f.location_id);
        const spot = locationMap.get(strId);
        return {
          id: `fav-${f.user_id}-${f.location_id}`,
          type: 'favorite',
          created_at: f.created_at,
          location_id: strId,
          location_name: spot?.name || 'Purdue Study Spot',
          location_category: spot?.category || 'Study Spot',
        };
      });

      const combined = [...reviewEntries, ...favoriteEntries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setFeedItems(combined);
    } catch (err: any) {
      setActivityError(err.message || 'Failed to load personal feed.');
    } finally {
      setActivityLoading(false);
    }
  };

  const filteredFeed = useMemo(() => {
    if (activeFilter === 'all') return feedItems;
    if (activeFilter === 'reviews') return feedItems.filter((i) => i.type === 'review');
    return feedItems.filter((i) => i.type === 'favorite');
  }, [feedItems, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: feedItems.length,
      reviews: feedItems.filter((i) => i.type === 'review').length,
      favorites: feedItems.filter((i) => i.type === 'favorite').length,
    };
  }, [feedItems]);

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

  const navigateToLocation = (locationId: string) => {
    if (!locationId) return;
    router.push(`/review/${locationId}`);
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
      }
    >
      {/* Top Header Card */}
      <View style={styles.topHeaderCard}>
        <View>
          <Text style={styles.appTitle}>STUDYSPOT PURDUE</Text>
          <Text style={styles.headerSubtitle}>Account & My Feed</Text>
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

      {/* Main Profile Info Card */}
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

            {bio ? (
              <View style={styles.bioCard}>
                <View style={styles.bioHeadingRow}>
                  <MaterialCommunityIcons name="text-account" size={16} color={COLORS.goldDark} />
                  <Text style={styles.bioHeaderTitle}>ABOUT ME</Text>
                </View>
                <Text style={styles.bioBodyText}>{bio}</Text>
              </View>
            ) : null}

            {/* Story #31: Friends Stats & Manage Action Bar */}
            <View style={styles.friendsCardBar}>
              <View style={styles.friendStats}>
                <MaterialCommunityIcons name="account-group-outline" size={22} color={COLORS.goldDark} />
                <View>
                  <Text style={styles.friendCountText}>
                    <Text style={styles.friendCountBold}>{friendsCount}</Text> {friendsCount === 1 ? 'Friend' : 'Friends'}
                  </Text>
                  {pendingRequestsCount > 0 ? (
                    <Text style={styles.friendSubText}>{pendingRequestsCount} pending</Text>
                  ) : null}
                </View>
                {pendingRequestsCount > 0 ? (
                  <View style={styles.pendingAlertBadge}>
                    <Text style={styles.pendingAlertBadgeText}>{pendingRequestsCount}</Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                style={({ pressed }) => [styles.manageFriendsBtn, pressed && styles.pressed]}
                onPress={handleOpenFriendsModal}
              >
                <MaterialCommunityIcons name="account-cog-outline" size={16} color={COLORS.header} />
                <Text style={styles.manageFriendsBtnText}>Manage Friends</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Unified Personal Activity Feed */}
      {!isEditing ? (
        <View style={styles.feedWrapper}>
          <View style={styles.feedHeaderRow}>
            <View>
              <Text style={styles.feedSectionTitle}>MY ACTIVITY FEED</Text>
              <Text style={styles.feedSectionSubtitle}>My StudySpot history</Text>
            </View>
            <View style={styles.feedCountPill}>
              <Text style={styles.feedCountPillText}>{counts.all} events</Text>
            </View>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterChipRow}>
            <Pressable
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
                All ({counts.all})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.filterChip, activeFilter === 'reviews' && styles.filterChipActive]}
              onPress={() => setActiveFilter('reviews')}
            >
              <MaterialCommunityIcons
                name="star-outline"
                size={14}
                color={activeFilter === 'reviews' ? COLORS.header : COLORS.muted}
              />
              <Text style={[styles.filterChipText, activeFilter === 'reviews' && styles.filterChipTextActive]}>
                Reviews ({counts.reviews})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.filterChip, activeFilter === 'favorites' && styles.filterChipActive]}
              onPress={() => setActiveFilter('favorites')}
            >
              <MaterialCommunityIcons
                name="heart-outline"
                size={14}
                color={activeFilter === 'favorites' ? COLORS.header : COLORS.muted}
              />
              <Text style={[styles.filterChipText, activeFilter === 'favorites' && styles.filterChipTextActive]}>
                Favorites ({counts.favorites})
              </Text>
            </Pressable>
          </View>

          {/* Feed States */}
          {activityLoading ? (
            <View style={styles.feedEmptyCard}>
              <ActivityIndicator color={COLORS.gold} size="small" />
              <Text style={styles.feedEmptyText}>Loading your activity feed...</Text>
            </View>
          ) : activityError ? (
            <View style={styles.feedEmptyCard}>
              <MaterialCommunityIcons name="alert-circle-outline" size={28} color={COLORS.delete} />
              <Text style={[styles.feedEmptyTitle, { color: COLORS.delete }]}>Could not load feed</Text>
              <Text style={styles.feedEmptyText}>{activityError}</Text>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
                onPress={fetchActivityFeed}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : filteredFeed.length === 0 ? (
            <View style={styles.feedEmptyCard}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons
                  name={
                    activeFilter === 'favorites'
                      ? 'heart-outline'
                      : activeFilter === 'reviews'
                      ? 'star-outline'
                      : 'school-outline'
                  }
                  size={32}
                  color={COLORS.goldDark}
                />
              </View>

              <Text style={styles.feedEmptyTitle}>
                {activeFilter === 'favorites'
                  ? 'No favorites saved yet'
                  : activeFilter === 'reviews'
                  ? 'No reviews submitted yet'
                  : 'No activity recorded yet'}
              </Text>

              <Text style={styles.feedEmptyText}>
                {activeFilter === 'favorites'
                  ? 'Every great study session starts with the right spot! Heart your go-to campus nooks to keep them handy.'
                  : activeFilter === 'reviews'
                  ? 'Your feedback helps your fellow Boilermakers find focus. Review your favorite study spots to share the wisdom!'
                  : 'Your Boilermaker journey is just getting started! Find your favorite desk, lock in, and make great things happen today.'}
              </Text>

              <Text style={styles.motivationalQuote}>
                "Success is the sum of small efforts, repeated day in and day out."
              </Text>
            </View>
          ) : (
            <View style={styles.feedTimeline}>
              {filteredFeed.map((item, index) => {
                const isReview = item.type === 'review';
                const isLast = index === filteredFeed.length - 1;

                return (
                  <View key={item.id} style={styles.timelineItem}>
                    <View style={styles.spineColumn}>
                      <View
                        style={[
                          styles.timelineNode,
                          {
                            backgroundColor: isReview ? COLORS.goldSoft : '#FCE8E6',
                            borderColor: isReview ? COLORS.goldDark : COLORS.heart,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={isReview ? 'star' : 'heart'}
                          size={14}
                          color={isReview ? COLORS.goldDark : COLORS.heart}
                        />
                      </View>
                      {!isLast ? <View style={styles.spineLine} /> : null}
                    </View>

                    <Pressable
                      style={({ pressed }) => [styles.timelineCard, pressed && styles.pressed]}
                      onPress={() => navigateToLocation(item.location_id)}
                    >
                      <View style={styles.timelineCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.timelineEventAction}>
                            {isReview ? 'Reviewed a spot' : 'Favorited a location'}
                          </Text>
                          <Text style={styles.timelineLocName}>{item.location_name}</Text>
                        </View>
                        <Text style={styles.timelineTimestamp}>
                          {formatRelativeTime(item.created_at)}
                        </Text>
                      </View>

                      {isReview && item.rating ? (
                        <View style={styles.ratingBadge}>
                          <MaterialCommunityIcons name="star" size={13} color={COLORS.star} />
                          <Text style={styles.ratingBadgeText}>{item.rating} / 5</Text>
                        </View>
                      ) : null}

                      {isReview && item.comment ? (
                        <Text style={styles.timelineComment} numberOfLines={3}>
                          "{item.comment}"
                        </Text>
                      ) : null}

                      <View style={styles.timelineCardFooter}>
                        <Text style={styles.timelineCategory}>{item.location_category}</Text>
                        <View style={styles.tapPrompt}>
                          <Text style={styles.tapPromptText}>View Spot</Text>
                          <MaterialCommunityIcons name="chevron-right" size={14} color={COLORS.goldDark} />
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {/* Logout Action */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
        onPress={signOut}
      >
        <MaterialCommunityIcons name="logout-variant" size={18} color={COLORS.delete} />
        <Text style={styles.logoutBtnText}>Log Out of Boilermaker Account</Text>
      </Pressable>

      {/* Story #31: Slide-Up Manage Friends Modal */}
      <Modal
        visible={isFriendsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFriendsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
            {/* Modal Handle & Header */}
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSubheading}>BOILERMAKER CONNECTIONS</Text>
                <Text style={styles.modalTitle}>Manage Friends</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}
                onPress={() => setIsFriendsModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={20} color={COLORS.header} />
              </Pressable>
            </View>

            {/* Modal Sub-Tabs */}
            <View style={styles.modalTabsRow}>
              <Pressable
                style={[styles.modalTab, friendsActiveTab === 'friends' && styles.modalTabActive]}
                onPress={() => {
                  setFriendsActiveTab('friends');
                  setFriendsFeedback(null);
                }}
              >
                <Text style={[styles.modalTabText, friendsActiveTab === 'friends' && styles.modalTabTextActive]}>
                  Friends ({friendsCount})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modalTab, friendsActiveTab === 'requests' && styles.modalTabActive]}
                onPress={() => {
                  setFriendsActiveTab('requests');
                  setFriendsFeedback(null);
                }}
              >
                <Text style={[styles.modalTabText, friendsActiveTab === 'requests' && styles.modalTabTextActive]}>
                  Requests {pendingRequestsCount > 0 ? `(${pendingRequestsCount})` : ''}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modalTab, friendsActiveTab === 'add' && styles.modalTabActive]}
                onPress={() => {
                  setFriendsActiveTab('add');
                  setFriendsFeedback(null);
                }}
              >
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={15}
                  color={friendsActiveTab === 'add' ? COLORS.header : COLORS.muted}
                />
                <Text style={[styles.modalTabText, friendsActiveTab === 'add' && styles.modalTabTextActive]}>
                  Add Friend
                </Text>
              </Pressable>
            </View>

            {/* Feedback Message Banner */}
            {friendsFeedback ? (
              <View
                style={[
                  styles.modalFeedbackBanner,
                  friendsFeedback.isError ? styles.feedbackError : styles.feedbackSuccess,
                ]}
              >
                <MaterialCommunityIcons
                  name={friendsFeedback.isError ? 'alert-circle-outline' : 'check-circle-outline'}
                  size={16}
                  color={friendsFeedback.isError ? COLORS.delete : COLORS.success}
                />
                <Text
                  style={[
                    styles.modalFeedbackText,
                    { color: friendsFeedback.isError ? COLORS.delete : COLORS.success },
                  ]}
                >
                  {friendsFeedback.message}
                </Text>
              </View>
            ) : null}

            {/* Tab 1: Accepted Friends List */}
            {friendsActiveTab === 'friends' ? (
              friendsModalLoading ? (
                <View style={styles.modalLoadingBox}>
                  <ActivityIndicator color={COLORS.gold} size="small" />
                  <Text style={styles.modalLoadingText}>Loading friends...</Text>
                </View>
              ) : acceptedFriends.length === 0 ? (
                <View style={styles.modalEmptyBox}>
                  <MaterialCommunityIcons name="account-group-outline" size={40} color={COLORS.icon} />
                  <Text style={styles.modalEmptyTitle}>No friends added yet</Text>
                  <Text style={styles.modalEmptySubtitle}>
                    Study Spot is better with friends! Switch to the Add Friend tab to search for fellow Boilermakers.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.modalListScroll} showsVerticalScrollIndicator={false}>
                  {acceptedFriends.map((f) => (
                    <View key={f.friendship_id} style={styles.userRowCard}>
                      <View style={styles.userRowAvatarBox}>
                        {f.friend.avatar_url ? (
                          <Image source={{ uri: f.friend.avatar_url }} style={styles.userRowAvatar} />
                        ) : (
                          <View style={styles.userRowAvatarFallback}>
                            <Text style={styles.userRowInitial}>
                              {(f.friend.full_name || f.friend.username || 'B').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.userRowInfo}>
                        <Text style={styles.userRowName}>{f.friend.full_name || f.friend.username}</Text>
                        <Text style={styles.userRowUsername}>{'@' + f.friend.username}</Text>
                        {f.friend.major ? <Text style={styles.userRowMajor}>{f.friend.major}</Text> : null}
                      </View>

                      <Pressable
                        style={({ pressed }) => [styles.userActionDangerBtn, pressed && styles.pressed]}
                        onPress={() =>
                          handleRemoveFriend(f.friendship_id, f.friend.full_name || f.friend.username)
                        }
                      >
                        <MaterialCommunityIcons name="account-remove-outline" size={16} color={COLORS.delete} />
                        <Text style={styles.userActionDangerText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )
            ) : null}

            {/* Tab 2: Incoming Requests */}
            {friendsActiveTab === 'requests' ? (
              friendsModalLoading ? (
                <View style={styles.modalLoadingBox}>
                  <ActivityIndicator color={COLORS.gold} size="small" />
                  <Text style={styles.modalLoadingText}>Checking requests...</Text>
                </View>
              ) : incomingRequests.length === 0 ? (
                <View style={styles.modalEmptyBox}>
                  <MaterialCommunityIcons name="email-check-outline" size={40} color={COLORS.icon} />
                  <Text style={styles.modalEmptyTitle}>No pending requests</Text>
                  <Text style={styles.modalEmptySubtitle}>
                    You're all caught up! New Boilermaker friend requests will appear here.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.modalListScroll} showsVerticalScrollIndicator={false}>
                  {incomingRequests.map((req) => (
                    <View key={req.friendship_id} style={styles.userRowCard}>
                      <View style={styles.userRowAvatarBox}>
                        {req.friend.avatar_url ? (
                          <Image source={{ uri: req.friend.avatar_url }} style={styles.userRowAvatar} />
                        ) : (
                          <View style={styles.userRowAvatarFallback}>
                            <Text style={styles.userRowInitial}>
                              {(req.friend.full_name || req.friend.username || 'B').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.userRowInfo}>
                        <Text style={styles.userRowName}>{req.friend.full_name || req.friend.username}</Text>
                        <Text style={styles.userRowUsername}>{'@' + req.friend.username}</Text>
                        {req.friend.major ? <Text style={styles.userRowMajor}>{req.friend.major}</Text> : null}
                      </View>

                      <View style={styles.actionPillsCol}>
                        <Pressable
                          style={({ pressed }) => [styles.acceptBtn, pressed && styles.pressed]}
                          onPress={() => handleAcceptRequest(req.friendship_id)}
                        >
                          <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [styles.declineBtn, pressed && styles.pressed]}
                          onPress={() => handleDeclineRequest(req.friendship_id)}
                        >
                          <MaterialCommunityIcons name="close" size={14} color={COLORS.delete} />
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )
            ) : null}

            {/* Tab 3: Search & Add Friend */}
            {friendsActiveTab === 'add' ? (
              <View style={styles.addTabContainer}>
                <View style={styles.searchBarRow}>
                  <MaterialCommunityIcons name="magnify" size={20} color={COLORS.muted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search Boilermaker username..."
                    placeholderTextColor={COLORS.muted}
                    value={searchUsername}
                    onChangeText={setSearchUsername}
                    autoCapitalize="none"
                    returnKeyType="search"
                    onSubmitEditing={handleSearchUsers}
                  />
                  {searchUsername.length > 0 ? (
                    <Pressable
                      style={({ pressed }) => [styles.searchActionBtn, pressed && styles.pressed]}
                      onPress={handleSearchUsers}
                    >
                      <Text style={styles.searchActionBtnText}>Search</Text>
                    </Pressable>
                  ) : null}
                </View>

                {isSearching ? (
                  <View style={styles.modalLoadingBox}>
                    <ActivityIndicator color={COLORS.gold} size="small" />
                    <Text style={styles.modalLoadingText}>Searching campus directory...</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.modalListScroll} showsVerticalScrollIndicator={false}>
                    {searchResults.map((target) => (
                      <View key={target.user_id} style={styles.userRowCard}>
                        <View style={styles.userRowAvatarBox}>
                          {target.avatar_url ? (
                            <Image source={{ uri: target.avatar_url }} style={styles.userRowAvatar} />
                          ) : (
                            <View style={styles.userRowAvatarFallback}>
                              <Text style={styles.userRowInitial}>
                                {(target.full_name || target.username || 'B').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.userRowInfo}>
                          <Text style={styles.userRowName}>{target.full_name || target.username}</Text>
                          <Text style={styles.userRowUsername}>{'@' + target.username}</Text>
                          {target.major ? <Text style={styles.userRowMajor}>{target.major}</Text> : null}
                        </View>

                        <Pressable
                          style={({ pressed }) => [styles.sendRequestBtn, pressed && styles.pressed]}
                          onPress={() => handleSendFriendRequest(target.user_id)}
                        >
                          <MaterialCommunityIcons name="account-plus" size={14} color={COLORS.white} />
                          <Text style={styles.sendRequestBtnText}>Add</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
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
  },
  displayUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.goldDark,
    marginTop: 2,
  },
  displayEmail: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
    marginBottom: 16,
  },
  academicBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
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
    marginBottom: 14,
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
    marginBottom: 14,
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
  /* Friends Bar in Profile */
  friendsCardBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  friendStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendCountText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  friendCountBold: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.header,
  },
  friendSubText: {
    fontSize: 11,
    color: COLORS.goldDark,
    fontWeight: '700',
  },
  pendingAlertBadge: {
    backgroundColor: COLORS.goldDark,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  pendingAlertBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  manageFriendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  manageFriendsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.header,
  },
  /* Form Editing Styles */
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
  /* Activity Feed Styles */
  feedWrapper: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 20,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: COLORS.goldDark,
  },
  feedSectionSubtitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.header,
  },
  feedCountPill: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feedCountPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: COLORS.goldSoft,
    borderColor: COLORS.goldDark,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  filterChipTextActive: {
    color: COLORS.header,
    fontWeight: '800',
  },
  feedEmptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  feedEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.header,
    marginTop: 4,
  },
  feedEmptyText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  motivationalQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.goldDark,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.header,
  },
  feedTimeline: {
    width: '100%',
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  spineColumn: {
    alignItems: 'center',
    width: 28,
  },
  timelineNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  spineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: COLORS.header,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  timelineEventAction: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  timelineLocName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 1,
  },
  timelineTimestamp: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
    marginLeft: 6,
  },
  ratingBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.header,
  },
  timelineComment: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 8,
  },
  timelineCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  timelineCategory: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  tapPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tapPromptText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.goldDark,
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
    marginTop: 10,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.delete,
  },

  /* Story #31: Slide-Up Friends Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(33, 26, 21, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 44,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalSubheading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: COLORS.goldDark,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.header,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTabActive: {
    backgroundColor: COLORS.goldSoft,
    borderColor: COLORS.goldDark,
  },
  modalTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  modalTabTextActive: {
    color: COLORS.header,
    fontWeight: '800',
  },
  modalFeedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: COLORS.successBackground,
    borderColor: COLORS.success,
  },
  feedbackError: {
    backgroundColor: COLORS.deleteBackground,
    borderColor: COLORS.delete,
  },
  modalFeedbackText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  modalLoadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  modalEmptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 6,
  },
  modalEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.header,
    marginTop: 6,
  },
  modalEmptySubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  modalListScroll: {
    maxHeight: 380,
  },
  userRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  userRowAvatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  userRowAvatar: {
    width: '100%',
    height: '100%',
  },
  userRowAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userRowInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  userRowInfo: {
    flex: 1,
  },
  userRowName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  userRowUsername: {
    fontSize: 12,
    color: COLORS.goldDark,
    fontWeight: '700',
  },
  userRowMajor: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  userActionDangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.deleteBackground,
    borderWidth: 1,
    borderColor: COLORS.delete,
    borderRadius: 10,
  },
  userActionDangerText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.delete,
  },
  actionPillsCol: {
    gap: 6,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.gold,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  acceptBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.deleteBackground,
    borderWidth: 1,
    borderColor: COLORS.delete,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  declineBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.delete,
  },
  addTabContainer: {
    width: '100%',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  searchActionBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  searchActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  sendRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.gold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  sendRequestBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
});