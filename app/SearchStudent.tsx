import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
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
};

// Vector Shape Components
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

export default function SearchStudentScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState([
    "RAHUL",
    "PRIYA",
    "ANKIT",
  ]);
  const [hasSearched, setHasSearched] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 20000, useNativeDriver: true })
    ).start();
  }, []);

  const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Function to handle search
  const handleSearch = async (text = searchText) => {
    if (!text.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    Keyboard.dismiss();

    try {
      const response = await axios.post(
        "https://rmpublicschool.org/binex/api.php?task=search_student",
        { search_text: text }
      );

      if (response.data.status === "success") {
        setStudents(response.data.data);

        // Add to recent searches if not already there
        if (!recentSearches.includes(text.toUpperCase()) && text.trim()) {
          setRecentSearches((prev) => [
            text.toUpperCase(),
            ...prev.slice(0, 4),
          ]);
        }
      } else {
        setError("No students found matching your search");
        setStudents([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search. Please check your connection.");
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clear search
  const clearSearch = () => {
    setSearchText("");
    setStudents([]);
    setError(null);
    setHasSearched(false);
  };

  // Function to handle recent search click
  const handleRecentSearch = (text: string) => {
    setSearchText(text);
    handleSearch(text);
  };

  const renderStudentCard = ({ item, index }: { item: any, index: number }) => {
    // Generate a consistent color based on the student ID
    const colorIndex = parseInt(item.id) % 5;
    const cardColors = [COLORS.primary, COLORS.secondary, COLORS.success, '#8B5CF6', '#EC4899'];
    const accentColor = cardColors[colorIndex];

    return (
      <Animated.View
        style={[
          styles.studentCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: Animated.multiply(
                  slideAnim,
                  new Animated.Value(index * 0.1 + 1)
                ),
              },
            ],
          },
        ]}
      >
        <View style={[styles.statusBar, { backgroundColor: accentColor }]} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: accentColor + '15' }]}>
              <Text style={[styles.avatarText, { color: accentColor }]}>{item.student_name.charAt(0)}</Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.student_name}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={14} color={COLORS.gray} />
                <Text style={styles.classText}>Class {item.student_class}-{item.student_section} • {item.student_gender || 'Student'}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'ACTIVE' ? COLORS.success + '15' : COLORS.error + '15' }]}>
              <Text style={[styles.statusText, { color: item.status === 'ACTIVE' ? COLORS.success : COLORS.error }]}>{item.status || 'Active'}</Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={COLORS.gray} />
              <Text style={styles.detailLabel}>Father:</Text>
              <Text style={styles.detailValue}>{item.student_father}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={16} color={COLORS.gray} />
              <Text style={styles.detailLabel}>Mobile:</Text>
              <Text style={styles.detailValue}>{item.student_mobile}</Text>
            </View>
            {item.admission_no && (
              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailLabel}>Adm No:</Text>
                <Text style={styles.detailValue}>{item.admission_no}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.attendanceButton]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: "/Attendance",
                  params: { student_id: item.id }
                });
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.feesButton]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: "/PayFee",
                  params: {
                    student_id: item.id,
                    student_name: item.student_name,
                    student_class: item.student_class,
                    student_section: item.student_section,
                    student_father: item.student_father,
                    student_mobile: item.student_mobile,
                    admission_no: item.admission_no || `ID/${item.id}`,
                  },
                });
              }}
            >
              <Ionicons name="wallet-outline" size={16} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Pay Fees</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.recentPill}
      onPress={() => handleRecentSearch(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="time-outline" size={14} color={COLORS.gray} style={styles.recentIcon} />
      <Text style={styles.recentText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Search Student</Text>
              <Text style={styles.headerSubtitle}>Find student details easily</Text>
            </View>
            <View style={styles.placeholderButton} />
          </View>

          <View style={styles.searchBoxContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color={COLORS.primary} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, ID..."
              placeholderTextColor={COLORS.gray}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              autoCapitalize="words"
              autoFocus={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={COLORS.gray} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch()}>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        {!hasSearched && recentSearches.length > 0 && (
          <View style={styles.recentContainer}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <FlatList
              data={recentSearches}
              renderItem={renderRecentSearch}
              keyExtractor={(item, index) => "recent-" + index}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            />
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.logoCircle}><Ionicons name="search" size={32} color={COLORS.primary} /></View>
            <Text style={styles.loadingText}>Searching students...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="alert-circle" size={40} color={COLORS.warning} />
            </View>
            <Text style={styles.emptyTitle}>No Results Found</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => handleSearch()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : hasSearched && students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="search" size={40} color={COLORS.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptyText}>Try adjusting your search criteria</Text>
          </View>
        ) : (
          <FlatList
            data={students}
            renderItem={renderStudentCard}
            keyExtractor={(item: any) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              hasSearched ? (
                <Text style={styles.resultsCount}>Found {students.length} students</Text>
              ) : null
            }
            ListEmptyComponent={
              !hasSearched ? (
                <View style={[styles.emptyContainer, { paddingTop: 40 }]}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="people" size={40} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>Find Students</Text>
                  <Text style={styles.emptyText}>Search for students to view details, pay fees, or take attendance</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  header: { backgroundColor: COLORS.primary, paddingTop: 10, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
  headerDecorations: { ...StyleSheet.absoluteFillObject },
  headerBlob: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.secondary, opacity: 0.12, top: -40, right: -50 },
  headerRing: { position: 'absolute', top: 30, left: -30 },
  headerDiamond1: { position: 'absolute', top: 80, right: 60 },
  headerDiamond2: { position: 'absolute', top: 120, right: 100 },
  headerDots: { position: 'absolute', bottom: 60, left: 30 },
  headerContent: { paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  placeholderButton: { width: 44 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, fontWeight: '500' },
  searchBoxContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF5F7', borderRadius: 12, padding: 8, paddingLeft: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 4 },
  searchIconContainer: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 12, color: COLORS.ink, height: 40 },
  clearButton: { padding: 4, marginRight: 4 },
  searchButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  mainContent: { flex: 1, backgroundColor: '#FDF5F7' },
  recentContainer: { paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gray, marginLeft: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  recentList: { paddingHorizontal: 20 },
  recentPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF5F7', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  recentIcon: { marginRight: 6 },
  recentText: { fontSize: 12, fontWeight: '600', color: COLORS.ink },

  listContainer: { padding: 10, paddingBottom: 40 },
  resultsCount: { fontSize: 12, color: COLORS.gray, fontWeight: '600', marginBottom: 12, textAlign: 'center' },

  studentCard: { backgroundColor: '#FDF5F7', borderRadius: 10, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)' },
  statusBar: { height: 4 },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 12, fontWeight: '800' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  classText: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  detailsContainer: { backgroundColor: '#FDF5F7', borderRadius: 12, padding: 10, gap: 8, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 12, color: COLORS.gray, fontWeight: '500', width: 60 },
  detailValue: { fontSize: 12, color: COLORS.ink, fontWeight: '600', flex: 1 },

  actionRow: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12, gap: 8 },
  attendanceButton: { backgroundColor: COLORS.secondary },
  feesButton: { backgroundColor: COLORS.success },
  actionButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.white },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.secondary, marginBottom: 16 },
  loadingText: { fontSize: 12, fontWeight: '600', color: COLORS.gray },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(122, 12, 46, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 12, fontWeight: '700', color: COLORS.ink, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 12, color: COLORS.gray, textAlign: 'center', lineHeight: 20 },
  retryButton: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: COLORS.primary, borderRadius: 10 },
  retryButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  dottedContainer: { position: 'absolute' },
  dottedRow: { flexDirection: 'row', marginBottom: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
});
