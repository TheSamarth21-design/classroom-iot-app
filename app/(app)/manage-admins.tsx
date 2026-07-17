import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../constants/theme';
import { AppUser } from '../../types';

const DEVELOPER_EMAIL = 'samarthbhoite88@gmail.com';

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function ManageAdminsScreen() {
  const { user } = useAuth();

  // ── Strict developer email gate ──
  if (user?.email !== DEVELOPER_EMAIL) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.deniedContainer}>
          <View style={styles.deniedIconBox}>
            <Ionicons name="lock-closed-outline" size={48} color={Colors.error} />
          </View>
          <Text style={styles.deniedTitle}>Access Denied</Text>
          <Text style={styles.deniedText}>
            This screen is restricted to the application developer.
          </Text>
          <TouchableOpacity style={styles.deniedBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.deniedBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <ManageAdminsContent />;
}

// ─── Inner Content ────────────────────────────────────────────────────────

function ManageAdminsContent() {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<AppUser | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const [admins, setAdmins] = useState<AppUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const unsubscribe: Unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser));
      setAdmins(data);
      setAdminsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Search by email ──
  const handleSearch = async () => {
    const email = searchEmail.toLowerCase().trim();
    if (!email) {
      Alert.alert('Enter Email', 'Please enter an email address to search.');
      return;
    }

    setSearchLoading(true);
    setSearchResult(null);
    setSearched(true);

    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);

      if (snap.empty) {
        setSearchResult(null);
      } else {
        const d = snap.docs[0];
        setSearchResult({ uid: d.id, ...d.data() } as AppUser);
      }
    } catch (err: any) {
      Alert.alert('Search Error', err.message ?? 'Could not search users.');
    } finally {
      setSearchLoading(false);
    }
  };

  // ── Promote to admin ──
  const handlePromote = (targetUser: AppUser) => {
    Alert.alert(
      'Promote to Admin',
      `Are you sure you want to promote "${targetUser.displayName}" (${targetUser.email}) to Admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            setPromoting(true);
            try {
              await updateDoc(doc(db, 'users', targetUser.uid), { role: 'admin' });
              setSearchResult({ ...targetUser, role: 'admin' });
              Alert.alert('Success', `${targetUser.displayName} is now an Admin.`);
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to promote user.');
            } finally {
              setPromoting(false);
            }
          },
        },
      ]
    );
  };

  // ── Render admin item ──
  const renderAdminItem = ({ item }: { item: AppUser }) => (
    <View style={styles.adminItem}>
      <View style={styles.adminAvatar}>
        <Ionicons name="person-outline" size={18} color={Colors.primary} />
      </View>
      <View style={styles.adminInfo}>
        <Text style={styles.adminName} numberOfLines={1}>{item.displayName}</Text>
        <Text style={styles.adminEmail} numberOfLines={1}>{item.email}</Text>
      </View>
      <View style={styles.roleBadge}>
        <Ionicons name="shield-checkmark-outline" size={12} color={Colors.primary} />
        <Text style={styles.roleBadgeText}>Admin</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Manage Admins</Text>
            <Text style={styles.headerSub}>Developer Console</Text>
          </View>
          <View style={styles.devBadge}>
            <Ionicons name="code-slash" size={14} color={Colors.warning} />
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Look Up User</Text>
          <Text style={styles.sectionDesc}>
            Search by email to find and promote teachers to Admin.
          </Text>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Ionicons
                name="search-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="teacher@example.com"
                placeholderTextColor={Colors.textMuted}
                value={searchEmail}
                onChangeText={setSearchEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleSearch}
              disabled={searchLoading}
            >
              {searchLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Search Result */}
          {searched && !searchLoading && (
            <View style={styles.resultContainer}>
              {searchResult ? (
                <View style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <View style={styles.resultAvatar}>
                      <Ionicons name="person-outline" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{searchResult.displayName}</Text>
                      <Text style={styles.resultEmail}>{searchResult.email}</Text>
                    </View>
                  </View>

                  <View style={styles.resultDivider} />

                  <View style={styles.resultFooter}>
                    <View style={styles.resultRolePill}>
                      <Ionicons
                        name={searchResult.role === 'admin' ? 'shield-checkmark-outline' : 'person-outline'}
                        size={14}
                        color={searchResult.role === 'admin' ? Colors.primary : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.resultRoleText,
                          searchResult.role === 'admin' && styles.resultRoleAdmin,
                        ]}
                      >
                        {searchResult.role === 'admin' ? 'Admin' : 'Standard User'}
                      </Text>
                    </View>

                    {searchResult.role !== 'admin' && (
                      <TouchableOpacity
                        style={styles.promoteBtn}
                        onPress={() => handlePromote(searchResult)}
                        disabled={promoting}
                      >
                        {promoting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="arrow-up-circle-outline" size={16} color="#fff" />
                            <Text style={styles.promoteBtnText}>Promote to Admin</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.noResult}>
                  <Ionicons name="person-remove-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.noResultText}>No user found with that email.</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Active Admins List */}
        <View style={styles.adminsSection}>
          <View style={styles.adminsSectionHeader}>
            <Text style={styles.sectionTitle}>Active Administrators</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{admins.length}</Text>
            </View>
          </View>

          {adminsLoading ? (
            <View style={styles.adminsLoader}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : admins.length === 0 ? (
            <View style={styles.adminsEmpty}>
              <Text style={styles.adminsEmptyText}>No administrators found.</Text>
            </View>
          ) : (
            <FlatList
              data={admins}
              keyExtractor={(item) => item.uid}
              renderItem={renderAdminItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.adminsList}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Access Denied ──
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  deniedIconBox: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    backgroundColor: Colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deniedTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  deniedText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  deniedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
    ...Shadow.primary,
  },
  deniedBtnText: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: '#fff',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  devBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.2)',
  },

  // ── Search Section ──
  searchSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 19,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.md,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.primary,
  },

  // ── Search Result ──
  resultContainer: {
    marginTop: Spacing.lg,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  resultEmail: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  resultDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.inactive,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultRoleText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  resultRoleAdmin: {
    color: Colors.primary,
  },
  promoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    ...Shadow.primary,
  },
  promoteBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: '#fff',
  },
  noResult: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noResultText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },

  // ── Active Admins Section ──
  adminsSection: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  adminsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  adminsList: {
    paddingBottom: Spacing.xxl,
  },
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminAvatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  adminEmail: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  roleBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  adminsLoader: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  adminsEmpty: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  adminsEmptyText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
});
