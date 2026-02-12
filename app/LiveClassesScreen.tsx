import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Linking,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    SafeAreaProvider,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

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
    live: '#EF4444',
    upcoming: '#3B82F6',
    ended: '#94A3B8',
};

// Decorative shapes
const DiamondShape = ({ style }: any) => (
    <Animated.View style={[styles.diamond, style]} />
);

const CircleRing = ({ style }: any) => (
    <Animated.View style={[styles.circleRing, style]} />
);

interface LiveClass {
    id: string;
    title: string;
    student_class: string;
    student_section: string;
    subject: string;
    start_time: string;
    end_time: string;
    link: string;
    status: string;
    subject_name: string;
    branch_id: string;
}

const LiveClassesScreen = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [studentId, setStudentId] = useState('');

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        initializeScreen();
        startAnimations();
    }, []);

    const startAnimations = () => {
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
                    toValue: -8,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotation animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 8000,
                useNativeDriver: true,
            })
        ).start();

        // Pulse animation for live indicator
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const initializeScreen = async () => {
        try {
            const id = await AsyncStorage.getItem('student_id');
            if (id) {
                setStudentId(id);
                await fetchLiveClasses(id);
            } else {
                Alert.alert('Error', 'Student ID not found. Please login again.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Error initializing:', err);
            setLoading(false);
        }
    };

    const fetchLiveClasses = async (id: string) => {
        setError(null);
        try {
            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=live_classes',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ student_id: id }),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch live classes');
            }

            const data = await response.json();
            console.log('live_classes response:', JSON.stringify(data).substring(0, 300));

            if (data && data.status === 'success' && data.data && data.data.length > 0) {
                // Sort: live classes first, then upcoming, then ended
                const sorted = data.data.sort((a: LiveClass, b: LiveClass) => {
                    const statusA = getClassStatus(a);
                    const statusB = getClassStatus(b);
                    const order: Record<string, number> = { live: 0, upcoming: 1, ended: 2 };
                    if (order[statusA] !== order[statusB]) {
                        return order[statusA] - order[statusB];
                    }
                    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                });
                setLiveClasses(sorted);
            } else {
                setLiveClasses([]);
            }
        } catch (err: any) {
            console.error('Error fetching live classes:', err);
            setError('Failed to load live classes. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        const id = studentId || (await AsyncStorage.getItem('student_id')) || '';
        await fetchLiveClasses(id);
    };

    const getClassStatus = (item: LiveClass): 'live' | 'upcoming' | 'ended' => {
        const now = new Date();
        const start = new Date(item.start_time);
        const end = new Date(item.end_time);

        if (now >= start && now <= end) return 'live';
        if (now < start) return 'upcoming';
        return 'ended';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minuteStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minuteStr} ${ampm}`;
    };

    const getDuration = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60));
        if (diff >= 60) {
            const hrs = Math.floor(diff / 60);
            const mins = diff % 60;
            return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
        }
        return `${diff}m`;
    };

    const getTimeRemaining = (startTime: string) => {
        const now = new Date();
        const start = new Date(startTime);
        const diff = start.getTime() - now.getTime();

        if (diff <= 0) return null;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `Starts in ${days}d ${hours % 24}h`;
        }
        if (hours > 0) {
            return `Starts in ${hours}h ${minutes}m`;
        }
        return `Starts in ${minutes}m`;
    };

    const handleJoinClass = (link: string) => {
        if (!link) {
            Alert.alert('Error', 'No meeting link available.');
            return;
        }
        Linking.openURL(link).catch(() => {
            Alert.alert('Error', 'Unable to open the meeting link.');
        });
    };

    const getStatusConfig = (status: 'live' | 'upcoming' | 'ended') => {
        switch (status) {
            case 'live':
                return {
                    label: '● LIVE NOW',
                    color: COLORS.live,
                    bgColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    buttonText: 'Join Now',
                    buttonColor: COLORS.live,
                    icon: 'videocam' as const,
                };
            case 'upcoming':
                return {
                    label: 'UPCOMING',
                    color: COLORS.upcoming,
                    bgColor: 'rgba(59, 130, 246, 0.1)',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    buttonText: 'Join',
                    buttonColor: COLORS.primary,
                    icon: 'time' as const,
                };
            case 'ended':
                return {
                    label: 'ENDED',
                    color: COLORS.ended,
                    bgColor: 'rgba(148, 163, 184, 0.1)',
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                    buttonText: 'Ended',
                    buttonColor: COLORS.ended,
                    icon: 'checkmark-circle' as const,
                };
        }
    };

    // Header
    const renderHeader = () => (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            {/* Decorative elements */}
            <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <DiamondShape style={styles.headerDiamond1} />
            </Animated.View>
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <CircleRing style={styles.headerCircle1} />
            </Animated.View>
            <DiamondShape style={styles.headerDiamond2} />

            <View style={styles.headerContent}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color={COLORS.white} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Live Classes</Text>
                    <Text style={styles.headerSubtitle}>Scheduled online sessions</Text>
                </View>
                <View style={styles.headerIconContainer}>
                    <Ionicons name="videocam" size={20} color={COLORS.secondary} />
                </View>
            </View>
        </View>
    );

    // Render class card
    const renderClassCard = (item: LiveClass, index: number) => {
        const status = getClassStatus(item);
        const config = getStatusConfig(status);
        const timeRemaining = status === 'upcoming' ? getTimeRemaining(item.start_time) : null;

        return (
            <Animated.View
                key={item.id}
                style={[
                    styles.classCard,
                    status === 'live' && styles.classCardLive,
                    status === 'ended' && styles.classCardEnded,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Status Badge */}
                <View style={styles.cardTopRow}>
                    <View style={[styles.statusBadge, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
                        {status === 'live' && (
                            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                        )}
                        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                    </View>
                    {timeRemaining && (
                        <View style={styles.countdownBadge}>
                            <Ionicons name="time-outline" size={12} color={COLORS.upcoming} />
                            <Text style={styles.countdownText}>{timeRemaining}</Text>
                        </View>
                    )}
                </View>

                {/* Title */}
                <Text style={[styles.classTitle, status === 'ended' && styles.classTitleEnded]}>
                    {item.title}
                </Text>

                {/* Subject & Class Info */}
                <View style={styles.infoRow}>
                    <View style={styles.infoChip}>
                        <Ionicons name="book" size={14} color={COLORS.primary} />
                        <Text style={styles.infoChipText}>{item.subject_name || 'Subject'}</Text>
                    </View>
                    <View style={styles.infoChip}>
                        <Ionicons name="school" size={14} color={COLORS.secondary} />
                        <Text style={styles.infoChipText}>
                            Class {item.student_class}{item.student_section ? ` - ${item.student_section}` : ''}
                        </Text>
                    </View>
                </View>

                {/* Date & Time */}
                <View style={styles.dateTimeContainer}>
                    <View style={styles.dateTimeItem}>
                        <View style={styles.dateTimeIcon}>
                            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.dateTimeLabel}>Date</Text>
                            <Text style={styles.dateTimeValue}>{formatDate(item.start_time)}</Text>
                        </View>
                    </View>
                    <View style={styles.dateTimeDivider} />
                    <View style={styles.dateTimeItem}>
                        <View style={styles.dateTimeIcon}>
                            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.dateTimeLabel}>Time</Text>
                            <Text style={styles.dateTimeValue}>
                                {formatTime(item.start_time)} - {formatTime(item.end_time)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Join Button */}
                {status !== 'ended' ? (
                    <TouchableOpacity
                        style={[
                            styles.joinButton,
                            status === 'live' && styles.joinButtonLive,
                        ]}
                        onPress={() => handleJoinClass(item.link)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={config.icon}
                            size={20}
                            color={COLORS.white}
                        />
                        <Text style={styles.joinButtonText}>{config.buttonText}</Text>
                        <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.endedBanner}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.ended} />
                        <Text style={styles.endedBannerText}>This class has ended</Text>
                    </View>
                )}
            </Animated.View>
        );
    };

    // Loading state
    const renderLoading = () => (
        <View style={styles.centerContainer}>
            <View style={styles.loadingIconContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
            <Text style={styles.loadingText}>Loading live classes...</Text>
            <Text style={styles.loadingSubtext}>Please wait</Text>
        </View>
    );

    // Error state
    const renderError = () => (
        <View style={styles.centerContainer}>
            <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                    setLoading(true);
                    initializeScreen();
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.retryButtonText}>Try Again</Text>
                <Ionicons name="refresh" size={16} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );

    // Empty state
    const renderEmptyState = () => (
        <View style={styles.centerContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="videocam-off-outline" size={40} color={COLORS.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No Live Classes</Text>
            <Text style={styles.emptyText}>
                There are no scheduled live classes at the moment. Check back later!
            </Text>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaProvider>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
                <View style={styles.safeArea}>
                    {renderHeader()}
                    {renderLoading()}
                </View>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <View style={styles.safeArea}>
                {renderHeader()}

                <ScrollView
                    style={styles.container}
                    contentContainerStyle={[
                        styles.contentContainer,
                        { paddingBottom: 20 + insets.bottom },
                    ]}
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
                    {error && liveClasses.length === 0 ? (
                        renderError()
                    ) : liveClasses.length > 0 ? (
                        <>
                            {/* Summary */}
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryChip}>
                                    <Text style={styles.summaryCount}>{liveClasses.length}</Text>
                                    <Text style={styles.summaryLabel}>Total</Text>
                                </View>
                                <View style={[styles.summaryChip, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <Text style={[styles.summaryCount, { color: COLORS.live }]}>
                                        {liveClasses.filter(c => getClassStatus(c) === 'live').length}
                                    </Text>
                                    <Text style={styles.summaryLabel}>Live</Text>
                                </View>
                                <View style={[styles.summaryChip, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                    <Text style={[styles.summaryCount, { color: COLORS.upcoming }]}>
                                        {liveClasses.filter(c => getClassStatus(c) === 'upcoming').length}
                                    </Text>
                                    <Text style={styles.summaryLabel}>Upcoming</Text>
                                </View>
                                <View style={[styles.summaryChip, { backgroundColor: 'rgba(148, 163, 184, 0.1)' }]}>
                                    <Text style={[styles.summaryCount, { color: COLORS.ended }]}>
                                        {liveClasses.filter(c => getClassStatus(c) === 'ended').length}
                                    </Text>
                                    <Text style={styles.summaryLabel}>Ended</Text>
                                </View>
                            </View>

                            {/* Class Cards */}
                            {liveClasses.map((item, index) => renderClassCard(item, index))}
                        </>
                    ) : (
                        renderEmptyState()
                    )}
                </ScrollView>
            </View>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Header
    header: {
        backgroundColor: COLORS.primary,
        paddingBottom: 18,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 14,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.white,
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
        fontWeight: '500',
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(212, 175, 55, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Decorative shapes
    diamond: {
        width: 12,
        height: 12,
        backgroundColor: 'rgba(212, 175, 55, 0.3)',
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
    },
    circleRing: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        position: 'absolute',
    },
    headerDiamond1: {
        top: 15,
        right: 60,
    },
    headerCircle1: {
        top: 8,
        right: 25,
    },
    headerDiamond2: {
        bottom: 30,
        left: 40,
        opacity: 0.4,
    },

    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },

    // Summary Row
    summaryRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    summaryChip: {
        flex: 1,
        backgroundColor: 'rgba(122, 12, 46, 0.08)',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    summaryCount: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.primary,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.gray,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },

    // Class Card
    classCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0E8EB',
    },
    classCardLive: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderWidth: 1.5,
        shadowColor: COLORS.live,
        shadowOpacity: 0.1,
    },
    classCardEnded: {
        opacity: 0.7,
    },

    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.live,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    countdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countdownText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.upcoming,
    },

    classTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.ink,
        marginBottom: 10,
    },
    classTitleEnded: {
        color: COLORS.gray,
    },

    infoRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    infoChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.ink,
    },

    dateTimeContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    dateTimeItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateTimeIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(122, 12, 46, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateTimeLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: COLORS.gray,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    dateTimeValue: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.ink,
        marginTop: 1,
    },
    dateTimeDivider: {
        width: 1,
        backgroundColor: COLORS.lightGray,
        marginHorizontal: 8,
    },

    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 13,
        borderRadius: 12,
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    joinButtonLive: {
        backgroundColor: COLORS.live,
        shadowColor: COLORS.live,
    },
    joinButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '700',
    },

    endedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: 'rgba(148, 163, 184, 0.08)',
        borderRadius: 10,
    },
    endedBannerText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.ended,
    },

    // Center Container States
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 30,
    },
    loadingIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(122, 12, 46, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.ink,
    },
    loadingSubtext: {
        fontSize: 12,
        color: COLORS.gray,
        marginTop: 6,
    },
    errorIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 50,
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 50,
        backgroundColor: '#FFF9F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.ink,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 13,
        color: COLORS.gray,
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.ink,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 13,
        color: COLORS.gray,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 20,
        marginTop: 24,
        gap: 6,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 2,
    },
    retryButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});

export default LiveClassesScreen;
