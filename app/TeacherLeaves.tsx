
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const COLORS = {
    primary: '#7A0C2E',
    secondary: '#D4AF37',
    white: '#FFFFFF',
    ink: '#0F172A',
    gray: '#64748B',
    lightGray: '#E2E8F0',
    success: '#10B981',
    error: '#DC2626',
    warning: '#F59E0B',
    background: '#FDF5F7',
};

export default function TeacherLeavesScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('pending'); // 'pending' | 'history'
    const [leaves, setLeaves] = useState<any[]>([]);

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const branchId = await AsyncStorage.getItem('branch_id');
            if (!branchId) {
                alert("Branch ID missing.");
                return;
            }

            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=get_all_teacher_leaves',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ branch_id: branchId }),
                }
            );

            const result = await response.json();
            if (result.status === 'success' && Array.isArray(result.data)) {
                setLeaves(result.data);
            } else {
                setLeaves([]);
            }
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: 'ACTIVE' | 'REJECTED') => {
        try {
            const branchId = await AsyncStorage.getItem('branch_id');

            console.log("Updating Leave Status Payload:", { id, status, branch_id: branchId });

            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=update_teacher_leave_status',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: id,
                        status: status,
                        branch_id: branchId
                    }),
                }
            );

            const result = await response.json();
            if (result.status === 'success') {
                Alert.alert('Success', `Leave request ${status.toLowerCase()}.`);
                fetchLeaves(); // Refresh list
            } else {
                Alert.alert('Error', result.message || 'Failed to update status.');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error.');
        }
    };

    const filteredLeaves = leaves.filter(item => {
        if (selectedTab === 'pending') return item.status === 'PENDING';
        return item.status !== 'PENDING';
    });

    const renderItem = ({ item }: { item: any }) => {
        const isPending = item.status === 'PENDING';
        const statusColor = item.status === 'ACTIVE' ? COLORS.success : item.status === 'REJECTED' ? COLORS.error : COLORS.warning;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                    </View>
                </View>

                <Text style={styles.dates}>
                    {item.from_date} to {item.to_date} ({item.total_days} days)
                </Text>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reason}>{item.reason}</Text>

                {isPending && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                            onPress={() => handleUpdateStatus(item.id, 'ACTIVE')}
                        >
                            <Ionicons name="checkmark" size={18} color={COLORS.white} />
                            <Text style={styles.actionText}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: COLORS.error }]}
                            onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
                        >
                            <Ionicons name="close" size={18} color={COLORS.white} />
                            <Text style={styles.actionText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Leave Applications</Text>
                <TouchableOpacity onPress={fetchLeaves} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={20} color={COLORS.white} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'pending' && styles.activeTab]}
                    onPress={() => setSelectedTab('pending')}
                >
                    <Text style={[styles.tabText, selectedTab === 'pending' && styles.activeTabText]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
                    onPress={() => setSelectedTab('history')}
                >
                    <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>History</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={filteredLeaves}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLeaves(); }} colors={[COLORS.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="layers-outline" size={48} color={COLORS.lightGray} />
                        <Text style={styles.emptyText}>No {selectedTab} leaves found.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        height: 100,
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 40
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
    backButton: { padding: 8 },
    refreshButton: { padding: 8 },

    tabContainer: { flexDirection: 'row', backgroundColor: COLORS.white, margin: 16, borderRadius: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: COLORS.primary },
    tabText: { color: COLORS.gray, fontWeight: '600' },
    activeTabText: { color: COLORS.white },

    listContent: { padding: 16, paddingTop: 0 },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    name: { fontSize: 16, fontWeight: 'bold', color: COLORS.ink },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold' },

    dates: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginBottom: 8 },
    reasonLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
    reason: { fontSize: 14, color: COLORS.ink, fontStyle: 'italic', marginBottom: 12 },

    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 10 },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, gap: 6 },
    actionText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },

    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: COLORS.gray },
});
