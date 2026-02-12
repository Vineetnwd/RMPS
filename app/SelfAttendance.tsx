import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    white: '#FFFFFF',
    ink: '#0F172A',
    gray: '#64748B',
    lightGray: '#E2E8F0',
    success: '#10B981',
    error: '#DC2626',
    warning: '#F59E0B',
    background: '#FDF5F7',
    cream: '#FFF5EC',
    cardBg: '#FFFFFF',
    present: '#10B981',
    absent: '#DC2626',
    leave: '#F59E0B',
    holiday: '#3B82F6',
};

const MONTHS = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

const MONTHS_DISPLAY = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Vector Shapes
const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }: any) => (
    <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: borderWidth, borderColor: color, backgroundColor: 'transparent' }, style]} />
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

const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }: any) => (
    <View style={[{ width: size, height: size, backgroundColor: color, transform: [{ rotate: '45deg' }] }, style]} />
);

export default function TeacherSelfAttendanceScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [attendanceData, setAttendanceData] = useState<any>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0, holiday: 0, total: 0 });
    const [marking, setMarking] = useState(false);
    const [error, setError] = useState('');

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

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

        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])).start();
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, [selectedMonth]);

    const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const getAttMonthString = (date: Date) => {
        const month = MONTHS[date.getMonth()];
        const year = date.getFullYear();
        return `${month}_${year}`;
    };

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            setError('');
            const empId = await AsyncStorage.getItem('emp_id') || await AsyncStorage.getItem('user_id');
            const branchId = await AsyncStorage.getItem('branch_id');

            if (!empId) {
                Alert.alert('Error', 'Teacher ID not found.');
                return;
            }

            const attMonth = getAttMonthString(selectedMonth);

            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=get_teacher_attendance',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        emp_id: empId,
                        att_month: attMonth,
                        branch_id: branchId ? parseInt(branchId) : null
                    }),
                }
            );

            const result = await response.json();

            if (result.status === 'success' && result.data) {
                setAttendanceData(result.data);
                calculateStats(result.data);
            } else {
                setAttendanceData(null);
                setStats({ present: 0, absent: 0, leave: 0, holiday: 0, total: 0 });
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
            setError('Failed to load attendance');
            setAttendanceData(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleMarkAttendance = async () => {
        try {
            setMarking(true);
            const empId = await AsyncStorage.getItem('emp_id') || await AsyncStorage.getItem('user_id');
            const branchId = await AsyncStorage.getItem('branch_id');
            const today = new Date();
            const day = today.getDate();
            const attMonth = getAttMonthString(today);

            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=mark_self_attendance',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        emp_id: empId,
                        att_month: attMonth,
                        day: day,
                        status: 'P',
                        branch_id: branchId ? parseInt(branchId) : null
                    }),
                }
            );

            const result = await response.json();

            if (result.status === 'success') {
                Alert.alert('Success', 'Attendance marked successfully!');
                // If the selected month is current month, refresh
                if (selectedMonth.getMonth() === today.getMonth() && selectedMonth.getFullYear() === today.getFullYear()) {
                    fetchAttendance();
                }
            } else {
                Alert.alert('Error', result.message || 'Failed to mark attendance.');
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            Alert.alert('Error', 'Network request failed.');
        } finally {
            setMarking(false);
        }
    };

    const calculateStats = (data: any) => {
        if (!data) return;
        let present = 0, absent = 0, leave = 0, holiday = 0, total = 0;
        const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const day = data[`d_${i}`];
            if (day !== null && day !== undefined && day !== '') {
                total++;
                if (day === 'P') present++;
                else if (day === 'A') absent++;
                else if (day === 'L') leave++;
                else if (day === 'H') holiday++;
            }
        }
        setStats({ present, absent, leave, holiday, total });
    };

    const handleMonthChange = (direction: number) => {
        const newMonth = new Date(selectedMonth);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setSelectedMonth(newMonth);
    };

    const getAttendanceColor = (status: string) => {
        if (!status) return COLORS.lightGray;
        switch (status.toUpperCase()) {
            case 'P': return COLORS.present;
            case 'A': return COLORS.absent;
            case 'L': return COLORS.leave;
            case 'H': return COLORS.holiday;
            default: return COLORS.lightGray;
        }
    };

    const getAttendanceLabel = (status: string) => {
        if (!status) return '';
        return status.toUpperCase();
    };

    const getAttendancePercentage = () => {
        if (stats.total === 0) return 0;
        return ((stats.present / stats.total) * 100).toFixed(1);
    };

    const renderCalendar = () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const key = `d_${i}`;
            const status = attendanceData ? attendanceData[key] : null;
            const isToday = i === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

            days.push(
                <View key={i} style={styles.dayCell}>
                    <View style={[
                        styles.dayContent,
                        { backgroundColor: getAttendanceColor(status) },
                        isToday && styles.today
                    ]}>
                        <Text style={[
                            styles.dayNumber,
                            status && styles.dayNumberWithStatus,
                            isToday && styles.todayText
                        ]}>{i}</Text>
                        {status && (
                            <Text style={styles.attendanceStatus}>{getAttendanceLabel(status)}</Text>
                        )}
                    </View>
                </View>
            );
        }
        return days;
    };

    const today = new Date();
    const isCurrentMonth = selectedMonth.getMonth() === today.getMonth() && selectedMonth.getFullYear() === today.getFullYear();
    const todayStatus = attendanceData ? attendanceData[`d_${today.getDate()}`] : null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerDecorations} pointerEvents="none">
                    <Animated.View style={[styles.headerBlob, { transform: [{ translateY: floatTranslate }] }]} />
                    <Animated.View style={[styles.headerRing, { transform: [{ rotate }] }]}>
                        <CircleRing size={80} borderWidth={2} color="rgba(212, 175, 55, 0.25)" />
                    </Animated.View>
                    <DiamondShape style={styles.headerDiamond1} color="rgba(212, 175, 55, 0.4)" size={14} />
                    <DottedPattern style={styles.headerDots} rows={2} cols={4} dotColor="rgba(255, 255, 255, 0.3)" />
                </View>

                <View style={styles.headerContent}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Self Attendance</Text>
                            <Text style={styles.headerSubtitle}>Manage your attendance</Text>
                        </View>
                        <TouchableOpacity style={styles.refreshButton} onPress={fetchAttendance}>
                            <Ionicons name="refresh" size={22} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    {/* Stats Cards */}
                    <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.present} />
                            </View>
                            <Text style={styles.statValue}>{stats.present}</Text>
                            <Text style={styles.statLabel}>Present</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: 'rgba(220, 38, 38, 0.2)' }]}>
                                <Ionicons name="close-circle" size={20} color={COLORS.absent} />
                            </View>
                            <Text style={styles.statValue}>{stats.absent}</Text>
                            <Text style={styles.statLabel}>Absent</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                                <Ionicons name="time" size={20} color={COLORS.leave} />
                            </View>
                            <Text style={styles.statValue}>{stats.leave}</Text>
                            <Text style={styles.statLabel}>Leave</Text>
                        </View>
                        {/* Holiday Stat */}
                        <View style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                                <Ionicons name="sunny" size={20} color={COLORS.holiday} />
                            </View>
                            <Text style={styles.statValue}>{stats.holiday}</Text>
                            <Text style={styles.statLabel}>Holiday</Text>
                        </View>
                    </Animated.View>

                    {/* Attendance Percentage */}
                    <Animated.View style={[styles.percentageCard, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.percentageContent}>
                            <View>
                                <Text style={styles.percentageValue}>{getAttendancePercentage()}%</Text>
                                <Text style={styles.percentageLabel}>Attendance Rate</Text>
                            </View>
                            <View style={styles.percentageIcon}>
                                <Ionicons name="trending-up" size={24} color={COLORS.secondary} />
                            </View>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${getAttendancePercentage()}%` as any, backgroundColor: Number(getAttendancePercentage()) >= 75 ? COLORS.present : COLORS.absent }]} />
                        </View>
                    </Animated.View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAttendance(); }} colors={[COLORS.primary]} />}
            >
                {/* Mark Attendance Button (Visible only if current month and not marked today) */}
                {isCurrentMonth && (!todayStatus || todayStatus !== 'P') && (
                    <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 16, marginTop: 16 }}>
                        <TouchableOpacity
                            style={styles.markButton}
                            onPress={handleMarkAttendance}
                            disabled={marking}
                        >
                            {marking ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <>
                                    <Ionicons name="finger-print" size={24} color={COLORS.white} />
                                    <Text style={styles.markButtonText}>Mark Present Today</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Confirmation Banner if Marked */}
                {isCurrentMonth && todayStatus === 'P' && (
                    <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 16, marginTop: 16 }}>
                        <View style={styles.markedBanner}>
                            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                            <Text style={styles.markedBannerText}>Attendance Marked for Today</Text>
                        </View>
                    </Animated.View>
                )}

                {/* Month Selector */}
                <Animated.View style={[styles.monthSelector, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={styles.monthButton} onPress={() => handleMonthChange(-1)}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.monthDisplay}>
                        <Ionicons name="calendar" size={20} color={COLORS.secondary} />
                        <Text style={styles.monthText}>{MONTHS_DISPLAY[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}</Text>
                    </View>
                    <TouchableOpacity style={styles.monthButton} onPress={() => handleMonthChange(1)}>
                        <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Calendar */}
                <View style={styles.calendarContainer}>
                    <View style={styles.calendarHeader}>
                        {WEEKDAYS.map((day, index) => (
                            <Text key={index} style={[styles.dayHeader, (index === 0 || index === 6) && styles.weekendHeader]}>{day}</Text>
                        ))}
                    </View>
                    <View style={styles.calendarGrid}>
                        {renderCalendar()}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: 50,
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerDecorations: { ...StyleSheet.absoluteFillObject },
    headerBlob: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.secondary, opacity: 0.15, top: -20, right: -20 },
    headerRing: { position: 'absolute', top: 20, left: -20 },
    headerDots: { position: 'absolute', bottom: 10, right: 20 },
    headerDiamond1: { position: 'absolute', top: 80, left: 40 },
    headerContent: { paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    refreshButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, marginHorizontal: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center', flex: 1, marginHorizontal: 4 },
    statIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.white },
    statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    percentageCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    percentageContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    percentageValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.ink },
    percentageLabel: { fontSize: 12, color: COLORS.gray },
    percentageIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
    progressBarContainer: { height: 8, backgroundColor: COLORS.lightGray, borderRadius: 4, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 4 },

    scrollView: { flex: 1 },
    monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
    monthButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
    monthDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
    monthText: { fontSize: 16, fontWeight: '600', color: COLORS.ink },

    calendarContainer: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 30 },
    calendarHeader: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, paddingBottom: 12 },
    dayHeader: { width: (width - 66) / 7, textAlign: 'center', fontSize: 12, fontWeight: '600', color: COLORS.gray },
    weekendHeader: { color: COLORS.error },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    emptyDay: { width: (width - 66) / 7, height: (width - 66) / 7, marginBottom: 8 },
    dayCell: { width: (width - 66) / 7, height: (width - 66) / 7, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    dayContent: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray },
    today: { borderWidth: 2, borderColor: COLORS.secondary },
    todayText: { color: COLORS.primary, fontWeight: 'bold' },
    dayNumber: { fontSize: 13, color: COLORS.ink, fontWeight: '500' },
    dayNumberWithStatus: { color: COLORS.white },
    attendanceStatus: { fontSize: 8, fontWeight: 'bold', color: COLORS.white, position: 'absolute', bottom: 2 },

    markButton: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 6 },
    markButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    markedBanner: { flexDirection: 'row', backgroundColor: COLORS.cream, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.success },
    markedBannerText: { color: COLORS.success, fontSize: 14, fontWeight: 'bold' },

    // Utils styles
    dottedContainer: { position: 'absolute' },
    dottedRow: { flexDirection: 'row', marginBottom: 6 },
    dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
});
