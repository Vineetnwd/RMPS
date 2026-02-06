import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

export default function ReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [receiptData, setReceiptData] = useState(null);
  const [error, setError] = useState(null);

  // Get receipt ID from params
  const receiptId = params.receipt_no || params.receipt_id || "";

  // School details
  const schoolDetails = {
    name: "Delhi Public School, Mushkipur",
    address: "Mushkipur, Muzaffarpur, Bihar - 842002",
    phone: "+91 9876543210",
    email: "info@dpsmushkipur.com",
    website: "www.dpsmushkipur.com",
    logo: require("./assets/logo.png")
  };

  useEffect(() => {
    fetchReceiptDetails();
  }, [receiptId]);

  const fetchReceiptDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!receiptId) {
        throw new Error("Receipt ID is required");
      }

      const response = await axios.post(
        'https://rmpublicschool.org/binex/api.php?task=get_receipt',
        {
          receipt_id: receiptId
        }
      );

      if (response.data) {
        setReceiptData(response.data);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Error fetching receipt:", err);
      setError("Failed to load receipt details. " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIXED: Complete HTML generation with proper fee table showing description and amount
  const generateReceiptHTML = () => {
    if (!receiptData) return '';

    // Format payment date
    const formattedDate = new Date(receiptData.payment_date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Determine paid amount
    const paidAmount = receiptData.paid_amount !== null
      ? parseFloat(receiptData.paid_amount)
      : parseFloat(receiptData.total);

    // Split months if there are multiple
    const paidMonths = receiptData.paid_month
      ? receiptData.paid_month.split(',').map(month => month.trim())
      : ['N/A'];
    const monthsDisplay = paidMonths.join(', ');

    // Calculate values safely
    const tutionFee = receiptData.fee_details?.tution_fee ? parseFloat(receiptData.fee_details.tution_fee) : 0;
    const transportFee = receiptData.fee_details?.transport_fee ? parseFloat(receiptData.fee_details.transport_fee) : 0;
    const totalAmount = parseFloat(receiptData.total) || 0;
    const discount = parseFloat(receiptData.discount) || 0;
    const miscFee = parseFloat(receiptData.misc_fee) || 0;
    const currentDues = parseFloat(receiptData.current_dues) || 0;

    // Format currency
    const formatCurrency = (amount) => {
      return '₹ ' + amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // Build fee rows dynamically
    let feeRows = '';
    let serialNo = 1;

    if (tutionFee > 0) {
      feeRows += `
        <tr>
          <td class="serial-no">${serialNo++}</td>
          <td class="description">
            <div class="fee-name">Tuition Fee</div>
            <div class="fee-period">Period: ${monthsDisplay}</div>
          </td>
          <td class="amount">${formatCurrency(tutionFee)}</td>
        </tr>
      `;
    }

    if (transportFee > 0) {
      feeRows += `
        <tr>
          <td class="serial-no">${serialNo++}</td>
          <td class="description">
            <div class="fee-name">Transport Fee</div>
            <div class="fee-period">Period: ${monthsDisplay}</div>
          </td>
          <td class="amount">${formatCurrency(transportFee)}</td>
        </tr>
      `;
    }

    if (miscFee > 0) {
      feeRows += `
        <tr>
          <td class="serial-no">${serialNo++}</td>
          <td class="description">
            <div class="fee-name">Miscellaneous Fee</div>
            <div class="fee-period">Additional charges</div>
          </td>
          <td class="amount">${formatCurrency(miscFee)}</td>
        </tr>
      `;
    }

    // If no fees, show a default row
    if (feeRows === '') {
      feeRows = `
        <tr>
          <td class="serial-no">1</td>
          <td class="description">
            <div class="fee-name">School Fee</div>
            <div class="fee-period">Period: ${monthsDisplay}</div>
          </td>
          <td class="amount">${formatCurrency(totalAmount)}</td>
        </tr>
      `;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fee Receipt - ${receiptData.receipt_id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 15px;
      color: #333;
      background-color: #f5f5f5;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border: 2px solid #1e3c72;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      position: relative;
    }
    
    /* Watermark */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      font-weight: bold;
      color: rgba(76, 175, 80, 0.06);
      z-index: 0;
      pointer-events: none;
      white-space: nowrap;
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%);
      color: white;
      padding: 15px 20px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .school-logo {
      width: 60px;
      height: 60px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      color: #1e3c72;
      flex-shrink: 0;
      border: 2px solid #fff;
    }
    
    .school-info {
      flex: 1;
    }
    
    .school-name {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .school-details {
      font-size: 11px;
      opacity: 0.9;
      line-height: 1.5;
    }
    
    /* Receipt Title */
    .receipt-title-section {
      text-align: center;
      padding: 15px;
      border-bottom: 2px dashed #e0e0e0;
      background: #fafafa;
      position: relative;
      z-index: 1;
    }
    
    .receipt-title {
      font-size: 24px;
      font-weight: bold;
      color: #1e3c72;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    
    .receipt-meta {
      display: flex;
      justify-content: center;
      gap: 40px;
      font-size: 13px;
      color: #555;
    }
    
    .receipt-meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .receipt-meta-item strong {
      color: #1e3c72;
    }
    
    /* Content */
    .content {
      padding: 20px;
      position: relative;
      z-index: 1;
    }
    
    /* Section */
    .section {
      margin-bottom: 20px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #1e3c72;
      background: linear-gradient(90deg, #e8eef7 0%, transparent 100%);
      padding: 8px 12px;
      border-left: 4px solid #1e3c72;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    /* Student Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
      background: #f8f9fa;
      padding: 12px 15px;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }
    
    .info-item {
      display: flex;
      padding: 4px 0;
    }
    
    .info-label {
      font-weight: 600;
      color: #666;
      min-width: 110px;
      font-size: 12px;
    }
    
    .info-value {
      color: #333;
      font-weight: 500;
      font-size: 12px;
    }
    
    /* ✅ FIXED: Fee Table with proper Description and Amount columns */
    .fee-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
      background: white;
      border: 1px solid #1e3c72;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .fee-table thead {
      background: linear-gradient(135deg, #1e3c72, #2a5298);
    }
    
    .fee-table th {
      padding: 12px 15px;
      text-align: left;
      color: white;
      font-weight: 600;
      font-size: 13px;
      border-bottom: 2px solid #1e3c72;
    }
    
    .fee-table th.serial-no {
      width: 60px;
      text-align: center;
    }
    
    .fee-table th.description {
      width: auto;
    }
    
    .fee-table th.amount {
      width: 150px;
      text-align: right;
    }
    
    .fee-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: top;
    }
    
    .fee-table td.serial-no {
      text-align: center;
      font-weight: 600;
      color: #1e3c72;
    }
    
    .fee-table td.description {
      text-align: left;
    }
    
    .fee-table td.description .fee-name {
      font-weight: 600;
      color: #333;
      font-size: 13px;
      margin-bottom: 3px;
    }
    
    .fee-table td.description .fee-period {
      font-size: 11px;
      color: #888;
      font-style: italic;
    }
    
    .fee-table td.amount {
      text-align: right;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #333;
    }
    
    .fee-table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    
    .fee-table tbody tr:hover {
      background-color: #e8f4e8;
    }
    
    .fee-table tbody tr:last-child td {
      border-bottom: none;
    }
    
    /* Summary Section */
    .summary-container {
      margin-top: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      border-bottom: 1px solid #e0e0e0;
      background: #fafafa;
    }
    
    .summary-row:last-child {
      border-bottom: none;
    }
    
    .summary-row.subtotal {
      background: #f0f0f0;
    }
    
    .summary-row.discount {
      background: #fff5f5;
    }
    
    .summary-row.discount .summary-value {
      color: #e74c3c;
    }
    
    .summary-row.total-paid {
      background: linear-gradient(135deg, #1e3c72, #2a5298);
      color: white;
      padding: 15px;
    }
    
    .summary-row.total-paid .summary-label,
    .summary-row.total-paid .summary-value {
      color: white;
      font-size: 16px;
      font-weight: bold;
    }
    
    .summary-label {
      font-weight: 500;
      color: #555;
      font-size: 13px;
    }
    
    .summary-value {
      font-weight: 600;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #333;
    }
    
    /* Dues Warning */
    .dues-warning {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(90deg, #fff3e0, #ffe0b2);
      border: 1px solid #ffb74d;
      border-left: 4px solid #f57c00;
      border-radius: 6px;
      padding: 12px 15px;
      margin-top: 15px;
    }
    
    .dues-label {
      font-weight: 600;
      color: #e65100;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .dues-amount {
      font-size: 16px;
      font-weight: bold;
      color: #e65100;
      font-family: 'Courier New', monospace;
    }
    
    /* Remarks */
    .remarks-box {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 12px 15px;
      border-radius: 0 6px 6px 0;
      margin-top: 15px;
    }
    
    .remarks-label {
      font-weight: 600;
      color: #1565c0;
      margin-bottom: 5px;
      font-size: 12px;
    }
    
    .remarks-text {
      color: #333;
      font-size: 12px;
      line-height: 1.5;
    }
    
    /* Payment Mode Badge */
    .payment-mode {
      display: inline-block;
      background: #e8f5e9;
      color: #2e7d32;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 10px;
    }
    
    /* Signature Section */
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px dashed #ccc;
    }
    
    .signature-box {
      text-align: center;
      width: 180px;
    }
    
    .signature-line {
      border-top: 1px solid #333;
      margin-bottom: 8px;
    }
    
    .signature-title {
      font-weight: 600;
      color: #333;
      font-size: 12px;
    }
    
    .signature-subtitle {
      color: #666;
      font-size: 11px;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 12px;
      background: #f5f5f5;
      border-top: 1px solid #e0e0e0;
      font-size: 10px;
      color: #888;
    }
    
    .footer p {
      margin: 2px 0;
    }
    
    .footer .thank-you {
      font-weight: bold;
      color: #1e3c72;
      font-size: 12px;
      margin-top: 8px;
    }
    
    /* Print Styles */
    @media print {
      body {
        padding: 0;
        background: white;
      }
      
      .receipt-container {
        box-shadow: none;
        border: 2px solid #1e3c72;
      }
      
      .fee-table tbody tr:hover {
        background-color: inherit;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Watermark -->
    <div class="watermark">PAID</div>
    
    <!-- Header -->
    <div class="header">
      <div class="school-logo">DPS</div>
      <div class="school-info">
        <div class="school-name">${schoolDetails.name}</div>
        <div class="school-details">
          ${schoolDetails.address}<br>
          Phone: ${schoolDetails.phone} | Email: ${schoolDetails.email}
        </div>
      </div>
    </div>
    
    <!-- Receipt Title -->
    <div class="receipt-title-section">
      <div class="receipt-title">FEE RECEIPT</div>
      <div class="receipt-meta">
        <div class="receipt-meta-item">
          <strong>Receipt No:</strong> ${receiptData.receipt_id}
        </div>
        <div class="receipt-meta-item">
          <strong>Date:</strong> ${formattedDate}
        </div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Student Information -->
      <div class="section">
        <div class="section-title">📋 Student Information</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Student Name:</span>
            <span class="info-value">${receiptData.student_name || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Admission No:</span>
            <span class="info-value">${receiptData.admission_no || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Class:</span>
            <span class="info-value">${receiptData.student_class || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Father's Name:</span>
            <span class="info-value">${receiptData.father_name || 'N/A'}</span>
          </div>
        </div>
      </div>
      
      <!-- Fee Details Section -->
      <div class="section">
        <div class="section-title">💰 Fee Details</div>
        
        <!-- ✅ FIXED: Fee Table with S.No, Description, and Amount columns -->
        <table class="fee-table">
          <thead>
            <tr>
              <th class="serial-no">S.No</th>
              <th class="description">Description</th>
              <th class="amount">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${feeRows}
          </tbody>
        </table>
        
        <!-- Summary Section -->
        <div class="summary-container">
          <div class="summary-row subtotal">
            <span class="summary-label">Subtotal:</span>
            <span class="summary-value">${formatCurrency(tutionFee + transportFee + miscFee)}</span>
          </div>
          ${discount > 0 ? `
          <div class="summary-row discount">
            <span class="summary-label">Discount:</span>
            <span class="summary-value">- ${formatCurrency(discount)}</span>
          </div>
          ` : ''}
          <div class="summary-row">
            <span class="summary-label">Net Amount:</span>
            <span class="summary-value">${formatCurrency(totalAmount)}</span>
          </div>
          <div class="summary-row total-paid">
            <span class="summary-label">✓ Amount Paid:</span>
            <span class="summary-value">${formatCurrency(paidAmount)}</span>
          </div>
        </div>
        
        ${currentDues > 0 ? `
        <!-- Dues Warning -->
        <div class="dues-warning">
          <span class="dues-label">⚠️ Outstanding Dues:</span>
          <span class="dues-amount">${formatCurrency(currentDues)}</span>
        </div>
        ` : ''}
        
        ${receiptData.remarks ? `
        <!-- Remarks -->
        <div class="remarks-box">
          <div class="remarks-label">📝 Remarks:</div>
          <div class="remarks-text">${receiptData.remarks}</div>
        </div>
        ` : ''}
        
        <div class="payment-mode">✓ Payment Received</div>
      </div>
      
      <!-- Signature Section -->
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-title">Parent's Signature</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-title">Authorized Signatory</div>
          <div class="signature-subtitle">DPS Mushkipur</div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>This is a computer-generated receipt and does not require a physical signature.</p>
      <p>For any queries, please contact the school office at ${schoolDetails.phone}</p>
      <p class="thank-you">Thank you for your payment!</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  const printReceipt = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const html = generateReceiptHTML();

      if (!html) {
        Alert.alert("Error", "Unable to generate receipt. Please try again.");
        return;
      }

      const { uri } = await Print.printToFileAsync({
        html,
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        }
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Receipt_${receiptData.receipt_id}`
        });
      } else {
        Alert.alert("Sharing not available", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Error printing receipt:", error);
      Alert.alert("Print Error", "There was an error while generating the receipt. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#7A0C2E" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#1e3c72" />
          <Text style={styles.loadingText}>Loading receipt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#7A0C2E" />
        <FontAwesome5 name="exclamation-triangle" size={50} color="#e74c3c" />
        <Text style={styles.errorTitle}>Error Loading Receipt</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchReceiptDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()}>
          <Text style={styles.backButtonErrorText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!receiptData) {
    return null;
  }

  // Calculate values for display
  const paidAmount = receiptData.paid_amount !== null
    ? parseFloat(receiptData.paid_amount)
    : parseFloat(receiptData.total);

  const isPartialPayment = receiptData.paid_amount !== null &&
    parseFloat(receiptData.paid_amount) < parseFloat(receiptData.total);

  const paidMonths = receiptData.paid_month
    ? receiptData.paid_month.split(',').map(month => month.trim())
    : ['N/A'];

  const hasDues = receiptData.current_dues && parseFloat(receiptData.current_dues) > 0;

  const tutionFee = receiptData.fee_details?.tution_fee ? parseFloat(receiptData.fee_details.tution_fee) : 0;
  const transportFee = receiptData.fee_details?.transport_fee ? parseFloat(receiptData.fee_details.transport_fee) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7A0C2E" />

      {/* Watermark */}
      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>PAID</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={20} color="#1e3c72" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fee Receipt</Text>
        <TouchableOpacity style={styles.printButton} onPress={printReceipt}>
          <FontAwesome5 name="download" size={20} color="#1e3c72" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Receipt Card */}
        <Animated.View entering={FadeIn.delay(200).springify()} style={styles.receiptCard}>
          {/* School Info */}
          <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.schoolHeader}>
            <Image
              source={schoolDetails.logo}
              style={styles.schoolLogo}
              defaultSource={require('./assets/default.png')}
            />
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolName}>{schoolDetails.name}</Text>
              <Text style={styles.schoolAddress}>{schoolDetails.address}</Text>
            </View>
          </LinearGradient>

          {/* Receipt Title */}
          <View style={styles.receiptTitleContainer}>
            <Text style={styles.receiptTitle}>RECEIPT</Text>
            <View style={styles.receiptMeta}>
              <View style={styles.receiptMetaItem}>
                <FontAwesome5 name="hashtag" size={12} color="#7f8c8d" />
                <Text style={styles.receiptNo}>{receiptData.receipt_id}</Text>
              </View>
              <View style={styles.receiptMetaItem}>
                <FontAwesome5 name="calendar" size={12} color="#7f8c8d" />
                <Text style={styles.receiptDate}>
                  {new Date(receiptData.payment_date).toLocaleDateString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Student Information */}
          <Animated.View entering={SlideInDown.delay(300).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="user-graduate" size={16} color="#1e3c72" />
              <Text style={styles.sectionTitle}>Student Information</Text>
            </View>

            <View style={styles.studentDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{receiptData.student_name || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Admission No.</Text>
                <Text style={styles.detailValue}>{receiptData.admission_no || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Class</Text>
                <Text style={styles.detailValue}>{receiptData.student_class || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Father's Name</Text>
                <Text style={styles.detailValue}>{receiptData.father_name || 'N/A'}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Payment Details */}
          <Animated.View entering={SlideInDown.delay(400).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="money-check-alt" size={16} color="#1e3c72" />
              <Text style={styles.sectionTitle}>Payment Details</Text>
            </View>

            <View style={styles.paymentDetails}>
              {/* Month Info */}
              <View style={styles.monthInfoRow}>
                <View style={styles.monthInfo}>
                  <FontAwesome5 name="calendar-alt" size={16} color="#1e3c72" style={styles.paymentIcon} />
                  <View>
                    <Text style={styles.paymentMethod}>
                      {paidMonths.length > 1 ? `${paidMonths.join(', ')} Fees` : `${paidMonths[0]} Fee`}
                    </Text>
                    <Text style={styles.paymentDate}>
                      Paid on {new Date(receiptData.payment_date).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>Paid Amount</Text>
                  <Text style={styles.amountValue}>₹{paidAmount.toLocaleString('en-IN')}</Text>
                  {isPartialPayment && (
                    <View style={styles.partialBadge}>
                      <Text style={styles.partialPayment}>Partial</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Fee Breakdown */}
              <View style={styles.feeBreakdown}>
                <Text style={styles.breakdownTitle}>Fee Breakdown</Text>

                {tutionFee > 0 && (
                  <View style={styles.feeRow}>
                    <View style={styles.feeInfo}>
                      <FontAwesome5 name="book" size={12} color="#4CAF50" />
                      <View style={styles.feeTextContainer}>
                        <Text style={styles.feeLabel}>Tuition Fee</Text>
                        <Text style={styles.feePeriod}>Period: {paidMonths.join(', ')}</Text>
                      </View>
                    </View>
                    <Text style={styles.feeValue}>₹{tutionFee.toLocaleString('en-IN')}</Text>
                  </View>
                )}

                {transportFee > 0 && (
                  <View style={styles.feeRow}>
                    <View style={styles.feeInfo}>
                      <FontAwesome5 name="bus" size={12} color="#2196F3" />
                      <View style={styles.feeTextContainer}>
                        <Text style={styles.feeLabel}>Transport Fee</Text>
                        <Text style={styles.feePeriod}>Period: {paidMonths.join(', ')}</Text>
                      </View>
                    </View>
                    <Text style={styles.feeValue}>₹{transportFee.toLocaleString('en-IN')}</Text>
                  </View>
                )}

                {parseFloat(receiptData.misc_fee) > 0 && (
                  <View style={styles.feeRow}>
                    <View style={styles.feeInfo}>
                      <FontAwesome5 name="file-alt" size={12} color="#9C27B0" />
                      <View style={styles.feeTextContainer}>
                        <Text style={styles.feeLabel}>Misc. Fee</Text>
                        <Text style={styles.feePeriod}>Additional charges</Text>
                      </View>
                    </View>
                    <Text style={styles.miscValue}>+₹{parseFloat(receiptData.misc_fee).toLocaleString('en-IN')}</Text>
                  </View>
                )}

                {parseFloat(receiptData.discount) > 0 && (
                  <View style={styles.feeRow}>
                    <View style={styles.feeInfo}>
                      <FontAwesome5 name="tag" size={12} color="#e74c3c" />
                      <View style={styles.feeTextContainer}>
                        <Text style={styles.feeLabel}>Discount</Text>
                        <Text style={styles.feePeriod}>Applied discount</Text>
                      </View>
                    </View>
                    <Text style={styles.discountValue}>-₹{parseFloat(receiptData.discount).toLocaleString('en-IN')}</Text>
                  </View>
                )}

                <View style={[styles.feeRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>₹{parseFloat(receiptData.total).toLocaleString('en-IN')}</Text>
                </View>

                {/* Net Paid */}
                <View style={styles.netPaidContainer}>
                  <View style={styles.netPaidRow}>
                    <Text style={styles.netPaidLabel}>✓ Amount Paid</Text>
                    <Text style={styles.netPaidValue}>₹{paidAmount.toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {/* Current Dues */}
                {hasDues && (
                  <View style={styles.duesContainer}>
                    <View style={styles.duesHeader}>
                      <FontAwesome5 name="exclamation-triangle" size={14} color="#f39c12" />
                      <Text style={styles.duesTitle}>Current Dues</Text>
                    </View>
                    <Text style={styles.duesAmount}>₹{parseFloat(receiptData.current_dues).toLocaleString('en-IN')}</Text>
                  </View>
                )}

                {receiptData.remarks && (
                  <View style={styles.remarksContainer}>
                    <Text style={styles.remarksLabel}>Remarks:</Text>
                    <Text style={styles.remarksText}>{receiptData.remarks}</Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Verification */}
          <Animated.View entering={SlideInDown.delay(500).springify()} style={[styles.section, styles.verificationSection]}>
            <View style={styles.qrContainer}>
              <View style={styles.qrPlaceholder}>
                <FontAwesome5 name="qrcode" size={60} color="#1e3c72" />
              </View>
              <Text style={styles.scanText}>Scan to verify</Text>
            </View>

            <View style={styles.signatureContainer}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>Authorized Signatory</Text>
              <Text style={styles.signaturePosition}>DPS Mushkipur</Text>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>✓ This is a computer-generated receipt.</Text>
            <Text style={styles.footerText}>For queries, contact: {schoolDetails.phone}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={printReceipt}>
          <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.buttonGradient}>
            <FontAwesome5 name="share-alt" size={18} color="#ffffff" />
            <Text style={styles.buttonText}>Share Receipt</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/Dashboard')}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1e3c72',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButtonError: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonErrorText: {
    color: '#1e3c72',
    fontSize: 16,
  },
  watermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  watermarkText: {
    fontSize: 120,
    color: 'rgba(200, 200, 200, 0.15)',
    fontWeight: 'bold',
    transform: [{ rotate: '-45deg' }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  printButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  receiptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
  schoolHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  schoolLogo: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#ffffff',
    marginRight: 16,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  schoolAddress: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.85,
  },
  receiptTitleContainer: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  receiptTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1e3c72',
    letterSpacing: 3,
  },
  receiptMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 20,
  },
  receiptMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptNo: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  receiptDate: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  studentDetails: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#7f8c8d',
  },
  detailValue: {
    flex: 2,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  paymentDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    overflow: 'hidden',
  },
  monthInfoRow: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    marginRight: 12,
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  paymentDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3c72',
  },
  partialBadge: {
    marginTop: 4,
  },
  partialPayment: {
    fontSize: 11,
    color: '#f39c12',
    backgroundColor: '#fff8e1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  feeBreakdown: {
    padding: 16,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 14,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  feeTextContainer: {
    flex: 1,
  },
  feeLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  feePeriod: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    fontStyle: 'italic',
  },
  feeValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  discountValue: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
  },
  miscValue: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  netPaidContainer: {
    marginTop: 12,
    backgroundColor: '#1e3c72',
    padding: 14,
    borderRadius: 10,
  },
  netPaidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netPaidLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  netPaidValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  duesContainer: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f39c12',
  },
  duesAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f39c12',
  },
  remarksContainer: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  remarksLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1565c0',
    marginBottom: 4,
  },
  remarksText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  verificationSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0,
    paddingVertical: 24,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scanText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
  },
  signatureContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  signatureLine: {
    width: 130,
    height: 1,
    backgroundColor: '#2c3e50',
    marginBottom: 8,
  },
  signatureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  signaturePosition: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  footerText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  actionButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#f5f6fa',
    overflow: 'hidden',
  },
  shareButton: {
    backgroundColor: 'transparent',
  },
  buttonGradient: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  doneButtonText: {
    color: '#1e3c72',
    fontWeight: 'bold',
    fontSize: 16,
  },
});