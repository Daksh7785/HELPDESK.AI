import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Animated,
  ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { COLORS, SHADOWS } from '../../styles/theme';
import { 
  BrainCircuit, Sparkles, CheckCircle2, AlertCircle, 
  ArrowRight, ShieldCheck, Zap, BarChart3, Clock
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import axios from 'axios';

const BACKEND_URL = 'https://ritesh19180-ai-helpdesk-api.hf.space';

const AIProcessingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { text, image_base64, image_text } = route.params;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    analyzeTicket();
  }, []);

  const analyzeTicket = async (retries = 3) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${BACKEND_URL}/ai/analyze_ticket`, {
        text,
        image_base64: image_base64 || "",
        image_text: image_text || "",
      });
      
      setResult(response.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: 12, useNativeDriver: true }),
      ]).start();
    } catch (err) {
      if (err.response?.status === 503 && retries > 0) {
        // Backend is waking up, wait 4 seconds and retry
        setTimeout(() => analyzeTicket(retries - 1), 4000);
        return;
      }
      console.error('AI Analysis Error:', err);
      setError(err.response?.status === 503 
        ? 'The AI engine is waking up. Please wait a moment...'
        : (err.message || 'AI engine is currently busy. Please try again.'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      if (!retries || !error) setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User session expired. Please log in again.');

      // Save to Supabase
      const ticketData = {
        user_id: user.id,
        subject: result.summary || "New Support Request",
        description: text,
        category: result.category,
        priority: result.priority,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { data, error: saveError } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single();

      if (saveError) throw saveError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to tracking for the new ticket
      navigation.reset({
        index: 0,
        routes: [
          { name: 'MainTabs' },
          { name: 'TicketTracking', params: { ticketId: data.id } }
        ],
      });
    } catch (err) {
      console.error('Final Submission Error:', err);
      setError('Failed to create ticket: ' + (err.message || 'Unknown error'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !result) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <BrainCircuit size={60} color={COLORS.primary} style={styles.brainIcon} />
        <Text style={styles.loadingTitle}>AI Engine Analyzing...</Text>
        <Text style={styles.loadingSubtitle}>Categorizing your issue and identifying priority.</Text>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={60} color={COLORS.error} />
        <Text style={styles.errorTitle}>Analysis Failed</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back & Edit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.aiBadge}>
            <Sparkles size={14} color={COLORS.primary} />
            <Text style={styles.aiBadgeText}>AI INSIGHTS GENERATED</Text>
          </View>
          <Text style={styles.title}>Review AI Analysis</Text>
          <Text style={styles.subtitle}>Our neural engine has parsed your request. Please confirm the details below.</Text>
        </View>

        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.resultItem}>
            <Text style={styles.label}>Summary</Text>
            <Text style={styles.value}>{result.summary}</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.resultItem, { flex: 1 }]}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.tag}>
                <BarChart3 size={14} color={COLORS.primary} />
                <Text style={styles.tagText}>{result.category}</Text>
              </View>
            </View>
            <View style={[styles.resultItem, { flex: 1 }]}>
              <Text style={styles.label}>Priority</Text>
              <View style={[styles.tag, { backgroundColor: result.priority === 'Critical' ? '#fee2e2' : '#fef3c7' }]}>
                <Clock size={14} color={result.priority === 'Critical' ? COLORS.error : '#f59e0b'} />
                <Text style={[styles.tagText, { color: result.priority === 'Critical' ? COLORS.error : '#f59e0b' }]}>
                  {result.priority}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.label}>Assigned Team</Text>
            <View style={styles.tag}>
              <ShieldCheck size={14} color={COLORS.primary} />
              <Text style={styles.tagText}>{result.assigned_team}</Text>
            </View>
          </View>

          {result.ocr_text ? (
            <View style={styles.resultItem}>
              <Text style={styles.label}>Extracted Text (OCR)</Text>
              <Text style={styles.ocrValue} numberOfLines={3}>{result.ocr_text}</Text>
            </View>
          ) : null}

          <View style={styles.confidenceRow}>
            <Zap size={14} color={COLORS.success} />
            <Text style={styles.confidenceText}>
              Analysis Confidence: {Math.round(result.confidence * 100)}%
            </Text>
          </View>
        </Animated.View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.confirmText}>Confirm & Create Ticket</Text>
              <CheckCircle2 size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Edit Request</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1120', padding: 40 },
  brainIcon: { marginBottom: 20 },
  loadingTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  loadingSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 10, lineHeight: 20 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginTop: 20 },
  errorSubtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  retryBtn: { marginTop: 30, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700' },
  header: { marginBottom: 30 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, alignSelf: 'flex-start', marginBottom: 16 },
  aiBadgeText: { fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, ...SHADOWS.medium, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)', marginBottom: 30 },
  resultItem: { marginBottom: 20 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  value: { fontSize: 17, fontWeight: '800', color: COLORS.text, lineHeight: 24 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
  tagText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  ocrValue: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', backgroundColor: COLORS.background, padding: 12, borderRadius: 12 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  confidenceText: { fontSize: 13, fontWeight: '700', color: COLORS.success },
  confirmBtn: { backgroundColor: COLORS.primary, height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, ...SHADOWS.medium },
  confirmText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cancelBtn: { marginTop: 20, height: 50, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
});

export default AIProcessingScreen;
