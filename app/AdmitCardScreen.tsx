import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    Pressable,
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
import { WebView } from 'react-native-webview';

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
};

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

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth: bw = 3 }: any) => (
    <View
        style={[
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: bw,
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
                                opacity: 0.3 + (rowIndex * cols + colIndex) * 0.03,
                            },
                        ]}
                    />
                ))}
            </View>
        ))}
    </View>
);

const AdmitCardScreen = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [examList, setExamList] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [studentId, setStudentId] = useState('');
    const [branchId, setBranchId] = useState('1');
    const [admitCardData, setAdmitCardData] = useState<any[]>([]);
    const [studentClass, setStudentClass] = useState('');
    const [studentSection, setStudentSection] = useState('');
    const [studentAdmission, setStudentAdmission] = useState('');
    const [loading, setLoading] = useState(false);
    const [examListLoading, setExamListLoading] = useState(true);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [examModalVisible, setExamModalVisible] = useState(false);
    const [webViewVisible, setWebViewVisible] = useState(false);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
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

        initializeScreen();
    }, []);

    const floatTranslate = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const initializeScreen = async () => {
        // Read all needed values from AsyncStorage directly to avoid state race conditions
        let resolvedStudentId = '';
        let resolvedBranchId = '1';
        let resolvedStudentClass = '';

        try {
            const id = await AsyncStorage.getItem('student_id');
            if (id) {
                resolvedStudentId = id;
                setStudentId(id);
            } else {
                Alert.alert('Error', 'Student ID not found. Please login again.');
                setExamListLoading(false);
                return;
            }

            // Try to get branch_id and class from student_data
            const studentDataStr = await AsyncStorage.getItem('student_data');
            if (studentDataStr) {
                const studentData = JSON.parse(studentDataStr);
                if (studentData.branch_id) {
                    resolvedBranchId = studentData.branch_id.toString();
                    setBranchId(resolvedBranchId);
                }
                if (studentData.student_class) {
                    resolvedStudentClass = studentData.student_class;
                    setStudentClass(resolvedStudentClass);
                }
                if (studentData.student_section) {
                    setStudentSection(studentData.student_section);
                }
                if (studentData.student_admission) {
                    setStudentAdmission(studentData.student_admission);
                }
            }
        } catch (err) {
            console.error('Error getting student info:', err);
        }

        // Now fetch exam list with resolved values
        await fetchExamList(resolvedStudentId, resolvedBranchId);
    };

    const fetchExamList = async (resolvedStudentId: string, resolvedBranchId: string) => {
        setExamListLoading(true);
        setError(null);

        try {
            console.log('Fetching exam list with branch_id:', resolvedBranchId);

            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=get_exam',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ branch_id: resolvedBranchId }),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch exam list');
            }

            const data = await response.json();
            console.log('get_exam response:', data);

            if (data && Array.isArray(data) && data.length > 0) {
                const normalizedList = data
                    .map((item: any) => ({
                        id: item.id || '',
                        exam_name: item.exam_name || item.name || '',
                    }))
                    .filter((item: any) => item.exam_name);

                if (normalizedList.length > 0) {
                    setExamList(normalizedList);
                    // Select the first exam by default
                    const defaultExam = normalizedList[0];
                    setSelectedExam(defaultExam);
                    // Fetch admit card with resolved values
                    await fetchAdmitCard(defaultExam, resolvedStudentId, resolvedBranchId);
                } else {
                    throw new Error('No exams found');
                }
            } else {
                throw new Error('No exams available');
            }
        } catch (err: any) {
            console.error('Error fetching exam list:', err);
            setError('Failed to load exam list. Please try again.');
            Alert.alert('Error', 'Failed to load exam list. Please check your connection.');
        } finally {
            setExamListLoading(false);
        }
    };

    const fetchAdmitCard = async (examItem: any, overrideStudentId?: string, overrideBranchId?: string) => {
        if (!examItem) return;

        setLoading(true);
        setError(null);
        setAdmitCardData([]);

        try {
            const id = overrideStudentId || studentId || (await AsyncStorage.getItem('student_id')) || '';
            const bId = overrideBranchId || branchId;

            console.log('Fetching admit card with:', { student_id: id, exam_id: examItem.id, branch_id: bId });

            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=admit_card',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        student_id: id,
                        exam_id: examItem.id,
                        branch_id: bId,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch admit card');
            }

            const data = await response.json();
            console.log('admit_card response:', JSON.stringify(data).substring(0, 200));

            if (data && data.status === 'success' && data.data && data.data.length > 0) {
                // Filter out entries with invalid dates (0000-00-00) and sort by date
                const validEntries = data.data
                    .filter((item: any) => item.exam_date && item.exam_date !== '0000-00-00')
                    .sort((a: any, b: any) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());

                const invalidEntries = data.data.filter(
                    (item: any) => !item.exam_date || item.exam_date === '0000-00-00'
                );

                setAdmitCardData([...validEntries, ...invalidEntries]);

                if (data.data[0]?.student_class) {
                    setStudentClass(data.data[0].student_class);
                }
            } else {
                setError('No admit card data found for this exam.');
            }
        } catch (err: any) {
            console.error('Error fetching admit card:', err);
            setError('Failed to load admit card. Please try again.');
            Alert.alert('Error', 'Failed to load admit card. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleExamChange = (examItem: any) => {
        setSelectedExam(examItem);
        setExamModalVisible(false);
        fetchAdmitCard(examItem, studentId, branchId);
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0000-00-00') return 'TBA';
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch {
            return dateString;
        }
    };

    const formatTime = (timeString: string) => {
        if (!timeString || timeString === '00:00:00') return '-';
        try {
            const [hours, minutes] = timeString.split(':');
            const h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hour12 = h % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        } catch {
            return timeString;
        }
    };

    const getDayName = (dateString: string) => {
        if (!dateString || dateString === '0000-00-00') return '';
        try {
            const date = new Date(dateString);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return days[date.getDay()];
        } catch {
            return '';
        }
    };

    const getSubjectColor = (index: number) => {
        const colors = [COLORS.primary, COLORS.secondary, '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
        return colors[index % colors.length];
    };

    // Render Header
    const renderHeader = () => (
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
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color={COLORS.white} />
                    </TouchableOpacity>

                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Admit Card</Text>
                        <Text style={styles.headerSubtitle}>Exam Schedule & Details</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.infoButton}
                        onPress={() => {
                            Alert.alert(
                                'Admit Card',
                                'This screen shows your exam schedule with subject-wise date, time, and marks distribution details.',
                                [{ text: 'OK' }]
                            );
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="information-circle" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                </View>

                {/* Exam Selector */}
                <View style={styles.examSelectorContainer}>
                    <View style={styles.examSelectorHeader}>
                        <View style={styles.examSelectorIcon}>
                            <Ionicons name="document-text" size={18} color={COLORS.secondary} />
                        </View>
                        <Text style={styles.examSelectorLabel}>Select Exam</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.examSelector}
                        onPress={() => setExamModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="clipboard" size={20} color={COLORS.secondary} />
                        <Text style={styles.examSelectorText}>
                            {selectedExam?.exam_name || 'Select exam'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    // Exam Selection Modal
    const ExamSelectionModal = () => (
        <Modal
            visible={examModalVisible}
            transparent={true}
            animationType="slide"
            statusBarTranslucent={true}
            onRequestClose={() => setExamModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <Pressable
                    style={{ flex: 1 }}
                    onPress={() => setExamModalVisible(false)}
                />
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderIcon}>
                                <Ionicons name="document-text" size={22} color={COLORS.secondary} />
                            </View>
                            <Text style={styles.modalTitle}>Select Exam</Text>
                        </View>
                        <FlatList
                            data={examList}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => {
                                const isSelected = selectedExam?.id === item.id;
                                return (
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.modalItem,
                                            pressed && styles.modalItemPressed,
                                            isSelected && styles.selectedModalItem,
                                        ]}
                                        onPress={() => handleExamChange(item)}
                                        android_ripple={{ color: 'rgba(122, 12, 46, 0.1)' }}
                                    >
                                        <View
                                            style={[
                                                styles.examIconContainer,
                                                isSelected && styles.examIconContainerActive,
                                            ]}
                                        >
                                            <Ionicons
                                                name="clipboard"
                                                size={18}
                                                color={isSelected ? COLORS.primary : COLORS.white}
                                            />
                                        </View>
                                        <View style={styles.modalItemContent}>
                                            <Text
                                                style={[
                                                    styles.modalItemText,
                                                    isSelected && styles.modalItemTextActive,
                                                ]}
                                            >
                                                {item.exam_name}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <View style={styles.checkIconContainer}>
                                                <Ionicons name="checkmark" size={18} color={COLORS.white} />
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            }}
                            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
                            contentContainerStyle={styles.modalList}
                        />
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setExamModalVisible(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.modalCloseButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Render admit card table
    const renderAdmitCardTable = () => {
        if (admitCardData.length === 0) return null;

        return (
            <Animated.View
                style={[
                    styles.reportCard,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <View style={styles.reportHeader}>
                    <View style={styles.reportHeaderIcon}>
                        <Ionicons name="document-text" size={20} color={COLORS.secondary} />
                    </View>
                    <Text style={styles.reportTitle}>Exam Schedule</Text>
                </View>

                <View style={styles.tableContainer}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.dateColumn]}>Date</Text>
                        <Text style={[styles.tableHeaderText, styles.subjectColumn]}>Subject</Text>
                        <Text style={[styles.tableHeaderText, styles.timeColumn]}>Time</Text>
                        <Text style={[styles.tableHeaderText, styles.marksColumn]}>Marks</Text>
                    </View>

                    {/* Table Rows */}
                    {admitCardData.map((item: any, index: number) => (
                        <View
                            key={item.id || index}
                            style={[
                                styles.tableRow,
                                index % 2 === 0 ? styles.evenRow : styles.oddRow,
                            ]}
                        >
                            {/* Date Column */}
                            <View style={styles.dateColumnContainer}>
                                {item.exam_date && item.exam_date !== '0000-00-00' ? (
                                    <>
                                        <Text style={styles.dateText}>{formatDate(item.exam_date)}</Text>
                                        <Text style={styles.dayText}>{getDayName(item.exam_date)}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.tbaText}>TBA</Text>
                                )}
                            </View>

                            {/* Subject Column */}
                            <View style={styles.subjectColumnContainer}>
                                <View style={[styles.subjectIcon, { backgroundColor: getSubjectColor(index) }]}>
                                    <Ionicons name="book" size={10} color="#fff" />
                                </View>
                                <View style={styles.subjectInfo}>
                                    <Text style={styles.subjectName} numberOfLines={2}>
                                        {item.subject_name || `Subject ${item.subject_id || index + 1}`}
                                    </Text>
                                    {item.sitting_name ? (
                                        <Text style={styles.sittingText}>{item.sitting_name} Sitting</Text>
                                    ) : null}
                                </View>
                            </View>

                            {/* Time Column */}
                            <View style={styles.timeColumnContainer}>
                                {item.start_time && item.start_time !== '00:00:00' ? (
                                    <>
                                        <Text style={styles.timeText}>{formatTime(item.start_time)}</Text>
                                        <Text style={styles.timeToText}>to</Text>
                                        <Text style={styles.timeText}>{formatTime(item.end_time)}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.tbaText}>-</Text>
                                )}
                            </View>

                            {/* Marks Column */}
                            <View style={styles.marksColumnContainer}>
                                <Text style={styles.totalMarksText}>{item.marks_total}</Text>
                                <Text style={styles.passingMarksText}>Pass: {item.marks_passing}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </Animated.View>
        );
    };

    // Build full URL with query params for the admit card PHP page
    const getAdmitCardUrl = () => {
        const params = `student_class=${encodeURIComponent(studentClass)}&student_section=${encodeURIComponent(studentSection)}&student_admission=${encodeURIComponent(studentAdmission)}&exam_id=${encodeURIComponent(selectedExam?.id || '')}&branch_id=${encodeURIComponent(branchId)}`;
        return `https://rmpublicschool.org/binex/student_admit_card.php?${params}`;
    };

    // Handle View - open WebView modal
    const handleView = () => {
        if (!selectedExam || !studentAdmission) {
            Alert.alert('Error', 'Student data or exam not available.');
            return;
        }
        setWebViewVisible(true);
    };

    // Handle Share - download PDF directly and share
    const handleShare = async () => {
        if (!selectedExam || !studentAdmission) {
            Alert.alert('Error', 'Student data or exam not available.');
            return;
        }

        setSharing(true);
        try {
            // Download the PDF directly
            const pdfName = `Admit_Card_${studentAdmission}_${selectedExam?.exam_name?.replace(/\s+/g, '_') || 'Exam'}.pdf`;
            const fileUri = `${FileSystem.cacheDirectory || ''}${pdfName}`;

            const downloadResult = await FileSystem.downloadAsync(
                getAdmitCardUrl(),
                fileUri
            );

            if (downloadResult.status !== 200) {
                throw new Error('Failed to download admit card PDF');
            }

            // Share the PDF file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share Admit Card',
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert('Error', 'Sharing is not available on this device.');
            }
        } catch (err: any) {
            console.error('Error sharing admit card:', err);
            Alert.alert('Error', 'Failed to download or share admit card. Please try again.');
        } finally {
            setSharing(false);
        }
    };

    // WebView Modal for viewing admit card (uses Google Docs viewer to render PDF inline)
    const WebViewModal = () => (
        <Modal
            visible={webViewVisible}
            animationType="slide"
            onRequestClose={() => setWebViewVisible(false)}
        >
            <View style={styles.webViewContainer}>
                <View style={styles.webViewHeader}>
                    <TouchableOpacity
                        style={styles.webViewCloseButton}
                        onPress={() => setWebViewVisible(false)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.webViewTitle}>Admit Card</Text>
                    <View style={{ width: 36 }} />
                </View>
                <WebView
                    source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(getAdmitCardUrl())}` }}
                    style={styles.webView}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.webViewLoading}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.webViewLoadingText}>Loading Admit Card...</Text>
                        </View>
                    )}
                    scalesPageToFit={true}
                    javaScriptEnabled={true}
                />
            </View>
        </Modal>
    );

    // Render loading state
    const renderLoading = () => (
        <View style={styles.centerContainer}>
            <View style={styles.loadingIconContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
            <Text style={styles.loadingText}>Loading admit card...</Text>
            <Text style={styles.loadingSubtext}>Please wait</Text>
        </View>
    );

    // Render error state
    const renderError = () => (
        <View style={styles.centerContainer}>
            <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={40} color={COLORS.error} />
            </View>
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={() => selectedExam && fetchAdmitCard(selectedExam, studentId, branchId)}
                activeOpacity={0.7}
            >
                <Text style={styles.retryButtonText}>Try Again</Text>
                <Ionicons name="refresh" size={16} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.centerContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="document-text-outline" size={40} color={COLORS.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No Admit Card</Text>
            <Text style={styles.emptyText}>
                Select an exam to view your admit card details.
            </Text>
        </View>
    );

    if (examListLoading) {
        return (
            <SafeAreaProvider>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
                <View style={styles.safeArea}>
                    {renderHeader()}
                    <View style={styles.centerContainer}>
                        <View style={styles.loadingIconContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                        <Text style={styles.loadingText}>Loading exams...</Text>
                    </View>
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
                >
                    {loading ? (
                        renderLoading()
                    ) : error && admitCardData.length === 0 ? (
                        renderError()
                    ) : admitCardData.length > 0 ? (
                        <>
                            {renderAdmitCardTable()}

                            {/* Action Buttons */}
                            <View style={styles.actionButtonsContainer}>
                                <TouchableOpacity
                                    style={styles.viewButton}
                                    onPress={handleView}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="eye" size={20} color={COLORS.white} />
                                    <Text style={styles.viewButtonText}>View</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.shareButton}
                                    onPress={handleShare}
                                    activeOpacity={0.8}
                                    disabled={sharing}
                                >
                                    {sharing ? (
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                    ) : (
                                        <Ionicons name="share-social" size={20} color={COLORS.primary} />
                                    )}
                                    <Text style={styles.shareButtonText}>
                                        {sharing ? 'Generating...' : 'Share'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        renderEmptyState()
                    )}
                </ScrollView>

                <ExamSelectionModal />
                <WebViewModal />
            </View>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FDF5F7',
    },

    // Header
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: 30,
        paddingBottom: 10,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
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
        right: 80,
    },
    headerDiamond1: {
        position: 'absolute',
        top: 70,
        left: 30,
    },
    headerDiamond2: {
        position: 'absolute',
        bottom: 60,
        right: 100,
    },
    headerDots: {
        position: 'absolute',
        bottom: 30,
        left: 60,
    },
    headerStripe: {
        position: 'absolute',
        bottom: 50,
        right: -40,
        width: 100,
        height: 20,
        borderRadius: 15,
        backgroundColor: COLORS.secondary,
        opacity: 0.08,
        transform: [{ rotate: '-15deg' }],
    },
    headerContent: {
        paddingHorizontal: 14,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
        fontWeight: '500',
    },
    infoButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
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
        width: 4,
        height: 4,
        borderRadius: 2,
        marginHorizontal: 4,
    },

    // Exam Selector
    examSelectorContainer: {
        gap: 6,
    },
    examSelectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    examSelectorIcon: {
        width: 26,
        height: 26,
        borderRadius: 10,
        backgroundColor: 'rgba(212, 175, 55, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    examSelectorLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
    },
    examSelector: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    examSelectorText: {
        fontSize: 12,
        color: COLORS.ink,
        flex: 1,
        fontWeight: '600',
    },

    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 10,
    },


    // Report Card
    reportCard: {
        backgroundColor: '#FDF5F7',
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    reportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.secondary,
        gap: 8,
    },
    reportHeaderIcon: {
        width: 26,
        height: 26,
        borderRadius: 12,
        backgroundColor: 'rgba(122, 12, 46, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.ink,
        flex: 1,
    },

    // Table
    tableContainer: {
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F5E8EB',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    tableHeaderText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 11,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        minHeight: 60,
    },
    evenRow: {
        backgroundColor: '#FFF9F0',
    },
    oddRow: {
        backgroundColor: COLORS.white,
    },

    dateColumn: {
        flex: 1.3,
        textAlign: 'left',
    },
    subjectColumn: {
        flex: 1.8,
        textAlign: 'left',
    },
    timeColumn: {
        flex: 1.2,
        textAlign: 'center',
    },
    marksColumn: {
        flex: 0.8,
        textAlign: 'center',
    },

    dateColumnContainer: {
        flex: 1.3,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.ink,
    },
    dayText: {
        fontSize: 10,
        color: COLORS.gray,
        fontWeight: '500',
        marginTop: 2,
    },
    tbaText: {
        fontSize: 11,
        color: COLORS.gray,
        fontWeight: '600',
        fontStyle: 'italic',
    },

    subjectColumnContainer: {
        flex: 1.8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    subjectIcon: {
        width: 22,
        height: 22,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    subjectInfo: {
        flex: 1,
    },
    subjectName: {
        fontSize: 11,
        color: COLORS.ink,
        fontWeight: '600',
    },
    sittingText: {
        fontSize: 9,
        color: COLORS.gray,
        fontWeight: '500',
        marginTop: 2,
    },

    timeColumnContainer: {
        flex: 1.2,
        alignItems: 'center',
    },
    timeText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.primary,
    },
    timeToText: {
        fontSize: 8,
        color: COLORS.gray,
        marginVertical: 1,
    },

    marksColumnContainer: {
        flex: 0.8,
        alignItems: 'center',
    },
    totalMarksText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.primary,
    },
    passingMarksText: {
        fontSize: 9,
        color: COLORS.gray,
        fontWeight: '500',
        marginTop: 2,
    },


    // Center Container States
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 30,
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
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.ink,
    },
    loadingSubtext: {
        fontSize: 12,
        color: COLORS.gray,
        marginTop: 6,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.ink,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 12,
        color: COLORS.gray,
        textAlign: 'center',
        lineHeight: 22,
    },
    emptyTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.ink,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 12,
        color: COLORS.gray,
        textAlign: 'center',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 28,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 24,
        gap: 6,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 1,
    },
    retryButtonText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '700',
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        justifyContent: 'flex-end',
        height: '60%',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 10,
        height: '100%',
    },
    modalHandle: {
        width: 26,
        height: 5,
        backgroundColor: COLORS.lightGray,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    modalHeaderIcon: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.ink,
    },
    modalList: {
        paddingVertical: 10,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    modalItemPressed: {
        backgroundColor: 'rgba(122, 12, 46, 0.05)',
    },
    selectedModalItem: {
        backgroundColor: '#FFF9F0',
    },
    examIconContainer: {
        width: 26,
        height: 26,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    examIconContainerActive: {
        backgroundColor: COLORS.secondary,
    },
    modalItemContent: {
        flex: 1,
    },
    modalItemText: {
        fontSize: 12,
        color: COLORS.ink,
        fontWeight: '500',
    },
    modalItemTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    checkIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSeparator: {
        height: 1,
        backgroundColor: COLORS.lightGray,
        marginVertical: 4,
    },
    modalCloseButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: COLORS.lightGray,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        fontSize: 12,
        color: COLORS.gray,
        fontWeight: '600',
    },

    // Action Buttons
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        marginBottom: 8,
    },
    viewButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    viewButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '700',
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        borderWidth: 2,
        borderColor: COLORS.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    shareButtonText: {
        color: COLORS.primary,
        fontSize: 15,
        fontWeight: '700',
    },

    // WebView Modal
    webViewContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    webViewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        paddingTop: Platform.OS === 'ios' ? 54 : 40,
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    webViewCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    webViewTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.white,
    },
    webView: {
        flex: 1,
    },
    webViewLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    webViewLoadingText: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.gray,
        fontWeight: '600',
    },
});

export default AdmitCardScreen;
