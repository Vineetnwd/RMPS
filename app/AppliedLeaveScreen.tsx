import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
import { SafeAreaView } from 'react-native-safe-area-context';

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
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#DC2626',
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

export default function AdminLeaveListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<any[]>([]);
  const [error, setError] = useState<string | null>('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

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

  useEffect(() => { checkAdminAccess(); }, []);
  useEffect(() => { filterLeaves(); }, [selectedFilter, searchQuery, leaves]);

  const checkAdminAccess = async () => {
    try {
      const userType = await AsyncStorage.getItem('user_type');
      const storedUserId = await AsyncStorage.getItem('user_id');
      setUserId(storedUserId);
      if (userType !== 'ADMIN' && userType !== 'DEV') { Alert.alert('Access Denied', 'This section is only for administrators.'); router.back(); return; }
      fetchLeaveApplications();
    } catch (err) { router.back(); }
  };

  const fetchLeaveApplications = async () => {
    try {
      setLoading(true); setError('');
      const branchId = await AsyncStorage.getItem('branch_id');
      const response = await fetch('https://rmpublicschool.org/binex/api.php?task=leave_applied', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch_id: branchId ? parseInt(branchId) : null }) });
      const result = await response.json();
      if (result.status === 'success' && result.data && Array.isArray(result.data)) {
        const sortedLeaves = result.data.sort((a: any, b: any) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime());
        setLeaves(sortedLeaves);
        await AsyncStorage.setItem('cached_admin_leaves', JSON.stringify(sortedLeaves));
      };//else { setError('No leave applications found'); setLeaves([]); }
    } catch (err) {
      setError('Failed to load leave applications');
      try { const cachedData = await AsyncStorage.getItem('cached_admin_leaves'); if (cachedData) { setLeaves(JSON.parse(cachedData)); setError('Showing cached data. Network error occurred.'); } } catch (cacheErr) { }
    } finally { setLoading(false); setRefreshing(false); }
  };

  const filterLeaves = () => {
    let filtered = leaves;
    if (selectedFilter !== 'all') filtered = filtered.filter((leave: any) => (leave.status || 'PENDING').toLowerCase() === selectedFilter.toLowerCase());
    if (searchQuery.trim()) filtered = filtered.filter((leave: any) => leave.student_id?.toString().toLowerCase().includes(searchQuery.toLowerCase()) || leave.cause?.toLowerCase().includes(searchQuery.toLowerCase()) || (leave.student_name && leave.student_name.toLowerCase().includes(searchQuery.toLowerCase())));
    setFilteredLeaves(filtered);
  };

  const onRefresh = () => { setRefreshing(true); fetchLeaveApplications(); };

  const handleStatusUpdate = async (leaveId: string, newStatus: string) => {
    try {
      const currentUserId = userId || await AsyncStorage.getItem('user_id');
      const branchId = await AsyncStorage.getItem('branch_id');
      const response = await fetch('https://rmpublicschool.org/binex/api.php?task=leave_update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: leaveId, status: newStatus, remarks: remarks || '', updated_by: currentUserId, branch_id: branchId ? parseInt(branchId) : null }) });
      const result = await response.json();
      if (result.status === 'success') { Alert.alert('Success', `Leave ${newStatus.toLowerCase()} successfully!`); setModalVisible(false); setRemarks(''); setSelectedLeave(null); fetchLeaveApplications(); }
      else Alert.alert('Error', result.msg || 'Failed to update leave status');
    } catch (err) { Alert.alert('Error', 'Network error occurred'); }
  };

  const openUpdateModal = (leave: any) => { setSelectedLeave(leave); setModalVisible(true); };
  const formatDate = (dateString: string) => { const date = new Date(dateString); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
  const calculateDays = (fromDate: string, toDate: string) => { const from = new Date(fromDate); const to = new Date(toDate); const diffTime = Math.abs(to.getTime() - from.getTime()); return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; };
  const getStatusColor = (status: string) => { switch (status?.toUpperCase()) { case 'APPROVED': return COLORS.approved; case 'REJECTED': return COLORS.rejected; default: return COLORS.pending; } };
  const getStatusIcon = (status: string) => { switch (status?.toUpperCase()) { case 'APPROVED': return 'checkmark-circle'; case 'REJECTED': return 'close-circle'; default: return 'time'; } };

  const stats = { total: leaves.length, pending: leaves.filter((l: any) => !l.status || l.status === 'PENDING').length, approved: leaves.filter((l: any) => l.status === 'APPROVED').length, rejected: leaves.filter((l: any) => l.status === 'REJECTED').length };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoCircle}><Ionicons name="calendar" size={40} color={COLORS.primary} /></View>
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
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
            <View style={styles.headerTitleContainer}><Text style={styles.headerTitle}>Leave Applications</Text><Text style={styles.headerSubtitle}>Manage student leaves</Text></View>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}><Ionicons name="refresh" size={20} color={COLORS.white} /></TouchableOpacity>
          </View>

          <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.statCard, styles.totalCard]}><View style={styles.statIconContainer}><Ionicons name="documents" size={18} color={COLORS.primary} /></View><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></View>
            <View style={[styles.statCard, styles.pendingCard]}><View style={styles.statIconContainer}><Ionicons name="time" size={18} color={COLORS.pending} /></View><Text style={styles.statValue}>{stats.pending}</Text><Text style={styles.statLabel}>Pending</Text></View>
            <View style={[styles.statCard, styles.approvedCard]}><View style={styles.statIconContainer}><Ionicons name="checkmark-circle" size={18} color={COLORS.approved} /></View><Text style={styles.statValue}>{stats.approved}</Text><Text style={styles.statLabel}>Approved</Text></View>
            <View style={[styles.statCard, styles.rejectedCard]}><View style={styles.statIconContainer}><Ionicons name="close-circle" size={18} color={COLORS.rejected} /></View><Text style={styles.statValue}>{stats.rejected}</Text><Text style={styles.statLabel}>Rejected</Text></View>
          </Animated.View>

          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}><Ionicons name="search" size={18} color={COLORS.gray} /></View>
            <TextInput style={styles.searchInput} placeholder="Search by student ID or reason..." placeholderTextColor={COLORS.gray} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={COLORS.gray} /></TouchableOpacity> : null}
          </View>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FilterButton title="All" active={selectedFilter === 'all'} onPress={() => setSelectedFilter('all')} count={leaves.length} />
        <FilterButton title="Pending" active={selectedFilter === 'pending'} onPress={() => setSelectedFilter('pending')} count={stats.pending} />
        <FilterButton title="Approved" active={selectedFilter === 'approved'} onPress={() => setSelectedFilter('approved')} count={stats.approved} />
        <FilterButton title="Rejected" active={selectedFilter === 'rejected'} onPress={() => setSelectedFilter('rejected')} count={stats.rejected} />
      </View>

      {error ? <View style={styles.errorBanner}><Ionicons name="information-circle" size={16} color={COLORS.warning} /><Text style={styles.errorBannerText}>{error}</Text></View> : null}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {filteredLeaves.length === 0 ? (
          <View style={styles.emptyContainer}><View style={styles.emptyIconContainer}><Ionicons name="document-text-outline" size={50} color={COLORS.lightGray} /></View><Text style={styles.emptyTitle}>{searchQuery ? 'No Matching Applications' : 'No Leave Applications'}</Text><Text style={styles.emptyText}>Try adjusting your search or filters</Text></View>
        ) : (
          filteredLeaves.map((leave: any) => <LeaveCard key={leave.id} leave={leave} formatDate={formatDate} calculateDays={calculateDays} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} openUpdateModal={openUpdateModal} />)
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}><View style={styles.modalTitleContainer}><Ionicons name="create" size={22} color={COLORS.primary} /><Text style={styles.modalTitle}>Update Leave Status</Text></View><TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}><Ionicons name="close" size={22} color={COLORS.gray} /></TouchableOpacity></View>
            {selectedLeave && (
              <View style={styles.modalBody}>
                <View style={styles.leaveInfoModal}><View style={styles.modalLabelContainer}><Ionicons name="person" size={16} color={COLORS.secondary} /><Text style={styles.modalLabel}>Student ID</Text></View><Text style={styles.modalValue}>{selectedLeave.student_id}</Text></View>
                <View style={styles.leaveInfoModal}><View style={styles.modalLabelContainer}><Ionicons name="calendar" size={16} color={COLORS.secondary} /><Text style={styles.modalLabel}>Duration</Text></View><Text style={styles.modalValue}>{formatDate(selectedLeave.from_date)} - {formatDate(selectedLeave.to_date)}</Text></View>
                <View style={styles.leaveInfoModal}><View style={styles.modalLabelContainer}><Ionicons name="document-text" size={16} color={COLORS.secondary} /><Text style={styles.modalLabel}>Reason</Text></View><Text style={styles.modalValueReason}>{selectedLeave.cause}</Text></View>
                <View style={styles.remarksContainer}><Text style={styles.remarksLabel}>Remarks (Optional)</Text><TextInput style={styles.remarksInput} placeholder="Add any remarks or notes..." placeholderTextColor={COLORS.gray} multiline numberOfLines={3} value={remarks} onChangeText={setRemarks} /></View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.approveButton]} onPress={() => { Alert.alert('Approve Leave', 'Are you sure you want to approve this leave application?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Approve', onPress: () => handleStatusUpdate(selectedLeave.id, 'APPROVED') }]); }}><Ionicons name="checkmark-circle" size={20} color={COLORS.white} /><Text style={styles.modalButtonText}>Approve</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.rejectButton]} onPress={() => { Alert.alert('Reject Leave', 'Are you sure you want to reject this leave application?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reject', style: 'destructive', onPress: () => handleStatusUpdate(selectedLeave.id, 'REJECTED') }]); }}><Ionicons name="close-circle" size={20} color={COLORS.white} /><Text style={styles.modalButtonText}>Reject</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterButton({ title, active, onPress, count }: { title: string; active: boolean; onPress: () => void; count: number }) {
  return (
    <TouchableOpacity style={[styles.filterButton, active && styles.filterButtonActive]} onPress={onPress}>
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>{title}</Text>
      {count > 0 && <View style={[styles.countBadge, active && styles.countBadgeActive]}><Text style={[styles.countText, active && styles.countTextActive]}>{count}</Text></View>}
    </TouchableOpacity>
  );
}

