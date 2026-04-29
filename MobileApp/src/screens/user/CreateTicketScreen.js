import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, SHADOWS } from '../../styles/theme';
import { ArrowLeft, Sparkles, Send } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useNotification } from '../../components/NotificationProvider';

const CreateTicketScreen = () => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { success, error: notifyError } = useNotification();

  const handleSubmit = async () => {
    if (!description.trim()) {
      notifyError('Empty Request', 'Please describe your issue first.');
      return;
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tickets').insert({
        user_id: user.id,
        subject: description.substring(0, 50) + (description.length > 50 ? '...' : ''),
        description,
        status: 'pending',
      });
      if (error) throw error;
      success('Ticket Created', 'Your request has been submitted.');
      navigation.goBack();
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
              Describe your issue naturally. Our AI will automatically categorize and prioritize it.
            </Text>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Issue Details</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., I can't access my email account since this morning..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={description}
              onChangeText={setDescription}
              numberOfLines={8}
              textAlignVertical="top"
            />
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
                <Text style={styles.btnText}>Submit Request</Text>
                <Send size={18} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.surfaceDark
  },
  title: { 
    fontSize: 18, 
    fontWeight: '800',
    color: COLORS.text
  },
  scrollContent: { 
    padding: 24 
  },
  aiBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12
  },
  aiBannerText: {
    flex: 1,
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18
  },
  inputCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)'
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12
  },
  input: { 
    backgroundColor: COLORS.background, 
    borderRadius: 12, 
    padding: 16, 
    minHeight: 150, 
    fontSize: 16, 
    color: COLORS.text,
    lineHeight: 24
  },
  btn: { 
    backgroundColor: COLORS.primary, 
    height: 60, 
    borderRadius: 16, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 12,
    ...SHADOWS.medium
  },
  btnDisabled: {
    backgroundColor: COLORS.textMuted,
    elevation: 0,
    shadowOpacity: 0
  },
  btnText: { 
    color: COLORS.white, 
    fontSize: 16, 
    fontWeight: '800' 
  }
});

export default CreateTicketScreen;
