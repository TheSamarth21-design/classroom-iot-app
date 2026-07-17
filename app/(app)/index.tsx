import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Animated,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClassrooms } from '../../hooks/useClassrooms';
import { useAuth } from '../../contexts/AuthContext';
import { createClassroom, deleteClassroom } from '../../services/firestoreService';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../constants/theme';
import { Classroom } from '../../types';
import { ApplianceOptions } from '../../constants/icons';

const DEVELOPER_EMAIL = 'samarthbhoite88@gmail.com';

const DEFAULT_SWITCHES = [
  { label: 'Light 1', icon: 'lightbulb-outline', virtual_pin: 'V1', order: 1 },
  { label: 'Light 2', icon: 'lightbulb-outline', virtual_pin: 'V2', order: 2 },
  { label: 'Light 3', icon: 'lightbulb-outline', virtual_pin: 'V3', order: 3 },
  { label: 'Light 4', icon: 'lightbulb-outline', virtual_pin: 'V4', order: 4 },
  { label: 'Light 5 & 6', icon: 'lightbulb-outline', virtual_pin: 'V5', order: 5 },
  { label: 'AC 1', icon: 'ac', virtual_pin: 'V6', order: 6 },
];

// ─── Classroom Card ────────────────────────────────────────────────────────

interface ClassroomCardProps {
  classroom: Classroom;
  isAdmin: boolean;
  onDelete: (classroom: Classroom) => void;
}

