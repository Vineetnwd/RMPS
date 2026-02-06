import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  background: '#F8FAFC',
  cream: '#FFF8E7',
  cardBg: '#FFFFFF',
};

// Base URL for attachments
const BASE_URL = 'https://dpsmushkipur.com/bine';
const ATTACHMENT_PATHS = {
  notice: '/homework/',    
};

const FEATURES = [
  {
    id: 'attendance',
    title: 'Attendance',
    icon: 'calendar',
    route: '/AttendanceScreen',
    color: COLORS.primary,
    bgColor: 'rgba(122, 12, 46, 0.1)',
  },
  {
    id: 'homework',
    title: 'Homework',
    icon: 'book',
    route: '/HomeWorkScreen',
    color: COLORS.secondary,
    bgColor: 'rgba(212, 175, 55, 0.15)',
  },
  {
    id: 'exam-report',
    title: 'Exam Report',
    icon: 'trophy',
    route: '/ExamReportScreen',
    color: COLORS.primary,
    bgColor: 'rgba(122, 12, 46, 0.1)',
  },
  {
    id: 'noticeboard',
    title: 'Notice Board',
    icon: 'notifications',
    route: '/noticeboard',
    color: COLORS.secondary,
    bgColor: 'rgba(212, 175, 55, 0.15)',
  },
  {
    id: 'holiday',
    title: 'Holidays',
    icon: 'sunny',
    route: '/HolidayScreen',
    color: COLORS.primary,
    bgColor: 'rgba(122, 12, 46, 0.1)',
  },
  {
    id: 'leave',
    title: 'Leave Applications',
    icon: 'document-text',
    route: '/StudentLeaves',
    color: COLORS.secondary,
    bgColor: 'rgba(212, 175, 55, 0.15)',
  },
  {
    id: 'payment',
    title: 'Online Payment',
    icon: 'card',
    route: '/StudentFeeScreen',
    color: COLORS.primary,
    bgColor: 'rgba(122, 12, 46, 0.1)',
  },
  {
    id: 'payment-history',
    title: 'Payment History',
    icon: 'receipt',
    route: '/PaymentHistoryScreen',
    color: COLORS.secondary,
    bgColor: 'rgba(212, 175, 55, 0.15)',
  },
  {
    id: 'bus',
    title: 'Live Bus Location',
    icon: 'bus',
    route: '/LiveBusLocation',
    color: COLORS.primary,
    bgColor: 'rgba(122, 12, 46, 0.1)',
  },
  {
    id: 'complain',
    title: 'Complaints',
    icon: 'alert-circle',
    route: '/StudentComplaints',
    color: COLORS.secondary,
    bgColor: 'rgba(212, 175, 55, 0.15)',
  },
  {
    id: 'help',
    title: 'Help & Support',
    icon: 'help-circle',
    route: '/HelpAndSupport',
    color: COLORS.primary,
    bgColor: 'rgba(122, 12, 46, 0.1)',
  },
  {
    id: 'rate',
    title: 'Rate & Review',
    icon: 'star',
    route: '/RatingScreen',
    color: COLORS.secondary,
    bgColor: 'rgba(212, 175, 55, 0.15)',
  },
];

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
                opacity: 0.3 + (rowIndex * cols + colIndex) * 0.02 
              },
            ]}
          />
        ))}
      </View>
    ))}
  </View>
);

