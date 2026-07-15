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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSwitches } from '../../../hooks/useSwitches';
import { useClassroom } from '../../../hooks/useClassroom';
import { useAuth } from '../../../contexts/AuthContext';
import { togglePin } from '../../../services/blynkService';
import { addSwitch, softDeleteSwitch, updateSwitch } from '../../../services/firestoreService';
import { auth, functions } from '../../../services/firebase';
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
      {/* Admin actions */}
      {isAdmin && (
        <View style={styles.adminActions}>
          <TouchableOpacity onPress={() => onEdit(sw)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={13} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(sw)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={13} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Icon */}
      <View style={[styles.switchIconBox, isOn && styles.switchIconBoxActive]}>
        <Ionicons
          name={iconName as any}
          size={28}
          color={isOn ? Colors.primary : Colors.textSecondary}
        />
        {isOn && <View style={styles.iconGlow} />}
      </View>

      {/* Label */}
      <Text style={[styles.switchLabel, isOn && styles.switchLabelActive]} numberOfLines={2}>
        {sw.label}
      </Text>
      <Text style={styles.switchPin}>{sw.virtual_pin}</Text>

      {/* Toggle */}
      <TouchableOpacity
        style={[styles.toggleBtn, isOn && styles.toggleBtnActive]}
        onPress={() => onToggle(sw, isOn ? 0 : 1)}
        activeOpacity={0.75}
      >
        <Ionicons
          name={isOn ? 'power' : 'power-outline'}
          size={18}
          color={isOn ? '#fff' : Colors.textSecondary}
        />
        <Text style={[styles.toggleBtnText, isOn && styles.toggleBtnTextActive]}>
          {isOn ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function ClassroomScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { isAdmin } = useAuth();

  const { classroom, loading: classroomLoading } = useClassroom(id);
  const blynkToken = classroom?.blynk_auth_token || '';

  const { switches, states, loading: switchesLoading, setLocalState } = useSwitches(id, blynkToken);
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
      // Optimistic update
      setLocalState(sw.virtual_pin, newValue);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Fire & forget to Blynk
      const success = await togglePin(blynkToken, sw.virtual_pin, newValue);
      if (!success) {
        // Revert on failure
        setLocalState(sw.virtual_pin, newValue === 1 ? 0 : 1);
        Alert.alert('Connection Error', 'Could not reach the device. Check your network.');
      }
    },
    [blynkToken, setLocalState]
  );

  // ── Add Switch Handler ──
  const handleAddSwitch = async () => {
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

      const templateId = classroom.blynk_template_id;
      const nextPinNumber = classroom.next_available_pin || 1;

      // Calculate the virtual pin directly based on next_available_pin
      const virtualPin = `V${nextPinNumber}`;
      
      // 2. Save switch metadata to Firestore
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{name ?? id}</Text>
          <Text style={styles.headerSub}>{switches.length} appliances</Text>
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
              isOn={states[item.virtual_pin] === 1}
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
                  <Text style={[
                    styles.iconOptionLabel,
                    newIcon === opt.value && styles.iconOptionLabelSelected,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, addLoading && styles.modalBtnDisabled]}
              onPress={handleAddSwitch}
              disabled={addLoading}
            >
              {addLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalBtnText}>Add Appliance</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Edit Switch Modal ── */}
      <Modal
        visible={!!editModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Appliance</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Appliance Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editLabel}
              onChangeText={setEditLabel}
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <TouchableOpacity style={styles.modalBtn} onPress={handleEditSwitch}>
              <Text style={styles.modalBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSub: { fontSize: Typography.xs, color: Colors.textMuted },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.primary,
  },
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  row: { gap: Spacing.md, marginBottom: Spacing.md },
  center: {
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
  },

  // Switch Cards
  switchCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minHeight: 170,
    ...Shadow.md,
  },
  switchCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface2,
  },
  adminActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  actionBtn: {
    padding: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface2,
  },
  switchIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.inactive,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  switchIconBoxActive: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconGlow: {
    position: 'absolute',
    inset: -4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.activeGlow,
  },
  switchLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  switchLabelActive: { color: Colors.textPrimary },
  switchPin: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.inactive,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleBtnText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
  },
  toggleBtnTextActive: { color: '#fff' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  modalLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.lg,
    height: 50,
    color: Colors.textPrimary,
    fontSize: Typography.md,
    marginBottom: Spacing.lg,
  },
  iconPicker: {
    marginBottom: Spacing.xl,
  },
  iconOption: {
    alignItems: 'center',
    gap: 4,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  iconOptionLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  iconOptionLabelSelected: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  modalBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.primary,
  },
  modalBtnDisabled: { opacity: 0.6 },
  modalBtnText: {
    color: '#fff',
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
});