function ClassroomCard({ classroom, isAdmin, onDelete }: ClassroomCardProps) {
  const activeCount = Object.values(classroom.states ?? {}).filter((v) => v === 1).length;

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: '/(app)/classroom/[id]',
            params: { id: classroom.id, name: classroom.name },
          })
        }
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, activeCount > 0 && styles.iconBoxActive]}>
            <Ionicons
              name="school-outline"
              size={22}
              color={activeCount > 0 ? Colors.primary : Colors.textSecondary}
            />
          </View>
          <View style={[styles.statusDot, activeCount > 0 && styles.statusDotActive]} />
        </View>

        <Text style={styles.cardName} numberOfLines={1}>{classroom.name}</Text>
        <Text style={styles.cardId}>ID: {classroom.id}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>
            {activeCount === 0 ? 'No active devices' : `${activeCount} active device${activeCount > 1 ? 's' : ''}`}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>

      {/* Delete Classroom Trash Button */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.cardTrashBtn}
          onPress={() => onDelete(classroom)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { classrooms, loading } = useClassrooms();
  const { user, isAdmin, signOut } = useAuth();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const isDeveloper = user?.email === DEVELOPER_EMAIL;

  // Add Classroom Modal States
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [blynkToken, setBlynkToken] = useState('');
  const [blynkTemplate, setBlynkTemplate] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Dynamic Switch List inside classroom creation
  const [initialSwitches, setInitialSwitches] = useState<typeof DEFAULT_SWITCHES>([]);

  useEffect(() => {
    if (addModalVisible) {
      // Seed default layout when opening modal
      setInitialSwitches(JSON.parse(JSON.stringify(DEFAULT_SWITCHES)));
    }
  }, [addModalVisible]);

  // Heartbeat animation for active grid status dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  // Add Switch to list before saving
  const addSwitchToRoster = () => {
    const nextPinNum = initialSwitches.length + 1;
    setInitialSwitches([
      ...initialSwitches,
      {
        label: `Appliance ${nextPinNum}`,
        icon: 'lightbulb-outline',
        virtual_pin: `V${nextPinNum}`,
        order: nextPinNum,
      },
    ]);
  };

  // Remove Switch from list before saving
  const removeSwitchFromRoster = (index: number) => {
    const updated = initialSwitches.filter((_, i) => i !== index).map((sw, i) => ({
      ...sw,
      order: i + 1,
    }));
    setInitialSwitches(updated);
  };

  // Update Switch properties in roster
  const updateRosterSwitch = (index: number, key: string, value: string) => {
    const updated = [...initialSwitches];
    updated[index] = { ...updated[index], [key]: value };
    setInitialSwitches(updated);
  };

  // Create Classroom handler
  const handleCreateClassroom = async () => {
    if (!className.trim() || !blynkToken.trim() || !blynkTemplate.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all classroom details.');
      return;
    }

    setSaveLoading(true);
    try {
      await createClassroom(
        className.trim(),
        blynkToken.trim(),
        blynkTemplate.trim(),
        initialSwitches
      );
      setClassName('');
      setBlynkToken('');
      setBlynkTemplate('');
      setAddModalVisible(false);
      Alert.alert('Success', 'Classroom and switch matrix created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not create classroom.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete Classroom handler
  const handleDeleteClassroom = (classroom: Classroom) => {
    Alert.alert(
      'Delete Classroom',
      `Are you sure you want to delete "${classroom.name}" and all its switches? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClassroom(classroom.id);
              Alert.alert('Success', 'Classroom deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Could not delete classroom.');
            }
          },
        },
      ]
    );
  };

  // Calculate global summary stats
  const totalClassrooms = classrooms.length;
  const activeClassroomsCount = classrooms.filter((c) => {
    const statesMap = c.states ?? {};
    return Object.values(statesMap).some((v) => v === 1);
  }).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Blurry background watermark logo */}
      <Image
        source={require('../../assets/logo.png')}
        style={styles.blurryBgLogo}
        blurRadius={20}
        resizeMode="contain"
      />
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.displayName?.split(' ')[0] ?? 'there'} 👋
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>Dashboard</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addClassroomBtn}
              onPress={() => setAddModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          {isDeveloper && (
            <TouchableOpacity
              style={styles.devBtn}
              onPress={() => router.push('/(app)/manage-admins')}
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.avatarBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>Control Node Status</Text>
          <Text style={styles.heroSubtitle}>Classroom energy diagnostics</Text>

          <View style={styles.heroMetricRow}>
            <Ionicons name="flash-outline" size={20} color={Colors.primary} />
            <Text style={styles.heroMetricText}>
              {activeClassroomsCount} Active Classrooms
            </Text>
          </View>

          <View style={styles.heroStatusIndicator}>
            <Animated.View style={[styles.statusPulseDot, { opacity: pulseAnim }]} />
            <Text style={styles.heroStatusLabel}>
              {totalClassrooms > 0 ? 'GRID OPERATIONAL' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        <View style={styles.heroRight}>
          <View style={styles.circularBadgeContainer}>
            <Text style={styles.badgeNum}>
              {totalClassrooms}
            </Text>
            <Text style={styles.badgeLbl}>Total Nodes</Text>
          </View>
        </View>
      </View>

      {/* Classrooms List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>My Rooms</Text>
        <Text style={styles.listSubtitle}>Control your smart devices</Text>
      </View>

      {/* Classrooms List */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.emptyText}>Syncing nodes...</Text>
        </View>
      ) : classrooms.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Classrooms Yet</Text>
          <Text style={styles.emptyText}>
            {isAdmin
              ? 'Add your first classroom by clicking the + button above.'
              : 'No classrooms have been set up yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={classrooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClassroomCard classroom={item} isAdmin={isAdmin} onDelete={handleDeleteClassroom} />
          )}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Add Classroom Modal (with Dynamic Switch configuration) ── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardAvoiding}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Classroom</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* Class Specs */}
                <Text style={styles.modalSectionHeading}>Class Details</Text>
                
                <Text style={styles.modalLabel}>Classroom Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Physics Lab, Room 302"
                  placeholderTextColor={Colors.textMuted}
                  value={className}
                  onChangeText={setClassName}
                />

                <Text style={styles.modalLabel}>Blynk Auth Token</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Paste Blynk Auth Token"
                  placeholderTextColor={Colors.textMuted}
                  value={blynkToken}
                  onChangeText={setBlynkToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.modalLabel}>Blynk Template ID</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. TMPL6xxxxxxxx"
                  placeholderTextColor={Colors.textMuted}
                  value={blynkTemplate}
                  onChangeText={setBlynkTemplate}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Switches specs */}
                <View style={styles.switchSectionHeader}>
                  <Text style={styles.modalSectionHeading}>Switches Configuration</Text>
                  <TouchableOpacity style={styles.addRosterBtn} onPress={addSwitchToRoster}>
                    <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.addRosterText}>Add Switch</Text>
                  </TouchableOpacity>
                </View>

                {initialSwitches.length === 0 ? (
                  <View style={styles.emptyRoster}>
                    <Text style={styles.emptyRosterText}>No switches added. Add at least one switch.</Text>
                  </View>
                ) : (
                  initialSwitches.map((item, idx) => (
                    <View key={idx} style={styles.switchRosterRow}>
                      {/* Name input */}
                      <TextInput
                        style={[styles.rosterInput, { flex: 2 }]}
                        placeholder="Switch Name"
                        placeholderTextColor={Colors.textMuted}
                        value={item.label}
                        onChangeText={(val) => updateRosterSwitch(idx, 'label', val)}
                      />
                      {/* Pin input */}
                      <TextInput
                        style={[styles.rosterInput, { flex: 1, textAlign: 'center' }]}
                        placeholder="Pin (e.g. V1)"
                        placeholderTextColor={Colors.textMuted}
                        value={item.virtual_pin}
                        autoCapitalize="characters"
                        onChangeText={(val) => updateRosterSwitch(idx, 'virtual_pin', val)}
                      />
                      {/* Remove item */}
                      <TouchableOpacity
                        style={styles.rosterTrashBtn}
                        onPress={() => removeSwitchFromRoster(idx)}
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, saveLoading && styles.btnDisabled]}
                onPress={handleCreateClassroom}
                disabled={saveLoading}
                activeOpacity={0.8}
              >
                {saveLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Create Classroom Node</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  blurryBgLogo: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    width: '80%',
    height: 300,
    opacity: 0.03, // very light watermark for background
    zIndex: -1,
  },
  headerLogo: {
    width: 100,
    height: 45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(43, 182, 115, 0.2)',
  },
  adminBadgeText: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  addClassroomBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  devBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(43, 182, 115, 0.2)',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // ── Solar Style Hero Card ──
  heroCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceDark,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.sm,
  },
  heroLeft: {
    flex: 1.3,
  },
  heroTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: Typography.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: Spacing.lg,
  },
  heroMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  heroMetricText: {
    fontSize: Typography.sm,
    color: '#FFFFFF',
    fontWeight: Typography.semibold,
  },
  heroStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(43, 182, 115, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  statusPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  heroStatusLabel: {
    fontSize: 9,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  heroRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  circularBadgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeNum: {
    fontSize: 22,
    fontWeight: Typography.bold,
    color: '#FFFFFF',
  },
  badgeLbl: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },

  // ── List Header ──
  listHeader: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  listTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  listSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ── List Grid ──
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  row: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardContainer: {
    flex: 1,
    position: 'relative',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 130,
    justifyContent: 'space-between',
    ...Shadow.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingRight: Spacing.xl, // Keep spacing for trash button
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.inactive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxActive: {
    backgroundColor: Colors.primaryLight,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  statusDotActive: {
    backgroundColor: Colors.success,
  },
  cardName: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardId: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  cardFooterText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  cardTrashBtn: {
    position: 'absolute',
    top: Spacing.md + 4,
    right: Spacing.md,
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  modalKeyboardAvoiding: {
    width: '100%',
    maxHeight: '90%',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: '#0F2231',
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 380,
    marginBottom: Spacing.md,
  },
  modalScrollContent: {
    paddingBottom: Spacing.md,
  },
  modalSectionHeading: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    color: Colors.textPrimary,
    fontSize: Typography.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginBottom: Spacing.md,
  },

  // ── Switch Configuration Roster ──
  switchSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  addRosterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  addRosterText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  emptyRoster: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginVertical: Spacing.sm,
  },
  emptyRosterText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  switchRosterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  rosterInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.sm,
    color: Colors.textPrimary,
    fontSize: Typography.xs + 1,
    paddingHorizontal: Spacing.sm,
    height: 38,
  },
  rosterTrashBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadow.primary,
  },
  modalSubmitBtnText: {
    color: '#fff',
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
