import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  cream: '#FFF8E7',
  overlay: 'rgba(122, 12, 46, 0.95)',
};

// Vector Shape Components
const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }) => (
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

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }) => (
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

const DottedPattern = ({ style, rows = 3, cols = 5 }) => (
  <View style={[styles.dottedContainer, style]}>
    {[...Array(rows)].map((_, rowIndex) => (
      <View key={rowIndex} style={styles.dottedRow}>
        {[...Array(cols)].map((_, colIndex) => (
          <View
            key={colIndex}
            style={[
              styles.dot,
              { opacity: 0.2 + (rowIndex * cols + colIndex) * 0.03 },
            ]}
          />
        ))}
      </View>
    ))}
  </View>
);

export default function LoginScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSendOTP = async () => {
    Keyboard.dismiss();
    setError('');

    if (!validatePhone(phoneNumber)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);

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

      const data = await response.json();

      if (data.status === 'success') {
        router.push({
          pathname: '/otp',
          params: {
            phoneNumber: phoneNumber,
            studentCount: data.count.toString(),
          },
        });
      } else {
        setError(data.msg || 'No student found with this mobile number');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const float1Translate = floatAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const float2Translate = floatAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Background Vector Elements */}
      <View style={styles.backgroundVectors} pointerEvents="none">
        <Animated.View
          style={[
            styles.glowBlobPrimary,
            { transform: [{ translateY: float1Translate }] },
          ]}
        />
        <Animated.View
          style={[
            styles.glowBlobSecondary,
            { transform: [{ translateY: float2Translate }] },
          ]}
        />

        <View style={styles.vectorStripe} />
        <View style={styles.vectorStripe2} />

        <Animated.View
          style={[
            styles.rotatingRing,
            { transform: [{ rotate }] },
          ]}
        >
          <CircleRing size={100} borderWidth={2} color="rgba(212, 175, 55, 0.3)" />
        </Animated.View>

        <DiamondShape
          style={styles.diamond1}
          color="rgba(212, 175, 55, 0.4)"
          size={16}
        />
        <DiamondShape
          style={styles.diamond2}
          color="rgba(255, 255, 255, 0.2)"
          size={12}
        />
        <DiamondShape
          style={styles.diamond3}
          color="rgba(212, 175, 55, 0.3)"
          size={20}
        />

        <DottedPattern style={styles.dottedPattern1} rows={4} cols={6} />
        <DottedPattern style={styles.dottedPattern2} rows={3} cols={4} />

        <Animated.View
          style={[
            styles.pulsingCircle,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
        <View style={styles.smallCircle1} />
        <View style={styles.smallCircle2} />
        <View style={styles.smallCircle3} />

        <View style={styles.lineAccent1} />
        <View style={styles.lineAccent2} />
        <View style={styles.lineAccent3} />

        {/* Hexagon Pattern */}
        <View style={styles.hexagonWrapper}>
          <View style={styles.hexagon} />
        </View>

        {/* Cross Pattern */}
        <View style={styles.crossPattern}>
          <View style={styles.crossHorizontal} />
          <View style={styles.crossVertical} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.innerContainer}>
              {/* Hero Section */}
              <Animated.View
                style={[
                  styles.hero,
                  { 
                    opacity: fadeAnim, 
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <View style={styles.portalPill}>
                  <Ionicons name="sparkles" size={14} color={COLORS.secondary} />
                  <Text style={styles.portalPillText}>STUDENT PORTAL</Text>
                </View>
              </Animated.View>

              {/* Identity Section */}
              <Animated.View
                style={[
                  styles.identityRow,
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <View style={styles.logoWrapper}>
                  <View style={styles.logoGlow} />
                  <View style={styles.logoCard}>
                    <Image
                      source={require('./assets/logo.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <View style={styles.schoolMeta}>
                  <Text style={styles.schoolName}>R M Public School</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color={COLORS.secondary} />
                    <Text style={styles.tagline}>Manjhagarh, Gopalganj</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Form Card */}
              <Animated.View
                style={[
                  styles.formContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }, { scale: cardScale }],
                  },
                ]}
              >
                <View style={styles.formCard}>
                  <View style={styles.cardAccentLine} />

                  <View style={styles.cardHeader}>
                    <View style={styles.headerTopRow}>
                      <View style={styles.headerIconContainer}>
                        <Ionicons name="key" size={24} color={COLORS.primary} />
                      </View>
                      <Text style={styles.welcomeText}>Sign in with OTP</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Enter your registered mobile number to receive a secure code.
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Mobile Number</Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          isFocused && styles.inputWrapperFocused,
                          error && styles.inputWrapperError,
                        ]}
                      >
                        <View style={styles.countryCode}>
                          <Text style={styles.flagText}>🇮🇳</Text>
                          <Text style={styles.countryCodeText}>+91</Text>
                        </View>
                        <View style={styles.inputDivider} />
                        <TextInput
                          ref={inputRef}
                          style={styles.input}
                          placeholder="Mobile number"
                          placeholderTextColor={COLORS.gray}
                          keyboardType="number-pad"
                          maxLength={10}
                          value={phoneNumber}
                          onChangeText={(text) => {
                            setPhoneNumber(text.replace(/[^0-9]/g, ''));
                            setError('');
                          }}
                          onFocus={handleInputFocus}
                          onBlur={handleInputBlur}
                          autoCorrect={false}
                          autoCapitalize="none"
                          returnKeyType="done"
                          onSubmitEditing={handleSendOTP}
                        />
                        {phoneNumber.length === 10 && !error && (
                          <View style={styles.validIcon}>
                            <Ionicons
                              name="checkmark-circle"
                              size={24}
                              color={COLORS.success}
                            />
                          </View>
                        )}
                      </View>
                    </View>

                    {error ? (
                      <Animated.View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                        <Text style={styles.errorText}>{error}</Text>
                      </Animated.View>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.sendOtpButton,
                        loading && styles.sendOtpButtonDisabled,
                      ]}
                      onPress={handleSendOTP}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <View style={styles.buttonContent}>
                        {loading ? (
                          <>
                            <ActivityIndicator color={COLORS.primary} size="small" />
                            <Text style={styles.buttonText}>Sending OTP...</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.buttonText}>Send OTP</Text>
                            <View style={styles.buttonIconBadge}>
                              <Ionicons name="send" size={18} color={COLORS.secondary} />
                            </View>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.infoContainer}>
                      <View style={styles.infoIconWrapper}>
                        <Ionicons name="shield-checkmark" size={16} color={COLORS.secondary} />
                      </View>
                      <Text style={styles.infoText}>
                        We only use your mobile number for secure login verification.
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* Features Section */}
              {!keyboardVisible && (
                <Animated.View 
                  style={[
                    styles.featuresContainer, 
                    { opacity: fadeAnim }
                  ]}
                >
                  <View style={styles.featuresRow}>
                    <FeatureItem 
                      icon="notifications-outline" 
                      text="Instant alerts" 
                      delay={400} 
                    />
                    <FeatureItem 
                      icon="calendar-outline" 
                      text="Daily homework" 
                      delay={500} 
                    />
                    <FeatureItem 
                      icon="card-outline" 
                      text="Fee tracking" 
                      delay={600} 
                    />
                  </View>
                </Animated.View>
              )}

              {/* Footer */}
              <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
                <TouchableOpacity
                  style={styles.adminLoginButton}
                  onPress={() => router.push('/admin_login')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-circle-outline" size={18} color={COLORS.secondary} />
                  <Text style={styles.footerText}>Admin Login</Text>
                </TouchableOpacity>
                
                <View style={styles.versionContainer}>
                  <View style={styles.versionDot} />
                  <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FeatureItem({ icon, text, delay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.featureItem, 
        { 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={22} color={COLORS.secondary} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </Animated.View>
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
  innerContainer: {
    flex: 1,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },

  // Background Elements
  glowBlobPrimary: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.secondary,
    opacity: 0.15,
    top: -80,
    right: -100,
  },
  glowBlobSecondary: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.3,
    bottom: 150,
    left: -80,
  },
  vectorStripe: {
    position: 'absolute',
    top: 140,
    right: -60,
    width: 250,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.secondary,
    opacity: 0.1,
    transform: [{ rotate: '-15deg' }],
  },
  vectorStripe2: {
    position: 'absolute',
    bottom: 200,
    left: -80,
    width: 300,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    opacity: 0.08,
    transform: [{ rotate: '20deg' }],
  },
  rotatingRing: {
    position: 'absolute',
    top: 80,
    right: 20,
  },
  diamond1: {
    position: 'absolute',
    top: 200,
    left: 30,
  },
  diamond2: {
    position: 'absolute',
    top: 350,
    right: 40,
  },
  diamond3: {
    position: 'absolute',
    bottom: 250,
    right: 60,
  },
  dottedContainer: {
    position: 'absolute',
  },
  dottedRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
    marginHorizontal: 6,
  },
  dottedPattern1: {
    top: 250,
    right: 10,
  },
  dottedPattern2: {
    bottom: 300,
    left: 20,
  },
  pulsingCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
    opacity: 0.1,
    top: 180,
    right: 80,
  },
  smallCircle1: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    opacity: 0.4,
    top: 100,
    left: 50,
  },
  smallCircle2: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    opacity: 0.3,
    bottom: 350,
    right: 30,
  },
  smallCircle3: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    opacity: 0.25,
    bottom: 180,
    left: 80,
  },
  lineAccent1: {
    position: 'absolute',
    width: 80,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.secondary,
    opacity: 0.2,
    top: 320,
    left: 10,
    transform: [{ rotate: '-30deg' }],
  },
  lineAccent2: {
    position: 'absolute',
    width: 60,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.white,
    opacity: 0.15,
    bottom: 280,
    right: 20,
    transform: [{ rotate: '45deg' }],
  },
  lineAccent3: {
    position: 'absolute',
    width: 100,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.secondary,
    opacity: 0.15,
    top: 420,
    right: 0,
    transform: [{ rotate: '-60deg' }],
  },
  hexagonWrapper: {
    position: 'absolute',
    top: 300,
    right: 25,
    opacity: 0.15,
  },
  hexagon: {
    width: 40,
    height: 23,
    backgroundColor: COLORS.secondary,
  },
  crossPattern: {
    position: 'absolute',
    bottom: 320,
    left: 60,
    width: 20,
    height: 20,
    opacity: 0.25,
  },
  crossHorizontal: {
    position: 'absolute',
    top: 8,
    left: 0,
    width: 20,
    height: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },
  crossVertical: {
    position: 'absolute',
    top: 0,
    left: 8,
    width: 4,
    height: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },

  // Hero Section
  hero: {
    marginBottom: 24,
  },
  portalPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  portalPillText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Identity Section
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 59,
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  logoWrapper: {
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.secondary,
    opacity: 0.2,
    top: -5,
    left: -5,
  },
  logoCard: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
    borderWidth: 3,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  logoImage: {
    width: 65,
    height: 65,
  },
  schoolMeta: {
    flex: 1,
  },
  schoolName: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Form Card
  formContainer: {
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  cardAccentLine: {
    height: 5,
    backgroundColor: COLORS.secondary,
  },
  cardHeader: {
    padding: 28,
    paddingBottom: 12,
    alignItems: 'flex-start',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(122, 12, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: 0.3,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'left',
    lineHeight: 20,
    paddingHorizontal: 0,
  },
  cardBody: {
    padding: 24,
    paddingTop: 8,
  },

  // Input Section
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    paddingRight: 12,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 8,
  },
  flagText: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  inputDivider: {
    width: 2,
    height: 32,
    backgroundColor: COLORS.secondary,
    borderRadius: 1,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: COLORS.ink,
    fontWeight: '600',
    paddingHorizontal: 14,
    letterSpacing: 1,
  },
  validIcon: {
    marginLeft: 8,
  },

  // Error Container
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
    gap: 10,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
  },

  // Button
  sendOtpButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  sendOtpButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  buttonIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  // Info Container
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.cream,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  infoIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#8A5A1A',
    lineHeight: 18,
    fontWeight: '500',
  },

  // Features Section
  featuresContainer: {
    marginBottom: 24,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  featureText: {
    fontSize: 11,
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 10,
    gap: 16,
  },
  adminLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  versionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  versionText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});
