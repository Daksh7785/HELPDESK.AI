import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../../styles/theme';
import { Bell, Sparkles, MessageSquare } from 'lucide-react-native';

const NotificationsScreen = () => {
  const NotificationItem = ({ icon: Icon, title, message, time, isUnread, color = COLORS.primary }) => (
    <View style={[styles.notificationCard, isUnread && styles.unreadCard]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>{message}</Text>
        <Text style={styles.notificationTime}>{time}</Text>
      </View>
      {isUnread && <View style={styles.unreadDot} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <NotificationItem 
          icon={Sparkles} 
          title="AI Categorization Complete" 
          message="Your request 'Cannot access email' has been categorized as High Priority."
          time="Just now"
          isUnread={true}
          color={COLORS.warning}
        />
        <NotificationItem 
          icon={MessageSquare} 
          title="Admin Replied" 
          message="IT Support has replied to your ticket #7AD530."
          time="2 hours ago"
          isUnread={true}
        />
        <NotificationItem 
          icon={Bell} 
          title="System Maintenance" 
          message="Scheduled downtime for the intranet portal this Sunday at 2 AM."
          time="Yesterday"
          isUnread={false}
          color={COLORS.textMuted}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: COLORS.background,
  },
  headerTitle: { fontSize: 32, fontWeight: '900', color: COLORS.text, letterSpacing: -1 },
  scrollContent: { padding: 24, paddingBottom: 120 },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...SHADOWS.soft
  },
  unreadCard: {
    backgroundColor: COLORS.primaryLight + '50',
    borderColor: COLORS.primaryLight
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  notificationContent: { flex: 1, justifyContent: 'center' },
  notificationTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  notificationMessage: { fontSize: 14, color: COLORS.textLight, lineHeight: 20, marginBottom: 8 },
  notificationTime: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginTop: 6
  }
});

export default NotificationsScreen;
