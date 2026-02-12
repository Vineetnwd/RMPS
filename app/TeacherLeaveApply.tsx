import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

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

const CircleRing = ({ style, color = COLORS.secondary, size = 60, borderWidth = 3 }: any) => (
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
                                opacity: 0.3 + (rowIndex * cols + colIndex) * 0.03
                            },
                        ]}
                    />
                ))}
            </View>
        ))}
    </View>
);

export default function TeacherLeaveApplyScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        from_date: new Date(),
        to_date: new Date(),
        cause: '',
    });
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [errors, setErrors] = useState<any>({});

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
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
    }, []);

    const floatTranslate = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const validateForm = () => {
        const newErrors: any = {};

        if (!formData.from_date) {
            newErrors.from_date = 'Start date is required';
        }

        if (!formData.to_date) {
            newErrors.to_date = 'End date is required';
        }

        if (formData.from_date && formData.to_date) {
            if (formData.to_date < formData.from_date) {
                newErrors.to_date = 'End date must be after start date';
            }
        }

        if (!formData.cause.trim()) {
            newErrors.cause = 'Reason for leave is required';
        } else if (formData.cause.trim().length < 10) {
            newErrors.cause = 'Reason must be at least 10 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            const empId = await AsyncStorage.getItem('emp_id') || await AsyncStorage.getItem('user_id');

            if (!empId) {
                Alert.alert('Error', 'Teacher ID not found. Please login again.');
                router.replace('/');
                return;
            }

            const branchId = await AsyncStorage.getItem('branch_id');

            const payload = {
                emp_id: empId,
                from_date: formatDateForAPI(formData.from_date),
                to_date: formatDateForAPI(formData.to_date),
                leave_cause: formData.cause.trim(),
                branch_id: branchId ? parseInt(branchId) : null,
            };

            console.log('Teacher Leave Payload:', payload);

            const response = await fetch(
                'https://rmpublicschool.org/binex/api.php?task=teacher_leave_apply',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json();
            console.log('Teacher Leave Response:', data);

            if (data.status === 'success') {
                Alert.alert(
                    'Success! ✅',
                    'Leave applied successfully. Your request will be reviewed soon.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Reset form
                                setFormData({
                                    from_date: new Date(),
                                    to_date: new Date(),
                                    cause: '',
                                });
                                setErrors({});
                                router.back();
                            },
                        },
                    ]
                );
            } else {
                Alert.alert('Error', data.msg || 'Failed to apply for leave');
            }
        } catch (err) {
            console.error('Error applying for leave:', err);
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDateForAPI = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateForDisplay = (date: Date) => {
        const options: any = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options);
    };

    const handleFromDateChange = (event: any, selectedDate: any) => {
        setShowFromDatePicker(false);
        if (selectedDate) {
            setFormData({ ...formData, from_date: selectedDate });
            setErrors({ ...errors, from_date: null });

            // Auto-adjust to_date if it's before from_date
            if (formData.to_date < selectedDate) {
                setFormData({
                    ...formData,
                    from_date: selectedDate,
                    to_date: selectedDate
                });
            }
        }
    };

    const handleToDateChange = (event: any, selectedDate: any) => {
        setShowToDatePicker(false);
        if (selectedDate) {
            setFormData({ ...formData, to_date: selectedDate });
            setErrors({ ...errors, to_date: null });
        }
    };

    const calculateDays = () => {
        const diffTime = Math.abs(formData.to_date.getTime() - formData.from_date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Apply for Leave</Text>
                            <Text style={styles.headerSubtitle}>Submit your request</Text>
                        </View>

                        <View style={{ width: 44 }} />
                    </View>

                    {/* Info Card */}
                    <Animated.View
                        style={[
                            styles.infoCard,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}
                    >
                        <View style={styles.infoIconContainer}>
                            <Ionicons name="calendar-outline" size={28} color={COLORS.secondary} />
                        </View>
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoText}>
                                Submit your leave application and we'll review it promptly
                            </Text>
                            {calculateDays() > 0 && (
                                <View style={styles.daysCounter}>
                                    <Ionicons name="time-outline" size={14} color={COLORS.secondary} />
                                    <Text style={styles.daysCounterText}>
                                        {calculateDays()} {calculateDays() === 1 ? 'Day' : 'Days'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formContainer}>
                    {/* From Date */}
                    <Animated.View
                        style={[
                            styles.inputGroup,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}
                    >
                        <View style={styles.labelContainer}>
                            <View style={styles.labelIcon}>
                                <Ionicons name="calendar" size={14} color={COLORS.secondary} />
                            </View>
                            <Text style={styles.label}>From Date</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.dateInput, errors.from_date && styles.inputError]}
                            onPress={() => setShowFromDatePicker(true)}
                        >
                            <View style={styles.dateContent}>
                                <View style={styles.dateIconContainer}>
                                    <Ionicons name="calendar-outline" size={18} color={COLORS.secondary} />
                                </View>
                                <Text style={styles.dateText}>
                                    {formatDateForDisplay(formData.from_date)}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                        {errors.from_date && (
                            <Text style={styles.errorText}>{errors.from_date}</Text>
                        )}
                    </Animated.View>

                    {/* To Date */}
                    <Animated.View
                        style={[
                            styles.inputGroup,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}
                    >
                        <View style={styles.labelContainer}>
                            <View style={styles.labelIcon}>
                                <Ionicons name="calendar" size={14} color={COLORS.secondary} />
                            </View>
                            <Text style={styles.label}>To Date</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.dateInput, errors.to_date && styles.inputError]}
                            onPress={() => setShowToDatePicker(true)}
                        >
                            <View style={styles.dateContent}>
                                <View style={styles.dateIconContainer}>
                                    <Ionicons name="calendar-outline" size={18} color={COLORS.secondary} />
                                </View>
                                <Text style={styles.dateText}>
                                    {formatDateForDisplay(formData.to_date)}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                        {errors.to_date && (
                            <Text style={styles.errorText}>{errors.to_date}</Text>
                        )}
                    </Animated.View>

                    {/* Duration Display */}
                    {!errors.to_date && !errors.from_date && (
                        <Animated.View
                            style={[
                                styles.durationCard,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }]
                                }
                            ]}
                        >
                            <View style={styles.durationIconContainer}>
                                <Ionicons name="time" size={22} color={COLORS.primary} />
                            </View>
                            <View style={styles.durationContent}>
                                <Text style={styles.durationValue}>{calculateDays()}</Text>
                                <Text style={styles.durationLabel}>
                                    {calculateDays() === 1 ? 'Day' : 'Days'} Leave
                                </Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Reason/Cause */}
                    <Animated.View
                        style={[
                            styles.inputGroup,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}
                    >
                        <View style={styles.labelContainer}>
                            <View style={styles.labelIcon}>
                                <Ionicons name="document-text" size={14} color={COLORS.secondary} />
                            </View>
                            <Text style={styles.label}>Reason for Leave</Text>
                        </View>
                        <View style={[styles.textAreaContainer, errors.cause && styles.inputError]}>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Please explain the reason for your leave application..."
                                placeholderTextColor={COLORS.gray}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                value={formData.cause}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, cause: text });
                                    setErrors({ ...errors, cause: null });
                                }}
                            />
                            <View style={styles.textAreaFooter}>
                                <Text style={styles.charCount}>
                                    {formData.cause.length} characters
                                </Text>
                                {formData.cause.length >= 10 && (
                                    <View style={styles.validIndicator}>
                                        <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                                        <Text style={styles.validText}>Valid</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        {errors.cause && (
                            <Text style={styles.errorText}>{errors.cause}</Text>
                        )}
                    </Animated.View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <View style={styles.submitInner}>
                            {loading ? (
                                <>
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                    <Text style={styles.submitButtonText}>Submitting...</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="paper-plane" size={20} color={COLORS.white} />
                                    <Text style={styles.submitButtonText}>Submit Leave Application</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Important Notes */}
                    <View style={styles.notesCard}>
                        <View style={styles.notesHeader}>
                            <View style={styles.notesIconContainer}>
                                <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
                            </View>
                            <Text style={styles.notesTitle}>Important Notes</Text>
                        </View>
                        <View style={styles.noteItem}>
                            <View style={styles.noteBullet} />
                            <Text style={styles.noteText}>
                                Leave applications will be reviewed within 24-48 hours
                            </Text>
                        </View>
                        <View style={styles.noteItem}>
                            <View style={styles.noteBullet} />
                            <Text style={styles.noteText}>
                                Ensure you provide a valid reason for your leave
                            </Text>
                        </View>
                        <View style={styles.noteItem}>
                            <View style={styles.noteBullet} />
                            <Text style={styles.noteText}>
                                You'll be notified once your application is approved
                            </Text>
                        </View>
                        <View style={styles.noteItem}>
                            <View style={styles.noteBullet} />
                            <Text style={styles.noteText}>
                                Contact admin for urgent leave requests
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Date Pickers */}
            {showFromDatePicker && (
                <DateTimePicker
                    value={formData.from_date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleFromDateChange}
                    minimumDate={new Date()}
                />
            )}

            {showToDatePicker && (
                <DateTimePicker
                    value={formData.to_date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleToDateChange}
                    minimumDate={formData.from_date}
                />
            )}
        </KeyboardAvoidingView>
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
        left: -30,
    },
    headerDiamond1: {
        position: 'absolute',
        top: 80,
        right: 60,
    },
    headerDiamond2: {
        position: 'absolute',
        top: 120,
        right: 100,
    },
    headerDots: {
        position: 'absolute',
        bottom: 60,
        left: 30,
    },
    headerStripe: {
        position: 'absolute',
        width: 3,
        height: 60,
        backgroundColor: COLORS.secondary,
        opacity: 0.3,
        right: 40,
        bottom: 40,
        borderRadius: 2,
    },
    headerContent: {
        paddingHorizontal: 14,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.white,
        letterSpacing: 0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
        fontWeight: '500',
    },

    // Info Card
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.white,
        padding: 10,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    infoIconContainer: {
        width: 26,
        height: 26,
        borderRadius: 10,
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoTextContainer: {
        flex: 1,
    },
    infoText: {
        fontSize: 12,
        color: COLORS.gray,
        lineHeight: 20,
    },
    daysCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 6,
        backgroundColor: '#FFF9F0',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    daysCounterText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.secondary,
    },

    // Scroll View
    scrollView: {
        flex: 1,
    },
    formContainer: {
        padding: 10,
    },

    // Input Group
    inputGroup: {
        marginBottom: 8,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    labelIcon: {
        width: 18,
        height: 18,
        borderRadius: 8,
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.ink,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },

    // Date Input
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FDF5F7',
        borderRadius: 12,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    dateContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dateIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#FFF9F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 14,
        color: COLORS.ink,
        fontWeight: '600',
    },
    inputError: {
        borderColor: COLORS.error,
        borderWidth: 1,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 11,
        marginTop: 4,
        marginLeft: 4,
    },

    // Duration Card
    durationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F2',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    durationIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(122, 12, 46, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    durationContent: {
        flex: 1,
    },
    durationValue: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.primary,
    },
    durationLabel: {
        fontSize: 12,
        color: COLORS.primary,
        opacity: 0.8,
    },

    // Text Area
    textAreaContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    textArea: {
        fontSize: 14,
        color: COLORS.ink,
        minHeight: 100,
        lineHeight: 22,
    },
    textAreaFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
        paddingTop: 8,
    },
    charCount: {
        fontSize: 11,
        color: COLORS.gray,
    },
    validIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    validText: {
        fontSize: 11,
        color: COLORS.success,
        fontWeight: '600',
    },

    // Submit Button
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        padding: 16,
        marginTop: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submitButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Notes
    notesCard: {
        backgroundColor: '#FFF9F0',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    notesIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(212, 175, 55, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notesTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.secondaryDark,
    },
    noteItem: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    noteBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.secondary,
        marginTop: 6,
        marginRight: 8,
    },
    noteText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.gray,
        lineHeight: 18,
    },

    dottedContainer: {
        position: 'absolute',
    },
    dottedRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginHorizontal: 4,
    },
});
