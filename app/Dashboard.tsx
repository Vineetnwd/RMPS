import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  background: '#FDF5F7',
  cream: '#FFF5EC',
  cardBg: '#FFFFFF',
};

type DashboardData = {
  student: number;
  absent: number;
  collection: string | number;
  full_name: string;
  user_type: string;
  recent_receipts: Receipt[];
  recent_students: Student[];
};

type Receipt = {
  id: number;
  student_id: number;
  paid_amount: string | number;
  paid_date: string;
};

type Student = {
  id: number;
  student_name?: string | null;
  created_at: string;
};

type MenuItem = {
  id: number;
  title: string;
  icon: ComponentProps<typeof FontAwesome5>["name"];
  color: string;
  route: string;
  description: string;
  adminOnly?: boolean;
};

type DiamondShapeProps = {
  style?: object;
  color?: string;
  size?: number;
};

type CircleRingProps = {
  style?: object;
  color?: string;
  size?: number;
  borderWidth?: number;
};

type DottedPatternProps = {
  style?: object;
  rows?: number;
  cols?: number;
  dotColor?: string;
};

// Vector Shape Components
const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }: DiamondShapeProps) => (
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

const CircleRing = ({
  style,
  color = COLORS.secondary,
  size = 60,
  borderWidth = 3
}: CircleRingProps) => (
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

const DottedPattern = ({
  style,
  rows = 3,
  cols = 4,
  dotColor = COLORS.secondary
}: DottedPatternProps) => (
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

export default function DashboardScreen() {
  const { branch_id: routeBranchId } = useLocalSearchParams<{ branch_id?: string }>();
  const [greeting, setGreeting] = useState("");
  const [branchName, setBranchName] = useState("School Dashboard");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("receipts");
  const [showSwitchBranch, setShowSwitchBranch] = useState(false);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    student: 0,
    absent: 0,
    collection: "0.00",
    full_name: "",
    user_type: "",
    recent_receipts: [],
    recent_students: []
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      setGreeting("Good Morning");
    } else if (currentHour < 18) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }

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

  // Refetch dashboard data when screen gains focus (e.g., after switching branch)
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [routeBranchId])
  );

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('user_id') || '2';

      // Check if user has multiple branches
      const storedBranchId = await AsyncStorage.getItem('branch_id');
      const effectiveBranchId = routeBranchId ? String(routeBranchId) : storedBranchId;
      if (routeBranchId && routeBranchId !== storedBranchId) {
        await AsyncStorage.setItem('branch_id', String(routeBranchId));
      }
      const allowedBranch = await AsyncStorage.getItem('allowed_branch');
      console.log("[Dashboard] route branch_id:", routeBranchId);
      console.log("[Dashboard] stored branch_id:", storedBranchId);
      console.log("[Dashboard] effective branch_id:", effectiveBranchId);

      // Store current branch_id for navigation
      setCurrentBranchId(effectiveBranchId);

      if (allowedBranch) {
        const branchArray = allowedBranch.split(',').map(b => b.trim());
        // Show switch button only if there are multiple branches
        setShowSwitchBranch(branchArray.length > 1);

        // Fetch branch details to get name
        try {
          const branchResponse = await fetch('https://rmpublicschool.org/binex/api.php?task=allowed_branch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowed_branch: allowedBranch }),
          });
          const branchData = await branchResponse.json();
          if (Array.isArray(branchData)) {
            const currentBranch = branchData.find((b: any) => b.id == effectiveBranchId);
            if (currentBranch) {
              setBranchName(currentBranch.inst_name);
            }
          }
        } catch (error) {
          console.error('Error fetching branch name:', error);
        }
      } else {
        setShowSwitchBranch(false);
      }

      const response = await fetch('https://rmpublicschool.org/binex/api.php?task=dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: parseInt(userId),
          branch_id: effectiveBranchId
        }),
      });

      const data = await response.json();
      setDashboardData(data);
      console.log("Dashboard data:", data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'user_id',
                'full_name',
                'user_type',
                'isLoggedIn'
              ]);

              router.replace('/admin_login');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short"
      });
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "number" ? amount : parseFloat(amount);
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(1)}L`;
    } else if (num >= 1000) {
      return `₹${(num / 1000).toFixed(1)}K`;
    }
    return `₹${num.toFixed(0)}`;
  };

  const formatFullCurrency = (amount: string | number) => {
    const num = typeof amount === "number" ? amount : parseFloat(amount);
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const menuItems: MenuItem[] = [
    {
      id: 1,
      title: "Search Student",
      icon: "search",
      color: COLORS.primary,
      route: "SearchStudent",
      description: "Find student records",
    },
    {
      id: 2,
      title: "Teacher Attendance",
      icon: "user-clock",
      color: COLORS.secondary,
      route: "TeacherAttendance",
      description: "View teacher logs",
    },
    {
      id: 4,
      title: "Collection Report",
      icon: "file-invoice-dollar",
      color: COLORS.success,
      route: "CollectionReport",
      description: "View fee collection stats",
    },
    {
      id: 5,
      title: "Dues List",
      icon: "exclamation-circle",
      color: COLORS.error,
      route: "DuesList",
      description: "Check pending payments",
    },
    {
      id: 6,
      title: "Teacher Leaves",
      icon: "file-signature",
      color: COLORS.primaryLight,
      route: "TeacherLeaves",
      description: "Manage leave requests",
    },
    {
      id: 7,
      title: "Notice Board",
      icon: "bullhorn",
      color: COLORS.warning,
      route: "Notice",
      description: "Update Important Notices",
    },
    {
      id: 8,
      title: "Leave Applications",
      icon: "calendar-alt",
      color: "#8B5CF6",
      route: "AppliedLeaveScreen",
      description: "Review Student Leaves",
      adminOnly: true,
    },
    {
      id: 9,
      title: "Complaints",
      icon: "comments",
      color: "#EC4899",
      route: "ComplaintsScreen",
      description: "View Student Complaints",
      adminOnly: true,
    },
  ];

  const handleMenuPress = (route: string) => {
    router.push({
      pathname: `/${route}` as any,
      params: { branch_id: currentBranchId || '' }
    });
    console.log(`Navigating to ${route} with branch_id: ${currentBranchId}`);
  };

  const renderReceiptItem = (receipt: Receipt, index: number) => (
    <View key={`receipt-${receipt.id}`} style={styles.activityItem}>
      <View
        style={[
          styles.activityIconContainer,
          { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
        ]}
      >
        <FontAwesome5 name="rupee-sign" size={16} color={COLORS.success} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>Fee Collected</Text>
        <Text style={styles.activityDescription}>
          Student ID: {receipt.student_id} - {formatFullCurrency(receipt.paid_amount)}
        </Text>
      </View>
      <View style={styles.activityTimeContainer}>
        <Text style={styles.activityTime}>{formatDate(receipt.paid_date)}</Text>
        <View style={styles.receiptBadge}>
          <Text style={styles.receiptBadgeText}>#{receipt.id}</Text>
        </View>
      </View>
    </View>
  );

  const renderStudentItem = (student: Student, index: number) => (
    <View key={`student-${student.id}`} style={styles.activityItem}>
      <View
        style={[
          styles.activityIconContainer,
          { backgroundColor: 'rgba(122, 12, 46, 0.15)' },
        ]}
      >
        <FontAwesome5 name="user-plus" size={16} color={COLORS.primary} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>New Student Added</Text>
        <Text style={styles.activityDescription}>
          {student.student_name || `Student ID: ${student.id}`}
        </Text>
      </View>
      <View style={styles.activityTimeContainer}>
        <Text style={styles.activityTime}>{formatDateTime(student.created_at)}</Text>
        <View style={[styles.receiptBadge, { backgroundColor: 'rgba(122, 12, 46, 0.1)' }]}>
          <Text style={[styles.receiptBadgeText, { color: COLORS.primary }]}>#{student.id}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="grid" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
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
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{dashboardData.full_name}</Text>
            <View style={styles.userRolePill}>
              <FontAwesome5 name="shield-alt" size={10} color={COLORS.secondary} />
              <Text style={styles.userRole}>{dashboardData.user_type}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.avatarContainer}>
              <Image
                source={require("./assets/logo.png")}
                style={styles.avatar}
                defaultSource={require("./assets/default.png")}
              />
              <View style={styles.statusIndicator} />
            </View>
            <View style={styles.headerButtonsRow}>
              {showSwitchBranch && (
                <TouchableOpacity
                  style={styles.switchBranchButton}
                  onPress={() => router.push('/SwitchBranch')}
                  activeOpacity={0.7}
                >
                  <FontAwesome5 name="exchange-alt" size={11} color={COLORS.secondary} />
                  <Text style={styles.switchBranchText}>Branch</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="sign-out-alt" size={12} color={COLORS.white} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          {/* Dashboard Header */}
          <View style={styles.dashboardHeader}>
            <View style={styles.dashboardTitleRow}>
              <View style={styles.dashboardIconContainer}>
                <Ionicons name="grid" size={20} color={COLORS.secondary} />
              </View>
              <View>
                <Text style={styles.dashboardTitle}>{branchName}</Text>
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStatsContainer}>
            <View style={[styles.quickStatCard, { backgroundColor: COLORS.primary }]}>
              <View style={styles.statIconContainer}>
                <FontAwesome5 name="users" size={18} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.quickStatNumber}>{dashboardData.student}</Text>
              <Text style={styles.quickStatLabel}>Total Students</Text>
            </View>
            <View style={[styles.quickStatCard, { backgroundColor: COLORS.success }]}>
              <View style={styles.statIconContainer}>
                <FontAwesome5 name="rupee-sign" size={18} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.quickStatNumber}>
                {formatCurrency(dashboardData.collection)}
              </Text>
              <Text style={styles.quickStatLabel}>Total Collection</Text>
            </View>
            <View style={[styles.quickStatCard, { backgroundColor: COLORS.error }]}>
              <View style={styles.statIconContainer}>
                <FontAwesome5 name="user-slash" size={18} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.quickStatNumber}>{dashboardData.absent}</Text>
              <Text style={styles.quickStatLabel}>Absent Today</Text>
            </View>
          </View>

          {/* Section Title */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Ionicons name="apps" size={16} color={COLORS.secondary} />
            </View>
            <Text style={styles.sectionTitle}>Management Tools</Text>
          </View>

          {/* Menu Grid */}
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item.route)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: item.color + '15' },
                  ]}
                >
                  <FontAwesome5 name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Activity Section */}
          <View style={styles.recentActivityContainer}>
            <View style={styles.recentActivityHeader}>
              <View style={styles.activityTitleRow}>
                <View style={styles.activityHeaderIcon}>
                  <Ionicons name="time" size={16} color={COLORS.secondary} />
                </View>
                <Text style={styles.recentActivityTitle}>Recent Activity</Text>
              </View>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={fetchDashboardData}
              >
                <FontAwesome5 name="sync-alt" size={12} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {/* Tab Buttons */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "receipts" && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab("receipts")}
              >
                <FontAwesome5
                  name="rupee-sign"
                  size={12}
                  color={activeTab === "receipts" ? COLORS.white : COLORS.success}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "receipts" && styles.activeTabButtonText,
                  ]}
                >
                  Fee Receipts ({dashboardData.recent_receipts?.length || 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "students" && [styles.activeTabButton, { backgroundColor: COLORS.primary }],
                ]}
                onPress={() => setActiveTab("students")}
              >
                <FontAwesome5
                  name="user-plus"
                  size={12}
                  color={activeTab === "students" ? COLORS.white : COLORS.primary}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "students" && styles.activeTabButtonText,
                  ]}
                >
                  New Students ({dashboardData.recent_students?.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Activity List */}
            <View style={styles.activityList}>
              {activeTab === "receipts" ? (
                dashboardData.recent_receipts && dashboardData.recent_receipts.length > 0 ? (
                  dashboardData.recent_receipts.map((receipt, index) =>
                    renderReceiptItem(receipt, index)
                  )
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyStateIcon}>
                      <FontAwesome5 name="receipt" size={32} color={COLORS.secondary} />
                    </View>
                    <Text style={styles.emptyStateText}>No recent receipts</Text>
                  </View>
                )
              ) : (
                dashboardData.recent_students && dashboardData.recent_students.length > 0 ? (
                  dashboardData.recent_students.map((student, index) =>
                    renderStudentItem(student, index)
                  )
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyStateIcon}>
                      <FontAwesome5 name="users" size={32} color={COLORS.secondary} />
                    </View>
                    <Text style={styles.emptyStateText}>No recent students</Text>
                  </View>
                )
              )}
            </View>

            {/* Summary Footer */}
            {activeTab === "receipts" && dashboardData.recent_receipts?.length > 0 && (
              <View style={styles.summaryFooter}>
                <Text style={styles.summaryLabel}>Total from recent:</Text>
                <Text style={styles.summaryText}>
                  {formatFullCurrency(
                    dashboardData.recent_receipts.reduce(
                      (sum, receipt) => sum + Number(receipt.paid_amount),
                      0
                    )
                  )}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
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
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 13,
    color: COLORS.gray,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerDecorations: {
    ...StyleSheet.absoluteFillObject,
  },
  headerBlob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary,
    opacity: 0.1,
    top: -40,
    right: -50,
  },
  headerRing: {
    position: 'absolute',
    top: 15,
    left: -30,
  },
  headerDiamond1: {
    position: 'absolute',
    top: 50,
    right: 60,
  },
  headerDiamond2: {
    position: 'absolute',
    top: 80,
    right: 100,
  },
  headerDots: {
    position: 'absolute',
    bottom: 30,
    left: 30,
  },
  headerStripe: {
    position: 'absolute',
    width: 3,
    height: 50,
    backgroundColor: COLORS.secondary,
    opacity: 0.25,
    right: 40,
    bottom: 15,
    borderRadius: 2,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 6,
  },
  userRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 16,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  userRole: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  branchNamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
    alignSelf: 'flex-start',
    gap: 5,
    maxWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  branchNameText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
    flexShrink: 1,
  },
  headerActions: {
    alignItems: "flex-end",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    backgroundColor: COLORS.white,
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
  },
  headerButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  switchBranchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  switchBranchText: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: "700",
  },


  // Scroll
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
  },

  // Dashboard Header
  dashboardHeader: {
    marginBottom: 14,
  },
  dashboardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dashboardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.ink,
    marginBottom: 1,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '500',
  },

  // Quick Stats
  quickStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
  },
  quickStatCard: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickStatNumber: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 1,
  },
  quickStatLabel: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.9,
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },

  // Menu Grid
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  menuItem: {
    width: (width - 42) / 2,
    backgroundColor: '#FDF5F7',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5E8EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 10,
    color: COLORS.gray,
    lineHeight: 14,
  },

  // Recent Activity
  recentActivityContainer: {
    backgroundColor: '#FDF5F7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5E8EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  recentActivityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentActivityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  refreshButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FFF5F0',
    gap: 5,
  },
  activeTabButton: {
    backgroundColor: COLORS.success,
  },
  tabButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.gray,
  },
  activeTabButtonText: {
    color: COLORS.white,
  },

  // Activity List
  activityList: {
    gap: 0,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E8EB',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.ink,
    marginBottom: 1,
  },
  activityDescription: {
    fontSize: 11,
    color: COLORS.gray,
  },
  activityTimeContainer: {
    alignItems: "flex-end",
  },
  activityTime: {
    fontSize: 9,
    color: COLORS.gray,
    marginBottom: 3,
    fontWeight: '500',
  },
  receiptBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  receiptBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.success,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyStateIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },

  // Summary Footer
  summaryFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5E8EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.success,
  },

  // Dotted Pattern
  dottedContainer: {
    position: 'absolute',
  },
  dottedRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 3,
  },
});
