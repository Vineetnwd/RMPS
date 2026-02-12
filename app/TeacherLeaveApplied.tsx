import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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
    pending: '#F59E0B',
    approved: '#10B981',
    rejected: '#DC2626',
    cancelled: '#94A3B8',
};

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Vector Shape Components
const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }: any) => (
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

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }: any) => (
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

const DottedPattern = ({ style, rows = 3, cols = 4, dotColor = COLORS.secondary }: any) => (
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

type LeaveApplication = {
    id: string;
    status: string;
    emp_id: string;
    from_date: string;
    to_date: string;
    leave_cause: string | null;
    leave_app: string | null;
    name: string | null;
};

export default function TeacherLeaveAppliedScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
    const [error, setError] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // ... (animations) ...
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
        Animated.loop(Animated.sequence([
            Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ])).start();
        Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 20000, useNativeDriver: true })).start();

        fetchLeaveApplications();
    }, []);
    // ... same ...
    // ... inside LeaveCard ...
    function LeaveCard({
        leave,
        index,
        getStatusColor,
        getStatusIcon,
        getStatusLabel,
        formatDate,
        formatShortDate,
        calculateDays,
        isUpcoming,
        isPast,
        fadeAnim
    }: { leave: LeaveApplication;[key: string]: any }) {
        const [expanded, setExpanded] = useState(false);
        const statusColor = getStatusColor(leave.status);
        const days = calculateDays(leave.from_date, leave.to_date);
        const upcoming = isUpcoming(leave.from_date);
        const past = isPast(leave.to_date);
        const scaleAnim = useRef(new Animated.Value(0)).current;
        const cause = leave.leave_cause;

        useEffect(() => {
            Animated.spring(scaleAnim, {
                toValue: 1,
                delay: index * 50,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }, []);

        return (
            <Animated.View style={[styles.leaveCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
                    <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View style={styles.dateContainer}>
                                <View style={[styles.dateBox, { borderColor: statusColor }]}>
                                    <Text style={[styles.dateDay, { color: statusColor }]}>{new Date(leave.from_date).getDate()}</Text>
                                    <Text style={styles.dateMonth}>{MONTHS[new Date(leave.from_date).getMonth()]}</Text>
                                </View>
                                <View style={styles.dateArrow}>
                                    <Ionicons name="arrow-forward" size={14} color={COLORS.gray} />
                                    <Text style={styles.daysCount}>{days} {days === 1 ? 'Day' : 'Days'}</Text>
                                </View>
                                <View style={[styles.dateBox, { borderColor: statusColor }]}>
                                    <Text style={[styles.dateDay, { color: statusColor }]}>{new Date(leave.to_date).getDate()}</Text>
                                    <Text style={styles.dateMonth}>{MONTHS[new Date(leave.to_date).getMonth()]}</Text>
                                </View>
                            </View>
                            <View style={styles.statusContainer}>
                                <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                                    <Ionicons name={getStatusIcon(leave.status)} size={14} color={statusColor} />
                                    <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(leave.status)}</Text>
                                </View>
                                {leave.status?.toUpperCase() === 'ACTIVE' && (
                                    <View style={[styles.timelineBadge, { backgroundColor: upcoming ? COLORS.cream : past ? '#FEE2E2' : '#D1FAE5' }]}>
                                        <Ionicons name={upcoming ? 'time-outline' : past ? 'checkmark-done' : 'today'} size={11} color={upcoming ? COLORS.secondary : past ? COLORS.rejected : COLORS.approved} />
                                        <Text style={[styles.timelineText, { color: upcoming ? COLORS.secondary : past ? COLORS.rejected : COLORS.approved }]}>
                                            {upcoming ? 'Upcoming' : past ? 'Completed' : 'Ongoing'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.leaveIdRow}>
                            <Ionicons name="document-text-outline" size={14} color={COLORS.gray} />
                            <Text style={styles.leaveId}>Application #{leave.id}</Text>
                        </View>

                        <View style={styles.causeContainer}>
                            <Text style={styles.causeLabel}>Reason:</Text>
                            <Text style={styles.causeText} numberOfLines={expanded ? undefined : 2}>
                                {cause || 'No reason provided'}
                            </Text>
                        </View>

                        {cause && cause.length > 80 && (
                            <View style={styles.expandRow}>
                                <Text style={styles.expandText}>{expanded ? 'Show Less' : 'Show More'}</Text>
                                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.secondary} />
                            </View>
                        )}

                        {leave.leave_app && (
                            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="attach" size={16} color={COLORS.secondary} />
                                <Text style={{ fontSize: 12, color: COLORS.secondary, fontStyle: 'italic' }}>Attachment available</Text>
                            </View>
                        )}

                        {expanded && (
                            <View style={styles.expandedDetails}>
                                <View style={styles.detailRow}>
                                    <View style={styles.detailItem}>
                                        <View style={styles.detailIconContainer}>
                                            <Ionicons name="calendar-outline" size={14} color={COLORS.secondary} />
                                        </View>
                                        <View>
                                            <Text style={styles.detailLabel}>From Date</Text>
                                            <Text style={styles.detailValue}>{formatDate(leave.from_date)}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <View style={styles.detailIconContainer}>
                                            <Ionicons name="calendar" size={14} color={COLORS.secondary} />
                                        </View>
                                        <View>
                                            <Text style={styles.detailLabel}>To Date</Text>
                                            <Text style={styles.detailValue}>{formatDate(leave.to_date)}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.totalDaysRow}>
                                    <View style={[styles.totalDaysBadge, { backgroundColor: statusColor + '15' }]}>
                                        <Ionicons name="hourglass-outline" size={16} color={statusColor} />
                                        <Text style={[styles.totalDaysText, { color: statusColor }]}>
                                            Total Duration: {days} {days === 1 ? 'Day' : 'Days'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    }

    const floatTranslate = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const fetchLeaveApplications = async () => {
        try {
            setLoading(true);
            setError('');

            const empId = await AsyncStorage.getItem('emp_id') || await AsyncStorage.getItem('user_id');
            const branchId = await AsyncStorage.getItem('branch_id');

            if (!empId) {
                Alert.alert('Error', 'Teacher ID not found. Please login again.');
                router.replace('/');
                return;
            }

            console.log('Fetching leave applications for teacher:', empId);

            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=get_teacher_leaves',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        emp_id: empId,
                        branch_id: branchId ? parseInt(branchId) : null
                    }),
                }
            );

            const result = await response.json();
            console.log('Leave applications response:', result);

            if (result.status === 'success' && result.data && Array.isArray(result.data) && result.data.length > 0) {
                // Sort by date (newest first)
                const sortedData = result.data.sort((a: any, b: any) =>
                    new Date(b.from_date).getTime() - new Date(a.from_date).getTime()
                );
                setLeaveApplications(sortedData);

                // Cache data
                await AsyncStorage.setItem('cached_teacher_leave_applications', JSON.stringify(sortedData));
            } else if (result.status === 'error' || !result.data || result.count === 0) {
                // Handle case when API returns: { "count": 0, "status": "error", "data": null }
                // This is not an error, just no data found
                setLeaveApplications([]);
                setError(''); // Clear any previous error - empty state will be shown
            } else {
                setLeaveApplications([]);
                setError(''); // No data found, show empty state
            }
        } catch (err) {
            console.error('Error fetching leave applications:', err);
            setError('Failed to load leave applications. Please try again.');

            // Try to load cached data
            try {
                const cachedData = await AsyncStorage.getItem('cached_teacher_leave_applications');
                if (cachedData) {
                    setLeaveApplications(JSON.parse(cachedData));
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
        fetchLeaveApplications();
    };

    const handleApplyLeave = () => {
        router.push('/TeacherLeaveApply');
    };

    const handleBack = () => {
        router.back();
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
                return COLORS.approved;
            case 'PENDING':
                return COLORS.pending;
            case 'REJECTED':
                return COLORS.rejected;
            case 'CANCELLED':
                return COLORS.cancelled;
            default:
                return COLORS.pending;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
                return 'checkmark-circle';
            case 'PENDING':
                return 'time';
            case 'REJECTED':
                return 'close-circle';
            case 'CANCELLED':
                return 'ban';
            default:
                return 'time';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
                return 'Approved';
            case 'PENDING':
                return 'Pending';
            case 'REJECTED':
                return 'Rejected';
            case 'CANCELLED':
                return 'Cancelled';
            default:
                return status || 'Pending';
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate();
        const month = MONTHS[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const formatShortDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate();
        const month = MONTHS[date.getMonth()];
        return `${day} ${month}`;
    };

    const calculateDays = (fromDate: string, toDate: string) => {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        const diffTime = Math.abs(to.getTime() - from.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const isUpcoming = (fromDate: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const leaveDate = new Date(fromDate);
        return leaveDate >= today;
    };

    const isPast = (toDate: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(toDate);
        return endDate < today;
    };

    const stats = {
        total: leaveApplications.length,
        pending: leaveApplications.filter((l: any) => l.status?.toUpperCase() === 'PENDING').length,
        approved: leaveApplications.filter((l: any) => l.status?.toUpperCase() === 'ACTIVE').length,
        rejected: leaveApplications.filter((l: any) => l.status?.toUpperCase() === 'REJECTED').length,
    };

    const filteredApplications = leaveApplications.filter((leave: any) => {
        if (selectedFilter === 'all') return true;
        return leave.status?.toUpperCase() === selectedFilter.toUpperCase();
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
                <View style={styles.loadingContent}>
                    <View style={styles.loadingIconContainer}>
                        <Ionicons name="calendar" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.loadingText}>Loading Leave Applications...</Text>
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
                            onPress={handleBack}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>My Leaves</Text>
                            <Text style={styles.headerSubtitle}>Leave applications</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleApplyLeave}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    {/* Stats Cards */}
                    <Animated.View
                        style={[
                            styles.statsRow,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}
                    >
                        <TouchableOpacity
                            style={[
                                styles.statCard,
                                selectedFilter === 'all' && styles.statCardActive
                            ]}
                            onPress={() => setSelectedFilter('all')}
                        >
                            <View style={styles.statIconContainer}>
                                <Ionicons name="documents" size={18} color={COLORS.secondary} />
                            </View>
                            <Text style={styles.statValue}>{stats.total}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.statCard,
                                selectedFilter === 'pending' && styles.statCardActive
                            ]}
                            onPress={() => setSelectedFilter('pending')}
                        >
                            <View style={[styles.statDot, { backgroundColor: COLORS.pending }]} />
                            <Text style={styles.statValue}>{stats.pending}</Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.statCard,
                                selectedFilter === 'active' && styles.statCardActive
                            ]}
                            onPress={() => setSelectedFilter('active')}
                        >
                            <View style={[styles.statDot, { backgroundColor: COLORS.approved }]} />
                            <Text style={styles.statValue}>{stats.approved}</Text>
                            <Text style={styles.statLabel}>Approved</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.statCard,
                                selectedFilter === 'rejected' && styles.statCardActive
                            ]}
                            onPress={() => setSelectedFilter('rejected')}
                        >
                            <View style={[styles.statDot, { backgroundColor: COLORS.rejected }]} />
                            <Text style={styles.statValue}>{stats.rejected}</Text>
                            <Text style={styles.statLabel}>Rejected</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            {/* Error Banner */}
            {error ? (
                <View style={styles.errorBanner}>
                    <Ionicons name="information-circle" size={18} color={COLORS.secondary} />
                    <Text style={styles.errorBannerText}>{error}</Text>
                    <TouchableOpacity onPress={fetchLeaveApplications}>
                        <Ionicons name="refresh" size={18} color={COLORS.secondary} />
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* Leave Applications List */}
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
                {filteredApplications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="calendar-outline" size={60} color={COLORS.lightGray} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {selectedFilter === 'all' ? 'No Leave Applications' : `No ${getStatusLabel(selectedFilter)} Applications`}
                        </Text>
                        <Text style={styles.emptyText}>
                            {selectedFilter === 'all'
                                ? "You haven't applied for any leave yet.\nTap the + button to apply for leave."
                                : `You don't have any ${selectedFilter.toLowerCase()} leave applications.`
                            }
                        </Text>
                        {selectedFilter === 'all' && (
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={handleApplyLeave}
                            >
                                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                                <Text style={styles.emptyButtonText}>Apply for Leave</Text>
                            </TouchableOpacity>
                        )}
                        {selectedFilter !== 'all' && (
                            <TouchableOpacity
                                style={styles.clearFilterButton}
                                onPress={() => setSelectedFilter('all')}
                            >
                                <Text style={styles.clearFilterText}>Show All Applications</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionHeaderIcon}>
                                <Ionicons name="list" size={18} color={COLORS.secondary} />
                            </View>
                            <Text style={styles.sectionTitle}>
                                {selectedFilter === 'all'
                                    ? `All Applications (${filteredApplications.length})`
                                    : `${getStatusLabel(selectedFilter)} (${filteredApplications.length})`
                                }
                            </Text>
                            {selectedFilter !== 'all' && (
                                <TouchableOpacity onPress={() => setSelectedFilter('all')}>
                                    <Text style={styles.clearFilter}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {filteredApplications.map((leave: any, index: number) => (
                            <LeaveCard
                                key={leave.id || index}
                                leave={leave}
                                index={index}
                                getStatusColor={getStatusColor}
                                getStatusIcon={getStatusIcon}
                                getStatusLabel={getStatusLabel}
                                formatDate={formatDate}
                                formatShortDate={formatShortDate}
                                calculateDays={calculateDays}
                                isUpcoming={isUpcoming}
                                isPast={isPast}
                                fadeAnim={fadeAnim}
                            />
                        ))}
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={handleApplyLeave}
                activeOpacity={0.8}
            >
                <View style={styles.fabInner}>
                    <Ionicons name="add" size={28} color={COLORS.white} />
                </View>
            </TouchableOpacity>
        </View>
    );
}

// Leave Card Component
function LeaveCard({
    leave,
    index,
    getStatusColor,
    getStatusIcon,
    getStatusLabel,
    formatDate,
    formatShortDate,
    calculateDays,
    isUpcoming,
    isPast,
    fadeAnim
}: any) {
    const [expanded, setExpanded] = useState(false);
    const statusColor = getStatusColor(leave.status);
    const days = calculateDays(leave.from_date, leave.to_date);
    const upcoming = isUpcoming(leave.from_date);
    const past = isPast(leave.to_date);
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

    return (
        <Animated.View
            style={[
                styles.leaveCard,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                }
            ]}
        >
            <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                {/* Status Bar */}
                <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

                <View style={styles.cardContent}>
                    {/* Date and Status Row */}
                    <View style={styles.cardHeader}>
                        {/* Date Display */}
                        <View style={styles.dateContainer}>
                            <View style={[styles.dateBox, { borderColor: statusColor }]}>
                                <Text style={[styles.dateDay, { color: statusColor }]}>
                                    {new Date(leave.from_date).getDate()}
                                </Text>
                                <Text style={styles.dateMonth}>
                                    {MONTHS[new Date(leave.from_date).getMonth()]}
                                </Text>
                            </View>

                            <View style={styles.dateArrow}>
                                <Ionicons name="arrow-forward" size={14} color={COLORS.gray} />
                                <Text style={styles.daysCount}>{days} {days === 1 ? 'Day' : 'Days'}</Text>
                            </View>

                            <View style={[styles.dateBox, { borderColor: statusColor }]}>
                                <Text style={[styles.dateDay, { color: statusColor }]}>
                                    {new Date(leave.to_date).getDate()}
                                </Text>
                                <Text style={styles.dateMonth}>
                                    {MONTHS[new Date(leave.to_date).getMonth()]}
                                </Text>
                            </View>
                        </View>

                        {/* Status Badge */}
                        <View style={styles.statusContainer}>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                                <Ionicons
                                    name={getStatusIcon(leave.status)}
                                    size={14}
                                    color={statusColor}
                                />
                                <Text style={[styles.statusText, { color: statusColor }]}>
                                    {getStatusLabel(leave.status)}
                                </Text>
                            </View>

                            {/* Timeline Badge */}
                            {leave.status?.toUpperCase() === 'ACTIVE' && (
                                <View style={[
                                    styles.timelineBadge,
                                    { backgroundColor: upcoming ? COLORS.cream : past ? '#FEE2E2' : '#D1FAE5' }
                                ]}>
                                    <Ionicons
                                        name={upcoming ? 'time-outline' : past ? 'checkmark-done' : 'today'}
                                        size={11}
                                        color={upcoming ? COLORS.secondary : past ? COLORS.rejected : COLORS.approved}
                                    />
                                    <Text style={[
                                        styles.timelineText,
                                        { color: upcoming ? COLORS.secondary : past ? COLORS.rejected : COLORS.approved }
                                    ]}>
                                        {upcoming ? 'Upcoming' : past ? 'Completed' : 'Ongoing'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Leave ID */}
                    <View style={styles.leaveIdRow}>
                        <Ionicons name="document-text-outline" size={14} color={COLORS.gray} />
                        <Text style={styles.leaveId}>Application #{leave.id}</Text>
                    </View>

                    {/* Cause/Reason */}
                    <View style={styles.causeContainer}>
                        <Text style={styles.causeLabel}>Reason:</Text>
                        <Text
                            style={styles.causeText}
                            numberOfLines={expanded ? undefined : 2}
                        >
                            {leave.leave_cause || leave.cause || 'No reason provided'}
                        </Text>
                    </View>

                    {/* Expand/Collapse */}
                    {(leave.leave_cause || leave.cause) && (leave.leave_cause || leave.cause).length > 80 && (
                        <View style={styles.expandRow}>
                            <Text style={styles.expandText}>
                                {expanded ? 'Show Less' : 'Show More'}
                            </Text>
                            <Ionicons
                                name={expanded ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color={COLORS.secondary}
                            />
                        </View>
                    )}

                    {/* Expanded Details */}
                    {expanded && (
                        <View style={styles.expandedDetails}>
                            <View style={styles.detailRow}>
                                <View style={styles.detailItem}>
                                    <View style={styles.detailIconContainer}>
                                        <Ionicons name="calendar-outline" size={14} color={COLORS.secondary} />
                                    </View>
                                    <View>
                                        <Text style={styles.detailLabel}>From Date</Text>
                                        <Text style={styles.detailValue}>{formatDate(leave.from_date)}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailItem}>
                                    <View style={styles.detailIconContainer}>
                                        <Ionicons name="calendar" size={14} color={COLORS.secondary} />
                                    </View>
                                    <View>
                                        <Text style={styles.detailLabel}>To Date</Text>
                                        <Text style={styles.detailValue}>{formatDate(leave.to_date)}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.totalDaysRow}>
                                <View style={[styles.totalDaysBadge, { backgroundColor: statusColor + '15' }]}>
                                    <Ionicons name="hourglass-outline" size={16} color={statusColor} />
                                    <Text style={[styles.totalDaysText, { color: statusColor }]}>
                                        Total Duration: {days} {days === 1 ? 'Day' : 'Days'}
                                    </Text>
                                </View>
                            </View>
                        </View>
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
        fontSize: 11,
        color: COLORS.gray,
    },

    // Header
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: 30,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
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
        bottom: 20,
        left: 20,
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
        paddingHorizontal: 16,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        height: 80,
    },
    statCardActive: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.secondary,
        transform: [{ scale: 1.05 }],
    },
    statIconContainer: {
        marginBottom: 4,
    },
    statDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.ink,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.gray,
        fontWeight: '600',
    },

    // Error Banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9F0',
        padding: 10,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 10,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
    },
    errorBannerText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.secondaryDark,
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
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
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.ink,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.gray,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F2',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    emptyButtonText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    clearFilterButton: {
        paddingVertical: 10,
    },
    clearFilterText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },

    // Lists
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionHeaderIcon: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#FFF9F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.gray,
        flex: 1,
    },
    clearFilter: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '600',
    },

    // Leave Card
    leaveCard: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    statusBar: {
        height: 4,
        width: '100%',
    },
    cardContent: {
        padding: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateBox: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        minWidth: 44,
    },
    dateDay: {
        fontSize: 14,
        fontWeight: '800',
    },
    dateMonth: {
        fontSize: 9,
        fontWeight: '600',
        color: COLORS.gray,
        textTransform: 'uppercase',
    },
    dateArrow: {
        alignItems: 'center',
        gap: 2,
    },
    daysCount: {
        fontSize: 9,
        color: COLORS.gray,
        fontWeight: '600',
    },
    statusContainer: {
        alignItems: 'flex-end',
        gap: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    timelineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    timelineText: {
        fontSize: 9,
        fontWeight: '600',
    },
    leaveIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    leaveId: {
        fontSize: 11,
        color: COLORS.gray,
    },
    causeContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    causeLabel: {
        fontSize: 10,
        color: COLORS.gray,
        fontWeight: '600',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    causeText: {
        fontSize: 12,
        color: COLORS.ink,
        lineHeight: 18,
    },
    expandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: 4,
    },
    expandText: {
        fontSize: 11,
        color: COLORS.secondary,
        fontWeight: '600',
    },

    // Expanded Details
    expandedDetails: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
    },
    detailRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        padding: 8,
        borderRadius: 8,
    },
    detailIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    detailLabel: {
        fontSize: 9,
        color: COLORS.gray,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.ink,
    },
    totalDaysRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    totalDaysBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    totalDaysText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabInner: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
