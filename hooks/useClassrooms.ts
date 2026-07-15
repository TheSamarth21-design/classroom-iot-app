import { useEffect, useState } from 'react';
import { subscribeToClassrooms } from '../services/firestoreService';
import { Classroom } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useClassrooms() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(true);
      return;
    }

    const unsubscribe = subscribeToClassrooms((data) => {
      setClassrooms(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { classrooms, loading, error };
}
