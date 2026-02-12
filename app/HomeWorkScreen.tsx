import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import RenderHtml from 'react-native-render-html';

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
  background: '#FDF5F7',
  cream: '#FFF5EC',
  cardBg: '#FFFFFF',
};

const SUBJECT_COLORS = [
  '#7A0C2E',
  '#D4AF37',
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
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

export default function HomeworkScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homework, setHomework] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

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

    fetchHomework();
  }, []);

  useEffect(() => {
    fetchHomework();
  }, [selectedDate]);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchHomework = async () => {
    try {
      setLoading(true);
      setError('');

      const studentId = await AsyncStorage.getItem('student_id');

      if (!studentId) {
        router.replace('/index');
        return;
      }

      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=get_homework',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_id: studentId,
            hw_date: selectedDate
          }),
        }
      );

      const data = await response.json();

      if (data && Array.isArray(data) && data.length > 0) {
        setHomework(data);
        await AsyncStorage.setItem(`homework_${selectedDate}`, JSON.stringify(data));
      } else {
        setHomework([]);
        setError('No homework found for this date');
      }
    } catch (err) {
      console.error('Error fetching homework:', err);
      setError('Failed to load homework');

      try {
        const cachedHomework = await AsyncStorage.getItem(`homework_${selectedDate}`);
        if (cachedHomework) {
          setHomework(JSON.parse(cachedHomework));
          setError('Showing cached homework. Network error occurred.');
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
    fetchHomework();
  };

  const handleDateChange = (days) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const handleDatePickerChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && date) {
      setTempDate(date);
      if (Platform.OS === 'android') {
        setSelectedDate(date.toISOString().split('T')[0]);
      }
    }
  };

  const handleDatePickerConfirm = () => {
    setSelectedDate(tempDate.toISOString().split('T')[0]);
    setShowDatePicker(false);
  };

  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
    setTempDate(new Date(selectedDate));
  };

  const openDatePicker = () => {
    setTempDate(new Date(selectedDate));
    setShowDatePicker(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('en-GB', options);
    }
  };

  const getFileExtension = (filename) => {
    if (!filename) return '';
    return filename.split('.').pop().toLowerCase();
  };

  const isImageFile = (filename) => {
    const ext = getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
  };

  const isPdfFile = (filename) => {
    const ext = getFileExtension(filename);
    return ext === 'pdf';
  };

  const handleFileOpen = (filename) => {
    if (!filename) return;
    const fileUrl = `https://rmpublicschool.org/binex/homework/${filename}`;

    if (isImageFile(filename)) {
      setSelectedImage(fileUrl);
      setImageModalVisible(true);
    } else if (isPdfFile(filename)) {
      Linking.openURL(fileUrl).catch(err => {
        Alert.alert('Error', 'Cannot open PDF file');
        console.error('Error opening PDF:', err);
      });
    } else {
      Linking.openURL(fileUrl).catch(err => {
        Alert.alert('Error', 'Cannot open file');
        console.error('Error opening file:', err);
      });
    }
  };

  const getSubjectColor = (subjectId) => {
    const index = parseInt(subjectId) % SUBJECT_COLORS.length;
    return SUBJECT_COLORS[index];
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="book" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading homework...</Text>
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
              <Text style={styles.headerTitle}>Homework</Text>
              <Text style={styles.headerSubtitle}>Daily assignments</Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar" size={20} color={COLORS.secondary} />
              </View>
              <Text style={styles.statLabel}>Selected Date</Text>
              <Text style={styles.statValue}>{formatDate(selectedDate)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="clipboard" size={20} color={COLORS.secondary} />
              </View>
              <Text style={styles.statLabel}>Assignments</Text>
              <Text style={styles.statValue}>{homework.length}</Text>
            </View>
          </Animated.View>

          {/* Date Selector */}
          <View style={styles.dateSelector}>
            <TouchableOpacity
              style={styles.dateNavButton}
              onPress={() => handleDateChange(-1)}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateCenterButton}
              onPress={openDatePicker}
            >
              <Ionicons name="calendar" size={18} color={COLORS.secondary} />
              <Text style={styles.dateCenterText}>{formatDate(selectedDate)}</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateNavButton}
              onPress={() => handleDateChange(1)}
            >
              <Ionicons name="chevron-forward" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="information-circle" size={18} color={COLORS.secondary} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Homework List */}
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
        {homework.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="checkmark-done-circle" size={60} color={COLORS.lightGray} />
            </View>
            <Text style={styles.emptyTitle}>No Homework!</Text>
            <Text style={styles.emptyText}>No assignments for this date</Text>
            <Text style={styles.emptySubText}>Enjoy your free time! 🎉</Text>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderIcon}>
                <Ionicons name="list" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.listHeaderTitle}>
                {homework.length} Assignment{homework.length > 1 ? 's' : ''}
              </Text>
            </View>

            {homework.map((item, index) => (
              <HomeworkCard
                key={item.id}
                homework={item}
                index={index}
                getSubjectColor={getSubjectColor}
                handleFileOpen={handleFileOpen}
                isImageFile={isImageFile}
                isPdfFile={isPdfFile}
                fadeAnim={fadeAnim}
              />
            ))}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setImageModalVisible(false)}
          >
            <View style={styles.modalCloseIcon}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </View>
          </TouchableOpacity>

          <Image
            source={{ uri: selectedImage }}
            style={styles.modalImage}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => Linking.openURL(selectedImage)}
          >
            <Ionicons name="download" size={20} color={COLORS.primary} />
            <Text style={styles.downloadText}>Download Image</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <>
          {Platform.OS === 'ios' ? (
            <Modal
              transparent={true}
              animationType="slide"
              visible={showDatePicker}
              onRequestClose={handleDatePickerCancel}
            >
              <View style={styles.datePickerModalContainer}>
                <TouchableOpacity
                  style={styles.datePickerBackdrop}
                  activeOpacity={1}
                  onPress={handleDatePickerCancel}
                />
                <View style={styles.datePickerModal}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity
                      style={styles.datePickerCancelButton}
                      onPress={handleDatePickerCancel}
                    >
                      <Text style={styles.datePickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.datePickerTitle}>Select Date</Text>
                    <TouchableOpacity
                      style={styles.datePickerConfirmButton}
                      onPress={handleDatePickerConfirm}
                    >
                      <Text style={styles.datePickerConfirmText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDatePickerChange}
                    textColor={COLORS.primary}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
        </>
      )}
    </View>
  );
}

