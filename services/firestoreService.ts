import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Classroom, ApplianceSwitch } from '../types';

// ─── Classrooms ────────────────────────────────────────────────────────────

/**
 * Real-time listener for all classrooms.
 * Returns an unsubscribe function.
 */
export function subscribeToClassrooms(
  callback: (classrooms: Classroom[]) => void
): Unsubscribe {
  const q = collection(db, 'Classrooms');
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Classroom));
    callback(data);
  });
}

// ─── Switches ──────────────────────────────────────────────────────────────

/**
 * Real-time listener for switches in a single classroom.
 * Filters out soft-deleted switches automatically.
 */
export function subscribeToSwitches(
  classroomId: string,
  callback: (switches: ApplianceSwitch[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'Classrooms', classroomId, 'switches'),
    where('isDeleted', '==', false),
    orderBy('order', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ApplianceSwitch));
    callback(data);
  });
}

/**
 * Adds a new switch to a classroom.
 * Also atomically increments the next_available_pin counter.
 */
export async function addSwitch(
  classroomId: string,
  label: string,
  icon: string,
  virtualPin: string,
  order: number
): Promise<void> {
  const switchesRef = collection(db, 'Classrooms', classroomId, 'switches');
  const classroomRef = doc(db, 'Classrooms', classroomId);

  // Add the switch document
  await addDoc(switchesRef, {
    label,
    icon,
    virtual_pin: virtualPin,
    isDeleted: false,
    order,
    createdAt: serverTimestamp(),
  });

  // Atomically increment the pin counter
  await updateDoc(classroomRef, {
    next_available_pin: increment(1),
  });
}

/**
 * Soft-deletes a switch by setting isDeleted = true.
 */
export async function softDeleteSwitch(
  classroomId: string,
  switchId: string
): Promise<void> {
  const ref = doc(db, 'Classrooms', classroomId, 'switches', switchId);
  await updateDoc(ref, { isDeleted: true });
}

/**
 * Updates a switch's label and/or icon.
 */
export async function updateSwitch(
  classroomId: string,
  switchId: string,
  updates: Partial<Pick<ApplianceSwitch, 'label' | 'icon'>>
): Promise<void> {
  const ref = doc(db, 'Classrooms', classroomId, 'switches', switchId);
  await updateDoc(ref, updates);
}
