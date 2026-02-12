import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#7A0C2E',
  primaryDark: '#5A0820',
  primaryLight: '#9A1C4E',
  secondary: '#D4AF37',
  secondaryLight: '#E6C35C',
  secondaryDark: '#B8942D',
  white: '#FFFFFF',
  ink: '#0F172A',
  gray: '#64748B',
  lightGray: '#E2E8F0',
  error: '#DC2626',
  success: '#10B981',
  background: '#7A0C2E',
  cream: '#FFF5EC',
};

// Vector Shape Components
const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }: { style?: any; color?: string; size?: number }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        backgroundColor: color,
        transform: [{ rotate: '45deg' }],
      },
      style,
    ]}
  />
);

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }: { style?: any; color?: string; size?: number; borderWidth?: number }) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: borderWidth,
        borderColor: color,
        backgroundColor: 'transparent',
      },
      style,
    ]}
  />
);

const DottedPattern = ({ style, rows = 3, cols = 5, dotColor = COLORS.secondary }: { style?: any; rows?: number; cols?: number; dotColor?: string }) => (
  <View style={[styles.dottedContainer, style]}>
    {[...Array(rows)].map((_, rowIndex) => (
      <View key={rowIndex} style={styles.dottedRow}>
        {[...Array(cols)].map((_, colIndex) => (
          <View
            key={colIndex}
            style={[
              styles.dot,
              {
                backgroundColor: dotColor,
                opacity: 0.2 + (rowIndex * cols + colIndex) * 0.03
              },
            ]}
          />
        ))}
      </View>
    ))}
  </View>
);

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { phoneNumber, studentCount } = params;

  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const inputRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Focus first input
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 500);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (newOtp.every((digit) => digit !== '')) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const storeStudentData = async (studentData: any) => {
    try {
      await AsyncStorage.setItem('student_id', studentData.id);
      await AsyncStorage.setItem('student_admission', studentData.student_admission);
      await AsyncStorage.setItem('student_name', studentData.student_name);
      await AsyncStorage.setItem('student_class', studentData.student_class);
      await AsyncStorage.setItem('student_section', studentData.student_section);
      await AsyncStorage.setItem('student_mobile', studentData.student_mobile);
      await AsyncStorage.setItem('student_photo', studentData.student_photo);
      await AsyncStorage.setItem('isLoggedIn', 'true');
    } catch (error) {
      console.error('Error storing student data:', error);
    }
  };

  const verifyOTP = async (otpValue: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=get_otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_mobile: phoneNumber,
            otp: otpValue,
          }),
        }
      );

      // Get response as text first to check if it's valid JSON
      const responseText = await response.text();
      console.log('OTP API Response:', responseText);

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response was:', responseText);
        setError('Server error. Please try again later.');
        setOtp(['', '', '', '']);
        inputRefs[0].current?.focus();
        shakeAnimation();
        return;
      }

      if (result.status === 'success') {
        const { count, data, notices } = result;
        await AsyncStorage.setItem('all_students', JSON.stringify(data));
        if (count > 1) {
          router.replace({
            pathname: '/student-selection',
            params: {
              students: JSON.stringify(data),
              notices: JSON.stringify(notices || []),
            },
          });
        } else if (count === 1) {
          const studentData = data[0];
          await storeStudentData(studentData);

          router.replace({
            pathname: '/student_home',
            params: {
              studentData: JSON.stringify(studentData),
              notices: JSON.stringify(notices || []),
            },
          });
        } else {
          setError('No student found');
          setOtp(['', '', '', '']);
          inputRefs[0].current?.focus();
          shakeAnimation();
        }
      } else {
        setError(result.msg || 'Invalid OTP');
        setOtp(['', '', '', '']);
        inputRefs[0].current?.focus();
        shakeAnimation();
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('OTP Verification Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setTimer(60);
    setCanResend(false);
    setOtp(['', '', '', '']);
    setError('');

    try {
      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=send_otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_mobile: phoneNumber,
          }),
        }
      );

      const result = await response.json();

      if (result.status === 'success') {
        console.log('OTP resent successfully');
      }
    } catch (err) {
      console.error('Resend OTP Error:', err);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Background Decorations */}
      <View style={styles.backgroundVectors} pointerEvents="none">
        <Animated.View
          style={[
            styles.glowBlobPrimary,
            { transform: [{ translateY: floatTranslate }] },
          ]}
        />
        <Animated.View
          style={[
            styles.glowBlobSecondary,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />

        <View style={styles.vectorStripe1} />
        <View style={styles.vectorStripe2} />

        <Animated.View
          style={[
            styles.rotatingRing,
            { transform: [{ rotate }] },
          ]}
        >
          <CircleRing size={120} borderWidth={2} color="rgba(212, 175, 55, 0.2)" />
        </Animated.View>

        <DiamondShape style={styles.diamond1} color="rgba(212, 175, 55, 0.4)" size={16} />
        <DiamondShape style={styles.diamond2} color="rgba(255, 255, 255, 0.2)" size={12} />
        <DiamondShape style={styles.diamond3} color="rgba(212, 175, 55, 0.3)" size={20} />
        <DiamondShape style={styles.diamond4} color="rgba(255, 255, 255, 0.15)" size={14} />

        <DottedPattern style={styles.dottedPattern1} rows={4} cols={5} />
        <DottedPattern style={styles.dottedPattern2} rows={3} cols={4} />

        <View style={styles.smallCircle1} />
        <View style={styles.smallCircle2} />
        <View style={styles.smallCircle3} />

        <View style={styles.lineAccent1} />
        <View style={styles.lineAccent2} />

        {/* Cross Pattern */}
        <View style={styles.crossPattern}>
          <View style={styles.crossHorizontal} />
          <View style={styles.crossVertical} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconWrapper}>
                <Animated.View
                  style={[
                    styles.iconGlow,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                />
                <View style={styles.iconContainer}>
                  <Ionicons name="shield-checkmark" size={45} color={COLORS.primary} />
                </View>
              </View>

              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>
                Enter the 4-digit verification code sent to
              </Text>
              <View style={styles.phoneContainer}>
                <Ionicons name="call" size={16} color={COLORS.secondary} />
                <Text style={styles.phoneText}>+91 {formatPhoneNumber(String(phoneNumber))}</Text>
              </View>
            </View>

            {/* OTP Card */}
            <View style={styles.otpCard}>
              <View style={styles.otpCardAccent} />

              <View style={styles.otpCardContent}>
                <Text style={styles.otpLabel}>Enter Verification Code</Text>

                {/* OTP Input */}
                <Animated.View
                  style={[
                    styles.otpContainer,
                    { transform: [{ translateX: shakeAnim }] },
                  ]}
                >
                  {otp.map((digit, index) => (
                    <View key={index} style={styles.otpInputWrapper}>
                      <TextInput
                        ref={inputRefs[index]}
                        style={[
                          styles.otpInput,
                          digit && styles.otpInputFilled,
                          error && styles.otpInputError,
                        ]}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={(value) => handleOtpChange(value, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        selectTextOnFocus
                        editable={!loading}
                      />
                      {digit && !error && (
                        <View style={styles.otpInputDot} />
                      )}
                    </View>
                  ))}
                </Animated.View>

                {/* Error Message */}
                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Loading Indicator */}
                {loading && (
                  <View style={styles.loadingContainer}>
                    <View style={styles.loadingSpinner}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                    <Text style={styles.loadingText}>Verifying OTP...</Text>
                  </View>
                )}

                {/* Resend OTP */}
                <View style={styles.resendContainer}>
                  {!canResend ? (
                    <View style={styles.timerContainer}>
                      <View style={styles.timerIconContainer}>
                        <Ionicons name="time-outline" size={18} color={COLORS.gray} />
                      </View>
                      <Text style={styles.timerText}>
                        Resend code in <Text style={styles.timerHighlight}>{timer}s</Text>
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={handleResendOTP}
                      disabled={resendLoading}
                      activeOpacity={0.8}
                    >
                      {resendLoading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <>
                          <Ionicons name="refresh" size={18} color={COLORS.primary} />
                          <Text style={styles.resendText}>Resend OTP</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Student Count Info */}
            {studentCount && parseInt(String(studentCount)) > 1 && (
              <View style={styles.infoBox}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="people" size={20} color={COLORS.secondary} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Multiple Students Found</Text>
                  <Text style={styles.infoSubtext}>
                    {studentCount} students are registered with this number
                  </Text>
                </View>
              </View>
            )}

            {/* Security Info */}
            <View style={styles.securityContainer}>
              <View style={styles.securityItem}>
                <View style={styles.securityIconContainer}>
                  <Ionicons name="lock-closed" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.securityText}>Secure verification</Text>
              </View>
              <View style={styles.securityDivider} />
              <View style={styles.securityItem}>
                <View style={styles.securityIconContainer}>
                  <Ionicons name="timer-outline" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.securityText}>Valid for 10 mins</Text>
              </View>
            </View>

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Ionicons name="help-circle-outline" size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.helpText}>
                Didn't receive the code? Check your SMS inbox or try resending.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  backgroundVectors: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 30,
  },

  // Background Decorations
  glowBlobPrimary: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.secondary,
    opacity: 0.12,
    top: -60,
    right: -80,
  },
  glowBlobSecondary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.25,
    bottom: 150,
    left: -60,
  },
  vectorStripe1: {
    position: 'absolute',
    top: 180,
    right: -50,
    width: 200,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    opacity: 0.08,
    transform: [{ rotate: '-20deg' }],
  },
  vectorStripe2: {
    position: 'absolute',
    bottom: 250,
    left: -70,
    width: 250,
    height: 35,
    borderRadius: 17,
    backgroundColor: COLORS.secondary,
    opacity: 0.06,
    transform: [{ rotate: '15deg' }],
  },
  rotatingRing: {
    position: 'absolute',
    top: 100,
    right: 10,
  },
  diamond1: {
    position: 'absolute',
    top: 220,
    left: 25,
  },
  diamond2: {
    position: 'absolute',
    top: 380,
    right: 35,
  },
  diamond3: {
    position: 'absolute',
    bottom: 200,
    right: 50,
  },
  diamond4: {
    position: 'absolute',
    bottom: 350,
    left: 40,
  },
  dottedContainer: {
    position: 'absolute',
  },
  dottedRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 5,
  },
  dottedPattern1: {
    top: 300,
    right: 15,
  },
  dottedPattern2: {
    bottom: 280,
    left: 15,
  },
  smallCircle1: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
    opacity: 0.4,
    top: 150,
    left: 40,
  },
  smallCircle2: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    opacity: 0.25,
    bottom: 320,
    right: 25,
  },
  smallCircle3: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.secondary,
    opacity: 0.2,
    bottom: 180,
    left: 70,
  },
  lineAccent1: {
    position: 'absolute',
    width: 70,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.secondary,
    opacity: 0.2,
    top: 350,
    left: 10,
    transform: [{ rotate: '-35deg' }],
  },
  lineAccent2: {
    position: 'absolute',
    width: 50,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.white,
    opacity: 0.15,
    bottom: 250,
    right: 15,
    transform: [{ rotate: '40deg' }],
  },
  crossPattern: {
    position: 'absolute',
    bottom: 380,
    right: 60,
    width: 18,
    height: 18,
    opacity: 0.25,
  },
  crossHorizontal: {
    position: 'absolute',
    top: 7,
    left: 0,
    width: 18,
    height: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },
  crossVertical: {
    position: 'absolute',
    top: 0,
    left: 7,
    width: 4,
    height: 18,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },

  // Back Button
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  iconGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.secondary,
    opacity: 0.2,
    top: -5,
    left: -5,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 3,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  phoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },

  // OTP Card
  otpCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 15,
    marginBottom: 24,
  },
  otpCardAccent: {
    height: 5,
    backgroundColor: COLORS.secondary,
  },
  otpCardContent: {
    padding: 28,
  },
  otpLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 24,
  },
  otpInputWrapper: {
    position: 'relative',
  },
  otpInput: {
    width: 65,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  otpInputFilled: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.cream,
  },
  otpInputError: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  otpInputDot: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  loadingSpinner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(122, 12, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },

  // Resend
  resendContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '500',
  },
  timerHighlight: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },

  // Security Info
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 24,
    gap: 16,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  securityDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Help
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 20,
    gap: 10,
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
    textAlign: 'center',
  },
});