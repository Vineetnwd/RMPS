import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// DPS Theme Colors
const COLORS = {
  primary: '#d31103',      // DPS Red
  secondary: '#ffc002',    // DPS Gold
  accent: '#d31103',       // DPS Red
  white: '#FFFFFF',
  gray: '#757575',
  lightGray: '#E0E0E0',
  error: '#F44336',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
};

const StudentProfile = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get student_id from AsyncStorage
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
        // Update cached data
        await AsyncStorage.setItem('student_data', JSON.stringify(data[0]));
      } else {
        setError('Student profile not found');
      }
    } catch (err) {
      setError('Failed to fetch student data');
      console.error(err);

      // Try to load cached data
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
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
        <Animatable.View
          animation="pulse"
          easing="ease-out"
          iterationCount="infinite"
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>DPS</Text>
          </View>
        </Animatable.View>
        <Text style={styles.loadingText}>Loading student profile...</Text>
      </View>
    );
  }

  if (error && !student) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={70} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchStudentProfile}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.primary]}
            style={styles.retryButtonGradient}
          >
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const imageSource = student?.student_photo !== "no_image.jpg"
    ? { uri: `https://dpsmushkipur.com/uploads/${student.student_photo}` }
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7A0C2E" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with DPS Gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.headerBackground}
        >
          {/* Header Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>



          {/* Student Photo */}
          <Animatable.View
            animation="fadeIn"
            duration={1000}
            style={styles.profileContainer}
          >

            {/* Student Name & Badge */}
            <View style={styles.infoOverlay}>
              <Text style={styles.studentName}>{student?.student_name}</Text>

              <View style={styles.studentBasicInfo}>
                <View style={styles.infoItem}>
                  <Ionicons name="school" size={16} color={COLORS.accent} />
                  <Text style={styles.infoText}>
                    {student?.student_class} - {student?.student_section}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="id-card" size={16} color={COLORS.accent} />
                  <Text style={styles.infoText}>Roll #{student?.student_roll}</Text>
                </View>
              </View>

              <View style={styles.badgeContainer}>
                <LinearGradient
                  colors={[COLORS.accent, '#FFD54F']}
                  style={styles.badge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="bus" size={14} color={COLORS.primary} />
                  <Text style={styles.badgeText}>{student?.student_type}</Text>
                </LinearGradient>
              </View>
            </View>
          </Animatable.View>
        </LinearGradient>

        {/* Error Banner */}
        {error && student && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          {/* Academic Information */}
          <Animatable.View animation="fadeInUp" delay={200}>
            <DetailCard
              title="Academic Information"
              icon={<FontAwesome5 name="user-graduate" size={22} color={COLORS.primary} />}
              details={[
                {
                  icon: <MaterialIcons name="school" size={20} color={COLORS.secondary} />,
                  label: "Admission No",
                  value: student?.student_admission
                },
                {
                  icon: <Ionicons name="book" size={20} color={COLORS.secondary} />,
                  label: "Class",
                  value: student?.student_class
                },
                {
                  icon: <FontAwesome5 name="chalkboard" size={18} color={COLORS.secondary} />,
                  label: "Section",
                  value: student?.student_section
                },
                {
                  icon: <MaterialIcons name="format-list-numbered" size={20} color={COLORS.secondary} />,
                  label: "Roll Number",
                  value: student?.student_roll
                },
              ]}
            />
          </Animatable.View>

          {/* Personal Information */}
          <Animatable.View animation="fadeInUp" delay={400}>
            <DetailCard
              title="Personal Information"
              icon={<Ionicons name="person" size={22} color={COLORS.primary} />}
              details={[
                {
                  icon: <Ionicons name="male-female" size={20} color={COLORS.secondary} />,
                  label: "Gender",
                  value: student?.student_sex
                },
                {
                  icon: <FontAwesome5 name="user-tie" size={18} color={COLORS.secondary} />,
                  label: "Father's Name",
                  value: student?.student_father || "Not Available"
                },
                {
                  icon: <Ionicons name="woman" size={20} color={COLORS.secondary} />,
                  label: "Mother's Name",
                  value: student?.student_mother || "Not Available"
                },
                {
                  icon: <Ionicons name="call" size={20} color={COLORS.secondary} />,
                  label: "Contact Number",
                  value: student?.student_mobile
                },
              ]}
            />
          </Animatable.View>

          {/* Quick Actions */}
          <Animatable.View animation="fadeInUp" delay={600}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtonContainer}>
              <ActionButton
                icon="calendar-outline"
                label="Attendance"
                gradient={[COLORS.secondary, '#81C784']}
                onPress={() => router.push('/student/attendance')}
              />
              <ActionButton
                icon="book-outline"
                label="Homework"
                gradient={['#2196F3', '#64B5F6']}
                onPress={() => router.push('/student/homework')}
              />
              <ActionButton
                icon="trophy-outline"
                label="Exam Report"
                gradient={['#FF9800', '#FFB74D']}
                onPress={() => router.push('/student/exam-report')}
              />
            </View>

            <View style={styles.actionButtonContainer}>
              <ActionButton
                icon="card-outline"
                label="Payment"
                gradient={[COLORS.accent, '#FFD54F']}
                onPress={() => router.push('/student/online-payment')}
              />
              <ActionButton
                icon="bus-outline"
                label="Live Bus"
                gradient={['#795548', '#A1887F']}
                onPress={() => router.push('/student/live-bus')}
              />
              <ActionButton
                icon="notifications-outline"
                label="Notices"
                gradient={['#E91E63', '#F06292']}
                onPress={() => router.push('/student/noticeboard')}
              />
            </View>
          </Animatable.View>

          {/* Settings */}
          <Animatable.View animation="fadeInUp" delay={800}>
            <View style={styles.settingsCard}>
              <SettingItem
                icon="create-outline"
                label="Edit Profile"
                color="#2196F3"
                onPress={() => { }}
              />
              <SettingItem
                icon="lock-closed-outline"
                label="Change Password"
                color="#FF9800"
                onPress={() => { }}
              />
              <SettingItem
                icon="shield-checkmark-outline"
                label="Privacy Settings"
                color="#9C27B0"
                onPress={() => { }}
              />
              <SettingItem
                icon="log-out-outline"
                label="Logout"
                color={COLORS.error}
                onPress={handleLogout}
              />
            </View>
          </Animatable.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailCard = ({ title, icon, details }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardIconContainer}>
        {icon}
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>

    <View style={styles.cardContent}>
      {details.map((item, index) => (
        <View
          key={index}
          style={[
            styles.detailRow,
            index === details.length - 1 && styles.detailRowLast
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

const ActionButton = ({ icon, label, gradient, onPress }) => (
  <TouchableOpacity
    style={styles.actionButton}
    activeOpacity={0.8}
    onPress={onPress}
  >
    <LinearGradient
      colors={gradient}
      style={styles.actionButtonGradient}
    >
      <Ionicons name={icon} size={28} color={COLORS.white} />
      <Text style={styles.actionButtonLabel}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const SettingItem = ({ icon, label, color, onPress }) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.settingIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.settingLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.gray,
    marginTop: 20,
    marginBottom: 25,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 14,
    gap: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerBackground: {
    paddingTop: 20,
    paddingBottom: 30,
    position: 'relative',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpsLogoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  dpsLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  dpsLogoText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 5,
    borderColor: COLORS.accent,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    backgroundColor: COLORS.white,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoOverlay: {
    width: '90%',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  studentBasicInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 3,
  },
  infoText: {
    color: COLORS.white,
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  badgeContainer: {
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 10,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    flex: 1,
  },
  cardContent: {
    marginLeft: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    width: 40,
  },
  detailLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.gray,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 15,
    marginTop: 5,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionButton: {
    width: (width - 55) / 3,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonGradient: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  actionButtonLabel: {
    color: COLORS.white,
    marginTop: 8,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  settingsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 15,
    marginTop: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default StudentProfile;