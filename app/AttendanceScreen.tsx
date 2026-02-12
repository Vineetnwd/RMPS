import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
  background: '#FDF5F7',
  cream: '#FFF5EC',
  cardBg: '#FFFFFF',
  present: '#10B981',
  absent: '#DC2626',
  leave: '#F59E0B',
  holiday: '#3B82F6',
};

// Updated MONTHS array to lowercase for new API format
const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

// Display months for UI (capitalized)
const MONTHS_DISPLAY = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export default function AttendanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    holiday: 0,
    total: 0,
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
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
          toValue: 1.05,
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

    fetchAttendance();
  }, []);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError('');

      const studentId = await AsyncStorage.getItem('student_id');

      if (!studentId) {
        router.replace('/index');
        return;
      }

      // Get branch_id from AsyncStorage or student_data
      let branchId = await AsyncStorage.getItem('branch_id');
      if (!branchId) {
        const studentData = await AsyncStorage.getItem('student_data');
        if (studentData) {
          const parsed = JSON.parse(studentData);
          branchId = parsed.branch_id ? parsed.branch_id.toString() : null;
        }
      }

      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=get_attendance',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_id: studentId,
            branch_id: branchId ? parseInt(branchId) : null
          }),
        }
      );

      const data = await response.json();

      console.log('Attendance API Response:', data);

      if (data && Array.isArray(data)) {
        setAttendanceData(data);
        await AsyncStorage.setItem('cached_attendance', JSON.stringify(data));
        calculateStats(data, selectedMonth);
      } else {
        setError('No attendance data found');
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance');

      try {
        const cachedAttendance = await AsyncStorage.getItem('cached_attendance');
        if (cachedAttendance) {
          const data = JSON.parse(cachedAttendance);
          setAttendanceData(data);
          calculateStats(data, selectedMonth);
          setError('Showing cached attendance. Network error occurred.');
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
    fetchAttendance();
  };

  const calculateStats = (data, month) => {
    const monthKey = formatMonthForAPI(month);
    console.log('Looking for month key:', monthKey);

    const monthData = data.find(item => item.att_month === monthKey);
    console.log('Found month data:', monthData);

    if (!monthData) {
      setStats({ present: 0, absent: 0, leave: 0, holiday: 0, total: 0 });
      return;
    }

    let present = 0, absent = 0, leave = 0, holiday = 0, total = 0;

    for (let i = 1; i <= 31; i++) {
      const day = monthData[`d_${i}`];
      if (day !== null && day !== undefined && day !== '') {
        total++;
        if (day === 'P') present++;
        else if (day === 'A') absent++;
        else if (day === 'L') leave++;
        else if (day === 'H') holiday++;
      }
    }

    setStats({ present, absent, leave, holiday, total });
  };

  const formatMonthForAPI = (date) => {
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${month}_${year}`;
  };

  const formatMonthForDisplay = (date) => {
    return `${MONTHS_DISPLAY[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleMonthChange = (direction) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setSelectedMonth(newMonth);
    calculateStats(attendanceData, newMonth);
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getAttendanceForDay = (day) => {
    const monthKey = formatMonthForAPI(selectedMonth);
    const monthData = attendanceData.find(item => item.att_month === monthKey);

    if (!monthData) return null;

    return monthData[`d_${day}`];
  };

  const getAttendanceColor = (status) => {
    if (!status || status === '') return COLORS.lightGray;
    switch (status.toUpperCase()) {
      case 'P': return COLORS.present;
      case 'A': return COLORS.absent;
      case 'L': return COLORS.leave;
      case 'H': return COLORS.holiday;
      default: return COLORS.lightGray;
    }
  };

  const getAttendanceLabel = (status) => {
    if (!status || status === '') return '';
    switch (status.toUpperCase()) {
      case 'P': return 'P';
      case 'A': return 'A';
      case 'L': return 'L';
      case 'H': return 'H';
      default: return '';
    }
  };

  const getAttendancePercentage = () => {
    if (stats.total === 0) return 0;
    return ((stats.present / stats.total) * 100).toFixed(1);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.emptyDay} />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForDay(day);
      const isToday =
        day === new Date().getDate() &&
        selectedMonth.getMonth() === new Date().getMonth() &&
        selectedMonth.getFullYear() === new Date().getFullYear();

      days.push(
        <View key={day} style={styles.dayCell}>
          <View
            style={[
              styles.dayContent,
              { backgroundColor: getAttendanceColor(attendance) },
              isToday && styles.today,
            ]}
          >
            <Text
              style={[
                styles.dayNumber,
                attendance && attendance !== '' && styles.dayNumberWithStatus,
                isToday && styles.todayText,
              ]}
            >
              {day}
            </Text>
            {attendance && attendance !== '' && (
              <Text style={styles.attendanceStatus}>
                {getAttendanceLabel(attendance)}
              </Text>
            )}
          </View>
        </View>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="calendar" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading attendance...</Text>
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
              <Text style={styles.headerTitle}>Attendance</Text>
              <Text style={styles.headerSubtitle}>View your records</Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <Animated.View
            style={[
              styles.statsRow,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.present} />
              </View>
              <Text style={styles.statValue}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(220, 38, 38, 0.2)' }]}>
                <Ionicons name="close-circle" size={20} color={COLORS.absent} />
              </View>
              <Text style={styles.statValue}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Ionicons name="time" size={20} color={COLORS.leave} />
              </View>
              <Text style={styles.statValue}>{stats.leave}</Text>
              <Text style={styles.statLabel}>Leave</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Ionicons name="sunny" size={20} color={COLORS.holiday} />
              </View>
              <Text style={styles.statValue}>{stats.holiday}</Text>
              <Text style={styles.statLabel}>Holiday</Text>
            </View>
          </Animated.View>

          {/* Attendance Percentage */}
          <Animated.View
            style={[
              styles.percentageCard,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={styles.percentageContent}>
              <View>
                <Text style={styles.percentageValue}>{getAttendancePercentage()}%</Text>
                <Text style={styles.percentageLabel}>Attendance Rate</Text>
              </View>
              <View style={styles.percentageIcon}>
                <Ionicons name="trending-up" size={24} color={COLORS.secondary} />
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${getAttendancePercentage()}%`,
                    backgroundColor: parseFloat(getAttendancePercentage()) >= 75 ? COLORS.present : COLORS.absent
                  }
                ]}
              />
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="information-circle" size={18} color={COLORS.leave} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

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
        {/* Month Selector */}
        <Animated.View
          style={[
            styles.monthSelector,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity
            style={styles.monthButton}
            onPress={() => handleMonthChange(-1)}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.monthDisplay}>
            <Ionicons name="calendar" size={20} color={COLORS.secondary} />
            <Text style={styles.monthText}>
              {formatMonthForDisplay(selectedMonth)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.monthButton}
            onPress={() => handleMonthChange(1)}
          >
            <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <View style={styles.calendarHeaderIcon}>
              <Ionicons name="grid" size={18} color={COLORS.secondary} />
            </View>
            <Text style={styles.calendarHeaderTitle}>Monthly Calendar</Text>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day, index) => (
              <View key={day} style={styles.weekdayCell}>
                <Text style={[
                  styles.weekdayText,
                  (index === 0 || index === 6) && styles.weekendText
                ]}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {renderCalendar()}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendHeader}>
            <View style={styles.legendHeaderIcon}>
              <Ionicons name="information-circle" size={18} color={COLORS.secondary} />
            </View>
            <Text style={styles.legendTitle}>Legend</Text>
          </View>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.present }]} />
              <Text style={styles.legendText}>Present (P)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.absent }]} />
              <Text style={styles.legendText}>Absent (A)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.leave }]} />
              <Text style={styles.legendText}>Leave (L)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.holiday }]} />
              <Text style={styles.legendText}>Holiday (H)</Text>
            </View>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderIcon}>
              <Ionicons name="stats-chart" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.summaryTitle}>Monthly Summary</Text>
          </View>
          <View style={styles.summaryBody}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <View style={[styles.summaryDot, { backgroundColor: COLORS.gray }]} />
                <Text style={styles.summaryLabel}>Total Working Days</Text>
              </View>
              <Text style={styles.summaryValue}>{stats.total}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <View style={[styles.summaryDot, { backgroundColor: COLORS.present }]} />
                <Text style={styles.summaryLabel}>Days Present</Text>
              </View>
              <Text style={[styles.summaryValue, { color: COLORS.present }]}>
                {stats.present}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <View style={[styles.summaryDot, { backgroundColor: COLORS.absent }]} />
                <Text style={styles.summaryLabel}>Days Absent</Text>
              </View>
              <Text style={[styles.summaryValue, { color: COLORS.absent }]}>
                {stats.absent}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryRowLeft}>
                <View style={[styles.summaryDot, { backgroundColor: COLORS.leave }]} />
                <Text style={styles.summaryLabel}>Days on Leave</Text>
              </View>
              <Text style={[styles.summaryValue, { color: COLORS.leave }]}>
                {stats.leave}
              </Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
              <View style={styles.summaryRowLeft}>
                <View style={[styles.summaryDot, { backgroundColor: COLORS.holiday }]} />
                <Text style={styles.summaryLabel}>Holidays</Text>
              </View>
              <Text style={[styles.summaryValue, { color: COLORS.holiday }]}>
                {stats.holiday}
              </Text>
            </View>
          </View>
        </View>

        {/* Available Months */}
        {attendanceData.length > 0 && (
          <View style={styles.availableMonthsCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryHeaderIcon}>
                <Ionicons name="folder-open" size={20} color={COLORS.secondary} />
              </View>
              <Text style={styles.summaryTitle}>Available Records</Text>
            </View>
            <View style={styles.monthChipsContainer}>
              {attendanceData.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.monthChip,
                    formatMonthForAPI(selectedMonth) === item.att_month && styles.monthChipActive
                  ]}
                  onPress={() => {
                    const [monthStr, yearStr] = item.att_month.split('_');
                    const monthIndex = MONTHS.indexOf(monthStr.toLowerCase());
                    if (monthIndex !== -1) {
                      const newDate = new Date(parseInt(yearStr), monthIndex, 1);
                      setSelectedMonth(newDate);
                      calculateStats(attendanceData, newDate);
                    }
                  }}
                >
                  <Text style={[
                    styles.monthChipText,
                    formatMonthForAPI(selectedMonth) === item.att_month && styles.monthChipTextActive
                  ]}>
                    {item.att_month.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
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
    bottom: 30,
    left: 60,
  },
  headerStripe: {
    position: 'absolute',
    bottom: 50,
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
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Percentage Card
  percentageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  percentageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentageValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },
  percentageLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
    marginTop: 2,
  },
  percentageIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
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
    borderColor: 'rgba(245, 158, 11, 0.3)',
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
  },

  // Month Selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 20,
    gap: 8,
  },
  monthButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#FDF5F7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  monthDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Calendar
  calendarContainer: {
    backgroundColor: '#FDF5F7',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  calendarHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  weekendText: {
    color: COLORS.error,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayContent: {
    flex: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  today: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  dayNumberWithStatus: {
    color: COLORS.white,
    fontSize: 12,
  },
  todayText: {
    fontWeight: '800',
  },
  attendanceStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 1,
  },

  // Legend
  legendContainer: {
    backgroundColor: '#FDF5F7',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  legendHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    gap: 6,
  },
  legendColor: {
    width: 18,
    height: 18,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FDF5F7',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF9F0',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
    gap: 8,
  },
  summaryHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  summaryBody: {
    padding: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },

  // Available Months
  availableMonthsCard: {
    backgroundColor: '#FDF5F7',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  monthChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 6,
  },
  monthChip: {
    backgroundColor: '#FDF5F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#F5E8EB',
  },
  monthChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  monthChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});