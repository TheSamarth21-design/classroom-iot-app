import { useEffect, useState } from 'react';
import { subscribeToSwitches } from '../services/firestoreService';
import { readAllPins } from '../services/blynkService';
import { ApplianceSwitch, SwitchStateMap } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useSwitches(classroomId: string, blynkAuthToken: string) {
  const [switches, setSwitches] = useState<ApplianceSwitch[]>([]);
  const [states, setStates] = useState<SwitchStateMap>({});
  const [loading, setLoading] = useState(true);
  const [statesLoading, setStatesLoading] = useState(true);
  const { user } = useAuth();

  // Real-time listener for switch layout from Firestore
  useEffect(() => {
    if (!classroomId || !user) return;

    const unsubscribe = subscribeToSwitches(classroomId, (data) => {
      setSwitches(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classroomId, user]);

  // Fetch physical state from Blynk once we have the switch list
  useEffect(() => {
    if (switches.length === 0 || !blynkAuthToken) return;

    const pins = switches.map((s) => s.virtual_pin);

    setStatesLoading(true);
    readAllPins(blynkAuthToken, pins)
      .then((map) => setStates(map))
      .finally(() => setStatesLoading(false));
  }, [switches, blynkAuthToken]);

  // Optimistic local state update (no waiting for Blynk round-trip)
  const setLocalState = (virtualPin: string, value: 0 | 1) => {
    setStates((prev) => ({ ...prev, [virtualPin]: value }));
  };

  return { switches, states, loading, statesLoading, setLocalState };
}
