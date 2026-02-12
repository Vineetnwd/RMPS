import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#7A0C2E',
    primaryDark: '#5A0820',
    secondary: '#D4AF37',
    secondaryLight: '#E6C35C',
    white: '#FFFFFF',
    ink: '#0F172A',
    gray: '#64748B',
    lightGray: '#E2E8F0',
    error: '#DC2626',
    success: '#10B981',
    background: '#FDF5F7',
};

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }: any) => (
    <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth, borderColor: color, backgroundColor: 'transparent' }, style]} />
);

const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }: any) => (
    <View style={[{ width: size, height: size, backgroundColor: color, transform: [{ rotate: '45deg' }] }, style]} />
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

export default function TeacherHomeworkHistory() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [homeworkList, setHomeworkList] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [currentUrl, setCurrentUrl] = useState('');
    const [webViewVisible, setWebViewVisible] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const storedUserId = await AsyncStorage.getItem('user_id');
            setUserId(storedUserId);
            if (storedUserId) {
                fetchHomeworkHistory(storedUserId);
            } else {
                setLoading(false);
                Alert.alert("Error", "User ID not found");
            }
        } catch (e) {
            setLoading(false);
        }
    };

    const fetchHomeworkHistory = async (id: string) => {
        setLoading(true);
        try {
            const branchId = await AsyncStorage.getItem('branch_id');

            console.log('Fetching homework history for created_by:', id, 'branch:', branchId);

            const response = await fetch('https://rmpublicschool.org/binex/api.php?task=get_teacher_homework', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    created_by: id,
                    branch_id: branchId
                }),
            });

            const text = await response.text();
            console.log('Teacher Homework Response:', text);

            try {
                const data = JSON.parse(text);
                if (data.status === 'success' || Array.isArray(data)) {
                    setHomeworkList(Array.isArray(data) ? data : data.data || []);
                } else {
                    setHomeworkList([]);
                }
            } catch (e) {
                console.error(e);
                setHomeworkList([]);
            }

        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to fetch homework history');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        if (userId) fetchHomeworkHistory(userId);
        else setRefreshing(false);
    };

    const handleOpenAttachment = (filename: string) => {
        if (!filename) return;
        const url = `https://rmpublicschool.org/binex/homework/${filename}`;
        const ext = filename.split('.').pop()?.toLowerCase();

        if (Platform.OS === 'android' && (ext === 'pdf' || ext === 'doc' || ext === 'docx')) {
            setCurrentUrl(`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`);
        } else {
            setCurrentUrl(url);
        }
        setWebViewVisible(true);
    };

    const renderItem = ({ item, index }: any) => {
        return (
            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.classBadge}>
                        <Ionicons name="school" size={14} color={COLORS.white} />
                        <Text style={styles.classBadgeText}>{item.class_name || item.hw_class} - {item.section_name || item.hw_section}</Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(item.hw_date || item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </View>

                <View style={styles.subjectRow}>
                    <Ionicons name="book" size={16} color={COLORS.primary} />
                    <Text style={styles.subjectText}>{item.subject_name || item.subject}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.contentContainer}>
                    {item.hw_text ? (
                        <RenderHtml
                            contentWidth={width - 60}
                            source={{ html: item.hw_text }}
                            tagsStyles={{ body: { color: COLORS.ink, fontSize: 13 } }}
                        />
                    ) : (
                        <Text style={styles.noContentText}>No text content</Text>
                    )}
                </View>

                {item.hw_file ? (
                    <TouchableOpacity style={styles.attachmentButton} onPress={() => handleOpenAttachment(item.hw_file)}>
                        <Ionicons name="attach" size={18} color={COLORS.white} />
                        <Text style={styles.attachmentText} numberOfLines={1}>{item.hw_file}</Text>
                        <Ionicons name="open-outline" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                ) : null}
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerDecorations} pointerEvents="none">
                    <CircleRing size={100} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', top: -20, right: -20 }} />
                    <DottedPattern style={{ position: 'absolute', bottom: 20, left: 20 }} dotColor="rgba(255,255,255,0.2)" />
                </View>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Uploaded Homework</Text>
                        <Text style={styles.headerSubtitle}>History of assignments</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={homeworkList}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={60} color={COLORS.gray} />
                            <Text style={styles.emptyText}>No uploaded homework found</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} /> : <View style={{ height: 20 }} />}
            />

            <Modal visible={webViewVisible} animationType="slide" onRequestClose={() => setWebViewVisible(false)}>
                <View style={styles.webViewContainer}>
                    <View style={styles.webViewHeader}>
                        <Text style={styles.webViewTitle}>Document Viewer</Text>
                        <TouchableOpacity onPress={() => setWebViewVisible(false)} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                    <WebView
                        source={{ uri: currentUrl }}
                        style={{ flex: 1 }}
                        startInLoadingState
                        scalesPageToFit
                        javaScriptEnabled
                        domStorageEnabled
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDF5F7' },
    header: { backgroundColor: COLORS.primary, paddingTop: 40, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
    headerDecorations: { ...StyleSheet.absoluteFillObject },
    headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
    backButton: { marginRight: 16, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    listContent: { padding: 16 },
    card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    classBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
    classBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
    dateText: { color: COLORS.gray, fontSize: 12 },
    subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    subjectText: { fontSize: 16, fontWeight: '700', color: COLORS.ink },
    divider: { height: 1, backgroundColor: COLORS.lightGray, marginBottom: 12 },
    contentContainer: { marginBottom: 12 },
    noContentText: { color: COLORS.gray, fontStyle: 'italic', fontSize: 12 },
    attachmentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, padding: 10, borderRadius: 10, gap: 8 },
    attachmentText: { flex: 1, color: COLORS.white, fontSize: 12, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: COLORS.gray, marginTop: 10, fontSize: 14 },
    dottedContainer: { position: 'absolute' },
    dottedRow: { flexDirection: 'row', marginBottom: 6 },
    dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
    webViewContainer: { flex: 1, backgroundColor: COLORS.white },
    webViewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 50 : 16 },
    webViewTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    closeButton: { padding: 4 },
});
