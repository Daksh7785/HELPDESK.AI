import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../../styles/theme';
import { Bot, Zap, ShieldCheck, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Smart AI Triage',
    subtitle: 'AUTOMATED EFFICIENCY',
    description: 'HelpDesk.ai instantly analyzes your request, categorizing it for the fastest possible resolution.',
    icon: Bot,
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    id: '2',
    title: 'Instant Tracking',
    subtitle: 'REAL-TIME VISIBILITY',
    description: 'Monitor your ticket status in real-time with a visual timeline and instant push notifications.',
    icon: Zap,
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    id: '3',
    title: 'Enterprise Security',
    subtitle: 'SECURE BY DESIGN',
    description: 'Your data is protected with high-level encryption while providing seamless IT support access.',
    icon: ShieldCheck,
    color: '#3b82f6',
    bg: '#eff6ff',
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = useCallback((nextIndex) => {
    // Fade + scale out
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setIndex(nextIndex);
      slideAnim.setValue(30);
      // Fade + scale in
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, scaleAnim, slideAnim]);

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (index < SLIDES.length - 1) {
      animateTransition(index + 1);
    } else {
      await AsyncStorage.setItem('@onboarding_complete', 'true');
      navigation.replace('Login');
    }
  }, [index, navigation, animateTransition]);

  const CurrentIcon = SLIDES[index].icon;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: SLIDES[index].bg }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {/* Animated Icon */}
        <Animated.View
          style={[
            styles.iconCircle,
            { backgroundColor: SLIDES[index].color + '20' },
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <CurrentIcon size={80} color={SLIDES[index].color} />
        </Animated.View>

        {/* Text Content */}
        <Animated.View
          style={[
            styles.textContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={[styles.subtitle, { color: SLIDES[index].color }]}>
            {SLIDES[index].subtitle}
          </Text>
          <Text style={styles.title}>{SLIDES[index].title}</Text>
          <Text style={styles.description}>{SLIDES[index].description}</Text>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.pagination}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === i ? SLIDES[index].color : '#d1d5db',
                    width: index === i ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: SLIDES[index].color }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>
              {index === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            <ArrowRight size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
    ...SHADOWS.medium,
  },
  textContainer: { width: '100%', alignItems: 'center', minHeight: 160 },
  subtitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  footer: { width: '100%', position: 'absolute', bottom: 60, alignItems: 'center' },
  pagination: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    width: '100%',
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.medium,
  },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});

export default OnboardingScreen;