export default function StudentHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [student, setStudent] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [downloadingNoticeId, setDownloadingNoticeId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [hasMultipleStudents, setHasMultipleStudents] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeScreen();
    }

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
    outputRange: [0, -15],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const initializeScreen = async () => {
    console.log('Initializing screen...');
    console.log('Params received:', params);
    
    if (params.studentData) {
      try {
        const studentData = JSON.parse(params.studentData);
        console.log('Student data loaded from params');
        setStudent(studentData);
        await AsyncStorage.setItem('student_data', JSON.stringify(studentData));
      } catch (e) {
        console.error('Error parsing student data:', e);
      }
    }

    if (params.notices) {
      try {
        const noticesData = typeof params.notices === 'string' 
          ? JSON.parse(params.notices) 
          : params.notices;
        
        console.log('Notices loaded from params:', noticesData.length);
        
        if (noticesData && Array.isArray(noticesData)) {
          setNotices(noticesData);
          await AsyncStorage.setItem('notices', JSON.stringify(noticesData));
        }
      } catch (e) {
        console.error('Error parsing notices:', e);
      }
    } else {
      try {
        const cachedNotices = await AsyncStorage.getItem('notices');
        if (cachedNotices) {
          const parsedNotices = JSON.parse(cachedNotices);
          console.log('Notices loaded from cache:', parsedNotices.length);
          setNotices(parsedNotices);
        }
      } catch (e) {
        console.error('Error loading cached notices:', e);
      }
    }

    try {
      const studentsData = await AsyncStorage.getItem('all_students');
      if (studentsData) {
        const students = JSON.parse(studentsData);
        if (students && students.length > 1) {
          setHasMultipleStudents(true);
          setAllStudents(students);
        }
      }
    } catch (e) {
      console.error('Error checking multiple students:', e);
    }

    await fetchStudentProfile();
  };

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      setError('');

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
          body: JSON.stringify({
            student_id: studentId,
          }),
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const studentData = data[0];
        setStudent(studentData);
        
        await AsyncStorage.setItem('student_data', JSON.stringify(studentData));

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
      } else {
        setError('Unable to load profile. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching student profile:', err);
      setError('Network error. Please check your connection.');
      
      const cachedData = await AsyncStorage.getItem('student_data');
      if (cachedData) {
        setStudent(JSON.parse(cachedData));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStudentProfile();
    setRefreshing(false);
  };

  const handleSwitchStudent = () => {
    Alert.alert(
      'Switch Student',
      'Do you want to switch to another student profile?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Switch',
          onPress: () => {
            router.push({
              pathname: '/student-selection',
              params: {
                students: JSON.stringify(allStudents),
                notices: JSON.stringify(notices),
              },
            });
          },
        },
      ],
    );
  };

  const handleViewAllNotices = () => {
    router.push({
      pathname: '/noticeboard',
      params: {
        notices: JSON.stringify(notices),
      },
    });
  };

  const handleDownloadAttachment = async (noticeId, attachment, title) => {
    if (!attachment) {
      Alert.alert('Error', 'No attachment available');
      return;
    }

    setDownloadingNoticeId(noticeId);
    setDownloadProgress(0);

    try {
      const cleanAttachment = attachment.trim();
      
      const fileExtension = cleanAttachment.split('.').pop().toLowerCase();
      const safeTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
      const fileName = `${safeTitle}_${Date.now()}.${fileExtension}`;
      const fileUri = FileSystem.documentDirectory + fileName;

      console.log('Attachment filename:', cleanAttachment);
      console.log('Target file:', fileUri);

      const possibleUrls = [
        `${BASE_URL}/homework/${cleanAttachment}`,
      ].filter(Boolean);

      let downloadSuccessful = false;
      let lastError = null;

      for (const url of possibleUrls) {
        try {
          console.log('Trying URL:', url);

          const headResponse = await fetch(url, { method: 'HEAD' }).catch(() => null);
          
          if (!headResponse || !headResponse.ok) {
            console.log(`URL not accessible: ${url}`);
            continue;
          }

          console.log('URL accessible, starting download...');

          const downloadResumable = FileSystem.createDownloadResumable(
            url,
            fileUri,
            {
              headers: {
                'Accept': '*/*',
              },
            },
            (progress) => {
              if (progress.totalBytesExpectedToWrite > 0) {
                const percent = Math.round(
                  (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
                );
                setDownloadProgress(percent);
                console.log(`Download progress: ${percent}%`);
              }
            }
          );

          const result = await downloadResumable.downloadAsync();

          if (result && result.uri) {
            const fileInfo = await FileSystem.getInfoAsync(result.uri);
            console.log('Downloaded file info:', fileInfo);

            if (fileInfo.exists && fileInfo.size > 0) {
              downloadSuccessful = true;
              
              const sharingAvailable = await Sharing.isAvailableAsync();
              
              if (sharingAvailable) {
                await Sharing.shareAsync(result.uri, {
                  mimeType: getMimeType(fileExtension),
                  dialogTitle: 'Open Attachment',
                  UTI: getUTI(fileExtension),
                });
              } else {
                Alert.alert(
                  'Download Complete',
                  `File saved to: ${result.uri}`,
                  [
                    { text: 'OK' },
                    {
                      text: 'Open in Browser',
                      onPress: () => Linking.openURL(url),
                    },
                  ]
                );
              }
              break;
            } else {
              await FileSystem.deleteAsync(result.uri, { idempotent: true });
              throw new Error('Downloaded file is empty');
            }
          }
        } catch (urlError) {
          console.log(`Failed with URL ${url}:`, urlError.message);
          lastError = urlError;
          continue;
        }
      }

      if (!downloadSuccessful) {
        throw lastError || new Error('Could not download from any URL');
      }

    } catch (error) {
      console.error('Download error:', error);
      
      Alert.alert(
        'Download Failed',
        'Unable to download the attachment. Would you like to try opening it in your browser?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open in Browser',
            onPress: () => {
              const browserUrl = `${BASE_URL}/homework/${attachment}`;
              Linking.openURL(browserUrl).catch(() => {
                Alert.alert('Error', 'Could not open browser');
              });
            },
          },
        ]
      );
    } finally {
      setDownloadingNoticeId(null);
      setDownloadProgress(0);
    }
  };

  const getMimeType = (extension) => {
    const mimeTypes = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      txt: 'text/plain',
      zip: 'application/zip',
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  };

  const getUTI = (extension) => {
    const utiTypes = {
      pdf: 'com.adobe.pdf',
      doc: 'com.microsoft.word.doc',
      docx: 'org.openxmlformats.wordprocessingml.document',
      jpg: 'public.jpeg',
      jpeg: 'public.jpeg',
      png: 'public.png',
      txt: 'public.plain-text',
    };
    return utiTypes[extension.toLowerCase()] || 'public.data';
  };

  const handleOpenInBrowser = (attachment) => {
    if (!attachment) return;
    
    const url = `${BASE_URL}/notices/${attachment}`;
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open URL:', err);
      Alert.alert('Error', 'Could not open the attachment');
    });
  };

  const stripHtmlTags = (html) => {
    if (!html) return '';
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
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
            await AsyncStorage.clear();
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
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <ActivityIndicator size="large" color={COLORS.secondary} />
          </View>
          <Text style={styles.loadingText}>Loading your profile...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  if (error && !student) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.errorIconContainer}>
          <Ionicons name="alert-circle" size={60} color={COLORS.primary} />
        </View>
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStudentProfile}>
          <Text style={styles.retryButtonText}>Try Again</Text>
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  if (!student) {
    return null;
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
              styles.headerBlob1,
              { transform: [{ translateY: floatTranslate }] },
            ]}
          />
          <Animated.View
            style={[
              styles.headerBlob2,
              { transform: [{ rotate }] },
            ]}
          >
            <CircleRing size={80} borderWidth={2} color="rgba(212, 175, 55, 0.3)" />
          </Animated.View>
          <DiamondShape 
            style={styles.headerDiamond1} 
            color="rgba(212, 175, 55, 0.4)" 
            size={14} 
          />
          <DiamondShape 
            style={styles.headerDiamond2} 
            color="rgba(255, 255, 255, 0.2)" 
            size={10} 
          />
          <View style={styles.headerStripe} />
          <DottedPattern 
            style={styles.headerDots} 
            rows={3} 
            cols={4} 
            dotColor="rgba(255, 255, 255, 0.3)" 
          />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.welcomePill}>
                <Ionicons name="sparkles" size={12} color={COLORS.secondary} />
                <Text style={styles.welcomePillText}>Welcome Back!</Text>
              </View>
              <Text style={styles.studentName}>{student.student_name}</Text>
              <View style={styles.classInfo}>
                <Ionicons name="school" size={14} color={COLORS.secondary} />
                <Text style={styles.classText}>
                  Class {student.student_class} - {student.student_section}
                </Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => router.push({
                  pathname: '/student_profile',
                  params: { studentData: JSON.stringify(student) }
                })}
              >
                <View style={styles.profileImageWrapper}>
                  {student.student_photo !== 'no_image.jpg' ? (
                    <Image
                      source={{
                        uri: `https://rmpublicschool.org/binex/upload/${student.student_photo}`,
                      }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.profilePlaceholder,
                        {
                          backgroundColor:
                            student.student_sex === 'MALE' ? COLORS.primaryDark : COLORS.primaryLight,
                        },
                      ]}
                    >
                      <Ionicons
                        name={student.student_sex === 'MALE' ? 'person' : 'person'}
                        size={30}
                        color={COLORS.white}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.profileBadge}>
                  <Ionicons name="camera" size={12} color={COLORS.white} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            {hasMultipleStudents && (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={handleSwitchStudent}
              >
                <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
                <Text style={styles.switchButtonText}>Switch</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={16} color={COLORS.white} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <Animated.View
            style={[
              styles.statsContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <StatCard icon="cash-outline" value={`₹${student.total_paid || 0}`} label="Total Paid" />
            <StatCard icon="alert-circle-outline" value={`₹${student.current_dues || 0}`} label="Current Dues" />
            <StatCard icon="trophy-outline" value="A+" label="Last Exam" />
          </Animated.View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
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
        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Student Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardIcon}>
              <Ionicons name="id-card" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.infoCardTitle}>Student Details</Text>
          </View>
          <View style={styles.infoCardBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Admission No</Text>
                <Text style={styles.infoValue}>{student.student_admission}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Roll Number</Text>
                <Text style={styles.infoValue}>{student.student_roll}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Student Type</Text>
                <Text style={styles.infoValue}>{student.student_type}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{student.student_sex}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIcon}>
                <Ionicons name="grid" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.sectionTitle}>Quick Access</Text>
            </View>
          </View>
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                index={index}
                onPress={() => router.push({
                  pathname: feature.route,
                  params: { 
                    student_id: student.id,
                    studentData: JSON.stringify(student)
                  }
                })}
                fadeAnim={fadeAnim}
              />
            ))}
          </View>
        </View>

        {/* Recent Notices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIcon}>
                <Ionicons name="megaphone" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.sectionTitle}>
                Recent Notices {notices.length > 0 && `(${notices.length})`}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={handleViewAllNotices}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
          
          {notices && notices.length > 0 ? (
            notices.slice(0, 3).map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                onDownload={handleDownloadAttachment}
                onOpenInBrowser={handleOpenInBrowser}
                isDownloading={downloadingNoticeId === notice.id}
                downloadProgress={downloadingNoticeId === notice.id ? downloadProgress : 0}
                formatDate={formatDate}
                stripHtmlTags={stripHtmlTags}
              />
            ))
          ) : (
            <View style={styles.noNoticesContainer}>
              <View style={styles.noNoticesIcon}>
                <Ionicons name="notifications-off-outline" size={40} color={COLORS.lightGray} />
              </View>
              <Text style={styles.noNoticesText}>No notices available</Text>
              <Text style={styles.noNoticesSubtext}>Check back later for updates</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={18} color={COLORS.secondary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FeatureCard({ feature, index, onPress, fadeAnim }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 50,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureCardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.featureCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.featureIconContainer, { backgroundColor: feature.bgColor }]}>
          <Ionicons name={feature.icon} size={26} color={feature.color} />
        </View>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <View style={[styles.featureArrow, { backgroundColor: feature.bgColor }]}>
          <Ionicons name="chevron-forward" size={14} color={feature.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function NoticeCard({ 
  notice, 
  onDownload, 
  onOpenInBrowser,
  isDownloading, 
  downloadProgress,
  formatDate, 
  stripHtmlTags 
}) {
  const [expanded, setExpanded] = useState(false);
  const hasAttachment = notice.notice_attachment && notice.notice_attachment.trim() !== '';
  const description = stripHtmlTags(notice.notice_details);
  const shortDescription = description.length > 100 
    ? description.substring(0, 100) + '...' 
    : description;

  const getFileIcon = (filename) => {
    if (!filename) return 'document-outline';
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return 'document-text';
      case 'doc':
      case 'docx': return 'document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'image';
      case 'mp4':
      case 'avi':
      case 'mov': return 'videocam';
      case 'mp3':
      case 'wav': return 'musical-notes';
      case 'zip':
      case 'rar': return 'archive';
      default: return 'document-outline';
    }
  };

  return (
    <View style={styles.noticeCard}>
      <View style={styles.noticeHeader}>
        <View style={styles.noticeIcon}>
          <Ionicons name="megaphone" size={22} color={COLORS.secondary} />
        </View>
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle} numberOfLines={2}>
            {notice.notice_title}
          </Text>
          <View style={styles.noticeDateContainer}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.gray} />
            <Text style={styles.noticeDate}>{formatDate(notice.notice_date)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.noticeDescription}>
        {expanded ? description : shortDescription}
      </Text>

      {description.length > 100 && (
        <TouchableOpacity 
          style={styles.readMoreButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.readMoreText}>
            {expanded ? 'Read Less' : 'Read More'}
          </Text>
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={14} 
            color={COLORS.secondary} 
          />
        </TouchableOpacity>
      )}

      {hasAttachment && (
        <View style={styles.attachmentContainer}>
          <View style={styles.attachmentInfo}>
            <View style={styles.attachmentIconContainer}>
              <Ionicons 
                name={getFileIcon(notice.notice_attachment)} 
                size={18} 
                color={COLORS.secondary} 
              />
            </View>
            <Text style={styles.attachmentName} numberOfLines={1}>
              {notice.notice_attachment}
            </Text>
          </View>

          <View style={styles.attachmentButtons}>
            <TouchableOpacity
              style={styles.browserButton}
              onPress={() => onOpenInBrowser(notice.notice_attachment)}
              disabled={isDownloading}
            >
              <Ionicons name="open-outline" size={18} color={COLORS.primary} />
              <Text style={styles.browserButtonText}>Open</Text>
            </TouchableOpacity>
          </View>

          {isDownloading && downloadProgress > 0 && (
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${downloadProgress}%` }
                ]} 
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 10,
  },
  loadingSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 30,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(122, 12, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  retryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerDecorations: {
    ...StyleSheet.absoluteFillObject,
  },
  headerBlob1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.secondary,
    opacity: 0.1,
    top: -50,
    right: -50,
  },
  headerBlob2: {
    position: 'absolute',
    top: 20,
    right: 30,
  },
  headerDiamond1: {
    position: 'absolute',
    top: 80,
    left: 30,
  },
  headerDiamond2: {
    position: 'absolute',
    bottom: 60,
    right: 80,
  },
  headerStripe: {
    position: 'absolute',
    top: 100,
    right: -30,
    width: 150,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.secondary,
    opacity: 0.08,
    transform: [{ rotate: '-15deg' }],
  },
  headerDots: {
    position: 'absolute',
    bottom: 80,
    left: 20,
  },
  headerContent: {
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerLeft: {
    flex: 1,
  },
  welcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  welcomePillText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  studentName: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  classText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
  },
  headerRight: {
    alignItems: 'center',
  },
  profileButton: {
    position: 'relative',
  },
  profileImageWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: COLORS.secondary,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 15,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  switchButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.3,
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

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
    gap: 10,
  },
  infoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoCardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Features
  featuresContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCardWrapper: {
    width: '48%',
    marginBottom: 14,
  },
  featureCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  featureArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  // Notice Card
  noticeCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noticeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 6,
    lineHeight: 22,
  },
  noticeDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeDate: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  noticeDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 21,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  attachmentContainer: {
    marginTop: 14,
    padding: 14,
    backgroundColor: COLORS.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  attachmentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '500',
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  browserButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    gap: 8,
  },
  browserButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },
  noNoticesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
  },
  noNoticesIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noNoticesText: {
    fontSize: 16,
    color: COLORS.ink,
    fontWeight: '600',
    marginBottom: 4,
  },
  noNoticesSubtext: {
    fontSize: 13,
    color: COLORS.gray,
  },
});