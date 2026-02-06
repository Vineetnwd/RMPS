import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  primary: '#7A0C2E',
  primaryDark: '#5A0820',
  primaryLight: '#9A1C4E',
  secondary: '#D4AF37',
  secondaryLight: '#E6C35C',
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

const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }: any) => (
  <View style={[{ width: size, height: size, backgroundColor: color, transform: [{ rotate: '45deg' }] }, style]} />
);

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }: any) => (
  <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth, borderColor: color, backgroundColor: 'transparent' }, style]} />
);

const DottedPattern = ({ style, rows = 3, cols = 4, dotColor = COLORS.secondary }: any) => (
  <View style={[styles.dottedContainer, style]}>
    {[...Array(rows)].map((_, rowIndex) => (
      <View key={rowIndex} style={styles.dottedRow}>
        {[...Array(cols)].map((_, colIndex) => (
          <View key={colIndex} style={[styles.dot, { backgroundColor: dotColor, opacity: 0.3 + (rowIndex * cols + colIndex) * 0.03 }]} />
        ))}
      </View>
    ))}
  </View>
);

const CLASS_OPTIONS = [
  { label: "NUR", value: "NUR" }, { label: "LKG", value: "LKG" }, { label: "UKG", value: "UKG" },
  { label: "I", value: "I" }, { label: "II", value: "II" }, { label: "III", value: "III" },
  { label: "IV", value: "IV" }, { label: "V", value: "V" }, { label: "VI", value: "VI" },
  { label: "VII", value: "VII" }, { label: "VIII", value: "VIII" }, { label: "IX", value: "IX" }, { label: "X", value: "X" },
];

const SECTION_OPTIONS = [
  { label: "Section A", value: "A" }, { label: "Section B", value: "B" }, { label: "Section C", value: "C" },
];

const MONTH_OPTIONS = [
  { label: "January", value: "January" }, { label: "February", value: "February" }, { label: "March", value: "March" },
  { label: "April", value: "April" }, { label: "May", value: "May" }, { label: "June", value: "June" },
  { label: "July", value: "July" }, { label: "August", value: "August" }, { label: "September", value: "September" },
  { label: "October", value: "October" }, { label: "November", value: "November" }, { label: "December", value: "December" },
];

