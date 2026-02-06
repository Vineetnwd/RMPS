import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
  warning: '#F59E0B',
  background: '#F8FAFC',
  cream: '#FFF8E7',
  cardBg: '#FFFFFF',
};

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

export default function LiveBusLocationScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const busAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Bus moving animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(busAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(busAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Wave animation for location markers
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

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

  const busTranslate = busAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaProvider>
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
              <CircleRing size={80} borderWidth={2} color="rgba(212, 175, 55, 0.25)" />
            </Animated.View>
            <DiamondShape style={styles.headerDiamond1} color="rgba(212, 175, 55, 0.4)" size={14} />
            <DiamondShape style={styles.headerDiamond2} color="rgba(255, 255, 255, 0.2)" size={10} />
            <DottedPattern style={styles.headerDots} rows={2} cols={4} dotColor="rgba(255, 255, 255, 0.3)" />
            <View style={styles.headerStripe} />
          </View>

          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Live Bus Location</Text>
              <Text style={styles.headerSubtitle}>Track your school bus</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </View>

        {/* Content */}
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Animated Icon Container */}
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.iconCircle}>
                {/* Animated Location Markers */}
                <Animated.View
                  style={[
                    styles.locationMarker,
                    styles.marker1,
                    { opacity: waveOpacity },
                  ]}
                >
                  <Ionicons name="location" size={18} color={COLORS.primary} />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.locationMarker,
                    styles.marker2,
                    { opacity: waveOpacity },
                  ]}
                >
                  <Ionicons name="location" size={14} color={COLORS.secondary} />
                </Animated.View>

                {/* Animated Bus */}
                <Animated.View
                  style={{
                    transform: [{ translateX: busTranslate }],
                  }}
                >
                  <Ionicons name="bus" size={70} color={COLORS.primary} />
                </Animated.View>
              </View>

              {/* Decorative route lines */}
              <View style={styles.routeLine1} />
              <View style={styles.routeLine2} />

              {/* Decorative circles */}
              <View style={[styles.decorativeCircle, styles.circle1]} />
              <View style={[styles.decorativeCircle, styles.circle2]} />
              <View style={[styles.decorativeCircle, styles.circle3]} />
            </Animated.View>

            {/* Coming Soon Badge */}
            <View style={styles.badge}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={styles.badgeText}>Coming Soon</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>Live Bus Tracking</Text>

            {/* Description */}
            <Text style={styles.description}>
              Track your school bus in real-time for added safety and peace of mind.
            </Text>

            {/* Feature List */}
            <View style={styles.featureList}>
              <FeatureItem
                icon="location-outline"
                text="Real-time Bus Location"
                delay={0}
              />
              <FeatureItem
                icon="navigate-outline"
                text="Live Route Tracking"
                delay={100}
              />
              <FeatureItem
                icon="notifications-outline"
                text="Arrival Notifications"
                delay={200}
              />
              <FeatureItem
                icon="speedometer-outline"
                text="Estimated Arrival Time"
                delay={300}
              />
              <FeatureItem
                icon="shield-checkmark-outline"
                text="Safe Journey Monitoring"
                delay={400}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <View style={styles.infoIconContainer}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={COLORS.secondary}
                />
              </View>
              <Text style={styles.infoText}>
                We're installing GPS tracking systems in all our buses. This feature will be available soon!
              </Text>
            </View>
          </Animated.View>
        </Animated.ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={styles.notifyButton}
            activeOpacity={0.8}
            onPress={() => {
              alert('You will be notified when live bus tracking is available!');
            }}
          >
            <View style={styles.notifyButtonInner}>
              <Ionicons name="notifications" size={20} color={COLORS.white} />
              <Text style={styles.notifyButtonText}>Notify Me When Available</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

function FeatureItem({ icon, text, delay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureItem,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={18} color={COLORS.secondary} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
      <Ionicons name="checkmark-circle" size={18} color={COLORS.success} style={{ opacity: 0.4 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerDecorations: {
    ...StyleSheet.absoluteFillObject,
  },
  headerBlob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
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
    top: 45,
    right: 100,
  },
  headerDots: {
    position: 'absolute',
    bottom: 30,
    left: 30,
  },
  headerStripe: {
    position: 'absolute',
    width: 3,
    height: 60,
    backgroundColor: COLORS.secondary,
    opacity: 0.3,
    right: 40,
    bottom: 20,
    borderRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontSize: 20,
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

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // Content
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    overflow: 'visible',
  },
  locationMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  marker1: {
    top: 10,
    right: 20,
  },
  marker2: {
    bottom: 20,
    left: 15,
  },
  routeLine1: {
    position: 'absolute',
    width: 80,
    height: 3,
    backgroundColor: COLORS.secondary,
    opacity: 0.3,
    top: 40,
    left: -20,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  routeLine2: {
    position: 'absolute',
    width: 60,
    height: 3,
    backgroundColor: COLORS.secondary,
    opacity: 0.3,
    bottom: 50,
    right: -15,
    transform: [{ rotate: '-30deg' }],
    borderRadius: 2,
  },
  decorativeCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 100,
  },
  circle1: {
    width: 40,
    height: 40,
    top: -10,
    right: 10,
  },
  circle2: {
    width: 30,
    height: 30,
    bottom: 20,
    left: -10,
  },
  circle3: {
    width: 25,
    height: 25,
    top: 30,
    left: -15,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 20,
    gap: 8,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Title
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 10,
  },

  // Feature List
  featureList: {
    width: '100%',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.ink,
    fontWeight: '600',
    flex: 1,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.cream,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    marginBottom: 20,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 20,
  },

  // Bottom Action
  bottomAction: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    backgroundColor: COLORS.background,
  },
  notifyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  notifyButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    gap: 10,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    borderRadius: 16,
  },
  notifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Dotted Pattern
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