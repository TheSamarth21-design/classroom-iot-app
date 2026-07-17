import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSwitches } from '../../../hooks/useSwitches';
import { useClassroom } from '../../../hooks/useClassroom';
import { useAuth } from '../../../contexts/AuthContext';
import { togglePin } from '../../../services/blynkService';
import { addSwitch, softDeleteSwitch, updateSwitch, updateSwitchState } from '../../../services/firestoreService';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../../constants/theme';
import { ApplianceIcons, ApplianceOptions } from '../../../constants/icons';
import { ApplianceSwitch } from '../../../types';

// ─── Switch Card ──────────────────────────────────────────────────────────

interface SwitchCardProps {
  sw: ApplianceSwitch;
  isOn: boolean;
  isAdmin: boolean;
  onToggle: (sw: ApplianceSwitch, newValue: 0 | 1) => void;
  onEdit: (sw: ApplianceSwitch) => void;
  onDelete: (sw: ApplianceSwitch) => void;
}

function SwitchCard({ sw, isOn, isAdmin, onToggle, onEdit, onDelete }: SwitchCardProps) {
  const iconName = ApplianceIcons[sw.icon] ?? ApplianceIcons.default;

  return (
    <View style={[styles.switchCard, isOn && styles.switchCardActive]}>
      {/* Admin Actions Row */}
      {isAdmin && (
        <View style={styles.adminActions}>
          <TouchableOpacity onPress={() => onEdit(sw)} style={styles.actionBtn}>
            <Ionicons name="create-outline" size={13} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(sw)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={13} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Circle Icon Switch - Styled like Dials in reference template */}
      <TouchableOpacity
        style={[styles.switchCircle, isOn && styles.switchCircleActive]}
        onPress={() => onToggle(sw, isOn ? 0 : 1)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={iconName as any}
          size={26}
          color={isOn ? '#FFFFFF' : Colors.primary}
        />
      </TouchableOpacity>

      {/* Label and State information */}
      <Text style={styles.switchLabel} numberOfLines={1}>
        {sw.label}
      </Text>
      <Text style={[styles.switchStatusText, isOn && styles.switchStatusTextActive]}>
        {isOn ? 'Active' : 'Inactive'}
      </Text>
      <Text style={styles.switchPin}>{sw.virtual_pin}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function ClassroomScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { isAdmin } = useAuth();

  const { classroom, loading: classroomLoading } = useClassroom(id);
  const blynkToken = classroom?.blynk_auth_token || '';

  const { switches, states, loading: switchesLoading, setLocalState } = useSwitches(id, blynkToken, classroom?.states);
  const loading = classroomLoading || switchesLoading;

  // ── Add Switch Modal State ──
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('lightbulb-outline');
  const [addLoading, setAddLoading] = useState(false);

  // ── Edit Modal State ──
  const [editModal, setEditModal] = useState<ApplianceSwitch | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // ── Toggle Handler ──
  const handleToggle = useCallback(
    async (sw: ApplianceSwitch, newValue: 0 | 1) => {
      const originalValue = newValue === 1 ? 0 : 1;

      // Optimistic update using switch ID
      setLocalState(sw.id, newValue);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        // Update Firestore and Blynk in parallel
        const firestorePromise = updateSwitchState(id, sw.id, newValue);
        const blynkPromise = togglePin(blynkToken, sw.virtual_pin, newValue);

        const [_, blynkSuccess] = await Promise.all([firestorePromise, blynkPromise]);

        if (!blynkSuccess) {
          throw new Error('Blynk update failed');
        }
      } catch (err) {
        // Revert local and Firestore state on error
        setLocalState(sw.id, originalValue);
        await updateSwitchState(id, sw.id, originalValue).catch(console.error);
        Alert.alert('Connection Error', 'Could not reach the device. Check your network.');
      }
    },
    [id, blynkToken, setLocalState]
  );

  // ── Add Switch Handler ──
  const handleAddSwitch = async () => {
    if (!isAdmin) {
      Alert.alert('Unauthorized', 'Only admins can add appliances.');
      return;
    }
    if (!newLabel.trim()) {
      Alert.alert('Missing Label', 'Please enter a name for this appliance.');
      return;
    }
    setAddLoading(true);
    try {
      if (!classroom) {
        throw new Error('Classroom details not loaded yet.');
      }
      if (!classroom.blynk_template_id) {
        throw new Error('Blynk template ID is missing from this classroom record.');
      }

      const nextPinNumber = classroom.next_available_pin || 1;
      const virtualPin = `V${nextPinNumber}`;
      
      // Save switch metadata to Firestore
      await addSwitch(id, newLabel.trim(), newIcon, virtualPin, switches.length + 1);

      setNewLabel('');
      setNewIcon('lightbulb-outline');
      setAddModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to add switch.');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Edit Switch Handler ──
  const handleEditSwitch = async () => {
    if (!isAdmin) {
      Alert.alert('Unauthorized', 'Only admins can edit appliances.');
      return;
    }
    if (!editModal || !editLabel.trim()) return;
    try {
      await updateSwitch(id, editModal.id, { label: editLabel.trim() });
      setEditModal(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Delete Handler ──
  const handleDelete = (sw: ApplianceSwitch) => {
    if (!isAdmin) {
      Alert.alert('Unauthorized', 'Only admins can remove appliances.');
      return;
    }
    Alert.alert(
      'Remove Switch',
      `Remove "${sw.label}" from this classroom? The pin will stay reserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => softDeleteSwitch(id, sw.id),
        },
      ]
    );
  };

  const activeCount = Object.values(states).filter((v) => v === 1).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Blurry background watermark logo */}
      <Image
        source={require('../../../assets/logo.png')}
        style={styles.blurryBgLogo}
        blurRadius={20}
        resizeMode="contain"
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{name ?? id}</Text>
          <Text style={styles.headerSub}>
            {switches.length} appliances • {activeCount} active
          </Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Switch Grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : switches.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="flash-off-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Appliances</Text>
          <Text style={styles.emptyText}>
            {isAdmin ? 'Tap + to add your first appliance.' : 'No appliances configured yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={switches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SwitchCard
              sw={item}
              isOn={states[item.id] === 1}
              isAdmin={isAdmin}
              onToggle={handleToggle}
              onEdit={(sw) => {
                setEditModal(sw);
                setEditLabel(sw.label);
              }}
              onDelete={handleDelete}
            />
          )}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Add Switch Modal ── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Appliance</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Appliance Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Main Light, Projector..."
              placeholderTextColor={Colors.textMuted}
              value={newLabel}
              onChangeText={setNewLabel}
              autoFocus
            />

            <Text style={styles.modalLabel}>Icon Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPicker}>
              {ApplianceOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.iconOption,
                    newIcon === opt.value && styles.iconOptionSelected,
                  ]}
                  onPress={() => setNewIcon(opt.value)}
                >
                  <Ionicons
                    name={ApplianceIcons[opt.icon] as any}
                    size={22}
                    color={newIcon === opt.value ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.iconOptionText,
                      newIcon === opt.value && styles.iconOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, addLoading && styles.btnDisabled]}
              onPress={handleAddSwitch}
              disabled={addLoading}
            >
              {addLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Add Switch</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Edit Switch Modal ── */}
      <Modal
        visible={editModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Appliance Label</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Appliance Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Projector Screen..."
              placeholderTextColor={Colors.textMuted}
              value={editLabel}
              onChangeText={setEditLabel}
              autoFocus
            />

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleEditSwitch}>
              <Text style={styles.modalSubmitBtnText}>Save changes</Text>
            </TouchableOpacity>
          </View>
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
  },
  headerSub: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.primary,
  },

  // ── Switch Grid Styles ──
  grid: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  row: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  switchCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  switchCardActive: {
    borderColor: 'rgba(43, 182, 115, 0.25)',
  },
  adminActions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    marginBottom: -6,
    marginTop: -Spacing.sm,
  },
  actionBtn: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Circular Device Button (Matches template's device circles)
  switchCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface2, // Soft pastel green
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(43, 182, 115, 0.15)',
  },
  switchCircleActive: {
    backgroundColor: Colors.primary, // Glowing forest green
    borderColor: Colors.primary,
    ...Shadow.primary,
  },
  switchLabel: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: '#0F2231', // Deep slate-blue
    marginBottom: 4,
    textAlign: 'center',
  },
  switchStatusText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    marginBottom: 2,
  },
  switchStatusTextActive: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  switchPin: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  // ── Status/Loading Indicators ──
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
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
    paddingHorizontal: Spacing.xl,
  },

  // ── Dialog Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: '#0F2231',
  },
  modalLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
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
  iconPicker: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  iconOption: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface2,
  },
  iconOptionText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  iconOptionTextSelected: {
    color: Colors.primary,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
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
});
