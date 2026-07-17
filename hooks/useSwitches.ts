import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { subscribeToSwitches, addSwitch } from '../services/firestoreService';
import { readAllPins } from '../services/blynkService';
import { ApplianceSwitch, SwitchStateMap } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useSwitches(
  classroomId: string,
  blynkAuthToken: string,
  classroomStates?: SwitchStateMap
) {
  const [switches, setSwitches] = useState<ApplianceSwitch[]>([]);
  const [states, setStates] = useState<SwitchStateMap>({});
  const [loading, setLoading] = useState(true);
  const [statesLoading, setStatesLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  // Real-time listener for switch layout from Firestore
  useEffect(() => {
    if (!classroomId || !user) return;

    const unsubscribe = subscribeToSwitches(classroomId, (data) => {
      setSwitches(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classroomId, user]);

  // Seeding missing switches (V5 & V6) dynamically if they are missing
  useEffect(() => {
    if (!classroomId || !user || !isAdmin || switches.length === 0) return;

    const pins = switches.map((s) => s.virtual_pin);
    const missingPins = [
      { pin: 'V5', label: 'Light 5 & 6', icon: 'lightbulb-outline', order: 5 },
      { pin: 'V6', label: 'AC 1', icon: 'ac', order: 6 },
    ].filter((item) => !pins.includes(item.pin));

    if (missingPins.length > 0) {
      console.log(`[Seeding] Seeding missing pins for classroom ${classroomId}:`, missingPins.map(m => m.pin));
      missingPins.forEach(async (item) => {
        try {
          await addSwitch(classroomId, item.label, item.icon, item.pin, item.order);
        } catch (err) {
          console.error(`[Seeding] Failed to add switch ${item.pin}:`, err);
        }
      });
    }
  }, [switches, classroomId, user]);

  // Synchronize state with classroomStates when it changes in Firestore
  useEffect(() => {
    if (!classroomStates) return;

    // Check if we need to fetch anything from Blynk (i.e. if there are switches without states in Firestore)
    if (switches.length > 0) {
      const switchIds = switches.map((s) => s.id);
      const hasAllStates = switchIds.every((swId) => swId in classroomStates);

      if (hasAllStates) {
        // We have all states in Firestore! Use them.
        const mapWithIds: SwitchStateMap = {};
        switches.forEach((s) => {
          mapWithIds[s.id] = classroomStates[s.id] ?? 0;
        });
        setStates(mapWithIds);
        setStatesLoading(false);
        return;
      }
    } else {
      // No switches loaded yet, but we can still set states if classroomStates exists
      setStates(classroomStates);
      return;
    }
  }, [classroomStates, switches]);

  // Fetch physical state from Blynk if states are missing in Firestore (initial sync)
  useEffect(() => {
    if (switches.length === 0 || !blynkAuthToken || !classroomId) return;

    const switchIds = switches.map((s) => s.id);
    const hasAllStates = classroomStates && switchIds.every((swId) => swId in classroomStates);

    if (hasAllStates) {
      return;
    }

    // We are missing some switch states in Firestore, fetch from Blynk and update Firestore
    const pins = switches.map((s) => s.virtual_pin);
    setStatesLoading(true);
    readAllPins(blynkAuthToken, pins)
      .then((blynkMap) => {
        const mapWithIds: SwitchStateMap = {};
        const updates: Record<string, 0 | 1> = {};

        switches.forEach((s) => {
          const val = blynkMap[s.virtual_pin] ?? 0;
          mapWithIds[s.id] = val;
          updates[`states.${s.id}`] = val;
        });

        setStates((prev) => ({ ...prev, ...mapWithIds }));
        
        const classroomRef = doc(db, 'Classrooms', classroomId);
        updateDoc(classroomRef, updates).catch((err) => {
          console.error('[useSwitches] Failed to save initial states to Firestore:', err);
        });
      })
      .catch((err) => {
        console.error('[useSwitches] Failed to read pins from Blynk:', err);
      })
      .finally(() => {
        setStatesLoading(false);
      });
  }, [switches, blynkAuthToken, classroomStates, classroomId]);

  // Optimistic local state update (no waiting for Blynk round-trip)
  const setLocalState = (switchId: string, value: 0 | 1) => {
    setStates((prev) => ({ ...prev, [switchId]: value }));
  };

  return { switches, states, loading, statesLoading, setLocalState };
}