function LeaveCard({ leave, formatDate, calculateDays, getStatusColor, getStatusIcon, openUpdateModal }: any) {
  const [expanded, setExpanded] = useState(false);
  const status = leave.status || 'PENDING';
  const statusColor = getStatusColor(status);
  const days = calculateDays(leave.from_date, leave.to_date);

  return (
    <Animated.View style={styles.leaveCard}>
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded(!expanded)} style={styles.leaveContent}>
        <View style={styles.leaveHeader}>
          <View style={[styles.studentIcon, { backgroundColor: statusColor + '20' }]}><Ionicons name="person" size={22} color={statusColor} /></View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentId}>Student ID: {leave.student_id}</Text>
            <View style={styles.dateRow}><Ionicons name="calendar-outline" size={14} color={COLORS.gray} /><Text style={styles.dateText}>{formatDate(leave.from_date)} - {formatDate(leave.to_date)}</Text></View>
            <View style={styles.daysRow}><Ionicons name="time-outline" size={14} color={COLORS.secondary} /><Text style={styles.daysText}>{days} {days === 1 ? 'day' : 'days'}</Text></View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}><Ionicons name={getStatusIcon(status)} size={14} color={statusColor} /><Text style={[styles.statusText, { color: statusColor }]}>{status}</Text></View>
        </View>
        {expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.reasonSection}><Text style={styles.reasonLabel}>Reason for Leave</Text><Text style={styles.reasonText}>{leave.cause}</Text></View>
            {leave.remarks ? <View style={styles.remarksSection}><Text style={styles.remarksLabelCard}>Admin Remarks</Text><Text style={styles.remarksTextCard}>{leave.remarks}</Text></View> : null}
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.expandButtonCard} onPress={() => setExpanded(!expanded)}><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.secondary} /><Text style={styles.expandButtonText}>{expanded ? 'Show Less' : 'View Details'}</Text></TouchableOpacity>
        {status === 'PENDING' && <TouchableOpacity style={styles.updateButton} onPress={() => openUpdateModal(leave)}><Ionicons name="create" size={18} color={COLORS.white} /><Text style={styles.updateButtonText}>Update</Text></TouchableOpacity>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.secondary },
  loadingText: { marginTop: 20, fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  header: { backgroundColor: COLORS.primary, paddingTop: 10, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  headerDecorations: { ...StyleSheet.absoluteFillObject },
  headerBlob: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.secondary, opacity: 0.12, top: -40, right: -50 },
  headerRing: { position: 'absolute', top: 30, left: -30 },
  headerDiamond1: { position: 'absolute', top: 80, right: 60 },
  headerDiamond2: { position: 'absolute', top: 120, right: 100 },
  headerDots: { position: 'absolute', bottom: 140, left: 30 },
  headerContent: { paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  refreshButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, fontWeight: '500' },
  statsRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  totalCard: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  pendingCard: { borderLeftWidth: 3, borderLeftColor: COLORS.pending },
  approvedCard: { borderLeftWidth: 3, borderLeftColor: COLORS.approved },
  rejectedCard: { borderLeftWidth: 3, borderLeftColor: COLORS.rejected },
  statIconContainer: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  statLabel: { fontSize: 10, color: COLORS.gray, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  searchIconContainer: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 8, backgroundColor: COLORS.background },
  filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, backgroundColor: COLORS.cardBg, gap: 6, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.secondary },
  filterButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
  filterButtonTextActive: { color: COLORS.white },
  countBadge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  countBadgeActive: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  countText: { fontSize: 10, fontWeight: '700', color: COLORS.ink },
  countTextActive: { color: COLORS.white },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cream, padding: 14, marginHorizontal: 20, marginBottom: 10, borderRadius: 14, gap: 12, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)' },
  errorBannerText: { flex: 1, fontSize: 13, color: COLORS.warning, fontWeight: '500' },
  scrollView: { flex: 1, paddingHorizontal: 20, backgroundColor: COLORS.background },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 30, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.gray },
  leaveCard: { backgroundColor: COLORS.cardBg, borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)' },
  statusBar: { height: 4 },
  leaveContent: { padding: 16 },
  leaveHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  studentIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  studentInfo: { flex: 1 },
  studentId: { fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dateText: { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  daysText: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  expandedContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  reasonSection: { backgroundColor: COLORS.cream, padding: 14, borderRadius: 14, marginBottom: 12 },
  reasonLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  reasonText: { fontSize: 14, color: COLORS.gray, lineHeight: 22 },
  remarksSection: { backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 14, borderRadius: 14 },
  remarksLabelCard: { fontSize: 13, fontWeight: '700', color: COLORS.warning, marginBottom: 8 },
  remarksTextCard: { fontSize: 14, color: COLORS.gray, lineHeight: 22 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  expandButtonCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  expandButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.secondary },
  updateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: COLORS.primary, gap: 8, borderLeftWidth: 1, borderLeftColor: COLORS.lightGray },
  updateButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%' },
  modalHandle: { width: 40, height: 5, backgroundColor: COLORS.lightGray, borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
  modalCloseButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20 },
  leaveInfoModal: { marginBottom: 16 },
  modalLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  modalLabel: { fontSize: 13, color: COLORS.gray, fontWeight: '600' },
  modalValue: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginLeft: 24 },
  modalValueReason: { fontSize: 15, color: COLORS.gray, lineHeight: 24, marginLeft: 24 },
  remarksContainer: { marginTop: 8, marginBottom: 20 },
  remarksLabel: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  remarksInput: { backgroundColor: COLORS.cream, borderRadius: 14, padding: 14, fontSize: 14, color: COLORS.ink, minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  approveButton: { backgroundColor: COLORS.success },
  rejectButton: { backgroundColor: COLORS.error },
  modalButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  dottedContainer: { position: 'absolute' },
  dottedRow: { flexDirection: 'row', marginBottom: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
});