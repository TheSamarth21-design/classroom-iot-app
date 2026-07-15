import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Classroom } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useClassroom(classroomId: string) {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!classroomId || !user) return;

    const unsub = onSnapshot(
      doc(db, 'Classrooms', classroomId),
      (docSnap) => {
        if (docSnap.exists()) {
          setClassroom({ id: docSnap.id, ...docSnap.data() } as Classroom);
        } else {
          setError('Classroom not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching classroom:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [classroomId, user]);

  return { classroom, loading, error };
}
