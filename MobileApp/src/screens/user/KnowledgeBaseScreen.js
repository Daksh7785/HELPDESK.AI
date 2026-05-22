import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { COLORS, SHADOWS } from '../../styles/theme';
import { Search, BookOpen, ChevronRight, ArrowLeft, HelpCircle } from 'lucide-react-native';

const DEFAULT_ARTICLES = [
  {
    id: 'fallback-kb-1',
    title: 'Self-Service Corporate Password Reset',
    content: 'To reset your corporate Windows and Active Directory passwords, navigate to reset.helpdesk.ai on any company-authorized device. Ensure your backup MFA mobile app is active before initializing the reset sequence. Passwords must be 12+ characters, contain special symbols, and not reuse your last 5 historical entries.'
  },
  {
    id: 'fallback-kb-2',
    title: 'Omnichannel Email & Calendar Setup',
    content: 'Configure Outlook/Gmail on your device by using IMAP/SMTP endpoints. SMTP server: mail.helpdesk.ai (port 587, STARTTLS). IMAP server: mail.helpdesk.ai (port 993, SSL/TLS). Authenticate using your global company credentials and input the OTP generated on your authenticator app.'
  },
  {
    id: 'fallback-kb-3',
    title: 'Enabling MFA & Security Hardware keys',
    content: 'Security rules mandate Multi-Factor Authentication (MFA) for standard logins. Log in to your user profile settings page, select Security tab, and tap "Setup MFA". You can scan the QR code using Google Authenticator, Duo Mobile, or map your hardware YubiKey. Keep backup codes stored safely.'
  },
  {
    id: 'fallback-kb-4',
    title: 'Fixing Local Database Connection Pool Exhaustion',
    content: 'If your FastAPI server fails with "QueuePool limit of size 5 overflow 10 reached", navigate to database settings in your docker-compose config and adjust the `pool_size` parameter to 20, and `max_overflow` to 10. Ensure all session connections are properly closed using ContextManagers.'
  }
];

const KnowledgeBaseScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async (query = '') => {
    setLoading(true);
    try {
      let remoteArticles = [];
      const trimmedQuery = query.trim().toLowerCase();

      try {
        if (trimmedQuery) {
          const { data, error } = await supabase
            .from('knowledge_base')
            .select('*')
            .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
            .limit(10);
          
          if (!error && data) {
            remoteArticles = data;
          }
        } else {
          const { data, error } = await supabase
            .from('knowledge_base')
            .select('*')
            .limit(20);
          
          if (!error && data) {
            remoteArticles = data;
          }
        }
      } catch (err) {
        console.warn('Supabase knowledge_base query failed, using offline fallbacks.', err);
      }

      // Filter fallbacks locally based on search query
      const localFiltered = trimmedQuery
        ? DEFAULT_ARTICLES.filter(
            art =>
              art.title.toLowerCase().includes(trimmedQuery) ||
              art.content.toLowerCase().includes(trimmedQuery)
          )
        : DEFAULT_ARTICLES;

      // Merge remote and local filtered, ensuring unique titles
      const merged = [...remoteArticles];
      localFiltered.forEach(localArt => {
        if (!merged.some(m => m.title.toLowerCase() === localArt.title.toLowerCase())) {
          merged.push(localArt);
        }
      });

      setArticles(merged);
    } catch (e) {
      console.error('KB Fetch Error:', e);
      setArticles(DEFAULT_ARTICLES);
    } finally {
      setLoading(false);
    }
  };

  const handleArticlePress = (item) => {
    Alert.alert(
      item.title,
      item.content,
      [{ text: 'Close', style: 'cancel' }],
      { cancelable: true }
    );
  };

  const renderArticle = ({ item }) => (
    <TouchableOpacity 
      style={styles.articleCard}
      onPress={() => handleArticlePress(item)}
    >
      <View style={styles.articleIcon}>
        <BookOpen size={20} color={COLORS.primary} />
      </View>
      <View style={styles.articleInfo}>
        <Text style={styles.articleTitle}>{item.title}</Text>
        <Text style={styles.articleSnippet} numberOfLines={2}>{item.content}</Text>
      </View>
      <ChevronRight size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search for solutions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchArticles(searchQuery)}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <HelpCircle size={48} color={COLORS.textMuted} strokeWidth={1} />
              <Text style={styles.emptyText}>No articles found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  searchSection: { paddingHorizontal: 20, marginBottom: 20 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, paddingHorizontal: 16, height: 56,
    ...SHADOWS.soft, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)'
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: COLORS.text },
  list: { padding: 20, paddingBottom: 100 },
  articleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderRadius: 20, marginBottom: 12,
    ...SHADOWS.soft, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)'
  },
  articleIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
    marginRight: 16
  },
  articleInfo: { flex: 1 },
  articleTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  articleSnippet: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' }
});

export default KnowledgeBaseScreen;
