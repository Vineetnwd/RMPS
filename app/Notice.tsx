import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FileUploader from './FileUploader';

const { width } = Dimensions.get('window');

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

export default function NoticeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeDetails, setNoticeDetails] = useState('');
  const [noticeDate, setNoticeDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 20000, useNativeDriver: true })).start();
  }, []);

  const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || noticeDate;
    setShowDatePicker(Platform.OS === 'ios');
    setNoticeDate(currentDate);
  };

  const handleUploadSuccess = (fileInfo: any) => { setUploadedFileInfo(fileInfo); };
  const handleUploadError = (error: string) => { Alert.alert('Upload Error', error); setUploadedFileInfo(null); };
  const handleBack = () => navigation.goBack();

  const validateForm = () => {
    const newErrors: any = {};
    if (!noticeTitle.trim()) newErrors.title = 'Notice title is required';
    if (!noticeDetails.trim()) newErrors.details = 'Notice details are required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const branchId = await AsyncStorage.getItem('branch_id');
      const formattedDate = format(noticeDate, 'yyyy-MM-dd');
      const noticeData = { notice_date: formattedDate, notice_title: noticeTitle, notice_details: noticeDetails, notice_attachment: uploadedFileInfo?.file_name || '', branch_id: branchId ? parseInt(branchId) : null };
      const response = await fetch('https://rmpublicschool.org/binex/api.php?task=notice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(noticeData) });
      const result = await response.json();
      if (result.status === 'success') {
        setSubmitSuccess(true);
        setTimeout(() => { setNoticeTitle(''); setNoticeDetails(''); setNoticeDate(new Date()); setUploadedFileInfo(null); setSubmitSuccess(false); }, 2000);
      } else Alert.alert('Error', 'Failed to create notice');
    } catch (error) { Alert.alert('Error', 'An unexpected error occurred'); }
    finally { setLoading(false); }
  };

  const FileInfoDisplay = () => {
    if (!uploadedFileInfo) return null;
    const isPdf = uploadedFileInfo.file_type === 'pdf';
    return (
      <View style={styles.fileInfoDisplay}>
        <View style={styles.fileInfoContent}>
          <View style={[styles.fileIconContainer, { backgroundColor: isPdf ? COLORS.error : COLORS.primary }]}><Ionicons name={isPdf ? "document-text" : "image"} size={24} color={COLORS.white} /></View>
          <View style={styles.fileDetails}><Text style={styles.fileName} numberOfLines={1}>{uploadedFileInfo.file_name}</Text><View style={styles.fileMetaContainer}><Text style={styles.uploadedText}><Ionicons name="checkmark-circle" size={12} color={COLORS.success} /> Uploaded</Text><Text style={styles.fileSize}>{uploadedFileInfo.file_size}</Text></View></View>
        </View>
        <TouchableOpacity style={styles.removeFileButton} onPress={() => setUploadedFileInfo(null)}><Ionicons name="close-circle" size={22} color={COLORS.error} /></TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
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
            <TouchableOpacity style={styles.backButton} onPress={handleBack}><Ionicons name="arrow-back" size={22} color={COLORS.white} /></TouchableOpacity>
            <View style={styles.headerTitleContainer}><Text style={styles.headerTitle}>School Notice</Text><Text style={styles.headerSubtitle}>Create announcements</Text></View>
            <View style={styles.headerIconContainer}><Ionicons name="megaphone" size={20} color={COLORS.white} /></View>
          </View>
          <Animated.View style={[styles.infoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.infoIconContainer}><Ionicons name="notifications" size={26} color={COLORS.primary} /></View>
            <Text style={styles.infoText}>Publish important notices and announcements for students and parents</Text>
          </Animated.View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidView} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }]}>
            <View style={styles.cardHeader}><View style={styles.cardHeaderIcon}><Ionicons name="create-outline" size={20} color={COLORS.primary} /></View><Text style={styles.cardHeaderText}>Notice Information</Text></View>

            <View style={styles.formGroup}>
              <View style={styles.labelContainer}><View style={styles.labelIconContainer}><Ionicons name="calendar" size={14} color={COLORS.secondary} /></View><Text style={styles.formLabel}>Notice Date</Text></View>
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                <View style={styles.dateSelectorIcon}><Ionicons name="calendar-outline" size={18} color={COLORS.primary} /></View>
                <Text style={styles.dateText}>{format(noticeDate, 'dd MMMM yyyy')}</Text>
                <View style={styles.datePickerButton}><Ionicons name="chevron-down" size={18} color={COLORS.white} /></View>
              </TouchableOpacity>
              {showDatePicker && <DateTimePicker value={noticeDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} />}
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelContainer}><View style={styles.labelIconContainer}><Ionicons name="text" size={14} color={COLORS.secondary} /></View><Text style={styles.formLabel}>Notice Title</Text></View>
              <View style={[styles.inputContainer, errors.title && styles.inputError]}>
                <View style={styles.inputIconContainer}><Ionicons name="create-outline" size={18} color={errors.title ? COLORS.error : COLORS.primary} /></View>
                <TextInput style={styles.input} placeholder="Enter notice title" value={noticeTitle} onChangeText={setNoticeTitle} maxLength={100} placeholderTextColor={COLORS.gray} />
              </View>
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelContainer}><View style={styles.labelIconContainer}><Ionicons name="document-text" size={14} color={COLORS.secondary} /></View><Text style={styles.formLabel}>Notice Details</Text></View>
              <View style={[styles.textAreaContainer, errors.details && styles.inputError]}>
                <TextInput style={styles.textArea} placeholder="Enter notice details" value={noticeDetails} onChangeText={setNoticeDetails} multiline numberOfLines={6} textAlignVertical="top" placeholderTextColor={COLORS.gray} />
                <View style={styles.charCountContainer}><Text style={styles.charCount}>{noticeDetails.length} characters</Text></View>
              </View>
              {errors.details && <Text style={styles.errorText}>{errors.details}</Text>}
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelContainer}><View style={styles.labelIconContainer}><Ionicons name="attach" size={14} color={COLORS.secondary} /></View><Text style={styles.formLabel}>Attachment (Optional)</Text></View>
              <Text style={styles.formLabelHint}>PDF or Image up to 5MB</Text>
              {uploadedFileInfo ? <FileInfoDisplay /> : (
                <View style={styles.uploaderContainer}>
                  <FileUploader onUploadSuccess={handleUploadSuccess} onUploadError={handleUploadError} buttonTitle="Upload Attachment" apiUrl="https://rmpublicschool.org/binex/api.php?task=upload" maxSize={5 * 1024 * 1024} allowedTypes={["jpg", "jpeg", "png", "gif", "pdf"]} theme={{ primary: COLORS.primary, success: COLORS.success, error: COLORS.error, warning: COLORS.warning, background: COLORS.white, text: COLORS.ink }} style={styles.fileUploader} />
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.submitButton, submitSuccess && styles.successButton, loading && styles.disabledButton]} onPress={handleSubmit} disabled={loading || submitSuccess} activeOpacity={0.8}>
              <View style={styles.submitButtonInner}>
                {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : submitSuccess ? (<><Ionicons name="checkmark-circle" size={20} color={COLORS.white} /><Text style={styles.submitButtonText}>Notice Published!</Text></>) : (<><Ionicons name="paper-plane" size={18} color={COLORS.white} /><Text style={styles.submitButtonText}>Publish Notice</Text></>)}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {submitSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: fadeAnim }]}>
          <View style={styles.successPopup}>
            <View style={styles.successIconContainer}><Ionicons name="checkmark-circle" size={60} color={COLORS.success} /></View>
            <Text style={styles.successPopupTitle}>Success!</Text>
            <Text style={styles.successPopupText}>Notice Published Successfully</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  keyboardAvoidView: { flex: 1, backgroundColor: '#FDF5F7' },
  header: { backgroundColor: COLORS.primary, paddingTop: 10, paddingBottom: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
  headerDecorations: { ...StyleSheet.absoluteFillObject },
  headerBlob: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.secondary, opacity: 0.12, top: -40, right: -50 },
  headerRing: { position: 'absolute', top: 30, left: -30 },
  headerDiamond1: { position: 'absolute', top: 80, right: 60 },
  headerDiamond2: { position: 'absolute', top: 120, right: 100 },
  headerDots: { position: 'absolute', bottom: 60, left: 30 },
  headerContent: { paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  headerIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2, fontWeight: '500' },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF5F7', padding: 10, borderRadius: 12, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 4 },
  infoIconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
  infoText: { flex: 1, fontSize: 12, color: COLORS.gray, lineHeight: 20 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 10, paddingBottom: 40 },
  card: { backgroundColor: '#FDF5F7', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 12 },
  cardHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(122, 12, 46, 0.1)', justifyContent: 'center', alignItems: 'center' },
  cardHeaderText: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  formGroup: { marginBottom: 20 },
  labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  labelIconContainer: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(212, 175, 55, 0.15)', justifyContent: 'center', alignItems: 'center' },
  formLabel: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  formLabelHint: { fontSize: 12, color: COLORS.gray, marginBottom: 10, marginLeft: 34 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF5F7', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  dateSelectorIcon: { width: 50, height: 54, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(212, 175, 55, 0.1)' },
  dateText: { flex: 1, fontSize: 12, color: COLORS.ink, fontWeight: '700', paddingHorizontal: 14 },
  datePickerButton: { backgroundColor: COLORS.primary, height: 54, width: 50, alignItems: 'center', justifyContent: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF5F7', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  inputIconContainer: { width: 50, height: 54, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(212, 175, 55, 0.1)', borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  inputError: { borderColor: COLORS.error, borderWidth: 1.5 },
  input: { flex: 1, height: 54, fontSize: 12, color: COLORS.ink, paddingHorizontal: 14 },
  textAreaContainer: { backgroundColor: '#FDF5F7', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  textArea: { fontSize: 12, color: COLORS.ink, minHeight: 120, lineHeight: 24 },
  charCountContainer: { borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 12, paddingTop: 10 },
  charCount: { fontSize: 12, color: COLORS.gray, textAlign: 'right', fontWeight: '500' },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: 6, marginLeft: 34, fontWeight: '600' },
  uploaderContainer: { borderWidth: 2, borderColor: '#F5E8EB', borderRadius: 12, padding: 10, backgroundColor: '#FFF9F0', borderStyle: 'dashed' },
  fileUploader: { marginTop: 0 },
  fileInfoDisplay: { flexDirection: 'row', backgroundColor: '#FFF9F0', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.04)', justifyContent: 'space-between', alignItems: 'center' },
  fileInfoContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fileIconContainer: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileDetails: { marginLeft: 14, flex: 1 },
  fileName: { fontSize: 12, color: COLORS.ink, fontWeight: '600' },
  fileMetaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  fileSize: { fontSize: 12, color: COLORS.gray },
  uploadedText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  removeFileButton: { padding: 5 },
  submitButton: { marginTop: 10, borderRadius: 12, overflow: 'hidden', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  submitButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 18, gap: 6, borderWidth: 2, borderColor: COLORS.secondary, borderRadius: 16 },
  submitButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  disabledButton: { opacity: 0.5, shadowOpacity: 0 },
  successButton: {},
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  successPopup: { backgroundColor: '#FDF5F7', borderRadius: 24, padding: 40, alignItems: 'center', width: width * 0.85, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10 },
  successIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successPopupTitle: { fontSize: 12, fontWeight: '800', color: COLORS.ink, marginBottom: 8 },
  successPopupText: { fontSize: 12, color: COLORS.gray, textAlign: 'center', fontWeight: '500' },
  dottedContainer: { position: 'absolute' },
  dottedRow: { flexDirection: 'row', marginBottom: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 4 },
});