export default function DuesListScreen() {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState("I");
  const [selectedSection, setSelectedSection] = useState("A");
  const [selectedMonths, setSelectedMonths] = useState([new Date().toLocaleString('en-US', { month: 'long' })]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showMonthsModal, setShowMonthsModal] = useState(false);
  const [duesData, setDuesData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [summary, setSummary] = useState({ totalStudents: 0, totalDues: 0, averageDue: 0 });
  const [showFilters, setShowFilters] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 20000, useNativeDriver: true })).start();
  }, []);

  const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    if (selectedClass && selectedSection && selectedMonths.length > 0) fetchDuesData();
  }, [selectedClass, selectedSection, selectedMonths]);

  useEffect(() => {
    if (duesData.length > 0) { filterData(); calculateSummary(); }
  }, [duesData, searchQuery]);

  const fetchDuesData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const branchId = await AsyncStorage.getItem('branch_id');
      const response = await axios.post("https://rmpublicschool.org/binex/api.php?task=dues_list", {
        student_class: selectedClass,
        student_section: selectedSection,
        months: selectedMonths.join(','),
        branch_id: branchId ? parseInt(branchId) : null
      });
      if (Array.isArray(response.data)) { setDuesData(response.data); setFilteredData(response.data); }
      else throw new Error("Invalid response format from server");
    } catch (err) {
      console.error("Error fetching dues data:", err);
      setError("Failed to load dues data. Please try again.");
    } finally { setIsLoading(false); }
  };

  const filterData = () => {
    if (!searchQuery.trim()) { setFilteredData(duesData); return; }
    const filtered = duesData.filter((student) =>
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_admission.includes(searchQuery) ||
      student.student_mobile.includes(searchQuery)
    );
    setFilteredData(filtered);
  };

  const calculateSummary = () => {
    const totalStudents = duesData.length;
    let totalDues = 0;
    duesData.forEach((student) => {
      const previousDues = parseFloat(student.previous_dues) || 0;
      const currentFees = student.fee?.total || 0;
      totalDues += previousDues + currentFees;
    });
    const averageDue = totalStudents > 0 ? Math.round(totalDues / totalStudents) : 0;
    setSummary({ totalStudents, totalDues, averageDue });
  };

  const toggleMonthSelection = (month: string) => {
    if (selectedMonths.includes(month)) {
      if (selectedMonths.length > 1) setSelectedMonths(selectedMonths.filter((m) => m !== month));
    } else setSelectedMonths([...selectedMonths, month]);
  };

  const formatCurrency = (amount: any) => "₹" + parseFloat(amount).toLocaleString("en-IN");

  const generatePDF = async () => {
    try {
      const htmlContent = `<html><head><style>body{font-family:Arial;margin:20px}h1{color:${COLORS.primary};text-align:center}table{width:100%;border-collapse:collapse}th{background:${COLORS.primary};color:white;padding:10px}td{padding:10px;border-bottom:1px solid #ddd}</style></head><body><h1>Dues List Report</h1><p>Class: ${selectedClass}-${selectedSection} | Months: ${selectedMonths.join(", ")}</p><table><tr><th>Student Name</th><th>Admission No.</th><th>Previous Dues</th><th>Current Fees</th><th>Total Due</th></tr>${filteredData.map((s) => `<tr><td>${s.student_name}</td><td>${s.student_admission}</td><td>${formatCurrency(s.previous_dues)}</td><td>${formatCurrency(s.fee.total)}</td><td>${formatCurrency(parseFloat(s.previous_dues) + s.fee.total)}</td></tr>`).join("")}</table></body></html>`;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      else Alert.alert("Sharing not available");
    } catch (error) { Alert.alert("Error", "Failed to generate PDF report"); }
  };

  const makePhoneCall = async (phoneNumber: string) => {
    const cleanedNumber = String(phoneNumber).trim();
    if (!cleanedNumber || !/^\+?\d{7,15}$/.test(cleanedNumber)) { Alert.alert("Invalid Number"); return; }
    const phoneUrl = Platform.OS === "android" ? `tel:${cleanedNumber}` : `telprompt:${cleanedNumber}`;
    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) await Linking.openURL(phoneUrl);
      else Alert.alert("Not Supported");
    } catch (error) { Alert.alert("Error"); }
  };

  const sendWhatsAppMessage = (phoneNumber: string, studentName: string, amount: number) => {
    if (!phoneNumber) return;
    const cleanedNumber = phoneNumber.replace(/\D/g, "");
    const formattedNumber = cleanedNumber.length === 10 ? `91${cleanedNumber}` : cleanedNumber;
    const message = `Dear Parent, Fee payment of ${formatCurrency(amount)} is pending for ${studentName}. Thank you, DPS Mushkipur`;
    const whatsappUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(whatsappUrl).then((supported) => {
      if (supported) Linking.openURL(whatsappUrl);
      else Alert.alert("WhatsApp is not installed");
    });
  };

  const renderDuesItem = ({ item }: { item: any }) => {
    const previousDues = parseFloat(item.previous_dues) || 0;
    const currentFees = item.fee?.total || 0;
    const totalDue = previousDues + currentFees;

    return (
      <Animated.View style={[styles.duesCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.cardHeader}>
          <View style={styles.studentInfoHeader}>
            <View style={styles.studentIconContainer}><Ionicons name="school" size={16} color={COLORS.primary} /></View>
            <Text style={styles.studentName}>{item.student_name}</Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Due</Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalDue)}</Text>
          </View>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}><Ionicons name="id-card-outline" size={14} color={COLORS.gray} /><Text style={styles.detailLabel}>Admission</Text><Text style={styles.detailValue}>{item.student_admission}</Text></View>
            <View style={styles.detailItem}><Ionicons name="call-outline" size={14} color={COLORS.gray} /><Text style={styles.detailLabel}>Mobile</Text><Text style={styles.detailValue}>{item.student_mobile}</Text></View>
          </View>
          <View style={styles.divider} />
          <View style={styles.feesSection}>
            <View style={styles.feeRow}><Text style={styles.feeLabel}>Previous Dues</Text><Text style={[styles.feeValue, styles.previousDue]}>{formatCurrency(previousDues)}</Text></View>
            {item.fee?.tution_fee && <View style={styles.feeRow}><Text style={styles.feeLabel}>Tuition Fee</Text><Text style={styles.feeValue}>{formatCurrency(item.fee.tution_fee)}</Text></View>}
            {item.fee?.transport_fee && <View style={styles.feeRow}><Text style={styles.feeLabel}>Transport Fee</Text><Text style={styles.feeValue}>{formatCurrency(item.fee.transport_fee)}</Text></View>}
            <View style={[styles.feeRow, styles.currentFeeRow]}><Text style={styles.currentFeeLabel}>Current Fee</Text><Text style={styles.currentFeeValue}>{formatCurrency(currentFees)}</Text></View>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.actionButton} onPress={() => makePhoneCall(item.student_mobile)}><Ionicons name="call" size={16} color={COLORS.primary} /><Text style={styles.actionButtonText}>Call</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => sendWhatsAppMessage(item.student_mobile, item.student_name, totalDue)}><Ionicons name="logo-whatsapp" size={16} color={COLORS.success} /><Text style={[styles.actionButtonText, { color: COLORS.success }]}>WhatsApp</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push({ pathname: "/student_profile", params: { student_id: item.id } })}><Ionicons name="person" size={16} color={COLORS.secondary} /><Text style={[styles.actionButtonText, { color: COLORS.secondary }]}>Profile</Text></TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <View style={styles.headerDecorations} pointerEvents="none">
            <Animated.View style={[styles.headerBlob, { transform: [{ translateY: floatTranslate }] }]} />
            <Animated.View style={[styles.headerRing, { transform: [{ rotate }] }]}><CircleRing size={80} borderWidth={2} color="rgba(212, 175, 55, 0.25)" /></Animated.View>
            <DiamondShape style={styles.headerDiamond1} color="rgba(212, 175, 55, 0.4)" size={14} />
            <DiamondShape style={styles.headerDiamond2} color="rgba(255, 255, 255, 0.2)" size={10} />
            <DottedPattern style={styles.headerDots} rows={2} cols={4} dotColor="rgba(255, 255, 255, 0.3)" />
          </View>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={COLORS.white} /></TouchableOpacity>
              <View style={styles.headerTitleContainer}><Text style={styles.headerTitle}>Dues List</Text><Text style={styles.headerSubtitle}>Outstanding payments</Text></View>
              <TouchableOpacity style={styles.headerButton} onPress={generatePDF}><Ionicons name="document-text" size={20} color={COLORS.white} /></TouchableOpacity>
            </View>
            <Animated.View style={[styles.infoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.infoIconContainer}><Ionicons name="wallet" size={26} color={COLORS.primary} /></View>
              <Text style={styles.infoText}>View and manage student fee dues with quick contact options</Text>
            </Animated.View>
          </View>
        </View>

        <View style={styles.filterToggleContainer}>
          <View style={styles.selectedInfoContainer}><Text style={styles.selectedInfoText}>Class {selectedClass}-{selectedSection} • {selectedMonths.length} months</Text></View>
          <TouchableOpacity style={styles.filterToggleButton} onPress={() => setShowFilters(!showFilters)}><Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={18} color={COLORS.gray} /></TouchableOpacity>
        </View>

        {showFilters && (
          <>
            <View style={styles.selectionBar}>
              <View style={styles.selectionRow}>
                <TouchableOpacity style={styles.selector} onPress={() => setShowClassModal(true)}><View style={styles.selectorLabelContainer}><Ionicons name="school" size={12} color={COLORS.secondary} /><Text style={styles.selectorLabel}>Class</Text></View><View style={styles.selectorValue}><Text style={styles.selectedValueText}>{selectedClass}</Text><Ionicons name="chevron-down" size={14} color={COLORS.gray} /></View></TouchableOpacity>
                <TouchableOpacity style={styles.selector} onPress={() => setShowSectionModal(true)}><View style={styles.selectorLabelContainer}><Ionicons name="grid" size={12} color={COLORS.secondary} /><Text style={styles.selectorLabel}>Section</Text></View><View style={styles.selectorValue}><Text style={styles.selectedValueText}>{selectedSection}</Text><Ionicons name="chevron-down" size={14} color={COLORS.gray} /></View></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.monthSelector} onPress={() => setShowMonthsModal(true)}><View style={styles.selectorLabelContainer}><Ionicons name="calendar" size={12} color={COLORS.secondary} /><Text style={styles.selectorLabel}>Selected Months</Text></View><View style={styles.selectedMonthsContainer}>{selectedMonths.map((month) => (<View key={month} style={styles.monthChip}><Text style={styles.monthChipText}>{month}</Text></View>))}<Ionicons name="create" size={14} color={COLORS.gray} style={styles.editIcon} /></View></TouchableOpacity>
            </View>
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, styles.studentsCard]}><View style={styles.summaryIconContainer}><Ionicons name="people" size={18} color={COLORS.primary} /></View><Text style={styles.summaryValue}>{summary.totalStudents}</Text><Text style={styles.summaryLabel}>Students</Text></View>
              <View style={[styles.summaryCard, styles.duesCard2]}><View style={styles.summaryIconContainer}><Ionicons name="cash" size={18} color={COLORS.error} /></View><Text style={styles.summaryValue}>{formatCurrency(summary.totalDues)}</Text><Text style={styles.summaryLabel}>Total Dues</Text></View>
              <View style={[styles.summaryCard, styles.avgCard]}><View style={styles.summaryIconContainer}><Ionicons name="analytics" size={18} color={COLORS.success} /></View><Text style={styles.summaryValue}>{formatCurrency(summary.averageDue)}</Text><Text style={styles.summaryLabel}>Avg. Due</Text></View>
            </View>
          </>
        )}

        <View style={styles.searchContainer}><View style={styles.searchIconContainer}><Ionicons name="search" size={18} color={COLORS.gray} /></View><TextInput style={styles.searchInput} placeholder="Search by name or admission number..." placeholderTextColor={COLORS.gray} value={searchQuery} onChangeText={setSearchQuery} />{searchQuery.length > 0 && (<TouchableOpacity onPress={() => setSearchQuery("")}><Ionicons name="close-circle" size={18} color={COLORS.gray} /></TouchableOpacity>)}</View>

        {isLoading ? (<View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Loading dues data...</Text></View>
        ) : error ? (<View style={styles.errorContainer}><Ionicons name="alert-circle" size={50} color={COLORS.error} /><Text style={styles.errorTitle}>Error Loading Data</Text><Text style={styles.errorMessage}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={fetchDuesData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
        ) : filteredData.length > 0 ? (<FlatList data={filteredData} renderItem={renderDuesItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />
        ) : (<View style={styles.emptyContainer}><View style={styles.emptyIconContainer}><Ionicons name="document-text-outline" size={50} color={COLORS.lightGray} /></View><Text style={styles.emptyTitle}>No Dues Found</Text><Text style={styles.emptyText}>No students with outstanding dues for the selected criteria</Text></View>)}

        <Modal visible={showClassModal} transparent animationType="fade" onRequestClose={() => setShowClassModal(false)}>
          <View style={styles.modalOverlay}><View style={styles.modalContainer}>
            <View style={styles.modalHeader}><View style={styles.modalTitleContainer}><Ionicons name="school" size={20} color={COLORS.primary} /><Text style={styles.modalTitle}>Select Class</Text></View><TouchableOpacity style={styles.closeButton} onPress={() => setShowClassModal(false)}><Ionicons name="close" size={22} color={COLORS.gray} /></TouchableOpacity></View>
            <ScrollView style={styles.modalContent}>{CLASS_OPTIONS.map((option) => (<TouchableOpacity key={option.value} style={[styles.modalOption, selectedClass === option.value && styles.modalOptionSelected]} onPress={() => { setSelectedClass(option.value); setShowClassModal(false); }}><Text style={[styles.modalOptionText, selectedClass === option.value && styles.modalOptionTextSelected]}>{option.label}</Text>{selectedClass === option.value && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}</TouchableOpacity>))}</ScrollView>
          </View></View>
        </Modal>

        <Modal visible={showSectionModal} transparent animationType="fade" onRequestClose={() => setShowSectionModal(false)}>
          <View style={styles.modalOverlay}><View style={styles.modalContainer}>
            <View style={styles.modalHeader}><View style={styles.modalTitleContainer}><Ionicons name="grid" size={20} color={COLORS.primary} /><Text style={styles.modalTitle}>Select Section</Text></View><TouchableOpacity style={styles.closeButton} onPress={() => setShowSectionModal(false)}><Ionicons name="close" size={22} color={COLORS.gray} /></TouchableOpacity></View>
            <View style={styles.modalContent}>{SECTION_OPTIONS.map((option) => (<TouchableOpacity key={option.value} style={[styles.modalOption, selectedSection === option.value && styles.modalOptionSelected]} onPress={() => { setSelectedSection(option.value); setShowSectionModal(false); }}><Text style={[styles.modalOptionText, selectedSection === option.value && styles.modalOptionTextSelected]}>{option.label}</Text>{selectedSection === option.value && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}</TouchableOpacity>))}</View>
          </View></View>
        </Modal>

        <Modal visible={showMonthsModal} transparent animationType="fade" onRequestClose={() => setShowMonthsModal(false)}>
          <View style={styles.modalOverlay}><View style={styles.modalContainer}>
            <View style={styles.modalHeader}><View style={styles.modalTitleContainer}><Ionicons name="calendar" size={20} color={COLORS.primary} /><Text style={styles.modalTitle}>Select Months</Text></View><TouchableOpacity style={styles.closeButton} onPress={() => setShowMonthsModal(false)}><Ionicons name="close" size={22} color={COLORS.gray} /></TouchableOpacity></View>
            <ScrollView style={styles.modalContent}>{MONTH_OPTIONS.map((option) => (<TouchableOpacity key={option.value} style={[styles.modalOption, selectedMonths.includes(option.value) && styles.modalOptionSelected]} onPress={() => toggleMonthSelection(option.value)}><Text style={[styles.modalOptionText, selectedMonths.includes(option.value) && styles.modalOptionTextSelected]}>{option.label}</Text>{selectedMonths.includes(option.value) && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}</TouchableOpacity>))}</ScrollView>
            <View style={styles.modalFooter}><TouchableOpacity style={styles.modalDoneButton} onPress={() => setShowMonthsModal(false)}><Text style={styles.modalDoneText}>Done</Text></TouchableOpacity></View>
          </View></View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 10, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  headerDecorations: { ...StyleSheet.absoluteFillObject },
  headerBlob: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.secondary, opacity: 0.12, top: -40, right: -50 },
  headerRing: { position: 'absolute', top: 30, left: -30 },
  headerDiamond1: { position: 'absolute', top: 80, right: 60 },
  headerDiamond2: { position: 'absolute', top: 120, right: 100 },
  headerDots: { position: 'absolute', bottom: 60, left: 30 },
  headerContent: { paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  headerButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, fontWeight: '500' },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  infoIconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
  infoText: { flex: 1, fontSize: 13, color: COLORS.gray, lineHeight: 20 },
  filterToggleContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingHorizontal: 20, paddingVertical: 14, marginHorizontal: 20, marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  selectedInfoContainer: { flex: 1 },
  selectedInfoText: { fontSize: 14, color: COLORS.ink, fontWeight: '600' },
  filterToggleButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.cream, justifyContent: 'center', alignItems: 'center' },
  selectionBar: { backgroundColor: COLORS.cardBg, padding: 16, marginHorizontal: 20, marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  selectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  selector: { flex: 1 },
  selectorLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  selectorLabel: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  selectorValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cream, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)' },
  selectedValueText: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  monthSelector: { marginTop: 4 },
  selectedMonthsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', backgroundColor: COLORS.cream, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', gap: 8 },
  monthChip: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  monthChipText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  editIcon: { marginLeft: 'auto' },
  summaryContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 12, gap: 10 },
  summaryCard: { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  studentsCard: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  duesCard2: { borderLeftWidth: 3, borderLeftColor: COLORS.error },
  avgCard: { borderLeftWidth: 3, borderLeftColor: COLORS.success },
  summaryIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: COLORS.gray, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, marginHorizontal: 20, marginTop: 16, marginBottom: 12, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  searchIconContainer: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray, fontWeight: '500' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, borderWidth: 2, borderColor: COLORS.secondary },
  retryText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 30, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.gray, textAlign: 'center' },
  listContainer: { padding: 20, paddingTop: 8 },
  duesCard: { backgroundColor: COLORS.cardBg, borderRadius: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  studentInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  studentIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(122, 12, 46, 0.1)', justifyContent: 'center', alignItems: 'center' },
  studentName: { fontSize: 16, fontWeight: '700', color: COLORS.ink, flex: 1 },
  amountContainer: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 10, color: COLORS.gray, marginBottom: 2, fontWeight: '500' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: COLORS.error },
  cardDetails: { padding: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  detailItem: { flex: 1, gap: 4 },
  detailLabel: { fontSize: 11, color: COLORS.gray, fontWeight: '500' },
  detailValue: { fontSize: 14, color: COLORS.ink, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.lightGray, marginVertical: 14 },
  feesSection: { gap: 10 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { fontSize: 13, color: COLORS.gray },
  feeValue: { fontSize: 13, color: COLORS.ink, fontWeight: '600' },
  previousDue: { color: COLORS.error },
  currentFeeRow: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  currentFeeLabel: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  currentFeeValue: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6, borderRightWidth: 1, borderRightColor: COLORS.lightGray },
  actionButtonText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', maxHeight: '70%', backgroundColor: COLORS.cardBg, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
  closeButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  modalContent: { maxHeight: 400 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  modalOptionSelected: { backgroundColor: COLORS.cream },
  modalOptionText: { fontSize: 15, color: COLORS.ink, fontWeight: '500' },
  modalOptionTextSelected: { fontWeight: '700', color: COLORS.primary },
  modalFooter: { borderTopWidth: 1, borderTopColor: COLORS.lightGray, padding: 16, alignItems: 'flex-end' },
  modalDoneButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.secondary },
  modalDoneText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  dottedContainer: { position: 'absolute' },
  dottedRow: { flexDirection: 'row', marginBottom: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
});
