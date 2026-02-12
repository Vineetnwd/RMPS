import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
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

const MONTHS = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

const MONTHS_DISPLAY = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TeacherAttendanceScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    useEffect(() => {
        fetchAttendanceData();
    }, [selectedMonth]);

    const fetchAttendanceData = async () => {
        try {
            setLoading(true);
            const branchId = await AsyncStorage.getItem('branch_id');
            const attMonth = `${MONTHS[selectedMonth.getMonth()]}_${selectedMonth.getFullYear()}`;

            if (!branchId) {
                alert("Branch ID missing.");
                return;
            }

            console.log(`Fetching for ${attMonth}, branch: ${branchId}`);

            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=get_all_teacher_attendance',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        branch_id: branchId,
                        att_month: attMonth
                    }),
                }
            );

            const result = await response.json();
            console.log("Full teacher attendance:", result);

            if (result.status === 'success' && Array.isArray(result.data)) {
                // Calculate summaries if not provided by backend (backend provides it based on my PHP code)
                // But double check PHP response structure.
                // PHP returns data with 'summary' key { present, absent, leave, total }.

                // If PHP code I just wrote is used, data will have 'summary'.
                // However, I should handle missing summary just in case.
                const processedData = result.data.map((item: any) => {
                    // Just in case summary is missing from backend response (dependent on my PHP upload)
                    if (!item.summary) {
                        let present = 0, absent = 0, leave = 0;
                        for (let i = 1; i <= 31; i++) {
                            if (item[`d_${i}`] === 'P') present++;
                            if (item[`d_${i}`] === 'A') absent++;
                            if (item[`d_${i}`] === 'L') leave++;
                        }
                        item.summary = { present, absent, leave, total: present + absent + leave };
                    }
                    return item;
                });

                setAttendanceData(processedData);
                setFilteredData(processedData);
            } else {
                setAttendanceData([]);
                setFilteredData([]);
            }
        } catch (error) {
            console.error('Error fetching teacher attendance:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text) {
            const filtered = attendanceData.filter(item =>
                item.name.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredData(filtered);
        } else {
            setFilteredData(attendanceData);
        }
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedMonth(newDate);
    };

    const renderItem = ({ item }: { item: any }) => {
        const summary = item.summary || { present: 0, absent: 0, leave: 0, total: 0 };
        const totalDays = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
        const attendancePercentage = totalDays > 0 ? ((summary.present / totalDays) * 100).toFixed(0) : 0;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.infoContainer}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.designation}>Rate: {attendancePercentage}%</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: COLORS.success }]}>{summary.present}</Text>
                        <Text style={styles.statLabel}>Present</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: COLORS.error }]}>{summary.absent}</Text>
                        <Text style={styles.statLabel}>Absent</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: COLORS.warning }]}>{summary.leave}</Text>
                        <Text style={styles.statLabel}>Leave</Text>
                    </View>
                </View>

                {/* Mini progress bar */}
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${attendancePercentage}%`, backgroundColor: Number(attendancePercentage) > 75 ? COLORS.success : COLORS.warning }]} />
                </View>
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
                <Text style={styles.headerTitle}>Teacher Attendance</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Month Selector */}
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
                    <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.monthText}>{MONTHS_DISPLAY[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.emp_id?.toString() || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAttendanceData(); }} colors={[COLORS.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people" size={48} color={COLORS.lightGray} />
                            <Text style={styles.emptyText}>No records found for this month.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        height: 100, // Adjusted from 80
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 40 // Safe area
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
    backButton: { padding: 8 },

    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        margin: 16,
        borderRadius: 12,
        padding: 12,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1
    },
    monthButton: { padding: 8, backgroundColor: COLORS.background, borderRadius: 20 },
    monthText: { fontSize: 16, fontWeight: '600', color: COLORS.ink, marginHorizontal: 20 },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: COLORS.lightGray
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 44, color: COLORS.ink },

    listContent: { padding: 16, paddingTop: 0 },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarContainer: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12
    },
    avatarText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
    infoContainer: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: COLORS.ink },
    designation: { fontSize: 13, color: COLORS.gray },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 10 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    statLabel: { fontSize: 12, color: COLORS.gray },

    progressBarBg: { height: 6, backgroundColor: COLORS.lightGray, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%' },

    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: COLORS.gray },
});