function HomeworkCard({ homework, index, getSubjectColor, handleFileOpen, isImageFile, isPdfFile, fadeAnim }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const subjectColor = getSubjectColor(homework.subject_id);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 100,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const getFileIcon = (filename) => {
    if (isImageFile(filename)) return 'image';
    if (isPdfFile(filename)) return 'document-text';
    return 'document-attach';
  };

  const getFileType = (filename) => {
    if (isImageFile(filename)) return 'Image';
    if (isPdfFile(filename)) return 'PDF Document';
    return 'Document';
  };

  const htmlConfig = {
    width: width - 80,
  };

  const tagsStyles = {
    body: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 22,
    },
  };

  return (
    <Animated.View
      style={[
        styles.homeworkCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      {/* Subject Badge */}
      <View style={[styles.subjectBadge, { backgroundColor: subjectColor }]}>
        <Ionicons name="book" size={14} color={COLORS.white} />
        <Text style={styles.subjectBadgeText}>Subject #{homework.subject_id}</Text>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.subjectIcon, { backgroundColor: subjectColor + '15' }]}>
            <Ionicons name="school" size={24} color={subjectColor} />
          </View>

          <View style={styles.classInfo}>
            <Text style={styles.classText}>
              Class {homework.hw_class} - {homework.hw_section}
            </Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
              <Text style={styles.cardDateText}>
                {new Date(homework.hw_date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>

          {homework.hw_file && (
            <View style={[styles.attachmentIndicator, { backgroundColor: subjectColor + '15' }]}>
              <Ionicons name="attach" size={18} color={subjectColor} />
            </View>
          )}
        </View>

        {/* Homework Text */}
        <View style={styles.homeworkContent}>
          <View style={styles.homeworkLabelRow}>
            <View style={styles.homeworkLabelIcon}>
              <Ionicons name="document-text" size={14} color={COLORS.secondary} />
            </View>
            <Text style={styles.homeworkLabel}>Assignment</Text>
          </View>
          <View style={styles.homeworkTextContainer}>
            <RenderHtml
              contentWidth={htmlConfig.width}
              source={{ html: homework.hw_text }}
              tagsStyles={tagsStyles}
            />
          </View>
        </View>

        {/* Attachment Section */}
        {homework.hw_file && (
          <View style={styles.attachmentSection}>
            <TouchableOpacity
              style={[styles.attachmentButton, { borderColor: subjectColor + '40' }]}
              onPress={() => handleFileOpen(homework.hw_file)}
              activeOpacity={0.8}
            >
              <View style={[styles.attachmentIcon, { backgroundColor: subjectColor + '15' }]}>
                <Ionicons
                  name={getFileIcon(homework.hw_file)}
                  size={22}
                  color={subjectColor}
                />
              </View>
              <View style={styles.attachmentInfo}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {homework.hw_file}
                </Text>
                <Text style={[styles.attachmentType, { color: subjectColor }]}>
                  {getFileType(homework.hw_file)} • Tap to open
                </Text>
              </View>
              <View style={[styles.attachmentArrow, { backgroundColor: subjectColor }]}>
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
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
    right: 80,
  },
  headerDiamond1: {
    position: 'absolute',
    top: 70,
    left: 30,
  },
  headerDiamond2: {
    position: 'absolute',
    bottom: 80,
    right: 120,
  },
  headerDots: {
    position: 'absolute',
    bottom: 40,
    left: 60,
  },
  headerStripe: {
    position: 'absolute',
    bottom: 60,
    right: -40,
    width: 100,
    height: 20,
    borderRadius: 15,
    backgroundColor: COLORS.secondary,
    opacity: 0.08,
    transform: [{ rotate: '-15deg' }],
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '500',
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
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 4,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },

  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateNavButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dateCenterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  dateCenterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
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
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#B45309',
    fontWeight: '500',
  },

  // ScrollView
  scrollView: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 20,
  },

  // List Header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  listHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FDF5F7',
    borderRadius: 24,
    marginTop: 10,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 12,
    color: COLORS.gray,
  },

  // Homework Card
  homeworkCard: {
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  subjectBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  classInfo: {
    flex: 1,
  },
  classText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDateText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  attachmentIndicator: {
    width: 26,
    height: 26,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeworkContent: {
    marginBottom: 10,
  },
  homeworkLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  homeworkLabelIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeworkLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  homeworkTextContainer: {
    backgroundColor: '#FDF5F7',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5E8EB',
  },
  attachmentSection: {
    marginTop: 4,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  attachmentIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 4,
  },
  attachmentType: {
    fontSize: 12,
    fontWeight: '500',
  },
  attachmentArrow: {
    width: 26,
    height: 26,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Image Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  modalCloseIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width - 40,
    height: height - 200,
  },
  downloadButton: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 6,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Date Picker Modal
  datePickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  datePickerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  datePickerCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
  },
  datePickerCancelText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  datePickerConfirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
  },
  datePickerConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});