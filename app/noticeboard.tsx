import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { WebView } from 'react-native-webview';

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
  background: '#FDF5F7',
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

export default function NoticeBoardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notices, setNotices] = useState([]);
  const [filteredNotices, setFilteredNotices] = useState([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // WebView modal state
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [webViewLoading, setWebViewLoading] = useState(true);

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

    fetchNotices();
  }, []);

  useEffect(() => {
    filterNotices();
  }, [searchQuery, selectedFilter, notices]);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError('');

      const studentId = await AsyncStorage.getItem('student_id');

      if (!studentId) {
        router.replace('/index');
        return;
      }

      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=get_notice',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ student_id: studentId }),
        }
      );

      const data = await response.json();

      if (data && Array.isArray(data)) {
        // Sort by date (newest first)
        const sortedNotices = data.sort((a, b) =>
          new Date(b.notice_date) - new Date(a.notice_date)
        );
        setNotices(sortedNotices);
        setFilteredNotices(sortedNotices);

        // Cache notices
        await AsyncStorage.setItem('cached_notices', JSON.stringify(sortedNotices));
      } else {
        setError('No notices found');
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
      setError('Failed to load notices');

      // Try to load cached notices
      try {
        const cachedNotices = await AsyncStorage.getItem('cached_notices');
        if (cachedNotices) {
          setNotices(JSON.parse(cachedNotices));
          setFilteredNotices(JSON.parse(cachedNotices));
          setError('Showing cached notices. Network error occurred.');
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
    fetchNotices();
  };

  const filterNotices = () => {
    let filtered = notices;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(notice =>
        notice.notice_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notice.notice_details.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply time filter
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (selectedFilter) {
      case 'week':
        filtered = filtered.filter(notice =>
          new Date(notice.notice_date) >= oneWeekAgo
        );
        break;
      case 'month':
        filtered = filtered.filter(notice =>
          new Date(notice.notice_date) >= oneMonthAgo
        );
        break;
      case 'all':
      default:
        break;
    }

    setFilteredNotices(filtered);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('en-GB', options);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleAttachment = (url) => {
    if (url && url.trim() !== '') {
      const fullUrl = `https://rmpublicschool.org/binex/system/upload/${url}`;
      setWebViewUrl(fullUrl);
      setWebViewLoading(true);
      setWebViewVisible(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="notifications" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading notices...</Text>
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
              <Text style={styles.headerTitle}>Notice Board</Text>
              <Text style={styles.headerSubtitle}>School announcements</Text>
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
                <Ionicons name="notifications" size={20} color={COLORS.secondary} />
              </View>
              <Text style={styles.statLabel}>Total Notices</Text>
              <Text style={styles.statValue}>{notices.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar" size={20} color={COLORS.secondary} />
              </View>
              <Text style={styles.statLabel}>This Week</Text>
              <Text style={styles.statValue}>
                {notices.filter(n => {
                  const date = new Date(n.notice_date);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return date >= weekAgo;
                }).length}
              </Text>
            </View>
          </Animated.View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search notices..."
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton
          title="All"
          active={selectedFilter === 'all'}
          onPress={() => setSelectedFilter('all')}
          count={notices.length}
        />
        <FilterButton
          title="This Week"
          active={selectedFilter === 'week'}
          onPress={() => setSelectedFilter('week')}
          count={notices.filter(n => {
            const date = new Date(n.notice_date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date >= weekAgo;
          }).length}
        />
        <FilterButton
          title="This Month"
          active={selectedFilter === 'month'}
          onPress={() => setSelectedFilter('month')}
          count={notices.filter(n => {
            const date = new Date(n.notice_date);
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            return date >= monthAgo;
          }).length}
        />
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="information-circle" size={18} color={COLORS.secondary} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Notices List */}
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
        {filteredNotices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-text-outline" size={60} color={COLORS.lightGray} />
            </View>
            <Text style={styles.emptyTitle}>No Notices!</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No notices found matching your search' : 'No notices available'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderIcon}>
                <Ionicons name="list" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.listHeaderTitle}>
                {filteredNotices.length} Notice{filteredNotices.length > 1 ? 's' : ''}
              </Text>
            </View>

            {filteredNotices.map((notice, index) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                index={index}
                formatDate={formatDate}
                getTimeAgo={getTimeAgo}
                handleAttachment={handleAttachment}
                fadeAnim={fadeAnim}
              />
            ))}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* WebView Modal for Attachments */}
      <Modal
        visible={webViewVisible}
        animationType="slide"
        onRequestClose={() => setWebViewVisible(false)}
      >
        <View style={styles.webViewContainer}>
          {/* WebView Header */}
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              style={styles.webViewCloseButton}
              onPress={() => setWebViewVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>Attachment</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Loading Indicator */}
          {webViewLoading && (
            <View style={styles.webViewLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.secondary} />
              <Text style={styles.webViewLoadingText}>Loading attachment...</Text>
            </View>
          )}

          {/* WebView */}
          <WebView
            source={{ uri: webViewUrl }}
            style={styles.webView}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            onError={() => {
              setWebViewLoading(false);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

function FilterButton({ title, active, onPress, count }) {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
        {title}
      </Text>
      {count > 0 && (
        <View style={[styles.countBadge, active && styles.countBadgeActive]}>
          <Text style={[styles.countText, active && styles.countTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function NoticeCard({ notice, index, formatDate, getTimeAgo, handleAttachment, fadeAnim }) {
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 100,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  // Remove HTML tags for preview
  const stripHtml = (html) => {
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
  };

  const previewText = stripHtml(notice.notice_details);
  const shouldShowMore = previewText.length > 150;

  // HTML rendering config
  const htmlConfig = {
    width: width - 80,
  };

  const tagsStyles = {
    body: {
      color: COLORS.gray,
      fontSize: 12,
      lineHeight: 22,
    },
    br: {
      height: 8,
    },
  };

  return (
    <Animated.View
      style={[
        styles.noticeCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(!expanded)}
      >
        {/* Date Badge */}
        <View style={styles.dateBadge}>
          <View style={styles.dateBadgeInner}>
            <Ionicons name="calendar" size={14} color={COLORS.secondary} />
            <Text style={styles.dateText}>{formatDate(notice.notice_date)}</Text>
          </View>
        </View>

        {/* Notice Content */}
        <View style={styles.noticeContent}>
          <View style={styles.noticeHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications" size={24} color={COLORS.secondary} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.noticeTitle}>{notice.notice_title}</Text>
              <View style={styles.noticeDateContainer}>
                <Ionicons name="time-outline" size={14} color={COLORS.gray} />
                <Text style={styles.timeAgo}>{getTimeAgo(notice.notice_date)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.noticeBody}>
            {expanded ? (
              <RenderHtml
                contentWidth={htmlConfig.width}
                source={{ html: notice.notice_details }}
                tagsStyles={tagsStyles}
              />
            ) : (
              <Text style={styles.noticePreview} numberOfLines={3}>
                {previewText}
              </Text>
            )}
          </View>

          {/* Attachment */}
          {notice.notice_attachment && notice.notice_attachment.trim() !== '' && (
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={() => handleAttachment(notice.notice_attachment)}
            >
              <View style={styles.attachmentIconContainer}>
                <Ionicons name="attach" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.attachmentText}>View Attachment</Text>
              <View style={styles.attachmentArrow}>
                <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          )}

          {/* Read More Button */}
          {shouldShowMore && (
            <TouchableOpacity
              style={styles.readMoreButton}
              onPress={() => setExpanded(!expanded)}
            >
              <Text style={styles.readMoreText}>
                {expanded ? 'Show Less' : 'Read More'}
              </Text>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
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
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 28,
    height: 28,
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
    fontSize: 12,
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

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 12,
    color: COLORS.ink,
    fontWeight: '500',
  },

  // Filter
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 6,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FDF5F7',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  countBadge: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  countTextActive: {
    color: COLORS.white,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    padding: 10,
    marginHorizontal: 20,
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

  // Scroll View
  scrollView: {
    flex: 1,
    paddingHorizontal: 14,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FDF5F7',
    borderRadius: 10,
    marginTop: 10,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },

  // List Header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  listHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Notice Card
  noticeCard: {
    backgroundColor: '#FDF5F7',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  dateBadge: {
    alignSelf: 'flex-start',
    marginLeft: 18,
    marginTop: 18,
  },
  dateBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  noticeContent: {
    padding: 10,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: 12,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  titleContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
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
  timeAgo: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  noticeBody: {
    marginTop: 8,
  },
  noticePreview: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 21,
  },

  // Attachment
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  attachmentIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
    marginLeft: 12,
  },
  attachmentArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Read More
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondary,
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

  // WebView Modal
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FDF5F7',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingTop: 30,
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  webViewCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  webViewLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    zIndex: 10,
  },
  webViewLoadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  webView: {
    flex: 1,
  },
});