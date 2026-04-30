import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../../styles/theme';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleStart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await AsyncStorage.setItem('@onboarding_complete', 'true');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background with Dark Gradient Overlay */}
      <View style={styles.bgContainer}>
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#020617']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.glowCircle, { backgroundColor: '#10b98115', top: -50, left: -50 }]} />
        <View style={[styles.glowCircle, { backgroundColor: '#3b82f615', bottom: -100, right: -50 }]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoContainer}>
            <View style={styles.iconContainer}>
              <Sparkles size={48} color="#10b981" />
            </View>
            <Text style={styles.logoText}>HELPDESK<Text style={{ color: '#10b981' }}>.AI</Text></Text>
          </View>

          <View style={styles.textWrapper}>
            <Text style={styles.title}>The Neural System Orchestrator</Text>
            <Text style={styles.description}>
              Automated IT ticket triage, millisecond categorization, and generative resolution built for modern enterprises.
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleStart}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText}>Authenticate</Text>
            <ArrowRight size={22} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  bgContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glowCircle: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.8,
  },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  logoText: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  textWrapper: { alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '400',
    paddingHorizontal: 10,
  },
  footer: { padding: 32, paddingBottom: 40 },
  primaryBtn: {
    height: 64,
    borderRadius: 16,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.large,
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

export default OnboardingScreen;
