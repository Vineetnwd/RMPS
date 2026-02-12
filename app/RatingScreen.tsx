import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  warning: '#F59E0B',
  background: '#FDF5F7',
  cream: '#FFF5EC',
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

const RatingScreen = () => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingReview, setFetchingReview] = useState(true);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [branchId, setBranchId] = useState<string | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const starScaleAnims = useRef([...Array(5)].map(() => new Animated.Value(1))).current;

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

    // Fetch existing review
    fetchExistingReview();
  }, []);

  const fetchExistingReview = async () => {
    try {
      const studentId = await AsyncStorage.getItem('student_id');
      const storedBranchId = await AsyncStorage.getItem('branch_id');
      setBranchId(storedBranchId);

      if (!studentId) {
        setFetchingReview(false);
        return;
      }

      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=get_review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: studentId }),
        }
      );

      const data = await response.json();

      if (data && data.id) {
        setExistingReview(data);
        setRating(parseInt(data.rating) || 0);
        setReview(data.review || '');
      }
    } catch (error) {
      console.error('Error fetching review:', error);
    } finally {
      setFetchingReview(false);
    }
  };

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleStarPress = (index) => {
    setRating(index);
    // Animate the star
    Animated.sequence([
      Animated.spring(starScaleAnims[index - 1], {
        toValue: 1.3,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(starScaleAnims[index - 1], {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubmit = async () => {
    const studentId = await AsyncStorage.getItem('student_id');

    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    if (review.trim() === '') {
      Alert.alert('Error', 'Please write a review');
      return;
    }

    setLoading(true);

    const payload = {
      student_id: studentId,
      rating: rating.toString(),
      review: review,
      status: 'ACTIVE',
      created_by: studentId,
      branch_id: branchId ? parseInt(branchId) : null,
    };

    try {
      const response = await fetch(
        'https://rmpublicschool.org/binex/api.php?task=send_review',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (data.status === 'success') {
        Alert.alert('Success', existingReview ? 'Review updated successfully!' : 'Review submitted successfully!', [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to submit review. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          style={styles.starButton}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: starScaleAnims[i - 1] }] }}>
            <View style={[
              styles.starContainer,
              i <= rating && styles.starContainerActive
            ]}>
              <Ionicons
                name={i <= rating ? 'star' : 'star-outline'}
                size={32}
                color={i <= rating ? COLORS.secondary : COLORS.lightGray}
              />
            </View>
          </Animated.View>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
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
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Rate & Review</Text>
              <Text style={styles.headerSubtitle}>Share your experience</Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Rating Preview Card */}
          <Animated.View
            style={[
              styles.ratingPreviewCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.ratingPreviewIconContainer}>
              <Ionicons name="star" size={26} color={COLORS.primary} />
            </View>
            <View style={styles.ratingPreviewContent}>
              <Text style={styles.ratingPreviewTitle}>RM Public School</Text>
              <Text style={styles.ratingPreviewSubtitle}>Help us improve with your feedback</Text>
            </View>
          </Animated.View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          {/* Rating Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="star-half" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.cardTitle}>How would you rate us?</Text>
            </View>

            <View style={styles.starsContainer}>
              {renderStars()}
            </View>

            {rating > 0 && (
              <View style={styles.ratingBadge}>
                <View style={[styles.ratingBadgeDot, {
                  backgroundColor: rating >= 4 ? COLORS.success : rating >= 3 ? COLORS.secondary : COLORS.warning
                }]} />
                <Text style={styles.ratingBadgeText}>
                  {rating} {rating === 1 ? 'Star' : 'Stars'} - {getRatingLabel()}
                </Text>
              </View>
            )}

            {existingReview && (
              <View style={styles.existingReviewBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.existingReviewText}>
                  Previously submitted on {new Date(existingReview.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {/* Review Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.secondary} />
              </View>
              <Text style={styles.cardTitle}>Write Your Review</Text>
            </View>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Share your thoughts about RM Public School..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={6}
                value={review}
                onChangeText={setReview}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.charCountContainer}>
              <Text style={styles.charCount}>{review.length} characters</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={[styles.submitButtonInner, loading && styles.submitButtonInnerDisabled]}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name={existingReview ? 'create' : 'send'} size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>
                    {existingReview ? 'Update Review' : 'Submit Review'}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Info Footer */}
          <View style={styles.footer}>
            <View style={styles.footerIconContainer}>
              <Ionicons name="information-circle" size={18} color={COLORS.secondary} />
            </View>
            <Text style={styles.footerText}>
              Your feedback helps us improve our services and provide better education
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

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

  // Rating Preview Card
  ratingPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    padding: 10,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  ratingPreviewIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingPreviewContent: {
    flex: 1,
  },
  ratingPreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 2,
  },
  ratingPreviewSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
  },

  // Card
  card: {
    backgroundColor: '#FDF5F7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  cardHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Stars
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  starContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5E8EB',
  },
  starContainerActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: COLORS.secondary,
  },

  // Rating Badge
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  ratingBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Existing Review Badge
  existingReviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  existingReviewText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.success,
  },

  // Text Input
  textInputContainer: {
    backgroundColor: '#FFF9F0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    overflow: 'hidden',
  },
  textInput: {
    padding: 10,
    fontSize: 12,
    color: COLORS.ink,
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  charCountContainer: {
    marginTop: 10,
  },
  charCount: {
    textAlign: 'right',
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '500',
  },

  // Submit Button
  submitButton: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    gap: 6,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    borderRadius: 12,
  },
  submitButtonInnerDisabled: {
    backgroundColor: COLORS.gray,
    borderColor: COLORS.gray,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF5F7',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  footerIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    flex: 1,
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 20,
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

export default RatingScreen;