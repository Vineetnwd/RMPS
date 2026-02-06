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
  background: '#F8FAFC',
  cream: '#FFF8E7',
  cardBg: '#FFFFFF',
};

const HOLIDAY_ICONS = [
  'balloon',
  'gift',
  'star',
  'heart',
  'trophy',
  'flower',
  'sparkles',
  'sunny',
];

const HOLIDAY_COLORS = [
  '#7A0C2E',
  '#D4AF37',
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
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

export default function HolidayListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [groupedHolidays, setGroupedHolidays] = useState({});
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

    fetchHolidays();
  }, []);

  useEffect(() => {
    groupHolidaysByMonth();
  }, [holidays]);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=holiday_list',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.status === 'success' && result.data && Array.isArray(result.data)) {
        // Sort by date
        const sortedHolidays = result.data.sort((a, b) =>
          new Date(a.holiday_date) - new Date(b.holiday_date)
        );
        setHolidays(sortedHolidays);

        // Cache holidays
        await AsyncStorage.setItem('cached_holidays', JSON.stringify(sortedHolidays));
      } else {
        setError('No holidays found');
      }
    } catch (err) {
      console.error('Error fetching holidays:', err);
      setError('Failed to load holidays');

      // Try to load cached holidays
      try {
        const cachedHolidays = await AsyncStorage.getItem('cached_holidays');
        if (cachedHolidays) {
          setHolidays(JSON.parse(cachedHolidays));
          setError('Showing cached holidays. Network error occurred.');
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
    fetchHolidays();
  };

  const groupHolidaysByMonth = () => {
    const grouped = {};

    holidays.forEach(holiday => {
      const date = new Date(holiday.holiday_date);
      const monthYear = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(holiday);
    });

    setGroupedHolidays(grouped);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const isUpcoming = (dateString) => {
    const holidayDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidayDate >= today;
  };

  const isPast = (dateString) => {
    const holidayDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidayDate < today;
  };

  const getDaysUntil = (dateString) => {
    const holidayDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = holidayDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUpcomingHolidays = () => {
    return holidays.filter(h => isUpcoming(h.holiday_date));
  };

  const getRandomIcon = (index) => {
    return HOLIDAY_ICONS[index % HOLIDAY_ICONS.length];
  };

  const getRandomColor = (index) => {
    return HOLIDAY_COLORS[index % HOLIDAY_COLORS.length];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="calendar" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading holidays...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  const upcomingCount = getUpcomingHolidays().length;

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
              <Text style={styles.headerTitle}>Holiday List</Text>
              <Text style={styles.headerSubtitle}>Academic year holidays</Text>
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
              <Text style={styles.statLabel}>Total Holidays</Text>
              <Text style={styles.statValue}>{holidays.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time" size={20} color={COLORS.secondary} />
              </View>
              <Text style={styles.statLabel}>Upcoming</Text>
              <Text style={styles.statValue}>{upcomingCount}</Text>
            </View>
          </Animated.View>

          {/* Year Badge */}
          <View style={styles.yearBadge}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.secondary} />
            <Text style={styles.yearText}>Academic Year {selectedYear}</Text>
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

      {/* Holiday List */}
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
        {holidays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={60} color={COLORS.lightGray} />
            </View>
            <Text style={styles.emptyTitle}>No Holidays!</Text>
            <Text style={styles.emptyText}>No holidays scheduled</Text>
            <Text style={styles.emptySubText}>Check back later for updates</Text>
          </View>
        ) : (
          <>
            {/* Next Holiday Card */}
            {upcomingCount > 0 && (
              <View style={styles.nextHolidaySection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderIcon}>
                    <Ionicons name="star" size={18} color={COLORS.secondary} />
                  </View>
                  <Text style={styles.sectionTitle}>Next Holiday</Text>
                </View>
                <NextHolidayCard
                  holiday={getUpcomingHolidays()[0]}
                  formatDate={formatDate}
                  getDayOfWeek={getDayOfWeek}
                  getDaysUntil={getDaysUntil}
                  fadeAnim={fadeAnim}
                />
              </View>
            )}

            {/* Grouped Holidays */}
            {Object.keys(groupedHolidays).map((monthYear, groupIndex) => (
              <View key={monthYear} style={styles.monthSection}>
                <View style={styles.monthHeader}>
                  <View style={styles.monthHeaderIcon}>
                    <Ionicons name="calendar" size={18} color={COLORS.secondary} />
                  </View>
                  <Text style={styles.monthTitle}>{monthYear}</Text>
                  <View style={styles.monthBadge}>
                    <Text style={styles.monthBadgeText}>
                      {groupedHolidays[monthYear].length}
                    </Text>
                  </View>
                </View>

                {groupedHolidays[monthYear].map((holiday, index) => (
                  <HolidayCard
                    key={holiday.id}
                    holiday={holiday}
                    index={groupIndex * 10 + index}
                    formatDate={formatDate}
                    getDayOfWeek={getDayOfWeek}
                    isUpcoming={isUpcoming(holiday.holiday_date)}
                    isPast={isPast(holiday.holiday_date)}
                    getDaysUntil={getDaysUntil}
                    getRandomIcon={getRandomIcon}
                    getRandomColor={getRandomColor}
                    fadeAnim={fadeAnim}
                  />
                ))}
              </View>
            ))}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function NextHolidayCard({ holiday, formatDate, getDayOfWeek, getDaysUntil, fadeAnim }) {
  const daysUntil = getDaysUntil(holiday.holiday_date);
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
    <Animated.View
      style={[
        styles.nextHolidayCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <View style={styles.nextHolidayIcon}>
        <Ionicons name="star" size={32} color={COLORS.white} />
      </View>
      <View style={styles.nextHolidayContent}>
        <Text style={styles.nextHolidayName}>{holiday.holiday_name}</Text>
        <View style={styles.nextHolidayDateRow}>
          <Ionicons name="calendar-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.nextHolidayDate}>
            {getDayOfWeek(holiday.holiday_date)}, {formatDate(holiday.holiday_date)}
          </Text>
        </View>
        <View style={styles.nextHolidayCountdown}>
          <Ionicons name="time-outline" size={14} color={COLORS.primary} />
          <Text style={styles.nextHolidayCountdownText}>
            {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow!' : `in ${daysUntil} days`}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function HolidayCard({
  holiday,
  index,
  formatDate,
  getDayOfWeek,
  isUpcoming,
  isPast,
  getDaysUntil,
  getRandomIcon,
  getRandomColor,
  fadeAnim
}) {
  const color = getRandomColor(index);
  const icon = getRandomIcon(index);
  const daysUntil = getDaysUntil(holiday.holiday_date);
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
        styles.holidayCard,
        isPast && styles.holidayCardPast,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <View style={[styles.holidayIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>

      <View style={styles.holidayContent}>
        <Text style={[styles.holidayName, isPast && styles.holidayNamePast]}>
          {holiday.holiday_name}
        </Text>
        <View style={styles.holidayDateRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={isPast ? COLORS.gray : COLORS.secondary}
          />
          <Text style={[styles.holidayDay, isPast && styles.holidayDatePast]}>
            {getDayOfWeek(holiday.holiday_date)}
          </Text>
        </View>
        <Text style={[styles.holidayDateFull, isPast && styles.holidayDatePast]}>
          {formatDate(holiday.holiday_date)}
        </Text>
      </View>

      {isUpcoming && (
        <View style={styles.holidayBadge}>
          {daysUntil === 0 ? (
            <View style={[styles.todayBadge, { backgroundColor: COLORS.success }]}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </View>
          ) : daysUntil === 1 ? (
            <View style={[styles.tomorrowBadge, { backgroundColor: COLORS.secondary }]}>
              <Text style={styles.tomorrowBadgeText}>Tomorrow</Text>
            </View>
          ) : daysUntil <= 7 ? (
            <View style={[styles.soonBadge, { borderColor: color }]}>
              <Text style={[styles.soonBadgeText, { color: color }]}>
                {daysUntil}d
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {isPast && (
        <View style={styles.pastBadge}>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.lightGray} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  loadingSubtext: {
    fontSize: 14,
    color: COLORS.gray,
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
    bottom: 40,
    left: 30,
  },
  headerStripe: {
    position: 'absolute',
    width: 3,
    height: 60,
    backgroundColor: COLORS.secondary,
    opacity: 0.3,
    right: 40,
    bottom: 20,
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
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Year Badge
  yearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '500',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  emptySubText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },

  // Next Holiday Section
  nextHolidaySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  nextHolidayCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  nextHolidayIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextHolidayContent: {
    flex: 1,
    justifyContent: 'center',
  },
  nextHolidayName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
  },
  nextHolidayDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  nextHolidayDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  nextHolidayCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  nextHolidayCountdownText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Month Section
  monthSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  monthHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  monthBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  monthBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Holiday Card
  holidayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  holidayCardPast: {
    opacity: 0.6,
  },
  holidayIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  holidayContent: {
    flex: 1,
  },
  holidayName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  holidayNamePast: {
    color: COLORS.gray,
  },
  holidayDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  holidayDay: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  holidayDatePast: {
    color: COLORS.gray,
  },
  holidayDateFull: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  holidayBadge: {
    marginLeft: 10,
  },
  todayBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  tomorrowBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tomorrowBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  soonBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  soonBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pastBadge: {
    marginLeft: 10,
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