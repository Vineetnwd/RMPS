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
  warning: '#F59E0B',
  background: '#F8FAFC',
  cream: '#FFF8E7',
  cardBg: '#FFFFFF',
  paid: '#10B981',
  pending: '#F59E0B',
  overdue: '#DC2626',
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

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPayments: 0,
    currentDues: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState('all');

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

    fetchPaymentHistory();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [payments]);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const studentId = await AsyncStorage.getItem('student_id');

      if (!studentId) {
        router.replace('/index');
        return;
      }

      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=payment_history',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ student_id: studentId }),
        }
      );

      const result = await response.json();

      if (result.status === 'success' && result.data && Array.isArray(result.data)) {
        const sortedPayments = result.data.sort((a, b) =>
          new Date(b.paid_date) - new Date(a.paid_date)
        );
        setPayments(sortedPayments);

        await AsyncStorage.setItem('cached_payments', JSON.stringify(sortedPayments));
      } else if (result.status === 'error' || !result.data || result.count === 0) {
        setPayments([]);
        setError('');
      } else {
        setError('No payment history found');
        setPayments([]);
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError('Failed to load payment history');

      try {
        const cachedPayments = await AsyncStorage.getItem('cached_payments');
        if (cachedPayments) {
          setPayments(JSON.parse(cachedPayments));
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
    fetchPaymentHistory();
  };

  const calculateStats = () => {
    const totalPaid = payments.reduce((sum, payment) =>
      sum + parseFloat(payment.paid_amount || 0), 0
    );

    const currentDues = payments.reduce((sum, payment) =>
      sum + parseFloat(payment.current_dues || 0), 0
    );

    setStats({
      totalPaid: totalPaid,
      totalPayments: payments.length,
      currentDues: currentDues,
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return COLORS.paid;
      case 'PENDING':
        return COLORS.pending;
      case 'OVERDUE':
        return COLORS.overdue;
      default:
        return COLORS.gray;
    }
  };

  const getFilteredPayments = () => {
    if (selectedFilter === 'all') {
      return payments;
    }
    return payments.filter(p => p.status?.toLowerCase() === selectedFilter);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="receipt" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading Payment History...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  const filteredPayments = getFilteredPayments();

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
              <Text style={styles.headerTitle}>Payment History</Text>
              <Text style={styles.headerSubtitle}>Track your payments</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Stats Cards */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="wallet" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.totalPaid)}</Text>
              <Text style={styles.statLabel}>Total Paid</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="receipt" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.statValue}>{stats.totalPayments}</Text>
              <Text style={styles.statLabel}>Payments</Text>
            </View>
          </Animated.View>

          {/* Dues Card */}
          {stats.currentDues > 0 && (
            <Animated.View
              style={[
                styles.duesCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <View style={styles.duesIcon}>
                <Ionicons name="alert-circle" size={22} color={COLORS.warning} />
              </View>
              <View style={styles.duesContent}>
                <Text style={styles.duesLabel}>Current Dues</Text>
                <Text style={styles.duesAmount}>{formatCurrency(stats.currentDues)}</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton
          title="All"
          active={selectedFilter === 'all'}
          onPress={() => setSelectedFilter('all')}
          count={payments.length}
        />
        <FilterButton
          title="Paid"
          active={selectedFilter === 'paid'}
          onPress={() => setSelectedFilter('paid')}
          count={payments.filter(p => p.status?.toLowerCase() === 'paid').length}
        />
        <FilterButton
          title="Pending"
          active={selectedFilter === 'pending'}
          onPress={() => setSelectedFilter('pending')}
          count={payments.filter(p => p.status?.toLowerCase() === 'pending').length}
        />
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="information-circle" size={18} color={COLORS.secondary} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={fetchPaymentHistory}>
            <Ionicons name="refresh" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Payment List */}
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
        {filteredPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={60} color={COLORS.lightGray} />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedFilter === 'all'
                ? 'No Payment History'
                : `No ${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Payments`}
            </Text>
            <Text style={styles.emptyText}>
              {selectedFilter === 'all'
                ? "You don't have any payment records yet."
                : `No ${selectedFilter} payments found.`}
            </Text>
            {selectedFilter !== 'all' && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => setSelectedFilter('all')}
              >
                <Text style={styles.clearFilterText}>Show All Payments</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderIcon}>
                <Ionicons name="list" size={16} color={COLORS.secondary} />
              </View>
              <Text style={styles.sectionTitle}>
                {selectedFilter === 'all'
                  ? `All Payments (${filteredPayments.length})`
                  : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} (${filteredPayments.length})`
                }
              </Text>
              {selectedFilter !== 'all' && (
                <TouchableOpacity onPress={() => setSelectedFilter('all')}>
                  <Text style={styles.clearFilter}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {filteredPayments.map((payment, index) => (
              <PaymentCard
                key={payment.receipt_id || index}
                payment={payment}
                index={index}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                fadeAnim={fadeAnim}
              />
            ))}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function FilterButton({ title, active, onPress, count }) {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
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

function PaymentCard({
  payment,
  index,
  formatCurrency,
  formatDate,
  getStatusColor,
  fadeAnim
}) {
  const [expanded, setExpanded] = useState(false);
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

  const getFeeBreakdown = () => {
    const fees = [];

    if (parseFloat(payment.admission_fee || 0) > 0) {
      fees.push({ label: 'Admission Fee', amount: payment.admission_fee });
    }
    if (parseFloat(payment.tution_fee || 0) > 0) {
      fees.push({ label: 'Tuition Fee', amount: payment.tution_fee });
    }
    if (parseFloat(payment.development_fee || 0) > 0) {
      fees.push({ label: 'Development Fee', amount: payment.development_fee });
    }
    if (parseFloat(payment.annual_fee || 0) > 0) {
      fees.push({ label: 'Annual Fee', amount: payment.annual_fee });
    }
    if (parseFloat(payment.registration_fee || 0) > 0) {
      fees.push({ label: 'Registration Fee', amount: payment.registration_fee });
    }
    if (parseFloat(payment.hostel_fee || 0) > 0) {
      fees.push({ label: 'Hostel Fee', amount: payment.hostel_fee });
    }
    if (parseFloat(payment.transport_fee || 0) > 0) {
      fees.push({ label: 'Transport Fee', amount: payment.transport_fee });
    }
    if (parseFloat(payment.other_fee || 0) > 0) {
      fees.push({ label: 'Other Fee', amount: payment.other_fee });
    }

    return fees;
  };

  const feeBreakdown = getFeeBreakdown();
  const statusColor = getStatusColor(payment.status);

  return (
    <Animated.View
      style={[
        styles.paymentCard,
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
        {/* Status Bar */}
        <View style={[styles.paymentStatusBar, { backgroundColor: statusColor }]} />

        {/* Receipt Badge */}
        <View style={[styles.receiptBadge, { backgroundColor: statusColor + '15' }]}>
          <Ionicons name="document-text" size={12} color={statusColor} />
          <Text style={[styles.receiptBadgeText, { color: statusColor }]}>
            Receipt #{payment.receipt_id}
          </Text>
        </View>

        {/* Card Header */}
        <View style={styles.paymentHeader}>
          <View style={[styles.paymentIcon, { backgroundColor: statusColor + '15' }]}>
            <Ionicons name="receipt" size={24} color={statusColor} />
          </View>

          <View style={styles.paymentInfo}>
            <Text style={styles.paymentMonth}>{payment.paid_month}</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.gray} />
              <Text style={styles.paymentDate}>{formatDate(payment.paid_date)}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <Ionicons
              name={payment.status?.toUpperCase() === 'PAID' ? 'checkmark-circle' : 'time'}
              size={12}
              color={statusColor}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {payment.status}
            </Text>
          </View>
        </View>

        {/* Amount Section */}
        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>{formatCurrency(payment.total)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Paid Amount</Text>
            <Text style={[styles.amountValue, { color: COLORS.success }]}>
              {formatCurrency(payment.paid_amount)}
            </Text>
          </View>
          {parseFloat(payment.current_dues || 0) > 0 && (
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Current Dues</Text>
              <Text style={[styles.amountValue, { color: COLORS.error }]}>
                {formatCurrency(payment.current_dues)}
              </Text>
            </View>
          )}
        </View>

        {/* Expandable Fee Breakdown */}
        {expanded && feeBreakdown.length > 0 && (
          <View style={styles.feeBreakdown}>
            <View style={styles.breakdownHeader}>
              <View style={styles.breakdownHeaderIcon}>
                <Ionicons name="list" size={14} color={COLORS.secondary} />
              </View>
              <Text style={styles.breakdownTitle}>Fee Breakdown</Text>
            </View>
            {feeBreakdown.map((fee, idx) => (
              <View key={idx} style={styles.feeRow}>
                <View style={styles.feeDot} />
                <Text style={styles.feeLabel}>{fee.label}</Text>
                <Text style={styles.feeAmount}>{formatCurrency(fee.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Remarks */}
        {expanded && payment.remarks && (
          <View style={styles.remarksSection}>
            <Text style={styles.remarksLabel}>Remarks</Text>
            <Text style={styles.remarksText}>{payment.remarks}</Text>
          </View>
        )}

        {/* Expand Button */}
        <View style={styles.expandButton}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.secondary}
          />
          <Text style={styles.expandButtonText}>
            {expanded ? 'Show Less' : 'View Details'}
          </Text>
        </View>
      </TouchableOpacity>
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

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Dues Card
  duesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  duesIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  duesContent: {
    flex: 1,
  },
  duesLabel: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 0.9,
  },
  duesAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 2,
  },

  // Filter
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.cardBg,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray,
  },
  filterButtonTextActive: {
    color: COLORS.primary,
  },
  countBadge: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(122, 12, 46, 0.2)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray,
  },
  countTextActive: {
    color: COLORS.primary,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    padding: 14,
    marginHorizontal: 20,
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

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
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
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  clearFilter: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '700',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  clearFilterButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  clearFilterText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '700',
  },

  // Payment Card
  paymentCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  paymentStatusBar: {
    height: 4,
  },
  receiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 16,
    marginTop: 14,
    gap: 6,
  },
  receiptBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMonth: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Amount Section
  amountSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Fee Breakdown
  feeBreakdown: {
    backgroundColor: COLORS.cream,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  breakdownHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  feeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
    marginRight: 10,
  },
  feeLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  feeAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },

  // Remarks
  remarksSection: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  remarksText: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
  },

  // Expand Button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  expandButtonText: {
    fontSize: 13,
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
});