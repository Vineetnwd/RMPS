import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

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
  warning: '#F59E0B',
  background: '#F8FAFC',
  cream: '#FFF8E7',
  cardBg: '#FFFFFF',
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

const DottedPattern = ({ style, rows = 3, cols = 4, dotColor = COLORS.secondary }) => (
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
                opacity: 0.3 + (rowIndex * cols + colIndex) * 0.03
              },
            ]}
          />
        ))}
      </View>
    ))}
  </View>
);

const COMPLAINT_TO_OPTIONS = [
  { label: 'ADMIN', value: 'ADMIN', icon: 'shield' },
  { label: 'ACCOUNT', value: 'ACCOUNT', icon: 'wallet' },
];

export default function ComplaintScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    complaint_date: new Date().toISOString().split('T')[0],
    complaint_to: 'ADMIN',
    complaint: '',
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState({});

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

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
  }, []);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.complaint_date) {
      newErrors.complaint_date = 'Date is required';
    }

    if (!formData.complaint_to) {
      newErrors.complaint_to = 'Please select recipient';
    }

    if (!formData.complaint.trim()) {
      newErrors.complaint = 'Complaint message is required';
    } else if (formData.complaint.trim().length < 10) {
      newErrors.complaint = 'Complaint must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const studentId = await AsyncStorage.getItem('student_id');

      if (!studentId) {
        Alert.alert('Error', 'Student ID not found. Please login again.');
        router.replace('/index');
        return;
      }

      const payload = {
        student_id: studentId,
        complaint_date: formData.complaint_date,
        complaint_to: formData.complaint_to,
        complaint: formData.complaint.trim(),
        status: 'ACTIVE',
      };

      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=send_complaint',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (data.status === 'success') {
        Alert.alert(
          'Success', 'Your complaint has been submitted successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                setFormData({
                  complaint_date: new Date().toISOString().split('T')[0],
                  complaint_to: 'ADMIN',
                  complaint: '',
                });
                setErrors({});
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', data.msg || 'Failed to submit complaint');
      }
    } catch (err) {
      console.error('Error submitting complaint:', err);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const handleDateChange = (days) => {
    const currentDate = new Date(formData.complaint_date);
    currentDate.setDate(currentDate.getDate() + days);
    setFormData({
      ...formData,
      complaint_date: currentDate.toISOString().split('T')[0],
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        {/* Background Decorations */}
        <View style={styles.headerDecorations} pointerEvents="none">
          <Animated.View
            style={[
              styles.headerBlob,
              { transform: [{ translateY: floatTranslate }] },
            ]}
          />
          <Animated.View
            style={[
              styles.headerRing,
              { transform: [{ rotate }] },
            ]}
          >
            <CircleRing size={80} borderWidth={2} color="rgba(212, 175, 55, 0.25)" />
          </Animated.View>
          <DiamondShape style={styles.headerDiamond1} color="rgba(212, 175, 55, 0.4)" size={14} />
          <DiamondShape style={styles.headerDiamond2} color="rgba(255, 255, 255, 0.2)" size={10} />
          <DottedPattern style={styles.headerDots} rows={2} cols={4} dotColor="rgba(255, 255, 255, 0.3)" />
          <View style={styles.headerStripe} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Submit Complaint</Text>
              <Text style={styles.headerSubtitle}>Share your concerns</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Info Card */}
          <Animated.View
            style={[
              styles.infoCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.infoIconContainer}>
              <Ionicons name="chatbox-ellipses" size={26} color={COLORS.primary} />
            </View>
            <Text style={styles.infoText}>
              Share your concerns and we'll address them promptly
            </Text>
          </Animated.View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Date Selector */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <View style={styles.labelIconContainer}>
                <Ionicons name="calendar" size={14} color={COLORS.secondary} />
              </View>
              <Text style={styles.label}>Date</Text>
            </View>
            <View style={styles.dateSelector}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => handleDateChange(-1)}
              >
                <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
              </TouchableOpacity>

              <View style={styles.dateDisplay}>
                <Text style={styles.dateText}>
                  {formatDateForDisplay(formData.complaint_date)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => handleDateChange(1)}
              >
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            {errors.complaint_date && (
              <Text style={styles.errorText}>{errors.complaint_date}</Text>
            )}
          </View>

          {/* Complaint To Dropdown */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <View style={styles.labelIconContainer}>
                <Ionicons name="person" size={14} color={COLORS.secondary} />
              </View>
              <Text style={styles.label}>Send To</Text>
            </View>
            <TouchableOpacity
              style={[styles.dropdown, errors.complaint_to && styles.inputError]}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <View style={styles.dropdownLeft}>
                <View style={styles.dropdownIconContainer}>
                  <Ionicons
                    name={COMPLAINT_TO_OPTIONS.find(o => o.value === formData.complaint_to)?.icon || 'shield'}
                    size={16}
                    color={COLORS.secondary}
                  />
                </View>
                <Text style={styles.dropdownText}>{formData.complaint_to}</Text>
              </View>
              <Ionicons
                name={showDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.gray}
              />
            </TouchableOpacity>

            {showDropdown && (
              <View style={styles.dropdownMenu}>
                {COMPLAINT_TO_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownItem,
                      formData.complaint_to === option.value && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, complaint_to: option.value });
                      setShowDropdown(false);
                      setErrors({ ...errors, complaint_to: null });
                    }}
                  >
                    <View style={styles.dropdownItemLeft}>
                      <View style={[
                        styles.dropdownItemIcon,
                        formData.complaint_to === option.value && styles.dropdownItemIconActive
                      ]}>
                        <Ionicons
                          name={option.icon}
                          size={16}
                          color={formData.complaint_to === option.value ? COLORS.primary : COLORS.secondary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          formData.complaint_to === option.value && styles.dropdownItemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {formData.complaint_to === option.value && (
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.complaint_to && (
              <Text style={styles.errorText}>{errors.complaint_to}</Text>
            )}
          </View>

          {/* Complaint Message */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <View style={styles.labelIconContainer}>
                <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.secondary} />
              </View>
              <Text style={styles.label}>Your Complaint</Text>
            </View>
            <View style={[styles.textAreaContainer, errors.complaint && styles.inputError]}>
              <TextInput
                style={styles.textArea}
                placeholder="Describe your complaint in detail..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                value={formData.complaint}
                onChangeText={(text) => {
                  setFormData({ ...formData, complaint: text });
                  setErrors({ ...errors, complaint: null });
                }}
              />
              <View style={styles.charCountContainer}>
                <Text style={styles.charCount}>
                  {formData.complaint.length} characters
                </Text>
              </View>
            </View>
            {errors.complaint && (
              <Text style={styles.errorText}>{errors.complaint}</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={[styles.submitButtonInner, loading && styles.submitButtonInnerDisabled]}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Submit Complaint</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <View style={styles.tipsIconContainer}>
                <Ionicons name="bulb" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.tipsTitle}>Tips for Better Response</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.tipText}>Be specific and clear in your complaint</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.tipText}>Provide relevant details and context</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.tipText}>Use respectful and professional language</Text>
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerDecorations: {
    ...StyleSheet.absoluteFillObject,
  },
  headerBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.secondary,
    opacity: 0.12,
    top: -40,
    right: -50,
  },
  headerRing: {
    position: 'absolute',
    top: 30,
    left: -30,
  },
  headerDiamond1: {
    position: 'absolute',
    top: 80,
    right: 60,
  },
  headerDiamond2: {
    position: 'absolute',
    top: 120,
    right: 100,
  },
  headerDots: {
    position: 'absolute',
    bottom: 60,
    left: 30,
  },
  headerStripe: {
    position: 'absolute',
    width: 3,
    height: 60,
    backgroundColor: COLORS.secondary,
    opacity: 0.3,
    right: 40,
    bottom: 40,
    borderRadius: 2,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '500',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formContainer: {},

  // Input Group
  inputGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  labelIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dateButton: {
    padding: 16,
    backgroundColor: COLORS.cardBg,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.cream,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Dropdown
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 15,
    color: COLORS.ink,
    fontWeight: '600',
  },
  dropdownMenu: {
    marginTop: 10,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.cream,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownItemIconActive: {
    backgroundColor: COLORS.secondary,
  },
  dropdownItemText: {
    fontSize: 15,
    color: COLORS.ink,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Text Area
  textAreaContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  textArea: {
    fontSize: 15,
    color: COLORS.ink,
    minHeight: 150,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  charCountContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    marginTop: 12,
    paddingTop: 10,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'right',
    fontWeight: '500',
  },
  inputError: {
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
    marginLeft: 5,
    fontWeight: '500',
  },

  // Submit Button
  submitButton: {
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    gap: 10,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    borderRadius: 16,
  },
  submitButtonInnerDisabled: {
    backgroundColor: COLORS.gray,
    borderColor: COLORS.gray,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  tipsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
  },

  // Dotted Pattern
  dottedContainer: {
    position: 'absolute',
  },
  dottedRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 4,
  },
});