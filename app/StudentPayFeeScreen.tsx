import { FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function StudentPayFeeScreen() {
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
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [studentInfo] = useState({
    id: student_id || "",
    name: student_name || "Student Name",
    class: student_class || "",
    section: student_section || "",
    admissionNo: admission_no || "",
  });

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
        { student_id: student_id }
      );

      if (response.data) {
        const processedData = {};
        Object.entries(response.data).forEach(([month, fees]) => {
          processedData[month] = {
            ...fees,
            total:
              typeof fees.total === "number"
                ? fees.total
                : parseFloat(fees.total) || 0,
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

    return months
      .filter((month) => feeData[month].status !== "PAID") // Only show unpaid
      .sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  };

  const renderFeeCard = (month, index) => {
    if (!feeData) return null;

    const monthData = feeData[month];
    if (!monthData) return null;

    const isSelected = selectedMonths.includes(month);

    return (
      <Animated.View
        key={month}
        entering={FadeInDown.delay(index * 100).springify()}
        style={styles.feeCard}
      >
        <TouchableOpacity
          style={[
            styles.feeCardContent,
            isSelected ? styles.selectedCard : null,
          ]}
          onPress={() => toggleMonthSelection(month)}
          activeOpacity={0.7}
        >
          <View style={styles.feeCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.monthTitle}>
                {month === "Admission_month" ? "Admission Fees" : month}
              </Text>
              {month === "Admission_month" && (
                <Text style={styles.oneTimeLabel}>One Time</Text>
              )}
            </View>

            <View style={styles.feeStatus}>
              {isSelected ? (
                <View style={styles.selectedCheckbox}>
                  <FontAwesome5 name="check" size={14} color="#ffffff" />
                </View>
              ) : (
                <View style={styles.unselectedCheckbox} />
              )}
              <Text style={styles.totalAmount}>₹{monthData.total}</Text>
            </View>
          </View>

          <View style={styles.feeBreakdown}>
            {Object.entries(monthData).map(([key, value]) => {
              if (key === "total" || key === "status") return null;

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

  const calculateSelectedTotal = () => {
    return selectedMonths.reduce((sum, month) => {
      const monthTotal =
        typeof feeData[month].total === "number"
          ? feeData[month].total
          : parseFloat(feeData[month].total) || 0;
      return sum + monthTotal;
    }, 0);
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
          <Text style={styles.headerTitle}>Pay Fees</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

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
          <Text style={styles.loadingText}>Loading pending fees...</Text>
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
      ) : getOrderedMonths().length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="check-circle" size={60} color="#4caf50" />
          <Text style={styles.emptyTitle}>All Fees Paid!</Text>
          <Text style={styles.emptyMessage}>
            No pending fees for this student.
          </Text>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backHomeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.instructionBanner}>
              <FontAwesome5
                name="info-circle"
                size={16}
                color="#2196f3"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.instructionText}>
                Select months to pay fees
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Pending Fees</Text>
            {getOrderedMonths().map((month, index) =>
              renderFeeCard(month, index)
            )}

            <View style={styles.bottomSpace} />
          </ScrollView>

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
                  ₹{calculateSelectedTotal().toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  router.push({
                    pathname: "/OnlinePaymentScreen",
                    params: {
                      student_id: studentInfo.id,
                      student_name: studentInfo.name,
                      student_class: studentInfo.class,
                      student_section: studentInfo.section,
                      selectedMonths: JSON.stringify(selectedMonths),
                      totalAmount: calculateSelectedTotal(),
                    },
                  });
                }}
              >
                <LinearGradient
                  colors={["#38b000", "#2d9200"]}
                  style={styles.payButtonGradient}
                >
                  <Text style={styles.payButtonText}>Continue to Pay</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 10,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#1e3c72",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2c3e50",
    marginTop: 10,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 10,
  },
  backHomeButton: {
    backgroundColor: "#1e3c72",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backHomeButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  studentInfoCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginTop: -20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  studentDetail: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
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
    fontSize: 12,
    color: "#7f8c8d",
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 10,
    paddingBottom: 120,
  },
  instructionBanner: {
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10,
  },
  feeCard: {
    marginBottom: 10,
  },
  feeCardContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },
  selectedCard: {
    borderLeftColor: "#4caf50",
    backgroundColor: "#f1f8f4",
    borderWidth: 2,
    borderColor: "#4caf50",
  },
  feeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 13,
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
  selectedCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 12,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  unselectedCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#bdc3c7",
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  feeBreakdown: {
    marginTop: 8,
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
  },
  feeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  feeValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2c3e50",
  },
  paymentContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 10,
  },
  paymentSummary: {
    flex: 1,
  },
  paymentText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  payButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  bottomSpace: {
    height: 70,
  },
});