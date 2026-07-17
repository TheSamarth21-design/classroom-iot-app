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
  getDocs,
  writeBatch,
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
  const docRef = await addDoc(switchesRef, {
    label,
    icon,
    virtual_pin: virtualPin,
    isDeleted: false,
    order,
    createdAt: serverTimestamp(),
  });

  // Atomically increment the pin counter and initialize the state in classroom states map using switch document ID
  await updateDoc(classroomRef, {
    next_available_pin: increment(1),
    [`states.${docRef.id}`]: 0,
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

/**
 * Updates a switch's real-time state in the classroom document using switch ID.
 */
export async function updateSwitchState(
  classroomId: string,
  switchId: string,
  newValue: 0 | 1
): Promise<void> {
  const ref = doc(db, 'Classrooms', classroomId);
  await updateDoc(ref, {
    [`states.${switchId}`]: newValue,
  });
}

/**
 * Creates a new classroom and populates it with initial switches dynamically.
 */
export async function createClassroom(
  name: string,
  blynkAuthToken: string,
  blynkTemplateId: string,
  initialSwitches: { label: string; icon: string; virtual_pin: string; order: number }[]
): Promise<void> {
  const classroomRef = collection(db, 'Classrooms');
  
  // 1. Create the parent Classroom doc
  const docRef = await addDoc(classroomRef, {
    name,
    blynk_auth_token: blynkAuthToken,
    blynk_template_id: blynkTemplateId,
    next_available_pin: initialSwitches.length + 1,
    states: {},
    createdAt: serverTimestamp(),
  });

  if (initialSwitches.length > 0) {
    const switchesRef = collection(db, 'Classrooms', docRef.id, 'switches');
    const batch = writeBatch(db);
    const statesObj: Record<string, number> = {};

    // 2. Add each switch document and map its ID to states map
    for (const sw of initialSwitches) {
      const swDocRef = doc(switchesRef);
      batch.set(swDocRef, {
        label: sw.label,
        icon: sw.icon,
        virtual_pin: sw.virtual_pin,
        isDeleted: false,
        order: sw.order,
        createdAt: serverTimestamp(),
      });
      statesObj[`states.${swDocRef.id}`] = 0;
    }

    // 3. Update parent doc states map
    batch.update(doc(db, 'Classrooms', docRef.id), statesObj);
    await batch.commit();
  }
}

/**
 * Deletes a classroom and all of its switches subcollection documents atomically.
 */
export async function deleteClassroom(classroomId: string): Promise<void> {
  const switchesRef = collection(db, 'Classrooms', classroomId, 'switches');
  const snap = await getDocs(switchesRef);
  
  const batch = writeBatch(db);
  
  // Delete all switches in the subcollection
  snap.forEach((d) => {
    batch.delete(d.ref);
  });
  
  // Delete parent classroom doc
  batch.delete(doc(db, 'Classrooms', classroomId));
  
  await batch.commit();
}
