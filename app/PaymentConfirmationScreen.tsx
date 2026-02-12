import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const paymentModes = [
  { id: 'cash', label: 'Cash', icon: 'money-bill-wave' },
  { id: 'online', label: 'Online Transfer', icon: 'university' },
  { id: 'upi', label: 'UPI', icon: 'mobile-alt' },
  { id: 'cheque', label: 'Cheque', icon: 'money-check' },
  { id: 'card', label: 'Debit/Credit Card', icon: 'credit-card' },
];

export default function PaymentConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse params
  const studentId = params.student_id;
  const studentName = params.student_name;
  const studentClass = params.student_class;
  const studentSection = params.student_section;
  const selectedMonths = params.selectedMonths ? JSON.parse(params.selectedMonths) : [];
  const totalAmount = params.totalAmount ? parseFloat(params.totalAmount) : 0;

  const [formData, setFormData] = useState({
    discount: 0,
    miscFee: 0,
    paidAmount: totalAmount, // Initialize with total amount
    paymentMode: 'cash',
    paymentDate: new Date(),
    remarks: '',
  });

  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isPaymentModeModalVisible, setPaymentModeModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [netAmount, setNetAmount] = useState(totalAmount);

  // Calculate net amount whenever discount or miscFee changes
  useEffect(() => {
    const discount = parseFloat(formData.discount) || 0;
    const miscFee = parseFloat(formData.miscFee) || 0;
    const calculated = totalAmount - discount + miscFee;
    const netTotal = calculated > 0 ? calculated : 0;

    setNetAmount(netTotal);

    // Also update paidAmount if it exceeds the new netAmount
    if (parseFloat(formData.paidAmount) > netTotal) {
      setFormData(prev => ({
        ...prev,
        paidAmount: netTotal
      }));
    }
  }, [formData.discount, formData.miscFee, totalAmount]);

  const handleInputChange = (field, value) => {
    if (field === 'paidAmount') {
      // Ensure paidAmount doesn't exceed netAmount
      const numValue = parseFloat(value) || 0;
      if (numValue > netAmount) {
        value = netAmount.toString();
      }
    }

    setFormData({
      ...formData,
      [field]: value
    });
  };

  const showDatePicker = () => {
    setDatePickerVisible(true);
  };

  const handleDateChange = (event, selectedDate) => {
    setDatePickerVisible(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        paymentDate: selectedDate
      });
    }
  };

  const togglePaymentModeModal = () => {
    setPaymentModeModalVisible(!isPaymentModeModalVisible);
  };

  const selectPaymentMode = (mode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData({
      ...formData,
      paymentMode: mode
    });
    setPaymentModeModalVisible(false);
  };

  const getSelectedPaymentMode = () => {
    return paymentModes.find(mode => mode.id === formData.paymentMode) || paymentModes[0];
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Get paid amount as a number
    const paidAmount = parseFloat(formData.paidAmount) || 0;

    // Validate form
    if (netAmount <= 0) {
      Alert.alert("Invalid Amount", "Payment amount must be greater than zero.");
      return;
    }

    if (paidAmount <= 0) {
      Alert.alert("Invalid Payment", "Paid amount must be greater than zero.");
      return;
    }

    // Confirm payment
    Alert.alert(
      "Confirm Payment",
      `Process payment of ₹${paidAmount.toLocaleString()} for ${studentName}?` +
      (paidAmount < netAmount ? `\n\nThis is a partial payment (Total due: ₹${netAmount.toLocaleString()})` : ""),
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Confirm",
          onPress: processPayment
        }
      ]
    );
  };

  const processPayment = async () => {
    let user_id = await AsyncStorage.getItem('user_id');
    setIsSubmitting(true);

    try {
      // Format the date as YYYY-MM-DD
      const formattedDate = formData.paymentDate.toISOString().split('T')[0];
      const paidAmount = parseFloat(formData.paidAmount) || 0;

      // Prepare payment data
      const paymentData = {
        student_id: studentId,
        months: selectedMonths,
        discount: formData.discount,
        misc_fee: formData.miscFee,
        payment_mode: formData.paymentMode,
        payment_date: formattedDate,
        remarks: formData.remarks,
        total: netAmount.toString(),
        paid_amount: paidAmount.toString(),
        created_by: user_id || '1' // Default to '1' if user_id is not found
      };

      console.log("Sending payment data:", paymentData);

      // Make API request
      const response = await axios.post(
        'https://rmpublicschool.org/binex/api.php?task=pay_fee',
        paymentData
      );

      setIsSubmitting(false);

      if (response.data && response.data.status === "success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Show success message
        Alert.alert(
          "Payment Successful",
          `Receipt Number: ${response.data.id || 'Generated'}\nAmount Paid: ₹${paidAmount.toLocaleString()}`,
          [
            {
              text: "View Receipt",
              onPress: () => {
                // Navigate to receipt screen with receipt data
                router.push({
                  pathname: '/ReceiptScreen',
                  params: {
                    receipt_no: response.data.id,
                    student_id: studentId,
                    student_name: studentName
                  }
                });
              }
            },
            {
              text: "Done",
              onPress: () => {
                // Go back to the dashboard
                router.push('/dashboard');
              }
            }
          ]
        );
      } else {
        throw new Error(response.data?.message || "Payment failed. Please try again.");
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error("Payment error:", error);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Payment Failed",
        error.message || "An error occurred while processing your payment. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7A0C2E" />

      <View style={styles.header}>
        <LinearGradient
          colors={['#1e3c72', '#2a5298']}
          style={styles.headerGradient}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Confirmation</Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Student Info Card */}
          <Animated.View
            entering={FadeInUp.delay(100).springify()}
            style={styles.studentInfoCard}
          >
            <LinearGradient
              colors={['#3a86ff', '#4361ee']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.studentAvatar}
            >
              <Text style={styles.avatarText}>{studentName.charAt(0)}</Text>
            </LinearGradient>
            <View style={styles.studentDetail}>
              <Text style={styles.studentName}>{studentName}</Text>
              <View style={styles.infoRow}>
                <FontAwesome5 name="graduation-cap" size={12} color="#7f8c8d" style={styles.infoIcon} />
                <Text style={styles.infoText}>Class {studentClass}-{studentSection}</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="id-badge" size={12} color="#7f8c8d" style={styles.infoIcon} />
                <Text style={styles.infoText}>ID: {studentId}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Payment Details */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Payment Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Selected Months</Text>
              <Text style={styles.detailValue}>{selectedMonths.length} months</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Amount</Text>
              <Text style={styles.detailValue}>₹{totalAmount.toLocaleString()}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Discount (₹)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.discount.toString()}
                onChangeText={(value) => handleInputChange('discount', value)}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Miscellaneous Fee (₹)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.miscFee.toString()}
                onChangeText={(value) => handleInputChange('miscFee', value)}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>

            <View style={styles.netAmountContainer}>
              <Text style={styles.netAmountLabel}>Net Amount</Text>
              <Text style={styles.netAmount}>₹{netAmount.toLocaleString()}</Text>
            </View>

            <View style={[styles.inputContainer, { marginTop: 16 }]}>
              <Text style={styles.inputLabel}>Amount Paying Now (₹)</Text>
              <View style={styles.paidAmountContainer}>
                <TextInput
                  style={styles.textInput}
                  value={formData.paidAmount.toString()}
                  onChangeText={(value) => handleInputChange('paidAmount', value)}
                  keyboardType="numeric"
                  placeholder={netAmount.toString()}
                />
                <TouchableOpacity
                  style={styles.payFullButton}
                  onPress={() => handleInputChange('paidAmount', netAmount.toString())}
                >
                  <Text style={styles.payFullButtonText}>Pay Full</Text>
                </TouchableOpacity>
              </View>

              {parseFloat(formData.paidAmount) < netAmount && (
                <View style={styles.partialPaymentNote}>
                  <FontAwesome5 name="info-circle" size={14} color="#f39c12" style={{ marginRight: 6 }} />
                  <Text style={styles.partialPaymentText}>
                    This is a partial payment. Remaining: ₹{(netAmount - parseFloat(formData.paidAmount)).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Payment Options */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Payment Options</Text>

            <TouchableOpacity
              style={styles.selectContainer}
              onPress={togglePaymentModeModal}
            >
              <Text style={styles.inputLabel}>Payment Mode</Text>
              <View style={styles.selectedOption}>
                <FontAwesome5
                  name={getSelectedPaymentMode().icon}
                  size={16}
                  color="#1e3c72"
                  style={styles.optionIcon}
                />
                <Text style={styles.selectedOptionText}>{getSelectedPaymentMode().label}</Text>
                <FontAwesome5 name="chevron-down" size={14} color="#7f8c8d" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectContainer}
              onPress={showDatePicker}
            >
              <Text style={styles.inputLabel}>Payment Date</Text>
              <View style={styles.selectedOption}>
                <FontAwesome5 name="calendar-alt" size={16} color="#1e3c72" style={styles.optionIcon} />
                <Text style={styles.selectedOptionText}>
                  {formData.paymentDate.toLocaleDateString()}
                </Text>
                <FontAwesome5 name="chevron-down" size={14} color="#7f8c8d" />
              </View>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Remarks (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.remarks}
                onChangeText={(value) => handleInputChange('remarks', value)}
                placeholder="Add any additional notes here..."
                multiline={true}
                numberOfLines={3}
              />
            </View>
          </Animated.View>

          {/* Months Detail */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Selected Months</Text>

            <View style={styles.monthsList}>
              {selectedMonths.map(month => (
                <View key={month} style={styles.monthItem}>
                  <FontAwesome5 name="calendar-check" size={14} color="#1e3c72" style={styles.monthIcon} />
                  <Text style={styles.monthText}>
                    {month === "Admission_month" ? "Admission Fees" : month}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Payment Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.payButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={['#38b000', '#2d9200']}
            style={styles.payButtonGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.payButtonText}>
                  Pay ₹{parseFloat(formData.paidAmount).toLocaleString()}
                </Text>
                <FontAwesome5 name="check-circle" size={16} color="#ffffff" style={{ marginLeft: 8 }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {isDatePickerVisible && (
        <DateTimePicker
          value={formData.paymentDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Payment Mode Modal */}
      <Modal
        visible={isPaymentModeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={togglePaymentModeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={togglePaymentModeModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Payment Mode</Text>
                <TouchableOpacity onPress={togglePaymentModeModal}>
                  <FontAwesome5 name="times" size={20} color="#7f8c8d" />
                </TouchableOpacity>
              </View>

              <View style={styles.paymentModeList}>
                {paymentModes.map(mode => (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.paymentModeItem,
                      formData.paymentMode === mode.id && styles.selectedPaymentMode
                    ]}
                    onPress={() => selectPaymentMode(mode.id)}
                  >
                    <FontAwesome5 name={mode.icon} size={20} color={formData.paymentMode === mode.id ? "#ffffff" : "#1e3c72"} />
                    <Text style={[
                      styles.paymentModeText,
                      formData.paymentMode === mode.id && styles.selectedPaymentModeText
                    ]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    height: 70,
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 70,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    paddingTop: 30,
  },
  backButton: {
    width: 26,
    height: 26,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 26,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 10,
    paddingBottom: 100,
  },
  studentInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  studentDetail: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  detailLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f5f6fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#ecf0f1',
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  netAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  netAmountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e3c72',
  },
  netAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e3c72',
  },
  paidAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payFullButton: {
    backgroundColor: '#1e3c72',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 10,
  },
  payFullButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  partialPaymentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  partialPaymentText: {
    fontSize: 12,
    color: '#f39c12',
    flex: 1,
  },
  selectContainer: {
    marginBottom: 10,
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  optionIcon: {
    marginRight: 10,
  },
  selectedOptionText: {
    flex: 1,
    fontSize: 12,
    color: '#2c3e50',
  },
  monthsList: {
    marginTop: 4,
  },
  monthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  monthIcon: {
    marginRight: 10,
  },
  monthText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  payButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  payButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  paymentModeList: {
    marginBottom: 8,
  },
  paymentModeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f5f6fa',
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  selectedPaymentMode: {
    backgroundColor: '#1e3c72',
    borderColor: '#1e3c72',
  },
  paymentModeText: {
    fontSize: 12,
    color: '#2c3e50',
    marginLeft: 16,
  },
  selectedPaymentModeText: {
    color: '#ffffff',
  },
});