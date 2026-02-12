import { FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function OnlinePaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Generate transaction ID once
  const transactionId = useMemo(
    () => params.transaction_id || `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`,
    [params.transaction_id]
  );

  // ✅ Parse payment details once
  const paymentDetails = useMemo(() => {
    try {
      const details = {
        studentId: params.student_id,
        studentName: params.student_name,
        studentClass: params.student_class || "",
        studentSection: params.student_section || "",
        selectedMonths: JSON.parse(params.selectedMonths || "[]"),
        totalAmount: parseFloat(params.totalAmount || 0),
        transactionId: transactionId,
      };

      console.log("✅ Payment Details Initialized:", details);
      return details;
    } catch (error) {
      console.error("❌ Error parsing payment details:", error);
      Alert.alert("Error", "Invalid payment details");
      router.back();
      return null;
    }
  }, [
    params.student_id,
    params.student_name,
    params.student_class,
    params.student_section,
    params.selectedMonths,
    params.totalAmount,
    transactionId,
  ]);

  const handlePhonePePayment = async () => {
    if (!paymentDetails) {
      Alert.alert("Error", "Payment details not loaded");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);

    try {
      const paymentPayload = {
        student_id: paymentDetails.studentId,
        student_name: paymentDetails.studentName,
        amount: paymentDetails.totalAmount,
        transaction_id: paymentDetails.transactionId,
        selected_months: paymentDetails.selectedMonths,
        payment_method: "PhonePe",
      };

      console.log("📤 Sending Payment Request:", paymentPayload);

      const response = await axios.post(
        "https://rmpublicschool.org/binex/api.php?task=initiate_phonepe_payment",
        paymentPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      console.log("📥 API Response:", response.data);

      if (response.data && response.data.success === true) {
        const paymentUrl = response.data.payment_url || response.data.url;
        const merchantTransactionId =
          response.data.merchant_transaction_id ||
          response.data.merchantTransactionId;

        console.log("✅ Payment URL:", paymentUrl);
        console.log("✅ Merchant Transaction ID:", merchantTransactionId);

        if (!paymentUrl) {
          throw new Error("Payment URL not received from server");
        }

        const canOpen = await Linking.canOpenURL(paymentUrl);

        if (canOpen) {
          await Linking.openURL(paymentUrl);

          Alert.alert(
            "Payment Initiated",
            "You will be redirected to PhonePe to complete the payment.",
            [
              {
                text: "OK",
                onPress: () => {
                  router.replace({
                    pathname: "/PaymentStatusScreen",
                    params: {
                      transaction_id:
                        merchantTransactionId || paymentDetails.transactionId,
                      student_id: paymentDetails.studentId,
                      student_name: paymentDetails.studentName,
                      amount: paymentDetails.totalAmount,
                    },
                  });
                },
              },
            ]
          );
        } else {
          throw new Error("Cannot open payment URL");
        }
      } else {
        const errorMessage =
          response.data?.message ||
          response.data?.error ||
          "Payment initiation failed. Please try again.";

        console.error("❌ API Error:", errorMessage);
        console.error("❌ Full Response:", JSON.stringify(response.data));

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("❌ PhonePe Payment Error:", error);

      let errorMessage = "Payment initiation failed. Please try again.";

      if (error.response) {
        console.error("Server Error Response:", error.response.data);
        errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `Server Error: ${error.response.status}`;
      } else if (error.request) {
        console.error("No Response from Server");
        errorMessage =
          "Cannot connect to payment server. Please check your internet connection.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      Alert.alert(
        "Payment Failed",
        errorMessage,
        [
          {
            text: "Retry",
            onPress: () => handlePhonePePayment(),
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => router.back(),
          },
        ],
        { cancelable: false }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOfflinePayment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      "Offline Payment",
      "Please visit the school office to complete the payment.",
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]
    );
  };

  if (!paymentDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3c72" />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={["#1e3c72", "#2a5298"]}
          style={styles.headerGradient}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isProcessing}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Method</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Summary Card */}
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryTitle}>Payment Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Student Name</Text>
            <Text style={styles.summaryValue}>{paymentDetails.studentName}</Text>
          </View>

          {paymentDetails.studentClass && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Class</Text>
              <Text style={styles.summaryValue}>
                {paymentDetails.studentClass}
                {paymentDetails.studentSection && `-${paymentDetails.studentSection}`}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Transaction ID</Text>
            <Text style={styles.summaryValueSmall}>
              {paymentDetails.transactionId}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected Months</Text>
            <Text style={styles.summaryValue}>
              {paymentDetails.selectedMonths.length}
            </Text>
          </View>

          <View style={styles.monthsList}>
            {paymentDetails.selectedMonths.map((month, index) => (
              <View key={index} style={styles.monthChip}>
                <Text style={styles.monthChipText}>{month}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>
              ₹{paymentDetails.totalAmount.toLocaleString()}
            </Text>
          </View>
        </Animated.View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {/* PhonePe Option */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <TouchableOpacity
            style={styles.paymentMethodCard}
            onPress={handlePhonePePayment}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <View style={styles.paymentMethodContent}>
              <View style={styles.paymentMethodIcon}>
                <Image
                  source={{
                    uri: "https://cdn.icon-icons.com/icons2/2699/PNG/512/phonepe_logo_icon_169316.png",
                  }}
                  style={styles.phonePeIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodTitle}>PhonePe</Text>
                <Text style={styles.paymentMethodSubtitle}>
                  Pay securely with PhonePe UPI
                </Text>
              </View>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#5f259f" />
              ) : (
                <FontAwesome5 name="chevron-right" size={16} color="#bdc3c7" />
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Offline Payment Option */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <TouchableOpacity
            style={styles.paymentMethodCard}
            onPress={handleOfflinePayment}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <View style={styles.paymentMethodContent}>
              <View
                style={[
                  styles.paymentMethodIcon,
                  { backgroundColor: "#e3f2fd" },
                ]}
              >
                <FontAwesome5 name="university" size={24} color="#2196f3" />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodTitle}>Pay at School</Text>
                <Text style={styles.paymentMethodSubtitle}>
                  Visit school office for offline payment
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color="#bdc3c7" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Info Banner */}
        <Animated.View
          entering={FadeInDown.delay(500).springify()}
          style={styles.infoBanner}
        >
          <FontAwesome5
            name="shield-alt"
            size={16}
            color="#4caf50"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.infoBannerText}>
            Your payment is secure and encrypted
          </Text>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    height: 70,
    overflow: "hidden",
  },
  headerGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 70,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    paddingTop: 20,
  },
  backButton: {
    width: 26,
    height: 26,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: "#7f8c8d",
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 10,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  summaryValueSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2c3e50",
  },
  divider: {
    height: 1,
    backgroundColor: "#ecf0f1",
    marginVertical: 12,
  },
  monthsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  monthChip: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  monthChipText: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "500",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#27ae60",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10,
  },
  paymentMethodCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  paymentMethodContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: "#f3e5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  phonePeIcon: {
    width: 30,
    height: 20,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  infoBannerText: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "500",
  },
});