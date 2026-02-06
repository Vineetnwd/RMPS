import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
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

interface Branch {
    id: string;
    inst_name: string;
}

export default function SwitchBranchScreen() {
    const router = useRouter();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
    const [switching, setSwitching] = useState(false);

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

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const allowedBranch = await AsyncStorage.getItem('allowed_branch');
            const branchId = await AsyncStorage.getItem('branch_id');
            setCurrentBranchId(branchId);

            if (!allowedBranch) {
                Alert.alert('Error', 'No branches available');
                router.back();
                return;
            }

            const response = await fetch('https://rmpublicschool.org/binex/api.php?task=allowed_branch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allowed_branch: allowedBranch }),
            });

            const result = await response.json();

            if (Array.isArray(result) && result.length > 0) {
                setBranches(result);
            } else {
                Alert.alert('Error', 'No branches found');
            }
        } catch (err) {
            console.error('Error fetching branches:', err);
            Alert.alert('Error', 'Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    const handleBranchSelect = async (branch: Branch) => {
        if (branch.id === currentBranchId) {
            Alert.alert('Info', 'This branch is already selected');
            return;
        }

        Alert.alert(
            'Switch Branch',
            `Are you sure you want to switch to "${branch.inst_name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Switch',
                    onPress: async () => {
                        try {
                            setSwitching(true);
                            const nextBranchId = String(branch.id);
                            console.log("[SwitchBranch] switching to branch_id:", nextBranchId);
                            await AsyncStorage.setItem('branch_id', nextBranchId);
                            await AsyncStorage.setItem('branch_name', branch.inst_name);
                            const storedBranchId = await AsyncStorage.getItem('branch_id');
                            console.log("[SwitchBranch] stored branch_id:", storedBranchId);
                            setCurrentBranchId(nextBranchId);

                            Alert.alert('Success', `Switched to ${branch.inst_name}`, [
                                {
                                    text: 'OK',
                                    onPress: () =>
                                        router.replace({
                                            pathname: '/Dashboard',
                                            params: {
                                                branch_id: nextBranchId,
                                                branch_name: branch.inst_name,
                                                ts: Date.now().toString()
                                            }
                                        })
                                }
                            ]);
                        } catch (err) {
                            console.error('Error switching branch:', err);
                            Alert.alert('Error', 'Failed to switch branch');
                        } finally {
                            setSwitching(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.logoCircle}><Ionicons name="business" size={40} color={COLORS.primary} /></View>
                <Text style={styles.loadingText}>Loading Branches...</Text>
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
                        <View style={styles.headerTitleContainer}><Text style={styles.headerTitle}>Switch Branch</Text><Text style={styles.headerSubtitle}>Select your institution</Text></View>
                        <View style={styles.headerIconContainer}><Ionicons name="business" size={20} color={COLORS.white} /></View>
                    </View>
                    <Animated.View style={[styles.infoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.infoIconContainer}><Ionicons name="swap-horizontal" size={26} color={COLORS.primary} /></View>
                        <Text style={styles.infoText}>Select a branch to switch your current working institution</Text>
                    </Animated.View>
                </View>
            </View>

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <View style={styles.branchListHeader}>
                        <View style={styles.branchListIcon}><Ionicons name="list" size={18} color={COLORS.secondary} /></View>
                        <Text style={styles.branchListTitle}>Available Branches ({branches.length})</Text>
                    </View>

                    {branches.map((branch, index) => {
                        const isSelected = branch.id === currentBranchId;
                        return (
                            <TouchableOpacity
                                key={branch.id}
                                style={[styles.branchCard, isSelected && styles.branchCardSelected]}
                                onPress={() => handleBranchSelect(branch)}
                                activeOpacity={0.7}
                                disabled={switching}
                            >
                                <View style={[styles.branchIconContainer, isSelected && styles.branchIconContainerSelected]}>
                                    <Ionicons name="business" size={24} color={isSelected ? COLORS.white : COLORS.primary} />
                                </View>
                                <View style={styles.branchInfo}>
                                    <Text style={[styles.branchName, isSelected && styles.branchNameSelected]}>{branch.inst_name}</Text>
                                    <Text style={[styles.branchId, isSelected && styles.branchIdSelected]}>Branch ID: {branch.id}</Text>
                                </View>
                                {isSelected ? (
                                    <View style={styles.selectedBadge}>
                                        <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                                        <Text style={styles.selectedBadgeText}>Current</Text>
                                    </View>
                                ) : (
                                    <View style={styles.selectButton}>
                                        <Ionicons name="arrow-forward" size={18} color={COLORS.secondary} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {branches.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}><Ionicons name="business-outline" size={50} color={COLORS.lightGray} /></View>
                            <Text style={styles.emptyTitle}>No Branches Available</Text>
                            <Text style={styles.emptyText}>Contact admin to get branch access</Text>
                        </View>
                    )}
                </Animated.View>
                <View style={{ height: 30 }} />
            </ScrollView>

            {switching && (
                <View style={styles.switchingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.white} />
                    <Text style={styles.switchingText}>Switching Branch...</Text>
                </View>
            )}
        </SafeAreaView>
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
    headerDots: { position: 'absolute', bottom: 60, left: 30 },
    headerContent: { paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    headerIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
    headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, fontWeight: '500' },
    infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    infoIconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
    infoText: { flex: 1, fontSize: 13, color: COLORS.gray, lineHeight: 20 },
    scrollContainer: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { padding: 20 },
    branchListHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    branchListIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
    branchListTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink },
    branchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    branchCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
    branchIconContainer: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(122, 12, 46, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    branchIconContainerSelected: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
    branchInfo: { flex: 1 },
    branchName: { fontSize: 16, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
    branchNameSelected: { color: COLORS.white },
    branchId: { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
    branchIdSelected: { color: 'rgba(255, 255, 255, 0.8)' },
    selectedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
    selectedBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
    selectButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyIconContainer: { width: 100, height: 100, borderRadius: 30, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 8 },
    emptyText: { fontSize: 14, color: COLORS.gray },
    switchingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    switchingText: { marginTop: 16, fontSize: 16, fontWeight: '600', color: COLORS.white },
    dottedContainer: { position: 'absolute' },
    dottedRow: { flexDirection: 'row', marginBottom: 6 },
    dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
});
