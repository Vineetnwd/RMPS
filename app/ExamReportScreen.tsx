import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

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
const DiamondShape = ({ style, color = COLORS.secondary, size = 20 }) => (
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

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }) => (
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

const DottedPattern = ({ style, rows = 3, cols = 4, dotColor = COLORS.secondary }) => (
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

const ExamReportScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [examListLoading, setExamListLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examModalVisible, setExamModalVisible] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const getParamStudentId = () => {
    const paramId = params?.student_id;
    if (typeof paramId === 'string' && paramId.trim().length > 0) {
      return paramId;
    }
    if (Array.isArray(paramId) && paramId[0]) {
      return paramId[0];
    }
    return '';
  };

  const parseExamListFromText = (rawText) => {
    if (!rawText) return [];

    const decoded = rawText
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');

    const stripped = decoded.replace(/<[^>]*>/g, ' ');
    const matches = [];
    const regexes = [
      /\[\s*exam_name\s*\]\s*=>\s*([^\r\n]+)/gi,
      /\bexam_name\b\s*=>\s*([^\r\n]+)/gi,
    ];

    regexes.forEach((regex) => {
      let match;
      while ((match = regex.exec(stripped)) !== null) {
        const value = (match[1] || '').trim();
        if (value) matches.push(value);
      }
    });

    const idMatches = [];
    const idRegexes = [
      /\[\s*id\s*\]\s*=>\s*([^\r\n]+)/gi,
      /\bid\b\s*=>\s*([^\r\n]+)/gi,
    ];

    idRegexes.forEach((regex) => {
      let match;
      while ((match = regex.exec(stripped)) !== null) {
        const value = (match[1] || '').trim();
        if (value) idMatches.push(value);
      }
    });

    if (matches.length === 0) return [];

    return matches.map((name, index) => ({
      id: idMatches[index] || '',
      exam_name: name,
    }));
  };

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
      })
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

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
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
    await getStudentId();
    await fetchExamList();
  };

  const getStudentId = async () => {
    const paramId = getParamStudentId();
    if (paramId) {
      setStudentId(paramId);
      return;
    }

    try {
      const id = await AsyncStorage.getItem('student_id');
      if (id) {
        setStudentId(id);
      } else {
        Alert.alert('Error', 'Student ID not found. Please login again.');
      }
    } catch (error) {
      console.error('Error getting student ID:', error);
      Alert.alert('Error', 'Failed to retrieve student information.');
    }
  };

  const fetchExamList = async () => {
    setExamListLoading(true);
    setError(null);

    try {
      const paramId = getParamStudentId();
      const requestId = paramId || studentId;
      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=get_exam',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestId ? { student_id: requestId } : {}),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch exam list');
      }

      const rawText = await response.text();
      console.log('get_exam response:', rawText);
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        data = parseExamListFromText(rawText);
      }

      const normalizedList = Array.isArray(data)
        ? data.map((item, index) => {
            if (typeof item === 'string') {
              return { id: '', exam_name: item };
            }
            if (item && typeof item === 'object') {
              return {
                id: item.id ?? item.exam_id ?? '',
                exam_name: item.exam_name || item.name || '',
              };
            }
            return { id: '', exam_name: '' };
          }).filter((item) => item.exam_name)
        : [];

      if (normalizedList.length > 0) {
        setExamList(normalizedList);
        setSelectedExam(normalizedList[0]);
        await fetchMarksReport(normalizedList[0]);
      } else {
        throw new Error('No exams found');
      }
    } catch (error) {
      console.error('Error fetching exam list:', error);
      setError('Failed to load exam list. Please try again.');
      Alert.alert('Error', 'Failed to load exam list. Please check your connection.');
    } finally {
      setExamListLoading(false);
    }
  };

  const fetchMarksReport = async (examItem) => {
    const examName = typeof examItem === 'string' ? examItem : examItem?.exam_name;
    const examId = typeof examItem === 'string' ? '' : examItem?.id;

    if (!studentId || !examName) {
      Alert.alert('Error', 'Please select an exam');
      return;
    }

    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=get_marks',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_id: studentId,
            exam_id: examId,
            exam_name: examName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch marks');
      }

      const data = await response.json();

      if (data.status === 'success') {
        setReportData(data);
      } else {
        throw new Error(data.message || 'Failed to fetch marks');
      }
    } catch (error) {
      console.error('Error fetching marks:', error);
      setError('Failed to load report. Please try again.');
      Alert.alert('Error', 'Failed to load exam report. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleExamChange = (examItem) => {
    setSelectedExam(examItem);
    setExamModalVisible(false);
    fetchMarksReport(examItem);
  };

  const handleOpenMarksheet = async () => {
    const selectedExamName = typeof selectedExam === 'string'
      ? selectedExam
      : selectedExam?.exam_name;

    if (!studentId || !selectedExamName) {
      Alert.alert('Error', 'Please select an exam first');
      return;
    }

    try {
      const url = `https://rmpublicschool.org/binex/exam_report_pdf?student_id=${studentId}&exam_name=${encodeURIComponent(selectedExamName)}`;
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open marksheet');
      }
    } catch (error) {
      console.error('Error opening marksheet:', error);
      Alert.alert('Error', 'Failed to open marksheet. Please try again.');
    }
  };

  const calculatePercentage = () => {
    if (!reportData || !reportData.subjects) return 0;
    const maxMarks = reportData.subjects.length * 50;
    return ((reportData.grand_total / maxMarks) * 100).toFixed(2);
  };

  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A1', color: COLORS.success };
    if (percentage >= 80) return { grade: 'A2', color: '#22C55E' };
    if (percentage >= 70) return { grade: 'B1', color: COLORS.secondary };
    if (percentage >= 60) return { grade: 'B2', color: '#F59E0B' };
    if (percentage >= 50) return { grade: 'C', color: '#EAB308' };
    return { grade: 'D', color: COLORS.error };
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+': return COLORS.success;
      case 'A': return '#22C55E';
      case 'B+': return COLORS.secondary;
      case 'B': return '#F59E0B';
      case 'C': return '#EAB308';
      case 'D': return COLORS.error;
      case 'N/A': return COLORS.gray;
      default: return COLORS.gray;
    }
  };

  const getSubjectColor = (index) => {
    const colors = [COLORS.primary, COLORS.secondary, '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
    return colors[index % colors.length];
  };

  const getActivityColor = (index) => {
    const colors = [COLORS.secondary, COLORS.secondaryLight, COLORS.primary];
    return colors[index % colors.length];
  };

  const getActivityIcon = (area) => {
    if (area.toLowerCase().includes('work')) return 'construct';
    if (area.toLowerCase().includes('health') || area.toLowerCase().includes('physical')) return 'fitness';
    if (area.toLowerCase().includes('discipline')) return 'star';
    if (area.toLowerCase().includes('art')) return 'color-palette';
    if (area.toLowerCase().includes('music')) return 'musical-notes';
    return 'ribbon';
  };

  // Render Header with Exam Selector
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
            <Text style={styles.headerTitle}>Exam Report</Text>
            <Text style={styles.headerSubtitle}>View your performance</Text>
          </View>
          
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => {
              Alert.alert(
                "Exam Report Information",
                "This screen shows your exam performance with detailed subject-wise marks breakdown and co-scholastic activities.",
                [{ text: "OK" }]
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
              {typeof selectedExam === 'string'
                ? selectedExam
                : selectedExam?.exam_name || 'Select exam'}
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
                const isSelected = selectedExam && typeof selectedExam === 'object'
                  ? selectedExam.id === item.id
                  : selectedExam === item;
                return (
                <Pressable
                  style={({ pressed }) => [
                    styles.modalItem,
                    pressed && styles.modalItemPressed,
                    isSelected && styles.selectedModalItem
                  ]}
                  onPress={() => handleExamChange(item)}
                  android_ripple={{ color: 'rgba(122, 12, 46, 0.1)' }}
                >
                  <View style={[
                    styles.examIconContainer,
                    isSelected && styles.examIconContainerActive
                  ]}>
                    <Ionicons 
                      name="clipboard" 
                      size={18} 
                      color={isSelected ? COLORS.primary : COLORS.white} 
                    />
                  </View>
                  <View style={styles.modalItemContent}>
                    <Text style={[
                      styles.modalItemText,
                      isSelected && styles.modalItemTextActive
                    ]}>{item.exam_name}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkIconContainer}>
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    </View>
                  )}
                </Pressable>
              )}}
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

  // Render student info card
  const renderStudentInfo = () => {
    if (!reportData) return null;

    const percentage = calculatePercentage();
    const gradeInfo = getGrade(percentage);

    return (
      <Animated.View 
        style={[
          styles.studentCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.studentCardAccent} />
        <View style={styles.studentCardContent}>
          <View style={styles.studentHeader}>
            <View style={styles.studentIconContainer}>
              <Ionicons name="person" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{reportData.student.name}</Text>
              <View style={styles.studentMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="school" size={14} color={COLORS.gray} />
                  <Text style={styles.metaValue}>Class {reportData.student.class}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="id-card" size={14} color={COLORS.gray} />
                  <Text style={styles.metaValue}>ID: {reportData.student.id}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <View style={[styles.performanceIconContainer, { backgroundColor: 'rgba(122, 12, 46, 0.1)' }]}>
                <Ionicons name="calculator" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.performanceLabel}>Total Marks</Text>
              <Text style={styles.performanceValue}>{reportData.grand_total}</Text>
            </View>
            <View style={styles.performanceDivider} />
            <View style={styles.performanceItem}>
              <View style={[styles.performanceIconContainer, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
                <Ionicons name="trending-up" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.performanceLabel}>Percentage</Text>
              <Text style={styles.performanceValue}>{percentage}%</Text>
            </View>
            <View style={styles.performanceDivider} />
            <View style={styles.performanceItem}>
              <View style={[styles.performanceIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="ribbon" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.performanceLabel}>Grade</Text>
              <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.color }]}>
                <Text style={styles.gradeText}>{gradeInfo.grade}</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Render Marksheet Button
  const renderMarksheetButton = () => {
    if (!reportData || !studentId || !selectedExam) return null;

    return (
      <Animated.View 
        style={[
          styles.marksheetButtonContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: pulseAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.marksheetButton}
          onPress={handleOpenMarksheet}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text" size={22} color={COLORS.primary} />
          <Text style={styles.marksheetButtonText}>Download Marksheet</Text>
          <View style={styles.marksheetButtonIcon}>
            <Ionicons name="download" size={18} color={COLORS.white} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render scholastic marks table
  const renderScholasticTable = () => {
    if (!reportData || !reportData.subjects) return null;

    return (
      <Animated.View 
        style={[
          styles.reportCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.reportHeader}>
          <View style={styles.reportHeaderIcon}>
            <Ionicons name="book" size={20} color={COLORS.secondary} />
          </View>
          <Text style={styles.reportTitle}>Scholastic Areas</Text>
        </View>

        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.subjectColumn]}>Subject</Text>
            <Text style={[styles.tableHeaderText, styles.markColumn]}>NB</Text>
            <Text style={[styles.tableHeaderText, styles.markColumn]}>SE</Text>
            <Text style={[styles.tableHeaderText, styles.markColumn]}>MO</Text>
            <Text style={[styles.tableHeaderText, styles.totalColumn]}>Total</Text>
          </View>

          {/* Table Rows */}
          {reportData.subjects.map((subject, index) => (
            <View
              key={subject.subject_id}
              style={[
                styles.tableRow,
                index % 2 === 0 ? styles.evenRow : styles.oddRow,
              ]}
            >
              <View style={styles.subjectColumnContainer}>
                <View style={[styles.subjectIcon, { backgroundColor: getSubjectColor(index) }]}>
                  <Ionicons name="book" size={10} color="#fff" />
                </View>
                <Text style={styles.subjectName} numberOfLines={1}>{subject.subject_name}</Text>
              </View>
              <Text style={[styles.tableCell, styles.markColumn]}>{subject.marks.nb}</Text>
              <Text style={[styles.tableCell, styles.markColumn]}>{subject.marks.se}</Text>
              <Text style={[styles.tableCell, styles.markColumn]}>{subject.marks.mo}</Text>
              <Text style={[styles.tableCell, styles.totalColumn, styles.totalMark]}>
                {subject.marks.total}
              </Text>
            </View>
          ))}

          {/* Grand Total Row */}
          <View style={styles.grandTotalRow}>
            <View style={styles.grandTotalContent}>
              <Ionicons name="trophy" size={20} color={COLORS.secondary} />
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
            </View>
            <Text style={styles.grandTotalValue}>{reportData.grand_total}</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Render co-scholastic activities
  const renderCoScholastic = () => {
    if (!reportData || !reportData.co_scholastic || reportData.co_scholastic.length === 0) return null;

    return (
      <Animated.View 
        style={[
          styles.reportCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.reportHeader}>
          <View style={[styles.reportHeaderIcon, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
            <Ionicons name="medal" size={20} color={COLORS.secondary} />
          </View>
          <Text style={styles.reportTitle}>Co-Scholastic Areas</Text>
        </View>

        <View style={styles.coScholasticContainer}>
          {reportData.co_scholastic.map((activity, index) => (
            <View
              key={index}
              style={[
                styles.coScholasticRow,
                index % 2 === 0 ? styles.evenRow : styles.oddRow,
              ]}
            >
              <View style={styles.coScholasticContent}>
                <View style={[styles.activityIcon, { backgroundColor: getActivityColor(index) }]}>
                  <Ionicons name={getActivityIcon(activity.area)} size={16} color="#fff" />
                </View>
                <Text style={styles.activityName}>{activity.area}</Text>
              </View>
              <View style={[styles.gradeChip, { backgroundColor: getGradeColor(activity.grade) }]}>
                <Text style={styles.gradeChipText}>{activity.grade}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.gradeInfoBox}>
          <View style={styles.gradeInfoIcon}>
            <Ionicons name="information-circle" size={16} color={COLORS.secondary} />
          </View>
          <Text style={styles.gradeInfoText}>
            Grading Scale: A1 (Outstanding), A2 (Excellent), B1 (Very Good), B2 (Good), C (Fair), D (Needs Improvement)
          </Text>
        </View>
      </Animated.View>
    );
  };

  // Render error state
  const renderError = () => (
    <View style={styles.centerContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle" size={60} color={COLORS.error} />
      </View>
      <Text style={styles.errorTitle}>Oops!</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => fetchMarksReport(selectedExam)}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.centerContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={60} color={COLORS.lightGray} />
      </View>
      <Text style={styles.emptyTitle}>No Report Selected</Text>
      <Text style={styles.emptyText}>Select an exam to view your report</Text>
    </View>
  );

  // Render loading state
  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <View style={styles.loadingIconContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
      <Text style={styles.loadingText}>Loading report...</Text>
      <Text style={styles.loadingSubtext}>Please wait a moment</Text>
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
            { paddingBottom: 20 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            renderLoading()
          ) : error && !reportData ? (
            renderError()
          ) : reportData ? (
            <>
              {renderStudentInfo()}
              {renderMarksheetButton()}
              {renderScholasticTable()}
              {renderCoScholastic()}
            </>
          ) : (
            renderEmptyState()
          )}
        </ScrollView>

        <ExamSelectionModal />
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

  // Student Card
  studentCard: {
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  studentCardAccent: {
    height: 5,
    backgroundColor: COLORS.secondary,
  },
  studentCardContent: {
    padding: 10,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(122, 12, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 8,
  },
  studentMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaValue: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  performanceRow: {
    flexDirection: 'row',
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    padding: 10,
  },
  performanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  performanceIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  performanceValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  gradeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  performanceDivider: {
    width: 1,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 8,
  },

  // Marksheet Button
  marksheetButtonContainer: {
    marginBottom: 8,
  },
  marksheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  marksheetButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
    textAlign: 'center',
  },
  marksheetButtonIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    flex: 1,
  },
  
  // Scholastic Table
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
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  evenRow: {
    backgroundColor: '#FFF9F0',
  },
  oddRow: {
    backgroundColor: COLORS.white,
  },
  subjectColumn: {
    flex: 2,
    textAlign: 'left',
  },
  subjectColumnContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  subjectName: {
    fontSize: 12,
    color: COLORS.ink,
    fontWeight: '600',
    flex: 1,
  },
  markColumn: {
    flex: 1,
    textAlign: 'center',
  },
  totalColumn: {
    flex: 1,
    textAlign: 'center',
  },
  tableCell: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  totalMark: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 12,
  },
  grandTotalRow: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.secondary,
  },

  // Co-Scholastic
  coScholasticContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  coScholasticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  coScholasticContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityName: {
    fontSize: 12,
    color: COLORS.ink,
    fontWeight: '600',
    flex: 1,
  },
  gradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  gradeChipText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  gradeInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9F0',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  gradeInfoIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeInfoText: {
    fontSize: 11,
    color: COLORS.gray,
    flex: 1,
    lineHeight: 16,
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
});

export default ExamReportScreen;
