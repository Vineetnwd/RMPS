import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

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
  present: '#10B981',
  absent: '#DC2626',
};

// Class and Section options
const CLASS_OPTIONS = [
  { label: 'NUR', value: 'NUR' },
  { label: 'LKG', value: 'LKG' },
  { label: 'UKG', value: 'UKG' },
  { label: 'I', value: 'I' },
  { label: 'II', value: 'II' },
  { label: 'III', value: 'III' },
  { label: 'IV', value: 'IV' },
  { label: 'V', value: 'V' },
  { label: 'VI', value: 'VI' },
  { label: 'VII', value: 'VII' },
  { label: 'VIII', value: 'VIII' },
  { label: 'IX', value: 'IX' },
  { label: 'X', value: 'X' }
];

const SECTION_OPTIONS = [
  { label: 'Section A', value: 'A' },
  { label: 'Section B', value: 'B' },
  { label: 'Section C', value: 'C' }
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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

export default function AttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ct_class?: string; ct_section?: string; branch_id?: string }>();

  // If ct_class & ct_section are passed, the teacher can only mark attendance for that class
  const isClassLocked = !!(params.ct_class && params.ct_section);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // State for class and section selection — initialise from params if available
  const [selectedClass, setSelectedClass] = useState(params.ct_class || 'II');
  const [selectedSection, setSelectedSection] = useState(params.ct_section || 'A');
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);

  // State for date and attendance
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attendance, setAttendance] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);

  // Summary state
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentPresent: 0
  });

  // Filter state
  const [showOnlyAbsent, setShowOnlyAbsent] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

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
  }, []);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    fetchStudents();
  }, [selectedClass, selectedSection]);

  useEffect(() => {
    filterStudents();
  }, [searchQuery, students, attendance, showOnlyAbsent]);

  useEffect(() => {
    calculateSummary();
  }, [attendance, students]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const branchId = await AsyncStorage.getItem('branch_id');
      const response = await axios.post(
        'https://rmpublicschool.org/binex/api.php?task=student_list',
        {
          student_class: selectedClass,
          student_section: selectedSection,
          branch_id: branchId ? parseInt(branchId) : null
        }
      );

      if (response.data.status === 'success') {
        const studentsWithStatus = response.data.data.map((student: any) => ({
          ...student,
          isPresent: true
        }));

        setStudents(studentsWithStatus);

        const newAttendance: { [key: string]: boolean } = {};
        studentsWithStatus.forEach(student => {
          newAttendance[student.id] = true;
        });

        setAttendance(newAttendance);
      } else {
        setStudents([]);
        setFilteredStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
      setFilteredStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(student =>
        student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_roll.includes(searchQuery) ||
        student.student_admission.includes(searchQuery)
      );
    }

    if (showOnlyAbsent) {
      filtered = filtered.filter(student => !attendance[student.id]);
    }

    filtered.sort((a, b) => parseInt(a.student_roll) - parseInt(b.student_roll));

    setFilteredStudents(filtered);
  };

  const calculateSummary = () => {
    const total = students.length;
    const present = Object.values(attendance).filter(status => status).length;
    const absent = total - present;
    const percentPresent = total > 0 ? Math.round((present / total) * 100) : 0;

    setSummary({
      total,
      present,
      absent,
      percentPresent
    });
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const formatDate = (date) => {
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };

  const openDatePicker = () => {
    setTempDate(new Date(selectedDate));
    setShowDateModal(true);
  };

  const applySelectedDate = () => {
    setSelectedDate(tempDate);
    setShowDateModal(false);
  };

  const generateDaysForMonth = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const markAllPresent = () => {
    const newAttendance: { [key: string]: boolean } = {};
    students.forEach(student => {
      newAttendance[student.id] = true;
    });

    setAttendance(newAttendance);
  };

  const markAllAbsent = () => {
    const newAttendance: { [key: string]: boolean } = {};
    students.forEach(student => {
      newAttendance[student.id] = false;
    });

    setAttendance(newAttendance);
  };

  const submitAttendance = async () => {
    setIsSubmitting(true);

    try {
      const student_list: { [key: string]: string } = {};
      Object.entries(attendance).forEach(([studentId, isPresent]) => {
        student_list[studentId] = isPresent ? "P" : "A";
      });

      const branchId = await AsyncStorage.getItem('branch_id');
      const requestData = {
        action: "make_att",
        att_date: selectedDate.toISOString().split('T')[0],
        student_list: student_list,
        branch_id: branchId ? parseInt(branchId) : null
      };

      console.log('Submitting attendance data:', requestData);

      const response = await axios.post(
        'https://rmpublicschool.org/binex/api.php?task=make_att',
        requestData
      );

      if (response.data) {
        Alert.alert(
          'Attendance Submitted',
          `Successfully marked attendance for ${selectedClass}-${selectedSection}.\n\nPresent: ${response.data.present}\nAbsent: ${response.data.absent}`,
          [{ text: 'OK' }]
        );

        setIsEditMode(false);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      Alert.alert(
        'Submission Failed',
        'There was an error submitting the attendance. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStudentItem = ({ item, index }) => {
    const isPresent = attendance[item.id];

    return (
      <Animated.View
        style={[
          styles.studentCard,
          isPresent ? styles.presentCard : styles.absentCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={styles.studentInfo}>
          <View style={[
            styles.rollContainer,
            { backgroundColor: isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)' }
          ]}>
            <Text style={[
              styles.rollNumber,
              { color: isPresent ? COLORS.success : COLORS.error }
            ]}>{item.student_roll}</Text>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.studentName}>{item.student_name}</Text>
            <View style={styles.studentMeta}>
              <Ionicons name="id-card-outline" size={12} color={COLORS.gray} />
              <Text style={styles.admissionNumber}>{item.student_admission}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.attendanceToggle,
            isPresent ? styles.presentToggle : styles.absentToggle
          ]}
          onPress={() => toggleAttendance(item.id)}
          disabled={!isEditMode}
          activeOpacity={isEditMode ? 0.7 : 1}
        >
          <Ionicons
            name={isPresent ? "checkmark-circle" : "close-circle"}
            size={18}
            color={COLORS.white}
          />
          <Text style={styles.statusText}>{isPresent ? 'Present' : 'Absent'}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

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
            <CircleRing size={70} borderWidth={2} color="rgba(212, 175, 55, 0.25)" />
          </Animated.View>
          <DiamondShape style={styles.headerDiamond1} color="rgba(212, 175, 55, 0.4)" size={12} />
          <DiamondShape style={styles.headerDiamond2} color="rgba(255, 255, 255, 0.2)" size={10} />
          <DottedPattern style={styles.headerDots} rows={2} cols={4} dotColor="rgba(255, 255, 255, 0.3)" />
        </View>

        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Attendance</Text>
            <Text style={styles.headerSubtitle}>{formatDate(selectedDate)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.editButton,
              isEditMode && styles.activeEditButton
            ]}
            onPress={() => setIsEditMode(!isEditMode)}
          >
            <Ionicons
              name={isEditMode ? "checkmark" : "create-outline"}
              size={20}
              color={isEditMode ? COLORS.primary : COLORS.white}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Class Selection Bar */}
      <Animated.View
        style={[
          styles.classSelectionBar,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.classSelectionLeft}>
          <TouchableOpacity
            style={[styles.classSelector, isClassLocked && { opacity: 0.7 }]}
            onPress={() => !isClassLocked && setShowClassModal(true)}
            activeOpacity={isClassLocked ? 1 : 0.7}
          >
            <View style={styles.selectorIconContainer}>
              <Ionicons name={isClassLocked ? 'lock-closed' : 'school'} size={16} color={isClassLocked ? COLORS.primary : COLORS.secondary} />
            </View>
            <View style={styles.selectorContent}>
              <Text style={styles.classSelectorLabel}>Class</Text>
              <View style={styles.classSelectorValue}>
                <Text style={styles.selectedValueText}>{selectedClass}</Text>
                {!isClassLocked && <Ionicons name="chevron-down" size={14} color={COLORS.gray} />}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.classSelector, isClassLocked && { opacity: 0.7 }]}
            onPress={() => !isClassLocked && setShowSectionModal(true)}
            activeOpacity={isClassLocked ? 1 : 0.7}
          >
            <View style={styles.selectorIconContainer}>
              <Ionicons name={isClassLocked ? 'lock-closed' : 'grid'} size={16} color={isClassLocked ? COLORS.primary : COLORS.secondary} />
            </View>
            <View style={styles.selectorContent}>
              <Text style={styles.classSelectorLabel}>Section</Text>
              <View style={styles.classSelectorValue}>
                <Text style={styles.selectedValueText}>{selectedSection}</Text>
                {!isClassLocked && <Ionicons name="chevron-down" size={14} color={COLORS.gray} />}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.dateSelector}
          onPress={openDatePicker}
        >
          <Ionicons name="calendar" size={18} color={COLORS.primary} />
          <Ionicons name="chevron-down" size={14} color={COLORS.gray} />
        </TouchableOpacity>
      </Animated.View>

      {/* Toggle Summary Button */}
      <TouchableOpacity
        style={styles.toggleSummaryButton}
        onPress={() => setShowSummary(!showSummary)}
      >
        <View style={styles.toggleSummaryLeft}>
          <View style={styles.toggleSummaryIcon}>
            <Ionicons name="stats-chart" size={14} color={COLORS.secondary} />
          </View>
          <Text style={styles.toggleSummaryText}>
            {showSummary ? 'Hide Summary' : 'Show Summary'}
          </Text>
        </View>
        <Ionicons
          name={showSummary ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.gray}
        />
      </TouchableOpacity>

      {/* Collapsible Summary Section */}
      {showSummary && (
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: 'rgba(100, 116, 139, 0.1)' }]}>
                <Ionicons name="people" size={18} color={COLORS.gray} />
              </View>
              <Text style={styles.summaryValue}>{summary.total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              </View>
              <Text style={[styles.summaryValue, styles.presentValue]}>
                {summary.present}
              </Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
                <Ionicons name="close-circle" size={18} color={COLORS.error} />
              </View>
              <Text style={[styles.summaryValue, styles.absentValue]}>
                {summary.absent}
              </Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
                <Ionicons name="trending-up" size={18} color={COLORS.secondary} />
              </View>
              <Text style={[styles.summaryValue, styles.percentValue]}>
                {summary.percentPresent}%
              </Text>
              <Text style={styles.summaryLabel}>Rate</Text>
            </View>
          </View>

          {/* Filter and Action Row */}
          <View style={styles.actionRow}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={COLORS.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search student..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.gray}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Absent</Text>
              <Switch
                value={showOnlyAbsent}
                onValueChange={setShowOnlyAbsent}
                trackColor={{ false: COLORS.lightGray, true: COLORS.secondary }}
                thumbColor={showOnlyAbsent ? COLORS.primary : COLORS.white}
                ios_backgroundColor={COLORS.lightGray}
              />
            </View>
          </View>

          {/* Mark All Buttons */}
          {isEditMode && (
            <View style={styles.markAllContainer}>
              <TouchableOpacity
                style={[styles.markAllButton, styles.markPresentButton]}
                onPress={markAllPresent}
              >
                <Ionicons name="checkmark-done" size={18} color={COLORS.white} />
                <Text style={styles.markAllText}>All Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.markAllButton, styles.markAbsentButton]}
                onPress={markAllAbsent}
              >
                <Ionicons name="close" size={18} color={COLORS.white} />
                <Text style={styles.markAllText}>All Absent</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}

      {/* Student List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : filteredStudents.length > 0 ? (
        <FlatList
          data={filteredStudents}
          renderItem={renderStudentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.studentListContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="school-outline" size={50} color={COLORS.lightGray} />
          </View>
          <Text style={styles.emptyTitle}>No Students Found</Text>
          <Text style={styles.emptyText}>Try changing the class or section</Text>
        </View>
      )}

      {/* Submit Button */}
      {isEditMode && students.length > 0 && (
        <View style={styles.submitButtonContainer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={submitAttendance}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Attendance</Text>
                <View style={styles.submitButtonIcon}>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Class Selection Modal */}
      <Modal
        visible={showClassModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClassModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIcon}>
                  <Ionicons name="school" size={20} color={COLORS.secondary} />
                </View>
                <Text style={styles.modalTitle}>Select Class</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowClassModal(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {CLASS_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    selectedClass === option.value && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedClass(option.value);
                    setShowClassModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedClass === option.value && styles.modalOptionTextSelected
                  ]}>
                    Class {option.label}
                  </Text>
                  {selectedClass === option.value && (
                    <View style={styles.modalCheckIcon}>
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Section Selection Modal */}
      <Modal
        visible={showSectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIcon}>
                  <Ionicons name="grid" size={20} color={COLORS.secondary} />
                </View>
                <Text style={styles.modalTitle}>Select Section</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSectionModal(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {SECTION_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    selectedSection === option.value && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedSection(option.value);
                    setShowSectionModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedSection === option.value && styles.modalOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {selectedSection === option.value && (
                    <View style={styles.modalCheckIcon}>
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Selection Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIcon}>
                  <Ionicons name="calendar" size={20} color={COLORS.secondary} />
                </View>
                <Text style={styles.modalTitle}>Select Date</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDateModal(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateModalContent}>
              {/* Year and Month Selection */}
              <View style={styles.yearMonthSelection}>
                <View style={styles.yearSelector}>
                  <Text style={styles.yearMonthLabel}>Year</Text>
                  <View style={styles.yearPickerContainer}>
                    <TouchableOpacity
                      style={styles.yearArrow}
                      onPress={() => {
                        const newDate = new Date(tempDate);
                        newDate.setFullYear(newDate.getFullYear() - 1);
                        setTempDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                    </TouchableOpacity>

                    <Text style={styles.yearValue}>{tempDate.getFullYear()}</Text>

                    <TouchableOpacity
                      style={styles.yearArrow}
                      onPress={() => {
                        const newDate = new Date(tempDate);
                        const newYear = newDate.getFullYear() + 1;
                        if (newYear <= new Date().getFullYear()) {
                          newDate.setFullYear(newYear);
                          setTempDate(newDate);
                        }
                      }}
                      disabled={tempDate.getFullYear() >= new Date().getFullYear()}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={tempDate.getFullYear() >= new Date().getFullYear() ? COLORS.lightGray : COLORS.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.monthSelector}>
                  <Text style={styles.yearMonthLabel}>Month</Text>
                  <View style={styles.monthPickerContainer}>
                    <TouchableOpacity
                      style={styles.monthArrow}
                      onPress={() => {
                        const newDate = new Date(tempDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setTempDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                    </TouchableOpacity>

                    <Text style={styles.monthValue}>
                      {MONTHS[tempDate.getMonth()].substring(0, 3)}
                    </Text>

                    <TouchableOpacity
                      style={styles.monthArrow}
                      onPress={() => {
                        const newDate = new Date(tempDate);
                        const currentDate = new Date();

                        if (
                          tempDate.getFullYear() < currentDate.getFullYear() ||
                          (tempDate.getFullYear() === currentDate.getFullYear() &&
                            tempDate.getMonth() < currentDate.getMonth())
                        ) {
                          newDate.setMonth(newDate.getMonth() + 1);
                          setTempDate(newDate);
                        }
                      }}
                      disabled={
                        tempDate.getFullYear() === new Date().getFullYear() &&
                        tempDate.getMonth() >= new Date().getMonth()
                      }
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={
                          tempDate.getFullYear() === new Date().getFullYear() &&
                            tempDate.getMonth() >= new Date().getMonth()
                            ? COLORS.lightGray
                            : COLORS.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Day Grid */}
              <View style={styles.dayGrid}>
                <View style={styles.weekdayHeader}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <Text key={index} style={styles.weekdayLabel}>{day}</Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {(() => {
                    const year = tempDate.getFullYear();
                    const month = tempDate.getMonth();
                    const daysInMonth = generateDaysForMonth(year, month);
                    const firstDayOfMonth = new Date(year, month, 1).getDay();

                    const currentDate = new Date();
                    const dayElements = [];

                    for (let i = 0; i < firstDayOfMonth; i++) {
                      dayElements.push(
                        <View key={`empty-${i}`} style={styles.emptyDay} />
                      );
                    }

                    for (let day of daysInMonth) {
                      const date = new Date(year, month, day);
                      const isCurrentDate = date.getDate() === tempDate.getDate() &&
                        date.getMonth() === tempDate.getMonth() &&
                        date.getFullYear() === tempDate.getFullYear();
                      const isFutureDate = date > currentDate;
                      const isToday = date.toDateString() === currentDate.toDateString();

                      dayElements.push(
                        <TouchableOpacity
                          key={`day-${day}`}
                          style={[
                            styles.dayButton,
                            isCurrentDate && styles.selectedDayButton,
                            isToday && !isCurrentDate && styles.todayButton,
                            isFutureDate && styles.disabledDayButton
                          ]}
                          onPress={() => {
                            if (!isFutureDate) {
                              const newDate = new Date(tempDate);
                              newDate.setDate(day);
                              setTempDate(newDate);
                            }
                          }}
                          disabled={isFutureDate}
                        >
                          <Text style={[
                            styles.dayText,
                            isCurrentDate && styles.selectedDayText,
                            isToday && !isCurrentDate && styles.todayText,
                            isFutureDate && styles.disabledDayText
                          ]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    return dayElements;
                  })()}
                </View>
              </View>

              {/* Date picker footer */}
              <View style={styles.datePickerFooter}>
                <TouchableOpacity
                  style={styles.cancelDateButton}
                  onPress={() => setShowDateModal(false)}
                >
                  <Text style={styles.cancelDateText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.applyDateButton}
                  onPress={applySelectedDate}
                >
                  <Text style={styles.applyDateText}>Apply</Text>
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F7',
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 30,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    top: -30,
    right: -40,
  },
  headerRing: {
    position: 'absolute',
    top: 30,
    right: 60,
  },
  headerDiamond1: {
    position: 'absolute',
    top: 60,
    left: 30,
  },
  headerDiamond2: {
    position: 'absolute',
    bottom: 30,
    right: 100,
  },
  headerDots: {
    position: 'absolute',
    bottom: 20,
    left: 80,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeEditButton: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
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

  // Class Selection Bar
  classSelectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: -6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  classSelectionLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  classSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  selectorIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorContent: {},
  classSelectorLabel: {
    fontSize: 10,
    color: COLORS.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classSelectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedValueText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(122, 12, 46, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },

  // Toggle Summary
  toggleSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
  },
  toggleSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleSummaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleSummaryText: {
    fontSize: 12,
    color: COLORS.ink,
    fontWeight: '600',
  },

  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  summaryIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 2,
  },
  presentValue: {
    color: COLORS.success,
  },
  absentValue: {
    color: COLORS.error,
  },
  percentValue: {
    color: COLORS.secondary,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F5E8EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.ink,
    padding: 0,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },

  // Mark All Container
  markAllContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  markAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  markPresentButton: {
    backgroundColor: COLORS.success,
  },
  markAbsentButton: {
    backgroundColor: COLORS.error,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Student List
  studentListContainer: {
    padding: 10,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(122, 12, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: 'rgba(226, 232, 240, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
  },

  // Student Card
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderLeftWidth: 4,
  },
  presentCard: {
    borderLeftColor: COLORS.success,
  },
  absentCard: {
    borderLeftColor: COLORS.error,
  },
  studentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rollContainer: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rollNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  nameContainer: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  admissionNumber: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  attendanceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  presentToggle: {
    backgroundColor: COLORS.success,
  },
  absentToggle: {
    backgroundColor: COLORS.error,
  },
  statusText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },

  // Submit Button
  submitButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 18,
    gap: 8,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  submitButtonText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  submitButtonIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#FDF5F7',
    borderRadius: 24,
    overflow: 'hidden',
  },
  dateModalContainer: {
    width: '100%',
    backgroundColor: '#FDF5F7',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionSelected: {
    backgroundColor: '#FFF9F0',
  },
  modalOptionText: {
    fontSize: 12,
    color: COLORS.ink,
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalCheckIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Date Modal Styles
  dateModalContent: {
    padding: 10,
  },
  yearMonthSelection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  yearSelector: {
    flex: 1,
  },
  monthSelector: {
    flex: 1,
  },
  yearMonthLabel: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  yearPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF9F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  monthPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF9F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  yearArrow: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(122, 12, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthArrow: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(122, 12, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  monthValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
    flex: 1,
    textAlign: 'center',
  },
  dayGrid: {
    marginBottom: 8,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDayButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  todayButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 12,
  },
  disabledDayButton: {
    opacity: 0.3,
  },
  emptyDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  dayText: {
    fontSize: 12,
    color: COLORS.ink,
    fontWeight: '600',
  },
  selectedDayText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  todayText: {
    color: COLORS.secondary,
    fontWeight: '800',
  },
  disabledDayText: {
    color: COLORS.lightGray,
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
    gap: 8,
  },
  cancelDateButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
  },
  cancelDateText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  applyDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  applyDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});