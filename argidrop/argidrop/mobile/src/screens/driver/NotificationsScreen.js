import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

const NOTIF_ICONS = {
  JOB_MATCHED:'✓', JOB_CANCELLED:'✕', PAYMENT_RELEASED:'💳', DOCUMENT_APPROVED:'✓', DOCUMENT_REJECTED:'⚠', DEFAULT:'·'
};
const NOTIF_COLORS = {
  JOB_MATCHED:C.forest, JOB_CANCELLED:'#9B2C2C', PAYMENT_RELEASED:C.forest, DOCUMENT_APPROVED:C.forest, DOCUMENT_REJECTED:'#B87333', DEFAULT:C.muted
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(r => setNotifications(r.data.notifications || [])).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  };

  const renderItem = ({ item:n }) => {
    const color = NOTIF_COLORS[n.type] || NOTIF_COLORS.DEFAULT;
    const icon = NOTIF_ICONS[n.type] || NOTIF_ICONS.DEFAULT;
    const isUnread = !n.readAt;
    return (
      <TouchableOpacity onPress={() => markRead(n.id)} style={[s.item, isUnread && s.itemUnread]}>
        <View style={[s.iconWrap, { borderColor:color }]}>
          <Text style={{ color, fontSize:14, fontWeight:'700' }}>{icon}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={[s.itemTitle, isUnread && { fontWeight:'600', color:C.ink }]}>{n.title}</Text>
          <Text style={s.itemBody}>{n.body}</Text>
          <Text style={s.itemTime}>{timeAgo(n.sentAt)}</Text>
        </View>
        {isUnread && <View style={s.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex:1, backgroundColor:C.cream }}>
      <View style={s.header}>
        <Text style={s.headerKicker}>Updates</Text>
        <Text style={s.headerTitle}>Notifications</Text>
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.forest} /></View>
      ) : notifications.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize:15, fontWeight:'500', color:C.ink, marginBottom:6 }}>All caught up</Text>
          <Text style={{ fontSize:13, color:C.muted }}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={n => n.id}
          contentContainerStyle={{ padding:12, paddingBottom:40 }}
          ItemSeparatorComponent={() => <View style={{ height:6 }} />}
        />
      )}
    </View>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString();
}

const s = StyleSheet.create({
  header:{ backgroundColor:C.paper, paddingTop:56, paddingHorizontal:20, paddingBottom:16, borderBottomWidth:1, borderBottomColor:C.border },
  headerKicker:{ fontSize:11, color:C.bronze, letterSpacing:2, fontWeight:'600', textTransform:'uppercase', marginBottom:4 },
  headerTitle:{ fontSize:26, fontWeight:'500', color:C.ink, letterSpacing:-0.5 },
  center:{ flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  item:{ flexDirection:'row', gap:12, alignItems:'flex-start', backgroundColor:C.paper, borderRadius:8, borderWidth:1, borderColor:C.border, padding:14 },
  itemUnread:{ borderColor:'#B8D4BC', backgroundColor:'#F5FAF6' },
  iconWrap:{ width:32, height:32, borderRadius:16, borderWidth:1.5, alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 },
  itemTitle:{ fontSize:14, fontWeight:'500', color:C.ink, marginBottom:3 },
  itemBody:{ fontSize:13, color:C.muted, lineHeight:18 },
  itemTime:{ fontSize:11, color:C.subtle, marginTop:4 },
  unreadDot:{ width:8, height:8, borderRadius:4, backgroundColor:C.forest, marginTop:6 },
});
