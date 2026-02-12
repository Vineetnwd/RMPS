import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
  background: '#FDF5F7',
  cream: '#FFF5EC',
  cardBg: '#FFFFFF',
  whatsapp: '#25D366',
  phone: '#3B82F6',
  email: '#EC4899',
  web: '#8B5CF6',
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

export default function HelpSupportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supportData, setSupportData] = useState<any>(null);
  const [error, setError] = useState('');

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

    fetchSupportData();
  }, []);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchSupportData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get branch_id from AsyncStorage or student_data
      let branchId = await AsyncStorage.getItem('branch_id');
      if (!branchId) {
        const studentData = await AsyncStorage.getItem('student_data');
        if (studentData) {
          const parsed = JSON.parse(studentData);
          branchId = parsed.branch_id ? parsed.branch_id.toString() : null;
        }
      }

      console.log('Fetching support data for branch:', branchId);

      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=help_and_support',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ branch_id: branchId ? parseInt(branchId) : null }),
        }
      );

      const data = await response.json();
      console.log('Help and Support Data:', data);

      let supportInfo = data;
      if (Array.isArray(data) && data.length > 0) {
        supportInfo = data[0];
      }

      if (supportInfo && supportInfo.id) {
        const mappedData = {
          schoolName: supportInfo.full_name || 'RM Public School',
          branchName: supportInfo.inst_name || '',
          contact: supportInfo.inst_contact || '',
          email: supportInfo.inst_email || '',
          website: supportInfo.inst_url || '',
          address: [supportInfo.inst_address1, supportInfo.inst_address2].filter(Boolean).join(' ').trim(),
          affNo: supportInfo.aff_no || '',
          schoolCode: supportInfo.school_code || '',
        };
        setSupportData(mappedData);
        await AsyncStorage.setItem('cached_support', JSON.stringify(mappedData));
      } else {
        setError('No support information available');
      }
    } catch (err) {
      console.error('Error fetching support data:', err);
      setError('Failed to load support information');

      try {
        const cachedData = await AsyncStorage.getItem('cached_support');
        if (cachedData) {
          setSupportData(JSON.parse(cachedData));
          setError('Showing cached data. Network error occurred.');
        }
      } catch (cacheErr) {
        console.error('Cache error:', cacheErr);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSupportData();
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    const phoneNumber = phone.replace(/\s/g, '');
    Linking.openURL(`tel:+91 ${phoneNumber}`).catch(err => {
      Alert.alert('Error', 'Unable to make a call');
      console.error('Error making call:', err);
    });
  };

  const handleEmail = (email) => {
    Linking.openURL(`mailto:${email}`).catch(err => {
      Alert.alert('Error', 'Unable to open email client');
      console.error('Error opening email:', err);
    });
  };

  const handleWebsite = (website) => {
    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    Linking.openURL(url).catch(err => {
      Alert.alert('Error', 'Unable to open website');
      console.error('Error opening website:', err);
    });
  };

  const handleWhatsApp = (wpLink) => {
    Linking.openURL(wpLink).catch(err => {
      Alert.alert('Error', 'Unable to open WhatsApp');
      console.error('Error opening WhatsApp:', err);
    });
  };

  const handleMap = (address) => {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.OS === 'ios'
      ? `maps://app?q=${encodedAddress}`
      : `geo:0,0?q=${encodedAddress}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="help-circle" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading Support Info...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
              <Text style={styles.headerTitle}>Help & Support</Text>
              <Text style={styles.headerSubtitle}>We're here to help</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Info Card */}
          <Animated.View
            style={[
              styles.headerCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.headerIconContainer}>
              <Ionicons name="headset" size={26} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerCardTitle}>
                {supportData ? supportData.schoolName : 'RM Public School'}
              </Text>
              {supportData?.branchName ? (
                <Text style={styles.headerCardBranch}>
                  Branch: {supportData.branchName}
                </Text>
              ) : null}
              <Text style={styles.headerCardText}>
                We're here to help! Reach out to us anytime
              </Text>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="information-circle" size={18} color={COLORS.secondary} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={fetchSupportData}>
            <Ionicons name="refresh" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {supportData && (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
          >
            {/* Quick Actions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <Ionicons name="flash" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>
              <View style={styles.quickActionsGrid}>
                {supportData.contact ? (
                  <QuickActionCard
                    icon="call"
                    label="Call Us"
                    color={COLORS.phone}
                    onPress={() => handleCall(supportData.contact)}
                  />
                ) : null}
                {supportData.email ? (
                  <QuickActionCard
                    icon="mail"
                    label="Email"
                    color={COLORS.email}
                    onPress={() => handleEmail(supportData.email)}
                  />
                ) : null}
                {supportData.website ? (
                  <QuickActionCard
                    icon="globe"
                    label="Website"
                    color={COLORS.web}
                    onPress={() => handleWebsite(supportData.website)}
                  />
                ) : null}
                {supportData.address ? (
                  <QuickActionCard
                    icon="location"
                    label="Directions"
                    color={COLORS.primary}
                    onPress={() => handleMap(supportData.address)}
                  />
                ) : null}
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <Ionicons name="information-circle" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.sectionTitle}>Contact Information</Text>
              </View>

              {supportData.contact ? (
                <ContactCard
                  icon="call"
                  iconColor={COLORS.phone}
                  title="Phone Number"
                  content={supportData.contact}
                  onPress={() => handleCall(supportData.contact)}
                  actionIcon="call-outline"
                />
              ) : null}

              {supportData.email ? (
                <ContactCard
                  icon="mail"
                  iconColor={COLORS.email}
                  title="Email Address"
                  content={supportData.email}
                  onPress={() => handleEmail(supportData.email)}
                  actionIcon="send"
                />
              ) : null}

              {supportData.website ? (
                <ContactCard
                  icon="globe"
                  iconColor={COLORS.web}
                  title="Website"
                  content={supportData.website}
                  onPress={() => handleWebsite(supportData.website)}
                  actionIcon="open"
                />
              ) : null}

              {supportData.address ? (
                <ContactCard
                  icon="location"
                  iconColor={COLORS.primary}
                  title="School Address"
                  content={supportData.address}
                  onPress={() => handleMap(supportData.address)}
                  actionIcon="navigate"
                  multiline
                />
              ) : null}

              {supportData.affNo ? (
                <ContactCard
                  icon="ribbon"
                  iconColor={COLORS.secondary}
                  title="Affiliation No."
                  content={supportData.affNo}
                  onPress={() => { }}
                  actionIcon="copy-outline"
                  multiline={false}
                />
              ) : null}
            </View>

            {/* Office Hours */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <Ionicons name="time" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.sectionTitle}>Office Hours</Text>
              </View>
              <View style={styles.hoursCard}>
                <View style={styles.hoursRow}>
                  <View style={styles.hoursIconContainer}>
                    <Ionicons name="sunny" size={16} color={COLORS.secondary} />
                  </View>
                  <Text style={styles.hoursDay}>Monday - Friday</Text>
                  <Text style={styles.hoursTime}>8:00 AM - 4:00 PM</Text>
                </View>
                <View style={styles.hoursDivider} />
                <View style={styles.hoursRow}>
                  <View style={styles.hoursIconContainer}>
                    <Ionicons name="partly-sunny" size={16} color={COLORS.secondary} />
                  </View>
                  <Text style={styles.hoursDay}>Saturday</Text>
                  <Text style={styles.hoursTime}>8:00 AM - 1:00 PM</Text>
                </View>
                <View style={styles.hoursDivider} />
                <View style={styles.hoursRow}>
                  <View style={[styles.hoursIconContainer, { backgroundColor: 'rgba(100, 116, 139, 0.15)' }]}>
                    <Ionicons name="moon" size={16} color={COLORS.gray} />
                  </View>
                  <Text style={styles.hoursDay}>Sunday</Text>
                  <Text style={[styles.hoursTime, { color: COLORS.error }]}>Closed</Text>
                </View>
              </View>
            </View>

            {/* FAQs */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <Ionicons name="help-circle" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              </View>

              <FAQCard
                question="How do I apply for leave?"
                answer="You can apply for leave through the 'Apply Leave' section in the app. Fill in the required details and submit your request."
              />

              <FAQCard
                question="How can I check my attendance?"
                answer="Navigate to the Attendance section to view your monthly attendance records with detailed calendar view."
              />

              <FAQCard
                question="Where can I view homework assignments?"
                answer="All homework assignments are available in the Homework section, organized by date with downloadable attachments."
              />

              <FAQCard
                question="How do I submit a complaint?"
                answer="Use the Complaint section to submit your concerns. Select the appropriate department and describe your issue."
              />
            </View>

            {/* Emergency Contact */}
            <View style={styles.emergencyCard}>
              <View style={styles.emergencyInner}>
                <View style={styles.emergencyIconContainer}>
                  <Ionicons name="alert-circle" size={28} color={COLORS.white} />
                </View>
                <View style={styles.emergencyContent}>
                  <Text style={styles.emergencyTitle}>Emergency Contact</Text>
                  <Text style={styles.emergencyText}>
                    For urgent matters, please call us immediately
                  </Text>
                  <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={() => handleCall(supportData.contact)}
                  >
                    <Ionicons name="call" size={16} color={COLORS.white} />
                    <Text style={styles.emergencyButtonText}>{supportData.contact}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ height: 30 }} />
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function QuickActionCard({ icon, label, color, onPress }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '48%' }}>
      <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={26} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ContactCard({ icon, iconColor, title, content, onPress, actionIcon, multiline }) {
  return (
    <TouchableOpacity style={styles.contactCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.contactIcon, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.contactContent}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={[styles.contactText, multiline && styles.contactTextMultiline]}>
          {content}
        </Text>
      </View>
      <View style={styles.contactAction}>
        <Ionicons name={actionIcon} size={18} color={COLORS.secondary} />
      </View>
    </TouchableOpacity>
  );
}

function FAQCard({ question, answer }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqCard}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <View style={styles.faqIconContainer}>
          <Ionicons
            name={expanded ? "remove" : "add"}
            size={18}
            color={expanded ? COLORS.primary : COLORS.secondary}
          />
        </View>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={COLORS.gray}
        />
      </View>
      {expanded && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

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
    fontSize: 12,
    color: COLORS.gray,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 30,
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerDecorations: {
    ...StyleSheet.absoluteFillObject,
  },
  headerBlob: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
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
    paddingHorizontal: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
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

  // Header Card
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    padding: 10,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  headerIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 2,
  },
  headerCardText: {
    fontSize: 11,
    color: COLORS.gray,
    lineHeight: 18,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    padding: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.ink,
    fontWeight: '500',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
  },

  // Section
  section: {
    paddingHorizontal: 14,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  sectionHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionCard: {
    backgroundColor: '#FDF5F7',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Contact Cards
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  contactIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  contactText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  contactTextMultiline: {
    lineHeight: 20,
  },
  contactAction: {
    width: 26,
    height: 26,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hours Card
  hoursCard: {
    backgroundColor: '#FDF5F7',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  hoursIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hoursDay: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  hoursTime: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  hoursDivider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 4,
  },

  // FAQ Cards
  faqCard: {
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  faqIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  faqAnswerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  faqAnswer: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 22,
  },

  // Emergency Card
  emergencyCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emergencyInner: {
    flexDirection: 'row',
    backgroundColor: COLORS.error,
    padding: 10,
    gap: 16,
  },
  emergencyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 8,
    lineHeight: 20,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  emergencyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
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