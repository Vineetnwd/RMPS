import { FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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

export default function StudentFeeScreen() {
  const router = useRouter();
  const {
    student_id,
    student_name,
    student_class,
    student_section,
    admission_no,
  } = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [studentInfo, setStudentInfo] = useState({
    id: student_id || "",
    name: student_name || "Student Name",
    class: student_class || "",
    section: student_section || "",
    admissionNo: admission_no || "",
  });

  const [selectedMonths, setSelectedMonths] = useState([]);

  // Fetch fee data from API
  useEffect(() => {
    fetchFeeData();
  }, [student_id]);

  const fetchFeeData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!student_id) {
        throw new Error("Student ID is required");
      }

      const response = await axios.post(
        "https://rmpublicschool.org/binex/api.php?task=student_fee",
        {
          student_id: student_id,
        }
      );

      // Process the API response
      if (response.data) {
        // Ensure each month has a total as a number and proper status
        const processedData = {};
        Object.entries(response.data).forEach(([month, fees]) => {
          processedData[month] = {
            ...fees,
            // Ensure total is a number
            total:
              typeof fees.total === "number"
                ? fees.total
                : parseFloat(fees.total) || 0,
            // Ensure status is properly captured (if it doesn't exist, default to UNPAID)
            status: fees.status || "UNPAID",
          };
        });

        setFeeData(processedData);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Error fetching fee data:", err);
      setError(err.message || "Failed to load fee data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total fees
  const calculateTotals = () => {
    if (!feeData) return { total: 0, paid: 0, pending: 0 };

    // Calculate total fees
    const total = Object.values(feeData).reduce((sum, month) => {
      const monthTotal =
        typeof month.total === "number"
          ? month.total
          : parseFloat(month.total) || 0;
      return sum + monthTotal;
    }, 0);

    // Calculate paid fees using the status field from API
    const paid = Object.values(feeData).reduce((sum, month) => {
      if (month.status !== "PAID") return sum;
      const monthTotal =
        typeof month.total === "number"
          ? month.total
          : parseFloat(month.total) || 0;
      return sum + monthTotal;
    }, 0);

    return {
      total: isNaN(total) ? 0 : total,
      paid: isNaN(paid) ? 0 : paid,
      pending: isNaN(total - paid) ? 0 : total - paid,
    };
  };

  const { total, paid, pending } = calculateTotals();

  // Toggle month selection
  const toggleMonthSelection = (month) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (feeData[month].status === "PAID") return;

    setSelectedMonths((prev) => {
      if (prev.includes(month)) {
        return prev.filter((m) => m !== month);
      } else {
        return [...prev, month];
      }
    });
  };

  // Handle payment
  const handlePayment = () => {
    if (selectedMonths.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const amountToPay = selectedMonths.reduce((sum, month) => {
      const monthTotal =
        typeof feeData[month].total === "number"
          ? feeData[month].total
          : parseFloat(feeData[month].total) || 0;
      return sum + monthTotal;
    }, 0);

    Alert.alert(
      "Confirm Payment",
      `Process payment of ₹${amountToPay} for ${selectedMonths.length} ${
        selectedMonths.length === 1 ? "month" : "months"
      }?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Pay Now",
          onPress: () => {
            // In a real app, make an API call to process payment
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Update fee data with new payment status
            const updatedFeeData = { ...feeData };
            selectedMonths.forEach((month) => {
              updatedFeeData[month] = {
                ...updatedFeeData[month],
                status: "PAID",
              };
            });

            setFeeData(updatedFeeData);
            setSelectedMonths([]);

            // Show success message
            Alert.alert(
              "Payment Successful",
              `Payment of ₹${amountToPay} has been processed successfully.`,
              [{ text: "OK" }]
            );
          },
        },
      ]
    );
  };

  // Get months ordered chronologically (with Admission_month first)
  const getOrderedMonths = () => {
    if (!feeData) return [];

    const months = Object.keys(feeData);
    const monthOrder = [
      "Admission_month",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
      "January",
      "February",
      "March",
    ];

    return months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  };

  // Render fee card for each month
  const renderFeeCard = (month, index) => {
    if (!feeData) return null;

    const monthData = feeData[month];
    const isPaid = monthData.status === "PAID";
    const isSelected = selectedMonths.includes(month);

    // Skip if monthData is undefined
    if (!monthData) return null;

    return (
      <Animated.View
        key={month}
        entering={FadeInDown.delay(index * 100).springify()}
        style={styles.feeCard}
      >
        <TouchableOpacity
          style={[
            styles.feeCardContent,
            isPaid ? styles.paidCard : null,
            isSelected ? styles.selectedCard : null,
          ]}
          onPress={() => toggleMonthSelection(month)}
          disabled={isPaid}
          activeOpacity={0.8}
        >
          <View style={styles.feeCardHeader}>
            <View>
              <Text style={styles.monthTitle}>
                {month === "Admission_month" ? "Admission Fees" : month}
              </Text>
              {month === "Admission_month" ? (
                <Text style={styles.oneTimeLabel}>One Time</Text>
              ) : null}
            </View>

            <View style={styles.feeStatus}>
              {isPaid ? (
                <View style={styles.paidStatusPill}>
                  <FontAwesome5
                    name="check-circle"
                    size={12}
                    color="#388e3c"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.paidStatusText}>PAID</Text>
                </View>
              ) : isSelected ? (
                <View style={styles.selectedStatusPill}>
                  <FontAwesome5 name="check" size={12} color="#ffffff" />
                </View>
              ) : (
                <View style={styles.pendingStatusPill}>
                  <Text style={styles.pendingStatusText}>UNPAID</Text>
                </View>
              )}

              <Text style={styles.totalAmount}>₹{monthData.total}</Text>
            </View>
          </View>

          {/* Fee breakdown */}
          <View style={styles.feeBreakdown}>
            {Object.entries(monthData).map(([key, value]) => {
              // Skip the total field and status field
              if (key === "total" || key === "status") return null;

              // Format the label with proper capitalization and spacing
              const formattedLabel = key
                .replace(/_/g, " ")
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

              return (
                <View key={key} style={styles.feeItem}>
                  <Text style={styles.feeLabel}>{formattedLabel}</Text>
                  <Text style={styles.feeValue}>₹{value}</Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3c72" />

      <View style={styles.header}>
        <LinearGradient
          colors={["#1e3c72", "#2a5298"]}
          style={styles.headerGradient}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Fees</Text>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => {
              Alert.alert(
                "Fee Information",
                "This screen shows the fee details for the selected student. You can select pending months and pay them together.",
                [{ text: "OK" }]
              );
            }}
          >
            <FontAwesome5 name="info-circle" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Student Info Card */}
      <Animated.View
        entering={FadeInUp.delay(200).springify()}
        style={styles.studentInfoCard}
      >
        <View style={styles.studentDetail}>
          <Text style={styles.studentName}>{studentInfo.name}</Text>
          <View style={styles.studentInfoRow}>
            <View style={styles.infoItem}>
              <FontAwesome5
                name="graduation-cap"
                size={12}
                color="#7f8c8d"
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Class {studentInfo.class}-{studentInfo.section}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <FontAwesome5
                name="id-badge"
                size={12}
                color="#7f8c8d"
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                {studentInfo.admissionNo || `ID: ${studentInfo.id}`}
              </Text>
            </View>
          </View>
        </View>
        <LinearGradient
          colors={["#3a86ff", "#4361ee"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.studentAvatar}
        >
          <Text style={styles.avatarText}>{studentInfo.name.charAt(0)}</Text>
        </LinearGradient>
      </Animated.View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3c72" />
          <Text style={styles.loadingText}>Loading fee details...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-triangle" size={50} color="#e74c3c" />
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFeeData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Fee Summary Cards */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.summaryCardsContainer}
          >
            <View style={[styles.summaryCard, { backgroundColor: "#e3f2fd" }]}>
              <Text style={styles.summaryValue}>₹{total.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Fees</Text>
              <FontAwesome5
                name="rupee-sign"
                size={18}
                color="rgba(33, 150, 243, 0.3)"
                style={styles.summaryIcon}
              />
            </View>

            <View style={[styles.summaryCard, { backgroundColor: "#e8f5e9" }]}>
              <Text style={styles.summaryValue}>₹{paid.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Paid</Text>
              <FontAwesome5
                name="check-circle"
                size={18}
                color="rgba(76, 175, 80, 0.3)"
                style={styles.summaryIcon}
              />
            </View>

            <View style={[styles.summaryCard, { backgroundColor: "#fff3e0" }]}>
              <Text style={styles.summaryValue}>
                ₹{pending.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Pending</Text>
              <FontAwesome5
                name="exclamation-circle"
                size={18}
                color="rgba(255, 152, 0, 0.3)"
                style={styles.summaryIcon}
              />
            </View>
          </Animated.View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Fee Cards */}
            <Text style={styles.sectionTitle}>Fee Structure</Text>
            {getOrderedMonths().map((month, index) =>
              renderFeeCard(month, index)
            )}

            <View style={styles.bottomSpace} />
          </ScrollView>

          {/* Payment Button */}
          {selectedMonths.length > 0 && (
            <Animated.View
              entering={FadeInUp.springify()}
              style={styles.paymentContainer}
            >
              <View style={styles.paymentSummary}>
                <Text style={styles.paymentText}>
                  {selectedMonths.length}{" "}
                  {selectedMonths.length === 1 ? "month" : "months"} selected
                </Text>
                <Text style={styles.paymentAmount}>
                  ₹
                  {selectedMonths
                    .reduce((sum, month) => {
                      const monthTotal =
                        typeof feeData[month].total === "number"
                          ? feeData[month].total
                          : parseFloat(feeData[month].total) || 0;
                      return sum + monthTotal;
                    }, 0)
                    .toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => {
                  // Navigate to payment confirmation screen with selected data
                  router.push({
                    pathname: "/PaymentConfirmationScreen",
                    params: {
                      student_id: studentInfo.id,
                      student_name: studentInfo.name,
                      student_class: studentInfo.class,
                      student_section: studentInfo.section,
                      selectedMonths: JSON.stringify(selectedMonths),
                      totalAmount: selectedMonths.reduce((sum, month) => {
                        const monthTotal =
                          typeof feeData[month].total === "number"
                            ? feeData[month].total
                            : parseFloat(feeData[month].total) || 0;
                        return sum + monthTotal;
                      }, 0),
                    },
                  });
                }}
              >
                <LinearGradient
                  colors={["#38b000", "#2d9200"]}
                  style={styles.payButtonGradient}
                >
                  <Text style={styles.payButtonText}>Pay Now</Text>
                  <FontAwesome5
                    name="arrow-right"
                    size={16}
                    color="#ffffff"
                    style={{ marginLeft: 8 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}
// Styles remain unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    height: 100,
    overflow: "hidden",
  },
  headerGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 100,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#7f8c8d",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#1e3c72",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  studentInfoCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginTop: -20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentDetail: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 6,
  },
  studentInfoRow: {
    marginTop: 4,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  summaryCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  summaryCard: {
    width: (width - 56) / 3,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
    zIndex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    zIndex: 1,
  },
  summaryIcon: {
    position: "absolute",
    right: 8,
    bottom: 8,
    transform: [{ rotate: "-15deg" }],
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
  },
  feeCard: {
    marginBottom: 16,
  },
  feeCardContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#3a86ff",
  },
  paidCard: {
    borderLeftColor: "#388e3c",
    opacity: 0.8,
  },
  selectedCard: {
    borderLeftColor: "#ff9800",
    backgroundColor: "#fffaf0",
  },
  feeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  oneTimeLabel: {
    fontSize: 12,
    color: "#e74c3c",
    marginTop: 2,
  },
  feeStatus: {
    alignItems: "flex-end",
  },
  paidStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  paidStatusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#388e3c",
  },
  pendingStatusPill: {
    backgroundColor: "#fff3e0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  pendingStatusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#f57c00",
  },
  selectedStatusPill: {
    backgroundColor: "#ff9800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  feeBreakdown: {
    marginTop: 8,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
  },
  feeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  feeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  paymentContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  paymentSummary: {
    flex: 1,
  },
  paymentText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  payButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginLeft: 16,
  },
  payButtonGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  payButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomSpace: {
    height: 100,
  },
});
