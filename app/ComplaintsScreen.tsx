import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
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
  background: '#FDF5F7',
  cream: '#FFF5EC',
  cardBg: '#FFFFFF',
  active: '#F59E0B',
  resolved: '#10B981',
  closed: '#64748B',
};

const COMPLAINT_COLORS = ['#7A0C2E', '#D4AF37', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6'];

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

export default function AdminComplaintListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [response, setResponse] = useState('');

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
  useEffect(() => { filterComplaints(); }, [selectedFilter, searchQuery, complaints]);

  const checkAdminAccess = async () => {
    const userType = await AsyncStorage.getItem('user_type');
    if (userType !== 'ADMIN' && userType !== 'DEV') { Alert.alert('Access Denied', 'This section is only for administrators.'); router.back(); return; }
    fetchComplaints();
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true); setError('');
      const userType = await AsyncStorage.getItem('user_type');
      const branchId = await AsyncStorage.getItem('branch_id');
      const apiResponse = await fetch('https://rmpublicschool.org/binex/api.php?task=complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_type: userType, branch_id: branchId ? parseInt(branchId) : null }) });
      const result = await apiResponse.json();
    } catch (err) {
      setError('Failed to load complaints');
      try { const cachedData = await AsyncStorage.getItem('cached_admin_complaints'); if (cachedData) { setComplaints(JSON.parse(cachedData)); setError('Showing cached data.'); } } catch (cacheErr) { }
    } finally { setLoading(false); setRefreshing(false); }
  };

  const filterComplaints = () => {
    let filtered = complaints;
    if (selectedFilter !== 'all') filtered = filtered.filter((complaint: any) => complaint.status.toLowerCase() === selectedFilter.toLowerCase());
    if (searchQuery.trim()) filtered = filtered.filter((complaint: any) => complaint.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || complaint.complaint.toLowerCase().includes(searchQuery.toLowerCase()) || complaint.complaint_to.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredComplaints(filtered);
  };

  const onRefresh = () => { setRefreshing(true); fetchComplaints(); };

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    setModalVisible(false);
    const updatedComplaints = complaints.map((complaint: any) => complaint.id === complaintId ? { ...complaint, status: newStatus, response: response || '' } : complaint);
    setComplaints(updatedComplaints);
    try {
      const adminId = await AsyncStorage.getItem('user_id');
      const branchId = await AsyncStorage.getItem('branch_id');
      const apiResponse = await fetch('https://rmpublicschool.org/binex/api.php?task=update_complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: complaintId, status: newStatus, response: response || '', updated_by: adminId || '0', branch_id: branchId ? parseInt(branchId) : null }) });
      const result = await apiResponse.json();
      if (result.status === 'success') { Alert.alert('Success', `Complaint ${newStatus.toLowerCase()} successfully!`); setResponse(''); setSelectedComplaint(null); setTimeout(() => fetchComplaints(), 1000); }
      else { Alert.alert('Error', result.msg || 'Failed to update'); fetchComplaints(); }
    } catch (err) { Alert.alert('Error', 'Network error'); fetchComplaints(); }
  };

  const openUpdateModal = (complaint: any) => { setSelectedComplaint(complaint); setResponse(''); setModalVisible(true); };
  const handleCall = (mobile: string) => { if (mobile) Linking.openURL(`tel:${mobile}`).catch(() => Alert.alert('Error', 'Unable to make a call')); };
  const getStatusColor = (status: string) => { switch (status?.toUpperCase()) { case 'ACTIVE': return COLORS.active; case 'RESOLVED': return COLORS.resolved; case 'CLOSED': return COLORS.closed; default: return COLORS.active; } };
  const getStatusIcon = (status: string) => { switch (status?.toUpperCase()) { case 'ACTIVE': return 'alert-circle'; case 'RESOLVED': return 'checkmark-circle'; case 'CLOSED': return 'close-circle'; default: return 'alert-circle'; } };
  const getComplaintColor = (index: number) => COMPLAINT_COLORS[index % COMPLAINT_COLORS.length];

  const stats = { total: complaints.length, active: complaints.filter((c: any) => c.status === 'ACTIVE').length, resolved: complaints.filter((c: any) => c.status === 'RESOLVED').length, closed: complaints.filter((c: any) => c.status === 'CLOSED').length };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoCircle}><Ionicons name="chatbubbles" size={40} color={COLORS.primary} /></View>
        <Text style={styles.loadingText}>Loading complaints...</Text>
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
            <View style={styles.headerTitleContainer}><Text style={styles.headerTitle}>Complaints</Text><Text style={styles.headerSubtitle}>Manage student concerns</Text></View>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}><Ionicons name="refresh" size={20} color={COLORS.white} /></TouchableOpacity>
          </View>

          <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.statCard, styles.totalCard]}><View style={styles.statIconContainer}><Ionicons name="chatbubbles" size={18} color={COLORS.primary} /></View><Text style={styles.statValue}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></View>
            <View style={[styles.statCard, styles.activeCard]}><View style={styles.statIconContainer}><Ionicons name="alert-circle" size={18} color={COLORS.active} /></View><Text style={styles.statValue}>{stats.active}</Text><Text style={styles.statLabel}>Active</Text></View>
            <View style={[styles.statCard, styles.resolvedCard]}><View style={styles.statIconContainer}><Ionicons name="checkmark-circle" size={18} color={COLORS.resolved} /></View><Text style={styles.statValue}>{stats.resolved}</Text><Text style={styles.statLabel}>Resolved</Text></View>
            <View style={[styles.statCard, styles.closedCard]}><View style={styles.statIconContainer}><Ionicons name="close-circle" size={18} color={COLORS.closed} /></View><Text style={styles.statValue}>{stats.closed}</Text><Text style={styles.statLabel}>Closed</Text></View>
          </Animated.View>

          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}><Ionicons name="search" size={18} color={COLORS.gray} /></View>
            <TextInput style={styles.searchInput} placeholder="Search by name, class or complaint..." placeholderTextColor={COLORS.gray} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={COLORS.gray} /></TouchableOpacity> : null}
          </View>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FilterButton title="All" active={selectedFilter === 'all'} onPress={() => setSelectedFilter('all')} count={complaints.length} />
        <FilterButton title="Active" active={selectedFilter === 'active'} onPress={() => setSelectedFilter('active')} count={stats.active} />
        <FilterButton title="Resolved" active={selectedFilter === 'resolved'} onPress={() => setSelectedFilter('resolved')} count={stats.resolved} />
        <FilterButton title="Closed" active={selectedFilter === 'closed'} onPress={() => setSelectedFilter('closed')} count={stats.closed} />
      </View>

      {error ? <View style={styles.errorBanner}><Ionicons name="information-circle" size={16} color={COLORS.warning} /><Text style={styles.errorBannerText}>{error}</Text></View> : null}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {filteredComplaints.length === 0 ? (
          <View style={styles.emptyContainer}><View style={styles.emptyIconContainer}><Ionicons name="chatbubbles-outline" size={50} color={COLORS.lightGray} /></View><Text style={styles.emptyTitle}>{searchQuery ? 'No Matching Complaints' : 'No Complaints Found'}</Text><Text style={styles.emptyText}>Try adjusting your search or filters</Text></View>
        ) : (
          filteredComplaints.map((complaint: any, index: number) => <ComplaintCard key={complaint.id} complaint={complaint} index={index} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} getComplaintColor={getComplaintColor} openUpdateModal={openUpdateModal} handleCall={handleCall} />)
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}><View style={styles.modalTitleContainer}><Ionicons name="create" size={22} color={COLORS.primary} /><Text style={styles.modalTitle}>Update Complaint</Text></View><TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}><Ionicons name="close" size={22} color={COLORS.gray} /></TouchableOpacity></View>
            {selectedComplaint && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.studentCard}>
                  <View style={styles.studentCardHeader}><View style={styles.studentCardIcon}><Ionicons name="person" size={18} color={COLORS.primary} /></View><Text style={styles.studentCardTitle}>Student Information</Text></View>
                  <View style={styles.studentCardRow}><Text style={styles.modalLabel}>Name</Text><Text style={styles.modalValue}>{selectedComplaint.student_name}</Text></View>
                  <View style={styles.studentCardRow}><Text style={styles.modalLabel}>Class</Text><Text style={styles.modalValue}>{selectedComplaint.student_class} - {selectedComplaint.student_section}</Text></View>
                  <View style={styles.studentCardRow}><Text style={styles.modalLabel}>Roll No</Text><Text style={styles.modalValue}>{selectedComplaint.student_roll}</Text></View>
                  <View style={styles.studentCardRow}><Text style={styles.modalLabel}>Mobile</Text><TouchableOpacity onPress={() => handleCall(selectedComplaint.student_mobile)}><Text style={styles.mobileValue}><Ionicons name="call" size={14} color={COLORS.secondary} /> {selectedComplaint.student_mobile}</Text></TouchableOpacity></View>
                </View>
                <View style={styles.complaintInfoModal}><View style={styles.modalLabelContainer}><Ionicons name="arrow-forward" size={16} color={COLORS.secondary} /><Text style={styles.modalLabel}>Complaint To</Text></View><Text style={styles.modalValueTo}>{selectedComplaint.complaint_to}</Text></View>
                <View style={styles.complaintInfoModal}><View style={styles.modalLabelContainer}><Ionicons name="document-text" size={16} color={COLORS.secondary} /><Text style={styles.modalLabel}>Complaint</Text></View><Text style={styles.modalValueComplaint}>{selectedComplaint.complaint}</Text></View>
                <View style={styles.responseContainer}><Text style={styles.responseLabel}>Admin Response</Text><TextInput style={styles.responseInput} placeholder="Add your response or notes..." placeholderTextColor={COLORS.gray} multiline numberOfLines={4} value={response} onChangeText={setResponse} /></View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, styles.resolveButton]} onPress={() => Alert.alert('Resolve', 'Mark as resolved?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Resolve', onPress: () => handleStatusUpdate(selectedComplaint.id, 'RESOLVED') }])}><Ionicons name="checkmark-circle" size={20} color={COLORS.white} /><Text style={styles.modalButtonText}>Resolve</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.closeComplaintButton]} onPress={() => Alert.alert('Close', 'Close this complaint?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Close', style: 'destructive', onPress: () => handleStatusUpdate(selectedComplaint.id, 'CLOSED') }])}><Ionicons name="close-circle" size={20} color={COLORS.white} /><Text style={styles.modalButtonText}>Close</Text></TouchableOpacity>
                </View>
              </ScrollView>
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

