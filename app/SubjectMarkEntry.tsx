import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

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
    warning: '#F59E0B',
    background: '#FDF5F7',
    cream: '#FFF5EC',
    cardBg: '#FFFFFF',
    blue: '#3B82F6',
    purple: '#7C3AED',
    teal: '#14B8A6',
    orange: '#F97316',
};

const API_BASE = 'https://rmpublicschool.org/binex/api.php';

// Types
type AssignedSubject = {
    class_name: string;
    section_name: string;
    subject_id: string;
    subject_name: string;
};

type ExamItem = {
    id: string;
    exam_name: string;
};

type Student = {
    id: string;
    student_admission: string;
    student_roll: string;
    student_name: string;
};

// Decorative components
const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }: any) => (
    <View style={[{ width: size, height: size, backgroundColor: color, transform: [{ rotate: '45deg' }] }, style]} />
);

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }: any) => (
    <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth, borderColor: color, backgroundColor: 'transparent' }, style]} />
);

const DottedPattern = ({ style, rows = 3, cols = 4, dotColor = COLORS.secondary }: any) => (
    <View style={[{ flexDirection: 'column', gap: 6 }, style]}>
        {[...Array(rows)].map((_, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 6 }}>
                {[...Array(cols)].map((_, ci) => (
                    <View key={ci} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: dotColor, opacity: 0.3 + (ri * cols + ci) * 0.03 }} />
                ))}
            </View>
        ))}
    </View>
);

// Determine which columns to show based on exam and class
const getExamColumns = (examName: string, studentClass: string) => {
    const columns: string[] = [];
    const columnLabels: Record<string, string> = {};
    const maxMarks: Record<string, number> = {};

    if (examName === 'UNIT TEST 1') {
        columns.push('ut1');
        columnLabels['ut1'] = 'UT 1';
        maxMarks['ut1'] = 80;
    } else if (examName === 'UNIT TEST 2') {
        columns.push('ut2');
        columnLabels['ut2'] = 'UT 2';
        maxMarks['ut2'] = 80;
    } else if (examName === 'UNIT TEST 3') {
        columns.push('ut3');
        columnLabels['ut3'] = 'UT 3';
        maxMarks['ut3'] = 80;
    } else if (examName === 'UNIT TEST 4') {
        columns.push('ut4');
        columnLabels['ut4'] = 'UT 4';
        maxMarks['ut4'] = 80;
    } else if (examName === 'TERM 1' || examName === 'TERM 2') {
        if (studentClass === 'IX' || studentClass === 'X') {
            columns.push('ma', 'portfolio', 'se', 'mid_term');
            columnLabels['ma'] = 'MA';
            columnLabels['portfolio'] = 'Portfolio';
            columnLabels['se'] = 'SE';
            columnLabels['mid_term'] = 'Mid Term';
            maxMarks['ma'] = 5;
            maxMarks['portfolio'] = 5;
            maxMarks['se'] = 5;
            maxMarks['mid_term'] = 80;
        } else {
            columns.push('ga', 'nb', 'sea', 'mid_term');
            columnLabels['ga'] = 'GA';
            columnLabels['nb'] = 'NB';
            columnLabels['sea'] = 'SEA';
            columnLabels['mid_term'] = 'Mid Term';
            if (studentClass === 'I' || studentClass === 'II') {
                maxMarks['ga'] = 20; maxMarks['nb'] = 5; maxMarks['sea'] = 5; maxMarks['mid_term'] = 60;
            } else {
                maxMarks['ga'] = 20; maxMarks['nb'] = 5; maxMarks['sea'] = 5; maxMarks['mid_term'] = 80;
            }
        }
    }

    return { columns, columnLabels, maxMarks };
};

// Determine term from exam name
const getTerm = (examName: string) => {
    if (['UNIT TEST 1', 'UNIT TEST 2', 'TERM 1'].includes(examName)) return 'TERM 1';
    return 'TERM 2';
};

