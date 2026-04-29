import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../../styles/theme';
import { Bot, Zap, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Neural Triage',
    subtitle: 'COGNITIVE ENGINE',
    description: 'Our DistilBERT v3 neural network analyzes every ticket in milliseconds, ensuring zero-latency routing to the right experts.',
    icon: Bot,
    color: '#10b981',
    accent: '#059669',
  },
  {
    id: '2',
    title: 'Real-time Pulse',
    subtitle: 'OPERATIONAL FLOW',
    description: 'Track your service lifecycle with hyper-accurate status feeds and proactive generative updates.',
    icon: Zap,
    color: '#6366f1',
    accent: '#4f46e5',
  },
  {
    id: '3',
    title: 'Fortified Access',
    subtitle: 'ENTERPRISE CORE',
    description: 'Multi-tenant SaaS isolation combined with military-grade encryption to safeguard your corporate knowledge base.',
    icon: ShieldCheck,
    color: '#f59e0b',
    accent: '#d97706',
  },
];

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    if (index < SLIDES.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -50, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setIndex(index + 1);
        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
      });
    } else {
      await AsyncStorage.setItem('@onboarding_complete', 'true');
      navigation.replace('Login');
    }
  }, [index, navigation, fadeAnim, slideAnim]);

  const CurrentIcon = SLIDES[index].icon;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background with Dark Gradient Overlay */}
      <View style={styles.bgContainer}>
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glowCircle, { backgroundColor: SLIDES[index].color + '15', top: height * 0.1, left: -50 }]} />
        <View style={[styles.glowCircle, { backgroundColor: SLIDES[index].accent + '10', bottom: height * 0.2, right: -100 }]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={[styles.miniLogo, { backgroundColor: SLIDES[index].color }]}>
              <Sparkles size={14} color="#fff" />
            </View>
            <Text style={styles.logoText}>HELPDESK<Text style={{ color: SLIDES[index].color }}>.AI</Text></Text>
          </View>
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Animated.View style={[styles.visualContainer, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
            <View style={[styles.glassCard, { borderColor: SLIDES[index].color + '40' }]}>
               <CurrentIcon size={80} color={SLIDES[index].color} strokeWidth={1.5} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.textWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.tag, { backgroundColor: SLIDES[index].color + '20' }]}>
              <Text style={[styles.tagText, { color: SLIDES[index].color }]}>{SLIDES[index].subtitle}</Text>
            </View>
            <Text style={styles.title}>{SLIDES[index].title}</Text>
            <Text style={styles.description}>{SLIDES[index].description}</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === i ? SLIDES[index].color : 'rgba(255,255,255,0.2)',
                    width: index === i ? 32 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: SLIDES[index].color }]}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText}>
              {index === SLIDES.length - 1 ? 'Start Launch' : 'Proceed'}
            </Text>
            <ArrowRight size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  bgContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glowCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.5,
  },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniLogo: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  skipText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 14 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  visualContainer: { marginBottom: 40 },
  glassCard: {
    width: 200,
    height: 200,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
  textWrapper: { alignItems: 'center' },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  tagText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -1,
  },
  description: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '400',
  },
  footer: { padding: 40, paddingBottom: 60 },
  pagination: { flexDirection: 'row', gap: 8, marginBottom: 32, justifyContent: 'center' },
  dot: { height: 6, borderRadius: 3 },
  primaryBtn: {
    height: 72,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.large,
  },
  btnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
});

export default OnboardingScreen;