function ComplaintCard({ complaint, index, getStatusColor, getStatusIcon, getComplaintColor, openUpdateModal, handleCall }: any) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = getStatusColor(complaint.status);
  const complaintColor = getComplaintColor(index);

  return (
    <Animated.View style={styles.complaintCard}>
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded(!expanded)} style={styles.complaintContent}>
        <View style={styles.complaintHeader}>
          <View style={[styles.studentIcon, { backgroundColor: complaintColor + '20' }]}><Ionicons name="person" size={22} color={complaintColor} /></View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{complaint.student_name}</Text>
            <View style={styles.infoRow}><Ionicons name="school-outline" size={14} color={COLORS.gray} /><Text style={styles.classText}>Class {complaint.student_class}-{complaint.student_section} • Roll {complaint.student_roll}</Text></View>
            <View style={styles.infoRow}><Ionicons name="arrow-forward" size={14} color={COLORS.secondary} /><Text style={styles.complaintTo}>To: {complaint.complaint_to}</Text></View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}><Ionicons name={getStatusIcon(complaint.status)} size={14} color={statusColor} /><Text style={[styles.statusText, { color: statusColor }]}>{complaint.status}</Text></View>
        </View>
        <View style={styles.complaintPreview}><Text style={styles.complaintText} numberOfLines={expanded ? undefined : 2}>{complaint.complaint}</Text></View>
        {expanded && (
          <View style={styles.expandedContent}>
            <TouchableOpacity style={styles.contactButton} onPress={() => handleCall(complaint.student_mobile)}><Ionicons name="call" size={16} color={COLORS.secondary} /><Text style={styles.contactText}>{complaint.student_mobile}</Text></TouchableOpacity>
            {complaint.response && <View style={styles.responseSection}><Text style={styles.responseLabelCard}>Admin Response</Text><Text style={styles.responseTextCard}>{complaint.response}</Text></View>}
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.expandButtonCard} onPress={() => setExpanded(!expanded)}><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.secondary} /><Text style={styles.expandButtonText}>{expanded ? 'Show Less' : 'View Details'}</Text></TouchableOpacity>
        {complaint.status === 'ACTIVE' && <TouchableOpacity style={styles.updateButton} onPress={() => openUpdateModal(complaint)}><Ionicons name="create" size={18} color={COLORS.white} /><Text style={styles.updateButtonText}>Update</Text></TouchableOpacity>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF5F7' },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.secondary },
  loadingText: { marginTop: 10, fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  header: { backgroundColor: COLORS.primary, paddingTop: 10, paddingBottom: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
  headerDecorations: { ...StyleSheet.absoluteFillObject },
  headerBlob: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.secondary, opacity: 0.12, top: -40, right: -50 },
  headerRing: { position: 'absolute', top: 30, left: -30 },
  headerDiamond1: { position: 'absolute', top: 80, right: 60 },
  headerDiamond2: { position: 'absolute', top: 120, right: 100 },
  headerDots: { position: 'absolute', bottom: 140, left: 30 },
  headerContent: { paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  refreshButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, fontWeight: '500' },
  statsRow: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#FDF5F7', borderRadius: 10, padding: 10, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  totalCard: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  activeCard: { borderLeftWidth: 3, borderLeftColor: COLORS.active },
  resolvedCard: { borderLeftWidth: 3, borderLeftColor: COLORS.resolved },
  closedCard: { borderLeftWidth: 3, borderLeftColor: COLORS.closed },
  statIconContainer: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  statLabel: { fontSize: 10, color: COLORS.gray, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF5F7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  searchIconContainer: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 12, color: COLORS.ink },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 16, gap: 8, backgroundColor: '#FDF5F7' },
  filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, backgroundColor: '#FDF5F7', gap: 4, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  filterButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.secondary },
  filterButtonText: { fontSize: 11, fontWeight: '600', color: COLORS.gray },
  filterButtonTextActive: { color: COLORS.white },
  countBadge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  countBadgeActive: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  countText: { fontSize: 10, fontWeight: '700', color: COLORS.ink },
  countTextActive: { color: COLORS.white },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9F0', padding: 10, marginHorizontal: 20, marginBottom: 10, borderRadius: 10, gap: 8, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)' },
  errorBannerText: { flex: 1, fontSize: 12, color: COLORS.warning, fontWeight: '500' },
  scrollView: { flex: 1, paddingHorizontal: 14, backgroundColor: '#FDF5F7' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 30, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 12, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
  emptyText: { fontSize: 12, color: COLORS.gray },
  complaintCard: { backgroundColor: '#FDF5F7', borderRadius: 10, marginBottom: 8, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)' },
  statusBar: { height: 4 },
  complaintContent: { padding: 16 },
  complaintHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  studentIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  classText: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
  complaintTo: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  complaintPreview: { backgroundColor: '#FFF9F0', padding: 10, borderRadius: 14 },
  complaintText: { fontSize: 12, color: COLORS.gray, lineHeight: 22 },
  expandedContent: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  contactButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212, 175, 55, 0.15)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 8, alignSelf: 'flex-start', marginBottom: 12 },
  contactText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  responseSection: { backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 10, borderRadius: 14 },
  responseLabelCard: { fontSize: 12, fontWeight: '700', color: COLORS.success, marginBottom: 8 },
  responseTextCard: { fontSize: 12, color: COLORS.gray, lineHeight: 22 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  expandButtonCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8 },
  expandButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  updateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: COLORS.primary, gap: 8, borderLeftWidth: 1, borderLeftColor: COLORS.lightGray },
  updateButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#FDF5F7', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  modalHandle: { width: 40, height: 5, backgroundColor: COLORS.lightGray, borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  modalCloseButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20 },
  studentCard: { backgroundColor: '#FFF9F0', borderRadius: 12, padding: 10, marginBottom: 16 },
  studentCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  studentCardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(122, 12, 46, 0.1)', justifyContent: 'center', alignItems: 'center' },
  studentCardTitle: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  studentCardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  complaintInfoModal: { marginBottom: 16 },
  modalLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modalLabel: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  modalValue: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  modalValueTo: { fontSize: 12, fontWeight: '700', color: COLORS.secondary, marginLeft: 24 },
  mobileValue: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  modalValueComplaint: { fontSize: 12, color: COLORS.gray, lineHeight: 24, marginLeft: 24 },
  responseContainer: { marginTop: 8, marginBottom: 20 },
  responseLabel: { fontSize: 12, fontWeight: '700', color: COLORS.ink, marginBottom: 10 },
  responseInput: { backgroundColor: '#FFF9F0', borderRadius: 10, padding: 10, fontSize: 12, color: COLORS.ink, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)' },
  modalActions: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  modalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 10, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  resolveButton: { backgroundColor: COLORS.success },
  closeComplaintButton: { backgroundColor: COLORS.closed },
  modalButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  dottedContainer: { position: 'absolute' },
  dottedRow: { flexDirection: 'row', marginBottom: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
});