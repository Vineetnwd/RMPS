import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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

const DottedPattern = ({ style, rows = 3, cols = 5, dotColor = COLORS.secondary }) => (
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

const BRANCH_PHOTO_FOLDER: Record<string, string> = {
  '1': 'Bishambharpur',
  '2': 'Barauli',
  '4': 'Barharia',
};

const getStudentPhotoUrl = (branchId: string | number, studentAdmission: string) => {
  if (!branchId) return null;
  const folder = BRANCH_PHOTO_FOLDER[branchId.toString()];
  if (!folder) return null;
  return `https://rmpublicschool.org/binex/student_photo/${folder}/Photo/${studentAdmission}.jpg`;
};

export default function StudentSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [students, setStudents] = useState([]);
  const [notices, setNotices] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Parse students
    if (params.students) {
      try {
        const studentsData = JSON.parse(params.students);
        setStudents(studentsData);
        console.log('Students loaded:', studentsData.length);
      } catch (e) {
        console.error('Error parsing students:', e);
      }
    }

    // Parse notices
    if (params.notices) {
      try {
        const noticesData = JSON.parse(params.notices);
        setNotices(noticesData);
        console.log('Notices loaded:', noticesData.length);
      } catch (e) {
        console.error('Error parsing notices:', e);
      }
    }

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
  }, []);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleStudentSelect = async (student) => {
    try {
      // Store all student data in AsyncStorage
      await AsyncStorage.setItem('student_id', student.id);
      await AsyncStorage.setItem('student_admission', student.student_admission);
      await AsyncStorage.setItem('student_name', student.student_name);
      await AsyncStorage.setItem('student_class', student.student_class);
      await AsyncStorage.setItem('student_section', student.student_section);
      await AsyncStorage.setItem('student_roll', student.student_roll);
      await AsyncStorage.setItem('student_type', student.student_type);
      await AsyncStorage.setItem('student_photo', student.student_photo);
      await AsyncStorage.setItem('student_sex', student.student_sex);
      await AsyncStorage.setItem('student_mobile', student.student_mobile);
      await AsyncStorage.setItem('total_paid', student.total_paid);
      await AsyncStorage.setItem('current_dues', student.current_dues);
      await AsyncStorage.setItem('student_data', JSON.stringify(student));
      await AsyncStorage.setItem('isLoggedIn', 'true');

      // Store notices
      if (notices && notices.length > 0) {
        await AsyncStorage.setItem('notices', JSON.stringify(notices));
        console.log('Notices stored in AsyncStorage');
      }

      console.log('Student selected:', student.student_name);

      // Navigate to home with student data and notices
      router.replace({
        pathname: '/student_home',
        params: {
          studentData: JSON.stringify(student),
          notices: JSON.stringify(notices),
        },
      });
    } catch (error) {
      console.error('Error storing student data:', error);
    }
  };

  const handleGoBack = () => {
    router.back();
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
          <CircleRing size={100} borderWidth={2} color="rgba(212, 175, 55, 0.25)" />
        </Animated.View>

        <DiamondShape style={styles.diamond1} color="rgba(212, 175, 55, 0.4)" size={16} />
        <DiamondShape style={styles.diamond2} color="rgba(255, 255, 255, 0.2)" size={12} />
        <DiamondShape style={styles.diamond3} color="rgba(212, 175, 55, 0.3)" size={18} />
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
          onPress={handleGoBack}
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
            <View style={styles.headerIconContainer}>
              <Ionicons name="people" size={40} color={COLORS.primary} />
            </View>
          </View>

          <Text style={styles.title}>Select Student</Text>
          <Text style={styles.subtitle}>
            Choose a profile to continue
          </Text>

          <View style={styles.countBadge}>
            <Ionicons name="school" size={14} color={COLORS.secondary} />
            <Text style={styles.countBadgeText}>
              {students.length} student{students.length > 1 ? 's' : ''} found
            </Text>
          </View>

          {notices.length > 0 && (
            <View style={styles.noticesBadge}>
              <View style={styles.noticesBadgeIcon}>
                <Ionicons name="notifications" size={14} color={COLORS.secondary} />
              </View>
              <Text style={styles.noticesBadgeText}>
                {notices.length} new notice{notices.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Students List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {students.map((student, index) => (
            <StudentCard
              key={student.id}
              student={student}
              index={index}
              fadeAnim={fadeAnim}
              onSelect={handleStudentSelect}
            />
          ))}

          {/* Help Section */}
          <View style={styles.helpSection}>
            <View style={styles.helpIconContainer}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.helpText}>
              Tap on a student card to access their dashboard
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function StudentCard({ student, index, fadeAnim, onSelect }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 100,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.studentCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onSelect(student)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        activeOpacity={0.95}
        style={[
          styles.cardTouchable,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Card Accent */}
        <View style={styles.cardAccent} />

        <View style={styles.cardContent}>
          <View style={styles.studentInfo}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow} />
              {student.student_photo !== 'no_image.jpg' && getStudentPhotoUrl(student.branch_id, student.student_admission) ? (
                <Image
                  source={{
                    uri: getStudentPhotoUrl(student.branch_id, student.student_admission) || '',
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    {
                      backgroundColor:
                        student.student_sex === 'MALE'
                          ? 'rgba(122, 12, 46, 0.1)'
                          : 'rgba(212, 175, 55, 0.15)',
                    },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={32}
                    color={COLORS.primary}
                  />
                </View>
              )}
              <View style={styles.classBadge}>
                <Text style={styles.classBadgeText}>
                  {student.student_class}
                </Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.details}>
              <Text style={styles.studentName} numberOfLines={1}>
                {student.student_name}
              </Text>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="school" size={12} color={COLORS.secondary} />
                </View>
                <Text style={styles.detailText}>
                  Class {student.student_class} - Section {student.student_section}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="id-card" size={12} color={COLORS.secondary} />
                </View>
                <Text style={styles.detailText}>
                  Roll: {student.student_roll} | Adm: {student.student_admission}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="bus" size={12} color={COLORS.secondary} />
                </View>
                <Text style={styles.detailText}>
                  {student.student_type}
                </Text>
              </View>

              {/* Payment Info */}
              {/* <View style={styles.paymentInfo}>
                <View style={styles.paymentItem}>
                  <View style={styles.paymentIconContainer}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  </View>
                  <View>
                    <Text style={styles.paymentLabel}>Total Paid</Text>
                    <Text style={styles.paymentValuePaid}>₹{student.total_paid || '0'}</Text>
                  </View>
                </View>
                <View style={styles.paymentDivider} />
                <View style={styles.paymentItem}>
                  <View style={styles.paymentIconContainer}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                  </View>
                  <View>
                    <Text style={styles.paymentLabel}>Current Dues</Text>
                    <Text style={styles.paymentValueDue}>₹{student.current_dues || '0'}</Text>
                  </View>
                </View>
              </View> */}
            </View>
          </View>

          {/* Arrow Button */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.white} />
          </View>
        </View>
      </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingTop: 30,
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
    bottom: 100,
    left: -60,
  },
  vectorStripe1: {
    position: 'absolute',
    top: 200,
    right: -50,
    width: 200,
    height: 26,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    opacity: 0.08,
    transform: [{ rotate: '-20deg' }],
  },
  vectorStripe2: {
    position: 'absolute',
    bottom: 200,
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
    top: 120,
    right: 20,
  },
  diamond1: {
    position: 'absolute',
    top: 250,
    left: 25,
  },
  diamond2: {
    position: 'absolute',
    top: 400,
    right: 35,
  },
  diamond3: {
    position: 'absolute',
    bottom: 150,
    right: 50,
  },
  diamond4: {
    position: 'absolute',
    bottom: 300,
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
    top: 320,
    right: 15,
  },
  dottedPattern2: {
    bottom: 250,
    left: 15,
  },
  smallCircle1: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
    opacity: 0.4,
    top: 180,
    left: 40,
  },
  smallCircle2: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    opacity: 0.25,
    bottom: 350,
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
    top: 380,
    left: 10,
    transform: [{ rotate: '-35deg' }],
  },
  lineAccent2: {
    position: 'absolute',
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.white,
    opacity: 0.15,
    bottom: 280,
    right: 15,
    transform: [{ rotate: '40deg' }],
  },
  crossPattern: {
    position: 'absolute',
    bottom: 400,
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
    width: 26,
    height: 26,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Header
  header: {
    paddingHorizontal: 24,
    marginBottom: 10,
    alignItems: 'center',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  iconGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: COLORS.secondary,
    opacity: 0.2,
    top: -5,
    left: -5,
  },
  headerIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 10,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    marginBottom: 12,
  },
  countBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
  },
  noticesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  noticesBadgeIcon: {
    width: 18,
    height: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticesBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },

  // Student Card
  studentCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  cardTouchable: {
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardAccent: {
    height: 5,
    backgroundColor: COLORS.secondary,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  studentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    opacity: 0.15,
    top: -3,
    left: -3,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  avatarPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  classBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 1,
  },
  classBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  details: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
    flex: 1,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  paymentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 10,
    color: COLORS.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  paymentValuePaid: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.success,
  },
  paymentValueDue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.error,
  },
  paymentDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    marginHorizontal: 12,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 1,
  },

  // Help Section
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  helpIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    flex: 1,
  },
});