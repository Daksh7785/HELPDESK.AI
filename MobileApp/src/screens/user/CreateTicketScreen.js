import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Image,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, SHADOWS } from '../../styles/theme';
import { 
  ArrowLeft, Sparkles, Send, Mic, Image as ImageIcon, 
  X, Volume2, StopCircle, CheckCircle2 
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useNotification } from '../../components/NotificationProvider';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CreateTicketScreen = () => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const navigation = useNavigation();
  const { success, error: notifyError } = useNotification();

  // Voice animation
  const waveAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVoiceActive) {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim, { toValue: 1.6, duration: 600, useNativeDriver: true }),
            Animated.timing(waveAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ])
        )
      ]).start();
    } else {
      waveAnim.setValue(1);
      pulseAnim.setValue(0);
    }
  }, [isVoiceActive]);

  const toggleVoice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsVoiceActive(!isVoiceActive);
  };

  const handleVoiceDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsVoiceActive(false);
    // Placeholder transcript
    const transcript = "I'm having trouble accessing the company VPN from my home network.";
    setDescription(prev => prev + (prev ? ' ' : '') + transcript);
  };

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      notifyError('Empty Request', 'Please describe your issue first.');
      return;
    }
    
    setLoading(true);
    try {
      let base64 = null;
      if (image) {
        const response = await fetch(image);
        const blob = await response.blob();
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }

      navigation.navigate('AIProcessing', {
        text: description,
        image_base64: base64,
        image_text: "" 
      });
    } catch (e) {
      notifyError('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>New Request</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.aiBanner}>
            <Sparkles size={20} color={COLORS.primary} />
            <Text style={styles.aiBannerText}>
              Our AI engine is ready. Describe your issue or use the Voice Assistant.
            </Text>
          </View>

          {/* ChatGPT Style Voice CTA */}
          <TouchableOpacity 
            style={styles.voiceCta}
            onPress={toggleVoice}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.primary, '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.voiceGradient}
            >
              <View style={styles.voiceIconContainer}>
                <Mic size={28} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.voiceTitle}>Voice Mode</Text>
                <Text style={styles.voiceSub}>Tap to speak naturally</Text>
              </View>
              <View style={styles.voiceAction}>
                <Text style={styles.voiceActionText}>START</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.inputCard}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Manual Description</Text>
              <View style={styles.charCount}>
                <Text style={styles.charText}>{description.length}/1000</Text>
              </View>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="E.g. My printer is showing a 'paper jam' error but I can't find any paper..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={description}
              onChangeText={setDescription}
              numberOfLines={6}
              textAlignVertical="top"
            />

            {image && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImageBtn}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.attachmentBtn} onPress={pickImage}>
                <ImageIcon size={20} color={COLORS.primary} />
                <Text style={[styles.attachmentText, { color: COLORS.primary }]}>
                  {image ? 'Change Screenshot' : 'Attach Screenshot'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.btn, !description.trim() && styles.btnDisabled]} 
            onPress={handleSubmit} 
            disabled={loading || !description.trim()}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.btnText}>Analyze & Submit</Text>
                <Send size={18} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ChatGPT Style Voice Modal */}
      <Modal visible={isVoiceActive} animationType="slide" transparent>
        <View style={styles.voiceModal}>
          <LinearGradient
            colors={['#0f172a', '#020617']}
            style={StyleSheet.absoluteFill}
          />
          
          <SafeAreaView style={styles.voiceModalContent}>
            <TouchableOpacity 
              style={styles.closeVoice} 
              onPress={() => setIsVoiceActive(false)}
            >
              <X size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.voiceMain}>
              <View style={styles.voiceCircleContainer}>
                <Animated.View style={[styles.voiceOuterCircle, { transform: [{ scale: waveAnim }] }]} />
                <Animated.View style={[styles.voiceInnerCircle, { opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }) }]} />
                <View style={styles.voiceMic}>
                  <Mic size={48} color="#fff" />
                </View>
              </View>

              <Text style={styles.voiceStatus}>Listening...</Text>
              <Text style={styles.voiceInstruction}>Speak clearly about your issue</Text>
            </View>

            <View style={styles.voiceFooter}>
              <TouchableOpacity 
                style={styles.voiceDoneBtn} 
                onPress={handleVoiceDone}
              >
                <Text style={styles.voiceDoneText}>Stop & Insert</Text>
                <CheckCircle2 size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: COLORS.background },
  title: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  scrollContent: { padding: 24 },
  aiBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12
  },
  aiBannerText: { flex: 1, color: COLORS.primary, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  
  // Voice CTA
  voiceCta: { marginBottom: 24, borderRadius: 24, overflow: 'hidden', ...SHADOWS.medium },
  voiceGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  voiceIconContainer: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  voiceTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  voiceSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  voiceAction: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  voiceActionText: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },

  inputCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)'
  },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  charCount: { backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  charText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  input: { 
    backgroundColor: COLORS.background, 
    borderRadius: 16, 
    padding: 16, 
    minHeight: 140, 
    fontSize: 16, 
    color: COLORS.text,
    lineHeight: 24
  },
  imagePreviewContainer: { marginTop: 16, position: 'relative', borderRadius: 16, overflow: 'hidden', height: 180, borderWidth: 1, borderColor: COLORS.border },
  imagePreview: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionRow: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  attachmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachmentText: { fontSize: 14, fontWeight: '700' },
  btn: { backgroundColor: COLORS.primary, height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, ...SHADOWS.medium },
  btnDisabled: { backgroundColor: COLORS.textMuted, elevation: 0, shadowOpacity: 0 },
  btnText: { color: COLORS.white, fontSize: 18, fontWeight: '800' },

  // Voice Modal
  voiceModal: { flex: 1 },
  voiceModalContent: { flex: 1, padding: 30 },
  closeVoice: { alignSelf: 'flex-end', padding: 10 },
  voiceMain: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  voiceCircleContainer: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
  voiceOuterCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.primary + '33' },
  voiceInnerCircle: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: COLORS.primary + '11' },
  voiceMic: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.large },
  voiceStatus: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 40 },
  voiceInstruction: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 10, fontWeight: '600' },
  voiceFooter: { paddingBottom: 40 },
  voiceDoneBtn: { height: 64, borderRadius: 24, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  voiceDoneText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});

export default CreateTicketScreen;
