import { Timestamp } from 'firebase/firestore';

// ─── User ──────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Timestamp;
}

// ─── Switch ────────────────────────────────────────────────────────────────

export interface ApplianceSwitch {
  id: string;
  label: string;
  icon: string;           // e.g. "lightbulb-outline"
  virtual_pin: string;    // e.g. "V1"
  isDeleted: boolean;
  order: number;
  createdAt: Timestamp;
}

// ─── Classroom ─────────────────────────────────────────────────────────────

export interface Classroom {
  id: string;
  name: string;
  blynk_auth_token: string;
  blynk_template_id: string;
  next_available_pin: number;
  states?: SwitchStateMap;
  createdAt: Timestamp;
}

// ─── Switch State ──────────────────────────────────────────────────────────

// Runtime-only — not stored in Firestore
// Maps virtual_pin → 0 (off) or 1 (on)
export type SwitchStateMap = Record<string, 0 | 1>;

// ─── Auth Context ──────────────────────────────────────────────────────────

export interface AuthContextType {
  user: AppUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ─── Firestore Service ─────────────────────────────────────────────────────

export interface AddSwitchPayload {
  label: string;
  icon: string;
  classroomId: string;
  templateId: string;
}
