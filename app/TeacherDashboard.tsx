import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
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
    purple: '#7C3AED',
    blue: '#3B82F6',
    teal: '#14B8A6',
    orange: '#F97316',
    rose: '#F43F5E',
};

// ── Types matching API response ──
type AllowedClass = {
    id: string;
    class_name: string;
    section_name: string;
};

type Receipt = {
    id: string;
    student_id: string;
    paid_amount: string;
    paid_date: string;
};

type RecentStudent = {
    id: string;
    student_name: string | null;
    student_class: string | null;
    student_section: string | null;
    created_at: string;
};

type DashboardData = {
    branch_id: string;
    emp_id: string;
    allowed_classes: AllowedClass[];
    class_teacher: string | null;
    student: number;
    present: number;
    absent: number;
    collection: string;
    full_name: string | null;
    user_type: string;
    recent_receipts: Receipt[];
    recent_students: RecentStudent[];
};

type MenuItem = {
    id: number;
    title: string;
    icon: ComponentProps<typeof FontAwesome5>["name"];
    color: string;
    route: string;
    description: string;
};

// ── Decorative Components ──
const DiamondShape = ({ style, color = 'rgba(212,175,55,0.3)', size = 16 }: { style?: object; color?: string; size?: number }) => (
    <View style={[{ width: size, height: size, backgroundColor: color, transform: [{ rotate: '45deg' }], borderRadius: 3 }, style]} />
);

const CircleRing = ({ style, color = 'rgba(212,175,55,0.2)', size = 60, borderWidth = 2.5 }: { style?: object; color?: string; size?: number; borderWidth?: number }) => (
    <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth, borderColor: color, backgroundColor: 'transparent' }, style]} />
);

const DottedPattern = ({ style, rows = 3, cols = 4, dotColor = 'rgba(255,255,255,0.25)' }: { style?: object; rows?: number; cols?: number; dotColor?: string }) => (
    <View style={[{ position: 'absolute' }, style]}>
        {[...Array(rows)].map((_, r) => (
            <View key={r} style={{ flexDirection: 'row', marginBottom: 5 }}>
                {[...Array(cols)].map((_, c) => (
                    <View key={c} style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: dotColor, marginHorizontal: 3, opacity: 0.4 + (r * cols + c) * 0.04 }} />
                ))}
            </View>
        ))}
    </View>
);

