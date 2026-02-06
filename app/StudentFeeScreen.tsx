import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const { width } = Dimensions.get("window");

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

export default function StudentFeeScreen() {
  const router = useRouter();
  const {
    student_id,
    student_name,
    student_class,
    student_section,
    admission_no,
  } = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [studentInfo] = useState({
    id: student_id || "",
    name: student_name || "Student Name",
    class: student_class || "",
    section: student_section || "",
    admissionNo: admission_no || "",
  });

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

    fetchFeeData();
  }, [student_id]);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchFeeData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!student_id) {
        throw new Error("Student ID is required");
      }

      const response = await axios.post(
        "https://rmpublicschool.org/binex/api.php?task=student_fee",
        { student_id: student_id }
      );

      if (response.data) {
        const processedData = {};
        Object.entries(response.data).forEach(([month, fees]) => {
          processedData[month] = {
            ...fees,
            total:
              typeof fees.total === "number"
                ? fees.total
                : parseFloat(fees.total) || 0,
            status: fees.status || "UNPAID",
          };
        });

        setFeeData(processedData);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Error fetching fee data:", err);
      setError(err.message || "Failed to load fee data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!feeData) return { total: 0, paid: 0, pending: 0 };

    const total = Object.values(feeData).reduce((sum, month) => {
      const monthTotal =
        typeof month.total === "number"
          ? month.total
          : parseFloat(month.total) || 0;
      return sum + monthTotal;
    }, 0);

    const paid = Object.values(feeData).reduce((sum, month) => {
      if (month.status !== "PAID") return sum;
      const monthTotal =
        typeof month.total === "number"
          ? month.total
          : parseFloat(month.total) || 0;
      return sum + monthTotal;
    }, 0);

    return {
      total: isNaN(total) ? 0 : total,
      paid: isNaN(paid) ? 0 : paid,
      pending: isNaN(total - paid) ? 0 : total - paid,
    };
  };

  const { total, paid, pending } = calculateTotals();

  const getOrderedMonths = () => {
    if (!feeData) return [];

    const months = Object.keys(feeData);
    const monthOrder = [
      "Admission_month",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
      "January",
      "February",
      "March",
    ];

    return months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  };

  const renderFeeCard = (month, index) => {
    if (!feeData) return null;

    const monthData = feeData[month];
    if (!monthData) return null;

    const isPaid = monthData.status === "PAID";

    return (
      <Animated.View
        key={month}
        style={[
          styles.feeCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View
          style={[styles.feeCardContent, isPaid ? styles.paidCard : styles.unpaidCard]}
        >
          <View style={styles.feeCardHeader}>
            <View style={styles.feeCardLeft}>
              <View style={[styles.monthIconContainer, { backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons
                  name={isPaid ? "checkmark-circle" : "time"}
                  size={20}
                  color={isPaid ? COLORS.success : COLORS.warning}
                />
              </View>
              <View>
                <Text style={styles.monthTitle}>
                  {month === "Admission_month" ? "Admission Fees" : month}
                </Text>
                {month === "Admission_month" ? (
                  <Text style={styles.oneTimeLabel}>One Time Payment</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.feeStatus}>
              {isPaid ? (
                <View style={styles.paidStatusPill}>
                  <FontAwesome5
                    name="check-circle"
                    size={10}
                    color={COLORS.success}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.paidStatusText}>PAID</Text>
                </View>
              ) : (
                <View style={styles.pendingStatusPill}>
                  <Text style={styles.pendingStatusText}>UNPAID</Text>
                </View>
              )}

              <Text style={styles.totalAmount}>₹{monthData.total}</Text>
            </View>
          </View>

          <View style={styles.feeBreakdown}>
            {Object.entries(monthData).map(([key, value]) => {
              if (key === "total" || key === "status") return null;

              const formattedLabel = key
                .replace(/_/g, " ")
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

              return (
                <View key={key} style={styles.feeItem}>
                  <Text style={styles.feeLabel}>{formattedLabel}</Text>
                  <Text style={styles.feeValue}>₹{value}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="wallet" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading Fee Details...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Student Fees</Text>
            <Text style={styles.headerSubtitle}>Fee details & payments</Text>
          </View>

          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => {
              Alert.alert(
                "Fee Information",
                "This screen shows the fee details for the selected student.",
                [{ text: "OK" }]
              );
            }}
          >
            <Ionicons name="information-circle-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Student Info Card */}
      <Animated.View
        style={[
          styles.studentInfoCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.studentDetail}>
          <Text style={styles.studentName}>{studentInfo.name}</Text>
          <View style={styles.studentInfoRow}>
            <View style={styles.infoItem}>
              <View style={styles.infoItemIcon}>
                <FontAwesome5
                  name="graduation-cap"
                  size={10}
                  color={COLORS.secondary}
                />
              </View>
              <Text style={styles.infoText}>
                Class {studentInfo.class}-{studentInfo.section}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoItemIcon}>
                <FontAwesome5
                  name="id-badge"
                  size={10}
                  color={COLORS.secondary}
                />
              </View>
              <Text style={styles.infoText}>
                {studentInfo.admissionNo || `ID: ${studentInfo.id}`}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.studentAvatar}>
          <Text style={styles.avatarText}>{studentInfo.name.charAt(0)}</Text>
        </View>
      </Animated.View>

      {error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="warning" size={50} color={COLORS.error} />
          </View>
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFeeData}>
            <Ionicons name="refresh" size={18} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Summary Cards */}
          <Animated.View
            style={[
              styles.summaryCardsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={[styles.summaryCard, styles.summaryCardTotal]}>
              <View style={styles.summaryIconContainer}>
                <FontAwesome5 name="rupee-sign" size={14} color={COLORS.secondary} />
              </View>
              <Text style={styles.summaryValue}>₹{total.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>

            <View style={[styles.summaryCard, styles.summaryCardPaid]}>
              <View style={[styles.summaryDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.summaryValue}>₹{paid.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Paid</Text>
            </View>

            <View style={[styles.summaryCard, styles.summaryCardPending]}>
              <View style={[styles.summaryDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.summaryValue}>₹{pending.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </Animated.View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderIcon}>
                <Ionicons name="list" size={16} color={COLORS.secondary} />
              </View>
              <Text style={styles.sectionTitle}>Fee Structure</Text>
            </View>

            {getOrderedMonths().map((month, index) =>
              renderFeeCard(month, index)
            )}

            <View style={styles.bottomSpace} />
          </ScrollView>

          {/* Pay Fee Button */}
          {pending > 0 && (
            <Animated.View
              style={[
                styles.paymentContainer,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              <View style={styles.paymentSummary}>
                <Text style={styles.paymentText}>Pending Amount</Text>
                <Text style={styles.paymentAmount}>
                  ₹{pending.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => {
                  router.push({
                    pathname: "/StudentPayFeeScreen",
                    params: {
                      student_id: studentInfo.id,
                      student_name: studentInfo.name,
                      student_class: studentInfo.class,
                      student_section: studentInfo.section,
                      admission_no: studentInfo.admissionNo,
                    },
                  });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.payButtonInner}>
                  <Text style={styles.payButtonText}>Pay Fees</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </>
      )}
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Student Info Card
  studentInfoCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginTop: -15,
    marginBottom: 16,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  studentDetail: {
    flex: 1,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 8,
  },
  studentInfoRow: {
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoItemIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // Summary Cards
  summaryCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    backgroundColor: COLORS.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardTotal: {},
  summaryCardPaid: {},
  summaryCardPending: {},
  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Scroll
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Fee Card
  feeCard: {
    marginBottom: 14,
  },
  feeCardContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  paidCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  unpaidCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  feeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  feeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  monthIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  oneTimeLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  feeStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paidStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },
  pendingStatusPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  feeBreakdown: {
    backgroundColor: COLORS.cream,
    padding: 14,
    borderRadius: 12,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },

  // Payment Container
  paymentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
  },
  paymentSummary: {
    flex: 1,
  },
  paymentText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  paymentAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
  },
  payButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 16,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
    borderRadius: 16,
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  bottomSpace: {
    height: 100,
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