export default function SubjectMarkEntry() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ emp_id?: string; branch_id?: string }>();

    // State
    const [branchId, setBranchId] = useState('');
    const [empId, setEmpId] = useState('');
    const [canEdit, setCanEdit] = useState(true);
    const [loading, setLoading] = useState(true);

    // Exam
    const [examList, setExamList] = useState<ExamItem[]>([]);
    const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);
    const [examModalVisible, setExamModalVisible] = useState(false);

    // Subjects
    const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<AssignedSubject | null>(null);

    // Students & Marks
    const [students, setStudents] = useState<Student[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [marks, setMarks] = useState<Record<string, Record<string, string>>>({}); // { studentId: { col: value } }
    const [savingCell, setSavingCell] = useState<string | null>(null);
    const [columns, setColumns] = useState<string[]>([]);
    const [columnLabels, setColumnLabels] = useState<Record<string, string>>({});
    const [maxMarks, setMaxMarks] = useState<Record<string, number>>({});
    const [currentTerm, setCurrentTerm] = useState('');

    // Animations
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

        initialize();
    }, []);

    const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    // ─── Init ───
    const initialize = async () => {
        const bid = params.branch_id || (await AsyncStorage.getItem('branch_id')) || '';
        const eid = params.emp_id || (await AsyncStorage.getItem('emp_id')) || '';
        setBranchId(bid);
        setEmpId(eid);

        await Promise.all([
            fetchExamList(bid),
            fetchAssignedSubjects(eid, bid),
            checkPermission(eid),
        ]);
        setLoading(false);
    };

    // ─── Fetch exam list ───
    const fetchExamList = async (bid: string) => {
        try {
            const response = await fetch(`${API_BASE}?task=get_exam`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch_id: bid }),
            });
            const rawText = await response.text();
            let data;
            try { data = JSON.parse(rawText); } catch { data = []; }

            const list: ExamItem[] = (Array.isArray(data) ? data : (data?.data || []))
                .map((item: any) => {
                    if (typeof item === 'string') return { id: '', exam_name: item };
                    return { id: item.id || item.exam_id || '', exam_name: item.exam_name || item.name || '' };
                })
                .filter((item: ExamItem) => item.exam_name);

            setExamList(list);
            if (list.length > 0) setSelectedExam(list[0]);
        } catch (err) {
            console.error('Error fetching exam list:', err);
            Alert.alert('Error', 'Failed to load exam list');
        }
    };

    // ─── Fetch assigned subjects ───
    const fetchAssignedSubjects = async (eid: string, bid: string) => {
        try {
            const response = await fetch(`${API_BASE}?task=assigned_subject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emp_id: eid, branch_id: bid }),
            });
            const result = await response.json();
            if (result.status === 'success' && Array.isArray(result.data)) {
                setAssignedSubjects(result.data);
            } else {
                setAssignedSubjects([]);
            }
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    };

    // ─── Check marks permission ───
    const checkPermission = async (eid: string) => {
        try {
            const response = await fetch(`${API_BASE}?task=marks_permission`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emp_id: eid }),
            });
            const result = await response.json();
            setCanEdit(result.can_edit === 'YES');
        } catch {
            // If the API doesn't exist yet, default to false (view only)
            setCanEdit(false);
        }
    };

    // ─── Step 1: Fetch students list using existing student_list API ───
    const fetchStudents = async (subject: AssignedSubject) => {
        setStudentsLoading(true);
        setStudents([]);
        setMarks({});
        try {
            const bid = branchId || params.branch_id || (await AsyncStorage.getItem('branch_id')) || '';
            console.log('Fetching students:', { class: subject.class_name, section: subject.section_name, branch_id: bid });

            const response = await fetch(`${API_BASE}?task=student_list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_class: subject.class_name,
                    student_section: subject.section_name,
                    branch_id: bid ? parseInt(bid) : null,
                }),
            });
            const result = await response.json();
            console.log('student_list response: count =', result?.data?.length || 0);

            if (result.status === 'success' && Array.isArray(result.data)) {
                setStudents(result.data);
                // Try to fetch existing marks
                if (selectedExam) {
                    await fetchMarks(subject, selectedExam, result.data, bid);
                } else {
                    // Initialize empty marks
                    initEmptyMarks(result.data, subject.class_name);
                }
            } else {
                Alert.alert('Error', 'No students found for this class');
            }
        } catch (err: any) {
            console.error('Error fetching students:', err);
            Alert.alert('Error', 'Failed to load students: ' + err.message);
        } finally {
            setStudentsLoading(false);
        }
    };

    // ─── Initialize empty marks for all students ───
    const initEmptyMarks = (studentList: Student[], className: string) => {
        if (!selectedExam) return;
        const examCols = getExamColumns(selectedExam.exam_name, className);
        setColumns(examCols.columns);
        setColumnLabels(examCols.columnLabels);
        setMaxMarks(examCols.maxMarks);
        setCurrentTerm(getTerm(selectedExam.exam_name));

        const initial: Record<string, Record<string, string>> = {};
        studentList.forEach((s) => {
            initial[s.id] = {};
            examCols.columns.forEach((col) => {
                initial[s.id][col] = '';
            });
        });
        setMarks(initial);
    };

    // ─── Step 2: Try fetching existing marks from student_marks API ───
    const fetchMarks = async (subject: AssignedSubject, exam: ExamItem, studentList: Student[], bid: string) => {
        const examCols = getExamColumns(exam.exam_name, subject.class_name);
        setColumns(examCols.columns);
        setColumnLabels(examCols.columnLabels);
        setMaxMarks(examCols.maxMarks);
        setCurrentTerm(getTerm(exam.exam_name));

        // Initialize empty marks first
        const initial: Record<string, Record<string, string>> = {};
        studentList.forEach((s) => {
            initial[s.id] = {};
            examCols.columns.forEach((col) => {
                initial[s.id][col] = '';
            });
        });

        try {
            const requestBody = {
                student_class: subject.class_name,
                student_section: subject.section_name,
                subject_id: subject.subject_id,
                exam_id: exam.exam_name,
                branch_id: bid,
            };
            console.log('Fetching marks:', JSON.stringify(requestBody));

            const response = await fetch(`${API_BASE}?task=student_marks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            const rawText = await response.text();
            console.log('student_marks raw:', rawText.slice(0, 500));

            let result;
            try { result = JSON.parse(rawText); } catch { result = null; }

            if (result && result.status === 'success' && Array.isArray(result.data)) {
                // Merge marks into our map
                result.data.forEach((entry: any) => {
                    const sid = entry.student_id;
                    if (initial[sid] && entry.marks) {
                        examCols.columns.forEach((col) => {
                            const val = entry.marks[col];
                            if (val !== undefined && val !== null && val !== 0 && val !== '0') {
                                initial[sid][col] = String(val);
                            }
                        });
                    }
                });
                // If API returns its own columns/max_marks, use those
                if (result.columns && result.columns.length > 0) {
                    setColumns(result.columns);
                }
                if (result.column_labels) setColumnLabels(result.column_labels);
                if (result.max_marks) setMaxMarks(result.max_marks);
                if (result.term) setCurrentTerm(result.term);
            } else {
                console.log('student_marks API not available or returned no data, using empty marks');
            }
        } catch (err) {
            console.log('student_marks API not reachable, continuing with empty marks');
        }

        setMarks(initial);
    };

    // ─── Save single mark ───
    const saveMark = async (student: Student, colName: string, value: string) => {
        const max = maxMarks[colName] || 100;
        const numVal = parseFloat(value) || 0;

        if (value !== '' && numVal > max) {
            Alert.alert('Invalid', `Marks cannot exceed ${max}`);
            return;
        }

        // Skip if empty and was already empty
        if (!value && !marks[student.id]?.[colName]) return;

        const cellKey = `${student.id}-${colName}`;
        setSavingCell(cellKey);

        try {
            const bid = branchId || params.branch_id || (await AsyncStorage.getItem('branch_id')) || '';

            const payload = {
                student_id: student.id,
                student_admission: student.student_admission,
                term: currentTerm,
                subject: selectedSubject?.subject_id,
                col_name: colName,
                value: numVal,
                branch_id: bid,
            };

            console.log('▶️ Saving Mark Payload:', JSON.stringify(payload, null, 2));

            const response = await fetch(`${API_BASE}?task=save_marks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const rawText = await response.text();
            const res = await response;
            // console.log('◀️ Save Mark Response:', res);

            let result;
            try {
                result = JSON.parse(rawText);
            } catch (e) {
                console.error('JSON Parse Error:', e);
                throw new Error('Invalid server response');
            }

            if (result.status !== 'success') {
                console.warn('Save failed:', result.message);
                Alert.alert('Error', result.message || 'Failed to save');
            } else {
                // console.log('✅ Mark saved successfully');
            }
        } catch (err: any) {
            console.error('Save error:', err);
            Alert.alert('Error', 'Network error while saving: ' + err.message);
        } finally {
            setSavingCell(null);
        }
    };

    // ─── Handle subject card press ───
    const handleSubjectPress = (subject: AssignedSubject) => {
        setSelectedSubject(subject);
        if (!selectedExam) {
            Alert.alert('Select Exam', 'Please select an exam first');
            return;
        }
        fetchStudents(subject);
    };

    // ─── Handle exam change ───
    const handleExamChange = (exam: ExamItem) => {
        setSelectedExam(exam);
        setExamModalVisible(false);
        if (selectedSubject) {
            // Re-fetch with new exam
            setStudents([]);
            setMarks({});
            fetchStudentsWithExam(selectedSubject, exam);
        }
    };

    // Fetch students when exam changes (needs exam passed explicitly)
    const fetchStudentsWithExam = async (subject: AssignedSubject, exam: ExamItem) => {
        setStudentsLoading(true);
        setStudents([]);
        setMarks({});
        try {
            const bid = branchId || params.branch_id || (await AsyncStorage.getItem('branch_id')) || '';
            const response = await fetch(`${API_BASE}?task=student_list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_class: subject.class_name,
                    student_section: subject.section_name,
                    branch_id: bid ? parseInt(bid) : null,
                }),
            });
            const result = await response.json();
            if (result.status === 'success' && Array.isArray(result.data)) {
                setStudents(result.data);
                await fetchMarks(subject, exam, result.data, bid);
            }
        } catch (err: any) {
            console.error('Error:', err);
        } finally {
            setStudentsLoading(false);
        }
    };

    // ─── Get subject card color ───
    const getSubjectColor = (index: number) => {
        const colors = [COLORS.primary, COLORS.blue, COLORS.success, COLORS.orange, COLORS.purple, COLORS.teal, COLORS.secondary];
        return colors[index % colors.length];
    };

    // ─── RENDER: Header ───
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerDecorations} pointerEvents="none">
                <Animated.View style={[styles.headerBlob, { transform: [{ translateY: floatTranslate }] }]} />
                <Animated.View style={[styles.headerRing, { transform: [{ rotate }] }]}>
                    <CircleRing size={80} borderWidth={2} color="rgba(212, 175, 55, 0.25)" />
                </Animated.View>
                <DiamondShape style={{ position: 'absolute', top: 30, right: 60 }} color="rgba(212, 175, 55, 0.4)" size={14} />
                <DiamondShape style={{ position: 'absolute', bottom: 20, left: 40 }} color="rgba(255, 255, 255, 0.2)" size={10} />
                <DottedPattern style={{ position: 'absolute', top: 50, left: 20 }} rows={2} cols={4} dotColor="rgba(255, 255, 255, 0.3)" />
                <View style={styles.headerStripe} />
            </View>

            <View style={[styles.headerContent, { paddingTop: insets.top + 8 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Marks Entry</Text>
                        <Text style={styles.headerSubtitle}>
                            {canEdit ? 'Edit & save marks' : 'View only mode'}
                        </Text>
                    </View>
                    {!canEdit && (
                        <View style={styles.viewOnlyBadge}>
                            <Ionicons name="lock-closed" size={14} color={COLORS.white} />
                            <Text style={styles.viewOnlyText}>View Only</Text>
                        </View>
                    )}
                </View>

                {/* Exam Selector */}
                <View style={styles.examSelectorContainer}>
                    <View style={styles.examSelectorRow}>
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

    // ─── RENDER: Subject Cards ───
    const renderSubjectCards = () => {
        if (assignedSubjects.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray} />
                    <Text style={styles.emptyText}>No assigned subjects found</Text>
                    <Text style={styles.emptySubtext}>Contact admin to assign subjects</Text>
                </View>
            );
        }

        return (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconBg}>
                        <Ionicons name="book" size={18} color={COLORS.white} />
                    </View>
                    <Text style={styles.sectionTitle}>Your Subjects</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{assignedSubjects.length}</Text>
                    </View>
                </View>

                {assignedSubjects.map((subject, index) => {
                    const color = getSubjectColor(index);
                    const isSelected = selectedSubject?.subject_id === subject.subject_id &&
                        selectedSubject?.class_name === subject.class_name &&
                        selectedSubject?.section_name === subject.section_name;

                    return (
                        <TouchableOpacity
                            key={`${subject.class_name}-${subject.section_name}-${subject.subject_id}-${index}`}
                            style={[styles.subjectCard, isSelected && { borderColor: color, borderWidth: 2 }]}
                            onPress={() => handleSubjectPress(subject)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.subjectCardAccent, { backgroundColor: color }]} />
                            <View style={styles.subjectCardBody}>
                                <View style={[styles.subjectIconBg, { backgroundColor: color }]}>
                                    <Ionicons name="book-outline" size={20} color={COLORS.white} />
                                </View>
                                <View style={styles.subjectInfo}>
                                    <Text style={styles.subjectName}>{subject.subject_name}</Text>
                                    <View style={styles.subjectMeta}>
                                        <View style={styles.metaChip}>
                                            <Ionicons name="school-outline" size={12} color={COLORS.gray} />
                                            <Text style={styles.metaChipText}>Class {subject.class_name}</Text>
                                        </View>
                                        <View style={styles.metaChip}>
                                            <Ionicons name="people-outline" size={12} color={COLORS.gray} />
                                            <Text style={styles.metaChipText}>Sec {subject.section_name}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.arrowCircle, { backgroundColor: isSelected ? color : COLORS.lightGray }]}>
                                    <Ionicons
                                        name={isSelected ? 'checkmark' : 'chevron-forward'}
                                        size={16}
                                        color={isSelected ? COLORS.white : COLORS.gray}
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>
        );
    };

    // ─── RENDER: Marks Table ───
    const renderMarksTable = () => {
        if (!selectedSubject || !selectedExam) return null;

        if (studentsLoading) {
            return (
                <View style={styles.loadingCard}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading students...</Text>
                </View>
            );
        }

        if (students.length === 0) return null;

        return (
            <Animated.View style={[styles.marksSection, { opacity: fadeAnim }]}>
                {/* Info chips */}
                <View style={styles.marksHeaderCard}>
                    <View style={styles.marksHeaderAccent} />
                    <View style={styles.marksHeaderBody}>
                        <View style={styles.marksHeaderRow}>
                            <View style={styles.marksInfoChip}>
                                <Ionicons name="school" size={14} color={COLORS.primary} />
                                <Text style={styles.marksInfoText}>Class {selectedSubject.class_name}-{selectedSubject.section_name}</Text>
                            </View>
                            <View style={styles.marksInfoChip}>
                                <Ionicons name="book" size={14} color={COLORS.blue} />
                                <Text style={styles.marksInfoText}>{selectedSubject.subject_name}</Text>
                            </View>
                        </View>
                        <View style={styles.marksHeaderRow}>
                            <View style={styles.marksInfoChip}>
                                <Ionicons name="clipboard" size={14} color={COLORS.orange} />
                                <Text style={styles.marksInfoText}>{selectedExam.exam_name}</Text>
                            </View>
                            <View style={styles.marksInfoChip}>
                                <Ionicons name="people" size={14} color={COLORS.success} />
                                <Text style={styles.marksInfoText}>{students.length} Students</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.tableCard}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View>
                            {/* Header row */}
                            <View style={styles.tableHeaderRow}>
                                <View style={[styles.tableHeaderCell, styles.admCol]}>
                                    <Text style={styles.tableHeaderText}>Adm No.</Text>
                                </View>
                                <View style={[styles.tableHeaderCell, styles.rollCol]}>
                                    <Text style={styles.tableHeaderText}>Roll</Text>
                                </View>
                                <View style={[styles.tableHeaderCell, styles.nameCol]}>
                                    <Text style={styles.tableHeaderText}>Name</Text>
                                </View>
                                {columns.map((col) => (
                                    <View key={col} style={[styles.tableHeaderCell, styles.markCol]}>
                                        <Text style={styles.tableHeaderText}>{columnLabels[col] || col}</Text>
                                        <Text style={styles.maxMarksText}>({maxMarks[col] || ''})</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Student rows */}
                            {students.map((student, index) => (
                                <View
                                    key={student.id}
                                    style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
                                >
                                    <View style={[styles.tableCell, styles.admCol]}>
                                        <Text style={styles.admText}>{student.student_admission || student.id}</Text>
                                    </View>
                                    <View style={[styles.tableCell, styles.rollCol]}>
                                        <Text style={styles.rollText}>{student.student_roll || '-'}</Text>
                                    </View>
                                    <View style={[styles.tableCell, styles.nameCol]}>
                                        <Text style={styles.nameText} numberOfLines={1}>{student.student_name}</Text>
                                    </View>
                                    {columns.map((col) => {
                                        const cellKey = `${student.id}-${col}`;
                                        const isSaving = savingCell === cellKey;
                                        const currentVal = marks[student.id]?.[col] ?? '';

                                        return (
                                            <View key={col} style={[styles.tableCell, styles.markCol]}>
                                                {canEdit ? (
                                                    <View style={styles.markInputWrapper}>
                                                        <TextInput
                                                            style={[
                                                                styles.markInput,
                                                                isSaving && styles.markInputSaving,
                                                                currentVal !== '' && styles.markInputFilled,
                                                            ]}
                                                            value={currentVal}
                                                            placeholder="-"
                                                            placeholderTextColor="#CBD5E1"
                                                            onChangeText={(text) => {
                                                                setMarks((prev) => ({
                                                                    ...prev,
                                                                    [student.id]: {
                                                                        ...prev[student.id],
                                                                        [col]: text.replace(/[^0-9.]/g, ''),
                                                                    },
                                                                }));
                                                            }}
                                                            onBlur={() => {
                                                                if (currentVal !== '') {
                                                                    saveMark(student, col, currentVal);
                                                                }
                                                            }}
                                                            keyboardType="numeric"
                                                            maxLength={4}
                                                            editable={!isSaving}
                                                            selectTextOnFocus
                                                        />
                                                        {isSaving && (
                                                            <View style={styles.savingIndicator}>
                                                                <ActivityIndicator size="small" color={COLORS.success} />
                                                            </View>
                                                        )}
                                                    </View>
                                                ) : (
                                                    <Text style={[styles.markReadonly, currentVal !== '' && styles.markReadonlyFilled]}>
                                                        {currentVal || '-'}
                                                    </Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </Animated.View>
        );
    };

    // ─── RENDER: Exam Modal ───
    const ExamSelectionModal = () => (
        <Modal
            visible={examModalVisible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={() => setExamModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={{ flex: 1 }} onPress={() => setExamModalVisible(false)} />
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
                            keyExtractor={(item, index) => `${item.id}-${index}`}
                            renderItem={({ item }) => {
                                const isSelected = selectedExam?.exam_name === item.exam_name;
                                return (
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.modalItem,
                                            pressed && styles.modalItemPressed,
                                            isSelected && styles.selectedModalItem,
                                        ]}
                                        onPress={() => handleExamChange(item)}
                                    >
                                        <View style={[styles.examIconContainer, isSelected && styles.examIconActive]}>
                                            <Ionicons name="clipboard" size={18} color={isSelected ? COLORS.primary : COLORS.white} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.modalItemText, isSelected && { color: COLORS.primary, fontWeight: '700' }]}>
                                                {item.exam_name}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <View style={styles.checkIcon}>
                                                <Ionicons name="checkmark" size={16} color={COLORS.white} />
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            }}
                            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
                            contentContainerStyle={{ paddingBottom: 8 }}
                        />
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setExamModalVisible(false)} activeOpacity={0.7}>
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // ─── MAIN RENDER ───
    if (loading) {
        return (
            <SafeAreaProvider>
                <View style={styles.loadingScreen}>
                    <StatusBar style="light" backgroundColor={COLORS.primary} />
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={[styles.loadingText, { marginTop: 16 }]}>Loading Marks Entry...</Text>
                </View>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <View style={styles.container}>
                <StatusBar style="light" backgroundColor={COLORS.primaryDark} />
                {renderHeader()}

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {renderSubjectCards()}
                    {renderMarksTable()}
                </ScrollView>

                <ExamSelectionModal />
            </View>
        </SafeAreaProvider>
    );
}

// ─── STYLES ───
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

    // Header
    header: { backgroundColor: COLORS.primary, overflow: 'hidden' },
    headerDecorations: { ...StyleSheet.absoluteFillObject },
    headerBlob: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(212, 175, 55, 0.12)' },
    headerRing: { position: 'absolute', bottom: 10, right: 30 },
    headerStripe: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: COLORS.secondary, opacity: 0.6 },
    headerContent: { paddingHorizontal: 20, paddingBottom: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, marginLeft: 14 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    viewOnlyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
    viewOnlyText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },

    // Exam selector
    examSelectorContainer: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14 },
    examSelectorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    examSelectorIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(212, 175, 55, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    examSelectorLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
    examSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    examSelectorText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.ink },

    // Body
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },

    // Section header
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    sectionIconBg: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    sectionTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.ink },
    countBadge: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    countBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },

    // Subject cards
    subjectCard: { backgroundColor: COLORS.white, borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, borderWidth: 1, borderColor: 'transparent' },
    subjectCardAccent: { height: 4 },
    subjectCardBody: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    subjectIconBg: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    subjectInfo: { flex: 1 },
    subjectName: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 4 },
    subjectMeta: { flexDirection: 'row', gap: 8 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    metaChipText: { fontSize: 11, color: COLORS.gray, fontWeight: '500' },
    arrowCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

    // Marks section
    marksSection: { marginTop: 24 },
    marksHeaderCard: { backgroundColor: COLORS.white, borderRadius: 14, overflow: 'hidden', marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    marksHeaderAccent: { height: 4, backgroundColor: COLORS.secondary },
    marksHeaderBody: { padding: 14, gap: 8 },
    marksHeaderRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    marksInfoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    marksInfoText: { fontSize: 12, fontWeight: '600', color: COLORS.ink },

    // Table
    tableCard: { backgroundColor: COLORS.white, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    tableHeaderRow: { flexDirection: 'row', backgroundColor: COLORS.primary },
    tableHeaderCell: { justifyContent: 'center', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
    tableHeaderText: { color: COLORS.white, fontSize: 11, fontWeight: '700', textAlign: 'center' },
    maxMarksText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '500', marginTop: 1 },
    admCol: { width: 65 },
    rollCol: { width: 45 },
    nameCol: { width: 150 },
    markCol: { width: 75 },
    tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
    evenRow: { backgroundColor: COLORS.white },
    oddRow: { backgroundColor: '#FAFBFC' },
    tableCell: { justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 6 },
    admText: { fontSize: 12, fontWeight: '500', color: COLORS.gray, textAlign: 'center' },
    rollText: { fontSize: 13, fontWeight: '600', color: COLORS.ink, textAlign: 'center' },
    nameText: { fontSize: 12, fontWeight: '500', color: COLORS.ink },

    // Mark input
    markInputWrapper: { position: 'relative', alignItems: 'center' },
    markInput: {
        width: 58,
        height: 36,
        borderWidth: 1.5,
        borderColor: COLORS.lightGray,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.ink,
        backgroundColor: COLORS.white,
        paddingVertical: 0,
    },
    markInputFilled: { borderColor: COLORS.secondary, backgroundColor: '#FFFEF5' },
    markInputSaving: { borderColor: COLORS.success, backgroundColor: '#F0FFF4' },
    savingIndicator: { position: 'absolute', right: -4, top: -4 },
    markReadonly: { fontSize: 14, fontWeight: '600', color: COLORS.gray, textAlign: 'center', width: 58 },
    markReadonlyFilled: { fontWeight: '800', color: COLORS.ink },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.gray, marginTop: 12 },
    emptySubtext: { fontSize: 13, color: COLORS.gray, marginTop: 4 },

    // Loading
    loadingCard: { alignItems: 'center', paddingVertical: 40 },
    loadingText: { fontSize: 14, color: COLORS.gray, marginTop: 10 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { maxHeight: '70%' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.lightGray, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    modalHeaderIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
    modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
    modalItemPressed: { backgroundColor: 'rgba(122, 12, 46, 0.05)' },
    selectedModalItem: { backgroundColor: 'rgba(122, 12, 46, 0.08)' },
    modalItemText: { fontSize: 15, fontWeight: '500', color: COLORS.ink },
    examIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    examIconActive: { backgroundColor: COLORS.secondaryLight },
    checkIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
    modalSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 12 },
    modalCloseButton: { marginTop: 12, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center' },
    modalCloseText: { fontSize: 15, fontWeight: '600', color: COLORS.gray },
});