// ── Main Component ──
export default function TeacherDashboard() {
    const [greeting, setGreeting] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<"receipts" | "students">("receipts");
    const [dashboardData, setDashboardData] = useState<DashboardData>({
        branch_id: "",
        emp_id: "",
        allowed_classes: [],
        class_teacher: null,
        student: 0,
        present: 0,
        absent: 0,
        collection: "0.00",
        full_name: null,
        user_type: "TEACHER",
        recent_receipts: [],
        recent_students: [],
    });

    // Animation refs — content starts visible to avoid blank screen
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnims = useRef(Array.from({ length: 6 }, () => new Animated.Value(1))).current;

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 17) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");

        loadCachedUserInfo();

        // Header decorative animations
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 25000, useNativeDriver: true })
        ).start();
    }, []);

    // Trigger content entry animations when loading completes
    useEffect(() => {
        if (!loading) {
            scaleAnims.forEach((a) => a.setValue(0));
            fadeAnim.setValue(0);
            slideAnim.setValue(20);

            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
                Animated.stagger(80, scaleAnims.map((a) =>
                    Animated.spring(a, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true })
                )),
            ]).start();
        }
    }, [loading]);

    const loadCachedUserInfo = async () => {
        try {
            const cachedName = await AsyncStorage.getItem('full_name');
            const cachedUserType = await AsyncStorage.getItem('user_type');
            const cachedClassTeacher = await AsyncStorage.getItem('class_teacher');
            const cachedEmpId = await AsyncStorage.getItem('emp_id');
            if (cachedName || cachedUserType || cachedEmpId) {
                setDashboardData(prev => ({
                    ...prev,
                    full_name: cachedName || prev.full_name,
                    user_type: cachedUserType || prev.user_type,
                    class_teacher: cachedClassTeacher || prev.class_teacher,
                    emp_id: cachedEmpId || prev.emp_id,
                }));
            }
        } catch (e) {
            console.error('Error loading cached user info:', e);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
        }, [])
    );

    const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem('user_id') || '0';
            const branchId = await AsyncStorage.getItem('branch_id') || '0';

            const response = await fetch('https://rmpublicschool.org/binex/api.php?task=teacher_dash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, branch_id: branchId }),
            });

            const data = await response.json();
            console.log("Teacher Dashboard data:", data);

            if (data && typeof data === 'object') {
                setDashboardData(prev => ({
                    ...prev,
                    branch_id: data.branch_id ?? prev.branch_id,
                    emp_id: data.emp_id ?? prev.emp_id,
                    allowed_classes: Array.isArray(data.allowed_classes) ? data.allowed_classes : [],
                    class_teacher: data.class_teacher ?? null,
                    student: data.student ?? 0,
                    present: data.present ?? 0,
                    absent: data.absent ?? 0,
                    collection: data.collection ?? "0.00",
                    full_name: data.full_name ?? null,
                    user_type: data.user_type ?? "TEACHER",
                    recent_receipts: Array.isArray(data.recent_receipts) ? data.recent_receipts : [],
                    recent_students: Array.isArray(data.recent_students) ? data.recent_students : [],
                }));

                // Cache user info
                if (data.full_name) await AsyncStorage.setItem('full_name', data.full_name);
                if (data.user_type) await AsyncStorage.setItem('user_type', data.user_type);
                if (data.branch_id) await AsyncStorage.setItem('branch_id', data.branch_id);
                if (data.class_teacher) await AsyncStorage.setItem('class_teacher', data.class_teacher);
                if (data.emp_id) await AsyncStorage.setItem('emp_id', String(data.emp_id));
            }
        } catch (error) {
            console.error('Error fetching teacher dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await AsyncStorage.multiRemove([
                            'user_id', 'full_name', 'user_type', 'isLoggedIn', 'branch_id', 'class_teacher',
                        ]);
                        router.replace('/admin_login');
                    } catch (error) {
                        console.error('Error during logout:', error);
                        Alert.alert('Error', 'Failed to logout. Please try again.');
                    }
                },
            },
        ]);
    };

    const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };

    // ── Helpers ──
    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === "number" ? amount : parseFloat(amount || "0");
        return `₹${num.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    };

    const formatDateTime = (dateTimeString: string) => {
        if (!dateTimeString) return "";
        const date = new Date(dateTimeString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
        }
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    };

    const getDisplayName = () => {
        if (dashboardData.full_name) return dashboardData.full_name;
        if (dashboardData.class_teacher) return `Class Teacher (${dashboardData.class_teacher})`;
        return "Teacher";
    };

    // ── Menu Items ──
    const menuItems: MenuItem[] = [
        {
            id: 1,
            title: "Self Attendance",
            icon: "hand-pointer",
            color: COLORS.primary,
            route: "SelfAttendance",
            description: "Mark your own attendance",
        },
        {
            id: 2,
            title: "My Leaves",
            icon: "calendar-check",
            color: COLORS.purple,
            route: "TeacherLeaveApplied",
            description: "Submit & track approvals",
        },
        {
            id: 3,
            title: "Subject Marks",
            icon: "clipboard-list",
            color: COLORS.blue,
            route: "SubjectMarkEntry",
            description: "Enter subject-wise marks",
        },
        {
            id: 4,
            title: "Homework",
            icon: "book-open",
            color: COLORS.orange,
            route: "HomeWork",
            description: "Upload & assign homework",
        },
        {
            id: 5,
            title: "Student Attendance",
            icon: "clipboard-check",
            color: COLORS.success,
            route: "Attendance",
            description: "Mark daily attendance",
        },
        {
            id: 6,
            title: "Student Dues",
            icon: "rupee-sign",
            color: COLORS.secondary,
            route: "DuesList",
            description: "View fee dues list",
        },
    ];

    const handleMenuPress = (route: string) => {
        const params: Record<string, string> = {
            branch_id: dashboardData.branch_id || '',
        };

        // For Student Attendance & Student Dues, pass the class teacher's class & section
        if ((route === 'Attendance' || route === 'DuesList') && dashboardData.class_teacher) {
            const parts = dashboardData.class_teacher.split('-');
            if (parts.length === 2) {
                params.ct_class = parts[0].trim();   // e.g. "II"
                params.ct_section = parts[1].trim();  // e.g. "A"
            }
        }

        // For Homework & Marks Entry, pass allowed classes and emp_id
        if (route === 'HomeWork' || route === 'SubjectMarkEntry') {
            if (dashboardData.allowed_classes.length > 0) {
                params.allowed_classes = JSON.stringify(dashboardData.allowed_classes);
            }
            if (dashboardData.emp_id) {
                params.emp_id = String(dashboardData.emp_id);
            }
        }

        router.push({
            pathname: `/${route}` as any,
            params,
        });
    };

    // ── Render Helpers ──
    const renderReceiptItem = (receipt: Receipt) => (
        <View key={`receipt-${receipt.id}`} style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: COLORS.success }]} />
            <View style={styles.activityBody}>
                <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Fee Collected</Text>
                    <Text style={[styles.activityAmount, { color: COLORS.success }]}>
                        {formatCurrency(receipt.paid_amount)}
                    </Text>
                </View>
                <View style={styles.activityRow}>
                    <Text style={styles.activitySub}>Student ID: {receipt.student_id}</Text>
                    <Text style={styles.activityDate}>{formatDate(receipt.paid_date)}</Text>
                </View>
            </View>
        </View>
    );

    const renderStudentItem = (student: RecentStudent) => (
        <View key={`student-${student.id}`} style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: COLORS.primary }]} />
            <View style={styles.activityBody}>
                <View style={styles.activityRow}>
                    <Text style={styles.activityLabel} numberOfLines={1}>
                        {student.student_name || 'Unnamed Student'}
                    </Text>
                    <Text style={styles.activityBadge}>#{student.id}</Text>
                </View>
                <View style={styles.activityRow}>
                    <Text style={styles.activitySub}>
                        {student.student_class && student.student_section
                            ? `Class ${student.student_class} - ${student.student_section}`
                            : student.student_class
                                ? `Class ${student.student_class}`
                                : 'Class N/A'}
                    </Text>
                    <Text style={styles.activityDate}>{formatDateTime(student.created_at)}</Text>
                </View>
            </View>
        </View>
    );

    // ── Loading Screen ──
    if (loading && !dashboardData.full_name && !dashboardData.class_teacher) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
                <View style={styles.loadingContent}>
                    <View style={styles.loadingIconRing}>
                        <View style={styles.loadingIconInner}>
                            <Ionicons name="school" size={36} color={COLORS.primary} />
                        </View>
                    </View>
                    <Text style={styles.loadingText}>Loading Dashboard...</Text>
                    <Text style={styles.loadingSubtext}>Please wait a moment</Text>
                </View>
            </View>
        );
    }

    // ── Main Render ──
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* ── HEADER ── */}
            <View style={styles.header}>
                <View style={styles.headerDecorations} pointerEvents="none">
                    <Animated.View style={[styles.headerBlob, { transform: [{ translateY: floatTranslate }] }]} />
                    <Animated.View style={[styles.headerRing, { transform: [{ rotate }] }]}>
                        <CircleRing size={90} borderWidth={2} color="rgba(212,175,55,0.2)" />
                    </Animated.View>
                    <DiamondShape style={{ position: 'absolute', top: 45, right: 55 }} color="rgba(212,175,55,0.35)" size={14} />
                    <DiamondShape style={{ position: 'absolute', top: 75, right: 95 }} color="rgba(255,255,255,0.18)" size={10} />
                    <DottedPattern style={{ bottom: 8, right: 15 }} rows={2} cols={5} />
                    <View style={styles.headerAccentLine} />
                </View>

                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greetingText}>{greeting},</Text>
                        <Text style={styles.userName} numberOfLines={1}>{getDisplayName()}</Text>
                        <View style={styles.headerBadgesRow}>
                            <View style={styles.roleBadge}>
                                <FontAwesome5 name="chalkboard-teacher" size={9} color={COLORS.secondary} />
                                <Text style={styles.roleText}>{dashboardData.user_type}</Text>
                            </View>
                            {dashboardData.class_teacher && (
                                <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)' }]}>
                                    <FontAwesome5 name="chalkboard" size={9} color={COLORS.white} />
                                    <Text style={[styles.roleText, { color: COLORS.white }]}>CT: {dashboardData.class_teacher}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={require("./assets/logo.png")}
                                style={styles.avatar}
                                defaultSource={require("./assets/default.png")}
                            />
                            <View style={styles.onlineDot} />
                        </View>
                        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                            <FontAwesome5 name="sign-out-alt" size={11} color={COLORS.white} />
                            <Text style={styles.logoutBtnText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* ── SCROLLABLE CONTENT ── */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
                }
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* Dashboard Title */}
                    <View style={styles.titleSection}>
                        <View style={styles.titleIconBox}>
                            <Ionicons name="grid" size={18} color={COLORS.secondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.titleText}>Teacher Panel</Text>
                            <Text style={styles.dateText}>
                                {new Date().toLocaleDateString("en-US", {
                                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                                })}
                            </Text>
                        </View>
                    </View>

                    {/* ── QUICK STATS ── */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
                            <View style={styles.statIconBg}>
                                <FontAwesome5 name="users" size={15} color="rgba(255,255,255,0.9)" />
                            </View>
                            <Text style={styles.statNumber}>{dashboardData.student}</Text>
                            <Text style={styles.statLabel}>Students</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: COLORS.success }]}>
                            <View style={styles.statIconBg}>
                                <FontAwesome5 name="check-circle" size={15} color="rgba(255,255,255,0.9)" />
                            </View>
                            <Text style={styles.statNumber}>{dashboardData.present}</Text>
                            <Text style={styles.statLabel}>Present</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: COLORS.error }]}>
                            <View style={styles.statIconBg}>
                                <FontAwesome5 name="user-slash" size={14} color="rgba(255,255,255,0.9)" />
                            </View>
                            <Text style={styles.statNumber}>{dashboardData.absent}</Text>
                            <Text style={styles.statLabel}>Absent</Text>
                        </View>
                    </View>

                    {/* ── COLLECTION CARD ── */}
                    {/* <View style={styles.collectionCard}>
                        <View style={styles.collectionLeft}>
                            <View style={styles.collectionIconBox}>
                                <FontAwesome5 name="rupee-sign" size={18} color={COLORS.secondary} />
                            </View>
                            <View>
                                <Text style={styles.collectionLabel}>Today's Collection</Text>
                                <Text style={styles.collectionValue}>{formatCurrency(dashboardData.collection)}</Text>
                            </View>
                        </View>
                        <View style={styles.collectionArrow}>
                            <FontAwesome5 name="arrow-up" size={12} color={COLORS.success} />
                        </View>
                    </View> */}

                    {/* ── ALLOWED CLASSES ── */}
                    {dashboardData.allowed_classes.length > 0 && (
                        <View style={styles.classesCard}>
                            <View style={styles.classesHeader}>
                                <View style={styles.classesIconBox}>
                                    <Ionicons name="book" size={16} color={COLORS.secondary} />
                                </View>
                                <Text style={styles.classesTitle}>My Classes</Text>
                                <View style={styles.classesBadge}>
                                    <Text style={styles.classesBadgeText}>{dashboardData.allowed_classes.length}</Text>
                                </View>
                            </View>
                            <View style={styles.classChipsWrap}>
                                {dashboardData.allowed_classes.map((cls) => (
                                    <View key={cls.id} style={styles.classChip}>
                                        <View style={styles.chipDot} />
                                        <Text style={styles.classChipText}>Class {cls.class_name} - {cls.section_name}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── MENU SECTION ── */}
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconBox}>
                            <Ionicons name="apps" size={15} color={COLORS.secondary} />
                        </View>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                    </View>

                    {/* ── MENU GRID ── */}
                    <View style={styles.menuGrid}>
                        {menuItems.map((item, index) => (
                            <Animated.View
                                key={item.id}
                                style={{ transform: [{ scale: scaleAnims[index] }], opacity: scaleAnims[index] }}
                            >
                                <TouchableOpacity
                                    style={styles.menuCard}
                                    onPress={() => handleMenuPress(item.route)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.menuCardAccent, { backgroundColor: item.color }]} />
                                    <View style={[styles.menuIconCircle, { backgroundColor: item.color + '15' }]}>
                                        <View style={[styles.menuIconInner, { backgroundColor: item.color }]}>
                                            <FontAwesome5 name={item.icon} size={18} color={COLORS.white} />
                                        </View>
                                    </View>
                                    <Text style={styles.menuCardTitle} numberOfLines={2}>{item.title}</Text>
                                    <Text style={styles.menuCardDesc} numberOfLines={2}>{item.description}</Text>
                                    <View style={[styles.menuArrow, { backgroundColor: item.color + '12' }]}>
                                        <FontAwesome5 name="chevron-right" size={10} color={item.color} />
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                    <View style={{ height: 30 }} />
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ── Styles ──
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Loading
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    loadingContent: { alignItems: 'center' },
    loadingIconRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(122,12,46,0.08)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 18,
    },
    loadingIconInner: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: COLORS.white,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
    },
    loadingText: { fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
    loadingSubtext: { fontSize: 12, color: COLORS.gray },

    // Header
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: 50, paddingBottom: 22, paddingHorizontal: 18,
        overflow: 'hidden',
    },
    headerDecorations: { ...StyleSheet.absoluteFillObject },
    headerBlob: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: COLORS.secondary, opacity: 0.08, top: -35, right: -45,
    },
    headerRing: { position: 'absolute', top: 10, left: -35 },
    headerAccentLine: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, backgroundColor: COLORS.secondary, opacity: 0.5,
    },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flex: 1, marginRight: 12 },
    greetingText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 2 },
    userName: { fontSize: 20, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3, marginBottom: 6 },
    headerBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    roleBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(212,175,55,0.18)',
        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 14,
        borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
    },
    roleText: { fontSize: 9, fontWeight: '700', color: COLORS.secondary, textTransform: 'uppercase', letterSpacing: 0.8 },
    headerRight: { alignItems: 'center' },
    avatarWrapper: {
        width: 48, height: 48, borderRadius: 24,
        borderWidth: 2, borderColor: 'rgba(212,175,55,0.5)',
        overflow: 'hidden', marginBottom: 6,
    },
    avatar: { width: '100%', height: '100%', borderRadius: 24 },
    onlineDot: {
        position: 'absolute', bottom: 8, right: -1,
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.primary,
    },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    },
    logoutBtnText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

    // Scroll
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },

    // Title
    titleSection: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    titleIconBox: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(212,175,55,0.1)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)',
    },
    titleText: { fontSize: 18, fontWeight: '800', color: COLORS.ink, letterSpacing: 0.2 },
    dateText: { fontSize: 11, color: COLORS.gray, fontWeight: '500', marginTop: 1 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statCard: {
        flex: 1, borderRadius: 14, padding: 14, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    },
    statIconBg: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    },
    statNumber: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 2 },
    statLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Collection
    collectionCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.white, borderRadius: 14, padding: 16,
        marginBottom: 14,
        borderWidth: 1, borderColor: '#F0F0F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    collectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    collectionIconBox: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(212,175,55,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    collectionLabel: { fontSize: 11, color: COLORS.gray, fontWeight: '500', marginBottom: 2 },
    collectionValue: { fontSize: 20, fontWeight: '800', color: COLORS.ink },
    collectionArrow: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(16,185,129,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },

    // Classes
    classesCard: {
        backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 14,
        borderWidth: 1, borderColor: '#F0F0F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    classesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    classesIconBox: {
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: 'rgba(212,175,55,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    classesTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.ink },
    classesBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    },
    classesBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
    classChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    classChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(122,12,46,0.06)',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(122,12,46,0.1)',
    },
    chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
    classChipText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

    // Section Header
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionIconBox: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: 'rgba(212,175,55,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.ink },

    // Menu Grid
    menuGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'space-between', gap: 12,
        marginBottom: 18,
    },
    menuCard: {
        width: (width - 44) / 2,
        backgroundColor: COLORS.white, borderRadius: 16,
        padding: 16, paddingTop: 18,
        borderWidth: 1, borderColor: '#F0F0F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        overflow: 'hidden', position: 'relative',
    },
    menuCardAccent: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
    },
    menuIconCircle: {
        width: 52, height: 52, borderRadius: 26,
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    menuIconInner: {
        width: 38, height: 38, borderRadius: 19,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
    },
    menuCardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.ink, marginBottom: 3, lineHeight: 17 },
    menuCardDesc: { fontSize: 10, color: COLORS.gray, lineHeight: 14, marginBottom: 10 },
    menuArrow: {
        width: 24, height: 24, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end',
    },

    // Activity Card
    activityCard: {
        backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#F0F0F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    activityHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    },
    activityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    activityIconBox: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: 'rgba(212,175,55,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    activityTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
    refreshBtn: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: 'rgba(212,175,55,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },

    // Tabs
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 8, borderRadius: 10,
        backgroundColor: '#F8F8F8',
    },
    tabActive: { backgroundColor: COLORS.success },
    tabText: { fontSize: 11, fontWeight: '600', color: COLORS.gray },
    tabTextActive: { color: COLORS.white },

    // Activity Items
    activityList: { gap: 2 },
    activityItem: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    activityDot: {
        width: 8, height: 8, borderRadius: 4,
        marginTop: 5, marginRight: 10,
    },
    activityBody: { flex: 1 },
    activityRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2,
    },
    activityLabel: { fontSize: 13, fontWeight: '600', color: COLORS.ink, flex: 1 },
    activityAmount: { fontSize: 13, fontWeight: '700' },
    activityBadge: {
        fontSize: 10, fontWeight: '600', color: COLORS.primary,
        backgroundColor: 'rgba(122,12,46,0.08)',
        paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6,
        overflow: 'hidden',
    },
    activitySub: { fontSize: 11, color: COLORS.gray },
    activityDate: { fontSize: 10, color: COLORS.gray, fontWeight: '500' },

    // Empty State
    emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyStateText: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },

    // Summary Footer
    summaryFooter: {
        marginTop: 12, paddingTop: 10,
        borderTopWidth: 1, borderTopColor: '#F5F5F5',
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    summaryLabel: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
    summaryValue: { fontSize: 14, fontWeight: '700', color: COLORS.success },
});