import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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
  background: '#FDF5F7',
  cream: '#FFF5EC',
  cardBg: '#FFFFFF',
};

// Vector Shape Components
const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }: any) => (
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

const DottedPattern = ({ style, rows = 3, cols = 4, dotColor = COLORS.secondary }: any) => (
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

const StudentProfile = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

    fetchStudentProfile();
  }, []);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const studentId = await AsyncStorage.getItem('student_id');

      if (!studentId) {
        router.replace('/');
        return;
      }

      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=get_student_profile',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ student_id: studentId }),
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        setStudent(data[0]);
        await AsyncStorage.setItem('student_data', JSON.stringify(data[0]));
      } else {
        setError('Student profile not found');
      }
    } catch (err) {
      setError('Failed to fetch student data');
      console.error(err);

      try {
        const cachedData = await AsyncStorage.getItem('student_data');
        if (cachedData) {
          setStudent(JSON.parse(cachedData));
          setError('Showing cached data. Network error occurred.');
        }
      } catch (cacheErr) {
        console.error('Cache error:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await AsyncStorage.removeItem('student_id');
            await AsyncStorage.removeItem('student_data');
            router.replace('/');
          },
          style: 'destructive',
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="person" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading Profile...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  if (error && !student) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={[styles.loadingIconContainer, { borderColor: 'rgba(220, 38, 38, 0.3)' }]}>
            <Ionicons name="alert-circle" size={36} color={COLORS.error} />
          </View>
          <Text style={styles.loadingText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStudentProfile}>
            <Ionicons name="refresh" size={16} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const BRANCH_PHOTO_FOLDER: Record<string, string> = {
    '1': 'Bishambharpur',
    '2': 'Barauli',
    '4': 'Barharia',
  };
  const getPhotoUrl = (branchId: string, admission: string) => {
    const folder = BRANCH_PHOTO_FOLDER[branchId] || 'Bishambharpur';
    return `https://rmpublicschool.org/binex/student_photo/${folder}/Photo/${admission}.jpg`;
  };

  const imageSource = student?.student_photo !== "no_image.jpg"
    ? { uri: getPhotoUrl(student.branch_id, student.student_admission) }
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.primary} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {/* Background Decorations */}
          <View style={styles.headerDecorations} pointerEvents="none">
            <Animated.View
              style={[
                styles.headerBlob1,
                { transform: [{ translateY: floatTranslate }] },
              ]}
            />
            <View style={styles.headerBlob2} />
            <DiamondShape style={styles.headerDiamond1} color="rgba(212, 175, 55, 0.3)" size={12} />
            <DiamondShape style={styles.headerDiamond2} color="rgba(255, 255, 255, 0.15)" size={8} />
            <DottedPattern style={styles.headerDots} rows={2} cols={4} dotColor="rgba(255, 255, 255, 0.25)" />
            <View style={styles.headerStripe} />
          </View>

          {/* Header Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Student Profile</Text>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Profile Section */}
          <Animated.View
            style={[
              styles.profileSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Avatar */}
            <View style={styles.profileImageWrapper}>
              {imageSource ? (
                <Image source={imageSource} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitial}>
                    {student?.student_name?.charAt(0) || 'S'}
                  </Text>
                </View>
              )}
            </View>

            {/* Name & Info */}
            <Text style={styles.studentName}>{student?.student_name}</Text>

            <View style={styles.infoPillsRow}>
              <View style={styles.infoPill}>
                <Ionicons name="school" size={12} color={COLORS.secondary} />
                <Text style={styles.infoPillText}>
                  {student?.student_class} - {student?.student_section}
                </Text>
              </View>
              <View style={styles.infoPill}>
                <Ionicons name="id-card" size={12} color={COLORS.secondary} />
                <Text style={styles.infoPillText}>Roll #{student?.student_roll}</Text>
              </View>
            </View>

            {student?.student_type && (
              <View style={styles.typeBadge}>
                <Ionicons name="bus" size={12} color={COLORS.primary} />
                <Text style={styles.typeBadgeText}>{student.student_type}</Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Error Banner */}
        {error && student && (
          <View style={styles.errorBanner}>
            <Ionicons name="information-circle" size={16} color={COLORS.secondary} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          {/* Academic Information */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <DetailCard
              title="Academic Information"
              icon={<FontAwesome5 name="user-graduate" size={16} color={COLORS.secondary} />}
              details={[
                { icon: <MaterialIcons name="date-range" size={16} color={COLORS.secondary} />, label: "Session", value: student?.student_session },
                { icon: <MaterialIcons name="confirmation-number" size={16} color={COLORS.secondary} />, label: "Admission No", value: student?.student_admission },
                { icon: <MaterialIcons name="event" size={16} color={COLORS.secondary} />, label: "Date of Admission", value: student?.date_of_admission },
                { icon: <MaterialIcons name="category" size={16} color={COLORS.secondary} />, label: "Admission Type", value: student?.admission_type },
                { icon: <Ionicons name="school" size={16} color={COLORS.secondary} />, label: "Class", value: `${student?.student_class} - ${student?.student_section}` },
                { icon: <MaterialIcons name="format-list-numbered" size={16} color={COLORS.secondary} />, label: "Roll Number", value: student?.student_roll },
                { icon: <FontAwesome5 name="home" size={14} color={COLORS.secondary} />, label: "House", value: student?.house_name || "N/A" },
              ]}
            />
          </Animated.View>

          {/* Personal Information */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <DetailCard
              title="Personal Information"
              icon={<Ionicons name="person" size={16} color={COLORS.secondary} />}
              details={[
                { icon: <FontAwesome5 name="birthday-cake" size={14} color={COLORS.secondary} />, label: "Date of Birth", value: student?.date_of_birth },
                { icon: <Ionicons name="male-female" size={16} color={COLORS.secondary} />, label: "Gender", value: student?.student_sex },
                { icon: <FontAwesome5 name="tint" size={14} color={COLORS.secondary} />, label: "Blood Group", value: student?.student_bloodgroup !== "NULL" ? student?.student_bloodgroup : "N/A" },
                { icon: <MaterialIcons name="category" size={16} color={COLORS.secondary} />, label: "Category", value: student?.student_category !== "NULL" ? student?.student_category : "N/A" },
                { icon: <FontAwesome5 name="pray" size={14} color={COLORS.secondary} />, label: "Religion", value: student?.student_religion !== "NULL" ? student?.student_religion : "N/A" },
                { icon: <FontAwesome5 name="id-card" size={14} color={COLORS.secondary} />, label: "Aadhar No", value: student?.aadhar_no !== "NULL" ? student?.aadhar_no : "N/A" },
              ]}
            />
          </Animated.View>

          {/* Contact & Address */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <DetailCard
              title="Contact Details"
              icon={<Ionicons name="call" size={16} color={COLORS.secondary} />}
              details={[
                { icon: <Ionicons name="call" size={16} color={COLORS.secondary} />, label: "Mobile", value: student?.student_mobile },
                { icon: <Ionicons name="logo-whatsapp" size={16} color={COLORS.secondary} />, label: "WhatsApp", value: student?.student_whatsapp },
                { icon: <MaterialIcons name="email" size={16} color={COLORS.secondary} />, label: "Email", value: student?.student_email },
                {
                  icon: <Ionicons name="location" size={16} color={COLORS.secondary} />,
                  label: "Address",
                  value: [student?.student_address1, student?.student_address2]
                    .filter(p => p && p !== 'NULL' && p.trim() !== '')
                    .join(', ')
                },
                {
                  icon: <MaterialIcons name="location-city" size={16} color={COLORS.secondary} />,
                  label: "Region",
                  value: [
                    [student?.district_code, student?.state_code].filter(p => p && p !== 'NULL').join(', '),
                    student?.pin_code && student?.pin_code !== 'NULL' ? student?.pin_code : null
                  ].filter(Boolean).join(' - ')
                },
              ]}
            />
          </Animated.View>

          {/* Family Information */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <DetailCard
              title="Family Information"
              icon={<MaterialIcons name="family-restroom" size={16} color={COLORS.secondary} />}
              details={[
                { icon: <MaterialIcons name="person" size={16} color={COLORS.secondary} />, label: "Father's Name", value: student?.student_father },
                { icon: <MaterialIcons name="work" size={16} color={COLORS.secondary} />, label: "Father's Occupation", value: student?.father_occupation !== "NULL" ? student?.father_occupation : "N/A" },
                { icon: <MaterialIcons name="school" size={16} color={COLORS.secondary} />, label: "Father's Qualification", value: student?.father_qualification !== "NULL" ? student?.father_qualification : "N/A" },
                { icon: <MaterialIcons name="person" size={16} color={COLORS.secondary} />, label: "Mother's Name", value: student?.student_mother },
                { icon: <MaterialIcons name="work" size={16} color={COLORS.secondary} />, label: "Mother's Occupation", value: student?.mother_occupation !== "NULL" ? student?.mother_occupation : "N/A" },
              ]}
            />
          </Animated.View>

          {/* Settings */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.settingsCard}>
              <SettingItem
                icon="log-out-outline"
                label="Logout"
                color={COLORS.error}
                onPress={handleLogout}
              />
            </View>
          </Animated.View>

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailCard = ({ title, icon, details }: any) => {
  // Helper to check if value is valid
  const isValid = (val: any) => {
    if (!val) return false;
    const str = String(val).trim().toUpperCase();
    return str !== '' && str !== 'NULL' && str !== '0000-00-00' && str !== 'N/A' && str !== '0' && str !== 'UNDEFINED';
  };

  const validDetails = details.filter((item: any) => isValid(item.value));

  if (validDetails.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconContainer}>
          {icon}
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>

      <View style={styles.cardContent}>
        {validDetails.map((item: any, index: number) => (
          <View
            key={index}
            style={[
              styles.detailRow,
              index === validDetails.length - 1 && styles.detailRowLast
            ]}
          >
            <View style={styles.detailIcon}>{item.icon}</View>
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text style={styles.detailValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const SettingItem = ({ icon, label, color, onPress }: any) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.settingIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={styles.settingLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F7',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  loadingSubtext: {
    fontSize: 11,
    color: COLORS.gray,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 12,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerDecorations: {
    ...StyleSheet.absoluteFillObject,
  },
  headerBlob1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.secondary,
    opacity: 0.08,
    top: -30,
    right: -30,
  },
  headerBlob2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
    opacity: 0.06,
    bottom: 20,
    left: -20,
  },
  headerDiamond1: {
    position: 'absolute',
    top: 40,
    left: 30,
  },
  headerDiamond2: {
    position: 'absolute',
    bottom: 40,
    right: 50,
  },
  headerDots: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  headerStripe: {
    position: 'absolute',
    top: 60,
    right: -15,
    width: 80,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.secondary,
    opacity: 0.06,
    transform: [{ rotate: '-15deg' }],
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
    zIndex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 14,
    zIndex: 1,
  },
  profileImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.secondary,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    backgroundColor: COLORS.white,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  infoPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoPillText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    padding: 10,
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.ink,
    fontWeight: '500',
  },

  // Content
  contentContainer: {
    padding: 10,
  },

  // Detail Card
  card: {
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F5E8EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E8EB',
    gap: 8,
  },
  cardIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
  },
  cardContent: {
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    width: 24,
    marginRight: 4,
    marginTop: 2,
  },
  detailLabel: {
    flex: 0.4,
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
    lineHeight: 18,
  },
  detailValue: {
    flex: 0.6,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    marginLeft: 8,
    textAlign: 'right',
    lineHeight: 18,
  },

  // Settings
  settingsCard: {
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    padding: 4,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F5E8EB',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  settingIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },

  // Dotted Pattern
  dottedContainer: {
    position: 'absolute',
  },
  dottedRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 3,
  },
});

export default StudentProfile;