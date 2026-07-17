import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../constants/theme';

// ─── Error Modal Config ───────────────────────────────────────────────────

interface ErrorModalConfig {
  visible: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  message: string;
  buttonText: string;
}

const EMPTY_MODAL: ErrorModalConfig = {
  visible: false,
  icon: 'alert-circle',
  iconColor: Colors.error,
  iconBg: Colors.errorLight,
  title: '',
  message: '',
  buttonText: 'Try Again',
};

function getErrorModal(code: string): Omit<ErrorModalConfig, 'visible'> {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return {
        icon: 'person-remove-outline',
        iconColor: Colors.warning,
        iconBg: 'rgba(255, 184, 0, 0.12)',
        title: 'Wrong Credentials',
        message: 'The email or password you entered is incorrect. Please check your credentials and try again.',
        buttonText: 'Try Again',
      };
    case 'auth/too-many-requests':
      return {
        icon: 'time-outline',
        iconColor: '#FF7A00',
        iconBg: 'rgba(255, 122, 0, 0.12)',
        title: 'Account Locked',
        message: 'Too many failed sign-in attempts. Your account has been temporarily locked for security. Please try again later.',
        buttonText: 'Got It',
      };
    case 'auth/network-request-failed':
      return {
        icon: 'cloud-offline-outline',
        iconColor: Colors.textSecondary,
        iconBg: 'rgba(100, 116, 139, 0.12)',
        title: 'No Connection',
        message: 'Unable to reach the server. Please check your internet connection and try again.',
        buttonText: 'Retry',
      };
    default:
      return {
        icon: 'alert-circle-outline',
        iconColor: Colors.error,
        iconBg: Colors.errorLight,
        title: 'Sign In Failed',
        message: 'Something went wrong while signing in. Please try again.',
        buttonText: 'Try Again',
      };
  }
}

interface ResetModalConfig {
  visible: boolean;
  state: 'input' | 'loading' | 'success' | 'error';
  errorMessage: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

  // Modals state
  const [errorModal, setErrorModal] = useState<ErrorModalConfig>(EMPTY_MODAL);
  const [resetModal, setResetModal] = useState<ResetModalConfig>({
    visible: false,
    state: 'input',
    errorMessage: '',
  });
  const [resetEmail, setResetEmail] = useState('');

  // ── Login Handler ──
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorModal({
        visible: true,
        icon: 'document-text-outline',
        iconColor: Colors.warning,
        iconBg: 'rgba(255, 184, 0, 0.12)',
        title: 'Missing Fields',
        message: 'Please enter both your email and password to sign in.',
        buttonText: 'Got It',
      });
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(app)');
    } catch (err: any) {
      const code = err.code ?? '';
      const config = getErrorModal(code);
      setErrorModal({ ...config, visible: true });
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password Handler ──
  const handleResetPassword = async () => {
    const targetEmail = resetEmail.trim().toLowerCase();
    if (!targetEmail) {
      setResetModal((prev) => ({
        ...prev,
        state: 'error',
        errorMessage: 'Please enter your email address.',
      }));
      return;
    }

    setResetModal((prev) => ({ ...prev, state: 'loading' }));
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetModal((prev) => ({ ...prev, state: 'success' }));
    } catch (err: any) {
      let msg = 'Failed to send reset email. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'No account found with that email address.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setResetModal((prev) => ({ ...prev, state: 'error', errorMessage: msg }));
    }
  };

  const openResetModal = () => {
    setResetEmail(email.trim());
    setResetModal({ visible: true, state: 'input', errorMessage: '' });
  };

  const closeResetModal = () => {
    setResetModal({ visible: false, state: 'input', errorMessage: '' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Splash Info Header */}
        <View style={styles.header}>
          <Text style={styles.splashTitle}>
            Manage Your {'\n'}
            <Text style={styles.greenText}>Classrooms</Text>
          </Text>
          <Text style={styles.splashSubtitle}>
            Take control of your smart appliances and optimize energy consumption.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedInput === 'email' && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={focusedInput === 'email' ? Colors.primary : Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="teacher@school.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedInput === 'password' && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={focusedInput === 'password' ? Colors.primary : Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotBtn} onPress={openResetModal}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Pill Sign In Button (Styled exactly like Start Tracking > in template) */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.buttonText}>Sign In</Text>
                <View style={styles.btnCircleArrow}>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Register Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Register</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>

      {/* ── Error Modal (Styled for clean light theme) ── */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal(EMPTY_MODAL)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconBox, { backgroundColor: errorModal.iconBg }]}>
              <Ionicons name={errorModal.icon as any} size={36} color={errorModal.iconColor} />
            </View>
            <Text style={styles.modalTitle}>{errorModal.title}</Text>
            <Text style={styles.modalMessage}>{errorModal.message}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: Colors.textPrimary }]}
              onPress={() => setErrorModal(EMPTY_MODAL)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>{errorModal.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal
        visible={resetModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeResetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {resetModal.state === 'success' ? (
              <>
                <View style={[styles.modalIconBox, { backgroundColor: Colors.successLight }]}>
                  <Ionicons name="checkmark-circle-outline" size={36} color={Colors.success} />
                </View>
                <Text style={styles.modalTitle}>Email Sent</Text>
                <Text style={styles.modalMessage}>
                  We've sent instructions to reset your password. Please check your inbox.
                </Text>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: Colors.primary }]}
                  onPress={closeResetModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnText}>Got It</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.modalIconBox, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="mail-outline" size={36} color={Colors.primary} />
                </View>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalMessage}>
                  Enter your email address to receive password reset link.
                </Text>

                <View style={styles.resetInputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.resetInput}
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textMuted}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={resetModal.state !== 'loading'}
                  />
                </View>

                {resetModal.state === 'error' && (
                  <View style={styles.resetError}>
                    <Text style={styles.resetErrorText}>{resetModal.errorMessage}</Text>
                  </View>
                )}

                <View style={styles.resetActions}>
                  <TouchableOpacity
                    style={styles.resetCancelBtn}
                    onPress={closeResetModal}
                    disabled={resetModal.state === 'loading'}
                  >
                    <Text style={styles.resetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.resetSendBtn, resetModal.state === 'loading' && styles.buttonDisabled]}
                    onPress={handleResetPassword}
                    disabled={resetModal.state === 'loading'}
                    activeOpacity={0.8}
                  >
                    {resetModal.state === 'loading' ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.resetSendText}>Reset</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean white background matching splash template
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.sm,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: Typography.bold,
    color: '#0F2231', // Deep slate-blue
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  greenText: {
    color: Colors.primary, // Vibrant forest green
  },
  splashSubtitle: {
    fontSize: Typography.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: '#0F2231',
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.md,
  },
  eyeBtn: {
    padding: Spacing.xs,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.xl,
    marginTop: -Spacing.xs,
  },
  forgotText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  // Pill button with arrow indicator (Start Tracking style)
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full, // Full pill shape
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    ...Shadow.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
  btnCircleArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadow.lg,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: '#0F2231',
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  modalBtn: {
    width: '100%',
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },

  // ── Reset Modal Extras ──
  resetInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: Spacing.md,
    height: 48,
    width: '100%',
    marginBottom: Spacing.md,
  },
  resetInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.md,
  },
  resetError: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    width: '100%',
    marginBottom: Spacing.md,
  },
  resetErrorText: {
    fontSize: Typography.xs,
    color: Colors.error,
    textAlign: 'center',
  },
  resetActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  resetCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  resetCancelText: {
    color: Colors.textSecondary,
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
  resetSendBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  resetSendText: {
    color: '#FFFFFF',
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
});
