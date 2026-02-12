import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";

const COLORS = {
  primary: '#d31103',
  secondary: '#ffc002',
  accent: '#d31103',
  white: '#FFFFFF',
};

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for student_id first
      const studentId = await AsyncStorage.getItem('student_id');

      if (studentId) {
        // Student is logged in
        console.log('Student found, redirecting to student_home');
        router.replace('./student_home');
        setIsLoading(false);
        return;
      }

      // Check for user_id (admin/teacher)
      const userId = await AsyncStorage.getItem('user_id');
      const userType = await AsyncStorage.getItem('user_type');

      if (userId) {
        // Check if user is a teacher
        if (userType === 'TEACHER') {
          console.log('Teacher found, redirecting to TeacherDashboard');
          router.replace('/TeacherDashboard');
        } else {
          // Admin or other user type
          console.log('Admin found, redirecting to Dashboard');
          router.replace('/Dashboard');
        }
        setIsLoading(false);
        return;
      }

      // No one is logged in, go to login screen
      console.log('No user found, staying on index');
      setIsLoading(false);

    } catch (error) {
      console.error('Error checking auth status:', error);
      router.replace('/index');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="admin_login" options={{ headerShown: false }} />
        <Stack.Screen name="otp" options={{ headerShown: false }} />
        <Stack.Screen name="student-selection" options={{ headerShown: false }} />
        <Stack.Screen name="student_home" options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="TeacherDashboard" options={{ headerShown: false }} />
        <Stack.Screen name="SearchStudent" options={{ headerShown: false }} />
        <Stack.Screen name="PayFee" options={{ headerShown: false }} />
        <Stack.Screen name="PaymentConfirmationScreen" options={{ headerShown: false }} />
        <Stack.Screen name="ReceiptScreen" options={{ headerShown: false }} />
        <Stack.Screen name="CollectionReport" options={{ headerShown: false }} />
        <Stack.Screen name="Attendance" options={{ headerShown: false }} />
        <Stack.Screen name="DuesList" options={{ headerShown: false }} />
        <Stack.Screen name="Notice" options={{ headerShown: false }} />
        <Stack.Screen name="HomeWork" options={{ headerShown: false }} />
        <Stack.Screen name="OnlinePaymentScreen" options={{ headerShown: false }} />
        <Stack.Screen name="StudentFeeScreen" options={{ headerShown: false }} />
        <Stack.Screen name="StudentPayFeeScreen" options={{ headerShown: false }} />
        <Stack.Screen name="AdmitCardScreen" options={{ headerShown: false }} />
        <Stack.Screen name="LiveClassesScreen" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

function SplashScreen() {
  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.secondary]}
      style={styles.splashContainer}
    >
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>DPS</Text>
        </View>
        <Text style={styles.schoolName}>Delhi Public School</Text>
        <Text style={styles.tagline}>Mushkipur</Text>
      </View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
    borderWidth: 6,
    borderColor: COLORS.white,
  },
  logoText: {
    fontSize: 50,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  schoolName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 25,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: COLORS.accent,
    marginTop: 8,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
});