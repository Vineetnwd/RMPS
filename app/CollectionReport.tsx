import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

// Color Constants - matching ComplaintScreen
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
const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }: { style?: any, color?: string, size?: number }) => (
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

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }: { style?: any, color?: string, size?: number, borderWidth?: number }) => (
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

const DottedPattern = ({ style, rows = 3, cols = 4, dotColor = COLORS.secondary }: { style?: any, rows?: number, cols?: number, dotColor?: string }) => (
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

export default function CollectionReportScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [fromDate, setFromDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const [summaryData, setSummaryData] = useState({
    totalAmount: 0,
    totalReceipts: 0,
    avgAmount: 0
  });

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

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
  }, []);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredReports(reports);
    } else {
      const filtered = reports.filter(report =>
        report.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.admission_no.includes(searchQuery) ||
        report.receipt_id.includes(searchQuery)
      );
      setFilteredReports(filtered);
    }
  }, [searchQuery, reports]);

  useEffect(() => {
    if (reports.length > 0) {
      calculateSummary();
    }
  }, [reports]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const formattedFromDate = fromDate.toISOString().split('T')[0];
      const formattedToDate = toDate.toISOString().split('T')[0];
      const branchId = await AsyncStorage.getItem('branch_id');

      const response = await axios.post(
        'https://rmpublicschool.org/binex/api.php?task=collection_report',
        {
          from_date: formattedFromDate,
          to_date: formattedToDate,
          branch_id: branchId ? parseInt(branchId) : null
        }
      );

      if (response.data.status === 'success') {
        // Process the data - convert string amounts to numbers and handle nulls
        const processedData = response.data.data.map((item: any) => ({
          ...item,
          paid_amount: item.paid_amount !== null ?
            parseFloat(item.paid_amount) :
            null
        }));

        setReports(processedData);
        setFilteredReports(processedData);
      } else {
        Alert.alert('Error', 'Failed to load reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'An error occurred while fetching reports');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = () => {
    // Calculate total collection amount (ignoring null values)
    const totalAmount = reports.reduce((sum, report) => {
      return sum + (report.paid_amount || 0);
    }, 0);

    // Count receipts with valid amounts
    const validReceipts = reports.filter(report => report.paid_amount !== null).length;

    // Calculate average amount
    const avgAmount = validReceipts > 0 ? totalAmount / validReceipts : 0;

    setSummaryData({
      totalAmount,
      totalReceipts: reports.length,
      avgAmount
    });
  };

  const handleFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      setFromDate(selectedDate);
    }
  };

  const handleToDateChange = (event: any, selectedDate?: Date) => {
    setShowToDatePicker(false);
    if (selectedDate) {
      setToDate(selectedDate);
    }
  };

  const handleReceiptPress = (receipt: any) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const viewFullReceipt = () => {
    setShowReceiptModal(false);
    router.push({
      pathname: '/ReceiptScreen',
      params: {
        receipt_id: selectedReceipt.receipt_id
      }
    });
  };

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const handleDateChange = (type: 'from' | 'to', days: number) => {
    if (type === 'from') {
      const newDate = new Date(fromDate);
      newDate.setDate(newDate.getDate() + days);
      setFromDate(newDate);
    } else {
      const newDate = new Date(toDate);
      newDate.setDate(newDate.getDate() + days);
      if (newDate <= new Date()) {
        setToDate(newDate);
      }
    }
  };

  const renderReceiptItem = ({ item, index }: { item: any, index: number }) => {
    return (
      <Animated.View
        style={[
          styles.receiptItem,
          {
            opacity: fadeAnim,
            transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.1)) }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.receiptCard}
          onPress={() => handleReceiptPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.receiptHeader}>
            <View style={styles.receiptInfo}>
              <View style={styles.receiptIdContainer}>
                <View style={styles.receiptIdIcon}>
                  <Ionicons name="receipt" size={14} color={COLORS.secondary} />
                </View>
                <Text style={styles.receiptId}>#{item.receipt_id}</Text>
              </View>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.gray} />
                <Text style={styles.receiptDate}>{item.paid_date}</Text>
              </View>
            </View>
            <View style={styles.receiptAmount}>
              <Text style={styles.amountLabel}>Amount</Text>
              <Text style={styles.amountValue}>
                {item.paid_amount !== null ? `₹${item.paid_amount.toLocaleString()}` : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.studentInfo}>
            <View style={styles.nameContainer}>
              <View style={styles.studentIconContainer}>
                <Ionicons name="school" size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.studentName}>{item.student_name}</Text>
            </View>
            <View style={styles.admissionContainer}>
              <Ionicons name="id-card-outline" size={14} color={COLORS.gray} />
              <Text style={styles.admissionNo}>{item.admission_no}</Text>
            </View>
          </View>

          <View style={styles.viewDetailsContainer}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
              <Text style={styles.headerTitle}>Collection Report</Text>
              <Text style={styles.headerSubtitle}>View fee collections</Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchReports}
            >
              <Ionicons name="refresh" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <Animated.View
            style={[
              styles.infoCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.infoIconContainer}>
              <Ionicons name="wallet" size={26} color={COLORS.primary} />
            </View>
            <Text style={styles.infoText}>
              View collection summary and receipt details for the selected period
            </Text>
          </Animated.View>
        </View>
      </View>

      <SafeAreaView style={styles.contentContainer}>
        {/* Date Range Selector */}
        <Animated.View
          style={[
            styles.dateRangeContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.datePickerRow}>
            {/* From Date */}
            <View style={styles.datePickerSection}>
              <View style={styles.dateLabelContainer}>
                <View style={styles.dateLabelIcon}>
                  <Ionicons name="calendar" size={12} color={COLORS.secondary} />
                </View>
                <Text style={styles.datePickerLabel}>From Date</Text>
              </View>
              <View style={styles.dateSelector}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => handleDateChange('from', -1)}
                >
                  <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateDisplay}
                  onPress={() => setShowFromDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatDateForDisplay(fromDate.toISOString().split('T')[0])}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => handleDateChange('from', 1)}
                >
                  <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* To Date */}
            <View style={styles.datePickerSection}>
              <View style={styles.dateLabelContainer}>
                <View style={styles.dateLabelIcon}>
                  <Ionicons name="calendar" size={12} color={COLORS.secondary} />
                </View>
                <Text style={styles.datePickerLabel}>To Date</Text>
              </View>
              <View style={styles.dateSelector}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => handleDateChange('to', -1)}
                >
                  <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateDisplay}
                  onPress={() => setShowToDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatDateForDisplay(toDate.toISOString().split('T')[0])}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => handleDateChange('to', 1)}
                >
                  <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Summary Cards */}
        <Animated.View
          style={[
            styles.summaryContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[styles.summaryCard, styles.totalCollectionCard]}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="cash" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryTitle}>Total Collection</Text>
            <Text style={styles.summaryValue}>₹{summaryData.totalAmount.toLocaleString()}</Text>
          </View>

          <View style={[styles.summaryCard, styles.totalReceiptsCard]}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="receipt" size={20} color={COLORS.secondary} />
            </View>
            <Text style={styles.summaryTitle}>Receipts</Text>
            <Text style={styles.summaryValue}>{summaryData.totalReceipts}</Text>
          </View>

          <View style={[styles.summaryCard, styles.avgAmountCard]}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="analytics" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.summaryTitle}>Avg. Amount</Text>
            <Text style={styles.summaryValue}>₹{summaryData.avgAmount.toFixed(0)}</Text>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View
          style={[
            styles.searchContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={18} color={COLORS.gray} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, admission no, or receipt"
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Receipt List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : filteredReports.length > 0 ? (
          <FlatList
            data={filteredReports}
            renderItem={renderReceiptItem}
            keyExtractor={item => item.receipt_id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-text-outline" size={60} color={COLORS.lightGray} />
            </View>
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptyText}>Try changing the date range or search criteria</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Date Pickers (Shown when active) */}
      {showFromDatePicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display="default"
          onChange={handleFromDateChange}
          maximumDate={toDate}
        />
      )}

      {showToDatePicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display="default"
          onChange={handleToDateChange}
          minimumDate={fromDate}
          maximumDate={new Date()}
        />
      )}

      {/* Receipt Details Modal */}
      <Modal
        visible={showReceiptModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReceiptModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="receipt" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.modalTitle}>Receipt Details</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowReceiptModal(false)}
                >
                  <Ionicons name="close" size={22} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              {selectedReceipt && (
                <View style={styles.receiptDetails}>
                  <View style={styles.receiptDetailRow}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="document-text" size={16} color={COLORS.secondary} />
                      <Text style={styles.receiptDetailLabel}>Receipt Number</Text>
                    </View>
                    <Text style={styles.receiptDetailValue}>#{selectedReceipt.receipt_id}</Text>
                  </View>

                  <View style={styles.receiptDetailRow}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="person" size={16} color={COLORS.secondary} />
                      <Text style={styles.receiptDetailLabel}>Student Name</Text>
                    </View>
                    <Text style={styles.receiptDetailValue}>{selectedReceipt.student_name}</Text>
                  </View>

                  <View style={styles.receiptDetailRow}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="id-card" size={16} color={COLORS.secondary} />
                      <Text style={styles.receiptDetailLabel}>Admission No.</Text>
                    </View>
                    <Text style={styles.receiptDetailValue}>{selectedReceipt.admission_no}</Text>
                  </View>

                  <View style={styles.receiptDetailRow}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="calendar" size={16} color={COLORS.secondary} />
                      <Text style={styles.receiptDetailLabel}>Payment Date</Text>
                    </View>
                    <Text style={styles.receiptDetailValue}>{selectedReceipt.paid_date}</Text>
                  </View>

                  <View style={[styles.receiptDetailRow, styles.amountRow]}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="cash" size={16} color={COLORS.success} />
                      <Text style={styles.receiptDetailLabel}>Amount Paid</Text>
                    </View>
                    <Text style={[styles.receiptDetailValue, styles.amountValueHighlight]}>
                      {selectedReceipt.paid_amount !== null
                        ? `₹${selectedReceipt.paid_amount.toLocaleString()}`
                        : 'N/A'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.viewFullButton}
                    onPress={viewFullReceipt}
                    activeOpacity={0.8}
                  >
                    <View style={styles.viewFullButtonInner}>
                      <Ionicons name="open-outline" size={18} color={COLORS.white} />
                      <Text style={styles.viewFullText}>View Full Receipt</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
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

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
  },

  // Date Range
  dateRangeContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerSection: {
    flex: 1,
  },
  dateLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  dateLabelIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dateButton: {
    padding: 12,
    backgroundColor: COLORS.cardBg,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.cream,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Summary Cards
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  totalCollectionCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  totalReceiptsCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  avgAmountCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
  },
  clearButton: {
    padding: 4,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },

  // List
  listContainer: {
    padding: 20,
    paddingTop: 8,
  },

  // Receipt Item
  receiptItem: {
    marginBottom: 14,
  },
  receiptCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  receiptIdIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptId: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 36,
  },
  receiptDate: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  receiptAmount: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.success,
  },
  studentInfo: {
    gap: 10,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(122, 12, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 15,
    color: COLORS.ink,
    fontWeight: '600',
  },
  admissionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 42,
  },
  admissionNo: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptDetails: {
    gap: 4,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  amountRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    marginHorizontal: -24,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  receiptDetailLabel: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  receiptDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  amountValueHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.success,
  },
  viewFullButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  viewFullButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    gap: 10,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    borderRadius: 16,
  },
  viewFullText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
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