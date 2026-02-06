import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
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
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FileUploader from './FileUploader';

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

export default function HomeWork() {
  const insets = useSafeAreaInsets();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [homeworkText, setHomeworkText] = useState('');
  const [uploadedFileInfo, setUploadedFileInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentDate] = useState(new Date());
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const formattedDate = format(currentDate, 'dd MMMM yyyy');

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

  useEffect(() => { fetchClasses(); }, []);
  useEffect(() => { if (selectedClass) fetchSubjects(); }, [selectedClass]);
  useEffect(() => { if (submitSuccess) { const timer = setTimeout(() => setSubmitSuccess(false), 3000); return () => clearTimeout(timer); } }, [submitSuccess]);

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const branchId = await AsyncStorage.getItem('branch_id');
      const response = await fetch('https://rmpublicschool.org/binex/api.php?task=class_list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: branchId }),
      });
      const result = await response.json();
      if (result.status === 'success') setClasses(result.data);
      else showAlert('Error', 'Failed to fetch classes');
    } catch (err: any) { showAlert('Error', 'Network error: ' + err.message); }
    finally { setLoadingClasses(false); }
  };

  const fetchSubjects = async () => {
    if (!selectedClass) return;
    try {
      setLoadingSubjects(true);
      const branchId = await AsyncStorage.getItem('branch_id');
      const response = await fetch('https://rmpublicschool.org/binex/api.php?task=subject_list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hw_class: selectedClass.student_class, branch_id: branchId }),
      });
      const result = await response.json();
      if (result.status === 'success') setSubjects(result.data);
      else showAlert('Error', 'Failed to fetch subjects');
    } catch (err: any) { showAlert('Error', 'Network error: ' + err.message); }
    finally { setLoadingSubjects(false); }
  };

  const showAlert = (title: string, message: string) => Alert.alert(title, message, [{ text: 'OK' }], { cancelable: true });
  const handleUploadSuccess = (fileInfo: any) => setUploadedFileInfo(fileInfo);
  const handleUploadError = (error: string) => { showAlert('Upload Error', error); setUploadedFileInfo(null); };
  const resetForm = () => { setHomeworkText(''); setUploadedFileInfo(null); setSelectedClass(null); setSelectedSubject(null); };

  const submitHomework = async () => {
    if (!selectedClass || !selectedSubject) { showAlert('Required Fields', 'Please select class and subject'); return; }
    if (!homeworkText.trim()) { showAlert('Required Field', 'Please enter homework details'); return; }
    try {
      setSubmitting(true);
      const branchId = await AsyncStorage.getItem('branch_id');
      const homeworkData = { task: "home_work", hw_class: selectedClass.student_class, hw_section: selectedClass.student_section, subject_id: selectedSubject.id, hw_text: homeworkText, hw_file: uploadedFileInfo?.file_name || '', branch_id: branchId };
      const response = await fetch('https://rmpublicschool.org/binex/api.php?task=home_work', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(homeworkData) });
      const result = await response.json();
      if (result.status === 'success') { setSubmitSuccess(true); resetForm(); }
      else showAlert('Error', 'Failed to add homework: ' + (result.message || 'Unknown error'));
    } catch (err: any) { showAlert('Error', 'Network error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const ClassSelectionModal = () => (
    <Modal visible={classModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setClassModalVisible(false)}>
      <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
        <Pressable style={{ flex: 1 }} onPress={() => setClassModalVisible(false)} />
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}><View style={styles.modalTitleContainer}><Ionicons name="school" size={20} color={COLORS.primary} /><Text style={styles.modalTitle}>Select Class & Section</Text></View></View>
            {loadingClasses ? (<View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Loading classes...</Text></View>) : (
              <FlatList data={classes} keyExtractor={(item, index) => `${item.student_class}-${item.student_section}-${index}`}
                renderItem={({ item }) => (
                  <Pressable style={({ pressed }) => [styles.modalItem, pressed && styles.modalItemPressed]} onPress={() => { setSelectedClass(item); setClassModalVisible(false); setSelectedSubject(null); }}>
                    <View style={styles.classIconContainer}><Text style={styles.classIcon}>{item.student_class}</Text></View>
                    <View style={styles.modalItemContent}><Text style={styles.modalItemText}>Class {item.student_class} - Section {item.student_section}</Text><Text style={styles.modalItemSubtext}>{item.total} Students</Text></View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  </Pressable>
                )} ItemSeparatorComponent={() => <View style={styles.modalSeparator} />} contentContainerStyle={styles.modalList}
              />
            )}
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setClassModalVisible(false)}><Text style={styles.modalCloseButtonText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const SubjectSelectionModal = () => (
    <Modal visible={subjectModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSubjectModalVisible(false)}>
      <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
        <Pressable style={{ flex: 1 }} onPress={() => setSubjectModalVisible(false)} />
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}><View style={styles.modalTitleContainer}><Ionicons name="book" size={20} color={COLORS.primary} /><Text style={styles.modalTitle}>Select Subject</Text></View></View>
            {loadingSubjects ? (<View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Loading subjects...</Text></View>
            ) : subjects.length > 0 ? (
              <FlatList data={subjects} keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable style={({ pressed }) => [styles.modalItem, pressed && styles.modalItemPressed]} onPress={() => { setSelectedSubject(item); setSubjectModalVisible(false); }}>
                    <View style={styles.subjectIconContainer}><Ionicons name="book-outline" size={18} color={COLORS.white} /></View>
                    <View style={styles.modalItemContent}><Text style={styles.modalItemText}>{item.subject_name}</Text></View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  </Pressable>
                )} ItemSeparatorComponent={() => <View style={styles.modalSeparator} />} contentContainerStyle={styles.modalList}
              />
            ) : (<View style={styles.noDataContainer}><Ionicons name="alert-circle-outline" size={40} color={COLORS.gray} /><Text style={styles.noDataText}>No subjects available</Text></View>)}
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSubjectModalVisible(false)}><Text style={styles.modalCloseButtonText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const FileInfoDisplay = () => {
    if (!uploadedFileInfo) return null;
    const isPdf = uploadedFileInfo.file_type === 'pdf';
    return (
      <View style={styles.fileInfoDisplay}>
        <View style={styles.fileInfoContent}>
          {isPdf ? (<View style={styles.pdfIconContainer}><Ionicons name="document-text" size={24} color={COLORS.white} /></View>) : (<Image source={{ uri: uploadedFileInfo.file_path }} style={styles.imagePreview} resizeMode="cover" />)}
          <View style={styles.fileDetails}><Text style={styles.fileName} numberOfLines={1}>{uploadedFileInfo.file_name}</Text><View style={styles.fileMetaContainer}><Text style={styles.uploadedText}><Ionicons name="checkmark-circle" size={12} color={COLORS.success} /> Uploaded</Text><Text style={styles.fileSize}>{uploadedFileInfo.file_size}</Text></View></View>
        </View>
        <TouchableOpacity style={styles.removeFileButton} onPress={() => setUploadedFileInfo(null)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}><Ionicons name="close-circle" size={24} color={COLORS.error} /></TouchableOpacity>
      </View>
    );
  };

  const SuccessMessage = () => {
    if (!submitSuccess) return null;
    return (
      <Animated.View style={[styles.successMessage, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        <Ionicons name="checkmark-circle" size={24} color={COLORS.white} /><Text style={styles.successText}>Homework assigned successfully!</Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}>
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
                <View style={styles.headerTitleContainer}><Text style={styles.headerTitle}>HomeWork</Text><Text style={styles.headerSubtitle}>Assign tasks to students</Text></View>
                <TouchableOpacity style={styles.infoButton} onPress={() => Alert.alert("Homework", "Assign homework to students by selecting class, subject and entering details.")}><Ionicons name="information-circle" size={22} color={COLORS.white} /></TouchableOpacity>
              </View>
              <Animated.View style={[styles.infoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.infoIconContainer}><Ionicons name="create" size={26} color={COLORS.primary} /></View>
                <Text style={styles.infoText}>Create and assign homework with optional file attachments</Text>
              </Animated.View>
            </View>
          </View>

          <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { paddingBottom: 20 + insets.bottom }]} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.cardHeader}><View style={styles.cardHeaderIcon}><Ionicons name="create-outline" size={20} color={COLORS.primary} /></View><Text style={styles.cardHeaderText}>Create New Assignment</Text></View>

              <View style={styles.section}>
                <View style={styles.labelContainer}><View style={styles.labelIconContainer}><Ionicons name="school" size={14} color={COLORS.secondary} /></View><Text style={styles.sectionTitle}>Class and Section</Text></View>
                <TouchableOpacity style={styles.selector} onPress={() => setClassModalVisible(true)} activeOpacity={0.7}>
                  <View style={styles.selectorIconContainer}><Ionicons name="people" size={18} color={selectedClass ? COLORS.primary : COLORS.gray} /></View>
                  <Text style={[styles.selectorText, !selectedClass && styles.selectorPlaceholder]}>{selectedClass ? `Class ${selectedClass.student_class} - Section ${selectedClass.student_section}` : 'Select class and section'}</Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <View style={styles.labelContainer}><View style={styles.labelIconContainer}><Ionicons name="book" size={14} color={COLORS.secondary} /></View><Text style={styles.sectionTitle}>Subject</Text></View>
                <TouchableOpacity style={[styles.selector, !selectedClass && styles.disabledSelector]} onPress={() => { if (selectedClass) setSubjectModalVisible(true); }} activeOpacity={selectedClass ? 0.7 : 1} disabled={!selectedClass}>
                  <View style={styles.selectorIconContainer}><Ionicons name="book-outline" size={18} color={selectedSubject ? COLORS.primary : COLORS.gray} /></View>
                  <Text style={[styles.selectorText, !selectedSubject && styles.selectorPlaceholder]}>{selectedSubject ? selectedSubject.subject_name : 'Select subject'}</Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <View style={styles.labelContainer}><View style={styles.labelIconContainer}><Ionicons name="calendar" size={14} color={COLORS.secondary} /></View><Text style={styles.sectionTitle}>Date</Text></View>
                <View style={styles.dateContainer}><Ionicons name="calendar-outline" size={18} color={COLORS.primary} /><Text style={styles.dateText}>{formattedDate}</Text></View>
              </View>

              <View style={styles.section}>
                <View style={styles.labelContainer}><View style={styles.labelIconContainer}><Ionicons name="create" size={14} color={COLORS.secondary} /></View><Text style={styles.sectionTitle}>Homework Details</Text></View>
                <View style={[styles.textAreaContainer, !selectedSubject && styles.disabledInput]}>
                  <TextInput style={styles.textArea} multiline numberOfLines={6} placeholder="Enter homework instructions here..." value={homeworkText} onChangeText={setHomeworkText} editable={!!selectedSubject} placeholderTextColor={COLORS.gray} />
                  <View style={styles.charCountContainer}><Text style={styles.charCount}>{homeworkText.length} characters</Text></View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.labelContainer}><View style={styles.labelIconContainer}><Ionicons name="attach" size={14} color={COLORS.secondary} /></View><Text style={styles.sectionTitle}>Attachment (Optional)</Text></View>
                <Text style={styles.sectionSubtitle}>PDF or Image up to 5MB</Text>
                {uploadedFileInfo ? <FileInfoDisplay /> : (
                  <View style={!selectedSubject && styles.disabledUploader}>
                    <FileUploader onUploadSuccess={handleUploadSuccess} onUploadError={handleUploadError} buttonTitle={selectedSubject ? "Select File" : "Select Subject First"} apiUrl="https://rmpublicschool.org/binex/api.php?task=upload" maxSize={5 * 1024 * 1024} allowedTypes={["jpg", "jpeg", "png", "gif", "pdf"]} theme={{ primary: COLORS.primary, success: COLORS.success, error: COLORS.error, warning: COLORS.warning, background: COLORS.white, text: COLORS.ink }} style={styles.fileUploader} />
                  </View>
                )}
              </View>

              <TouchableOpacity style={[styles.submitButton, (!selectedSubject || submitting) && styles.disabledButton]} onPress={submitHomework} disabled={!selectedSubject || submitting} activeOpacity={0.8}>
                <View style={styles.submitButtonInner}>
                  {submitting ? <ActivityIndicator size="small" color={COLORS.white} /> : (<><Ionicons name="send" size={18} color={COLORS.white} /><Text style={styles.submitButtonText}>Submit Homework</Text></>)}
                </View>
              </TouchableOpacity>
            </Animated.View>
            <SuccessMessage />
            <ClassSelectionModal />
            <SubjectSelectionModal />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { padding: 20 },
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
  infoButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, fontWeight: '500' },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, padding: 16, borderRadius: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  infoIconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
  infoText: { flex: 1, fontSize: 13, color: COLORS.gray, lineHeight: 20 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, gap: 12 },
  cardHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(122, 12, 46, 0.1)', justifyContent: 'center', alignItems: 'center' },
  cardHeaderText: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
  section: { marginBottom: 20 },
  labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  labelIconContainer: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  sectionSubtitle: { fontSize: 12, color: COLORS.gray, marginBottom: 10, marginLeft: 34 },
  selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  selectorIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  selectorText: { flex: 1, fontSize: 15, color: COLORS.ink, fontWeight: '500' },
  selectorPlaceholder: { color: COLORS.gray },
  disabledSelector: { backgroundColor: COLORS.lightGray, opacity: 0.7 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cream, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', gap: 12 },
  dateText: { fontSize: 15, color: COLORS.ink, fontWeight: '700' },
  textAreaContainer: { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  textArea: { fontSize: 15, color: COLORS.ink, minHeight: 120, textAlignVertical: 'top', lineHeight: 24 },
  charCountContainer: { borderTopWidth: 1, borderTopColor: COLORS.lightGray, marginTop: 12, paddingTop: 10 },
  charCount: { fontSize: 12, color: COLORS.gray, textAlign: 'right', fontWeight: '500' },
  disabledInput: { backgroundColor: COLORS.lightGray, opacity: 0.7 },
  fileUploader: { marginTop: 5 },
  disabledUploader: { opacity: 0.7, pointerEvents: 'none' as const },
  fileInfoDisplay: { flexDirection: 'row', backgroundColor: COLORS.cream, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', justifyContent: 'space-between', alignItems: 'center' },
  fileInfoContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pdfIconContainer: { width: 44, height: 44, backgroundColor: COLORS.error, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  imagePreview: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.lightGray },
  fileDetails: { marginLeft: 14, flex: 1 },
  fileName: { fontSize: 14, color: COLORS.ink, fontWeight: '600' },
  fileMetaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  fileSize: { fontSize: 12, color: COLORS.gray },
  uploadedText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  removeFileButton: { padding: 4 },
  submitButton: { marginTop: 10, borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  submitButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 18, gap: 10, borderWidth: 2, borderColor: COLORS.secondary, borderRadius: 16 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  disabledButton: { opacity: 0.5, shadowOpacity: 0 },
  successMessage: { marginTop: 20, backgroundColor: COLORS.success, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  successText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { justifyContent: 'flex-end', height: '70%' },
  modalContent: { backgroundColor: COLORS.cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, height: '100%' },
  modalHandle: { width: 40, height: 5, backgroundColor: COLORS.lightGray, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { marginBottom: 16 },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.ink },
  modalList: { paddingVertical: 10 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14 },
  modalItemPressed: { backgroundColor: COLORS.cream },
  classIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  subjectIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  classIcon: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  modalItemContent: { flex: 1 },
  modalItemText: { fontSize: 15, color: COLORS.ink, fontWeight: '600' },
  modalItemSubtext: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  modalSeparator: { height: 1, backgroundColor: COLORS.lightGray, marginVertical: 4 },
  modalCloseButton: { marginTop: 16, padding: 16, backgroundColor: COLORS.lightGray, borderRadius: 14, alignItems: 'center' },
  modalCloseButtonText: { fontSize: 16, color: COLORS.gray, fontWeight: '600' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray, fontWeight: '500' },
  noDataContainer: { padding: 40, alignItems: 'center' },
  noDataText: { marginTop: 12, color: COLORS.gray, fontSize: 16, textAlign: 'center' },
  dottedContainer: { position: 'absolute' },
  dottedRow: { flexDirection: 'row', marginBottom: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
});