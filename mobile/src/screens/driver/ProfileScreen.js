import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editPayout, setEditPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ provider:'', account:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/drivers/me').then(r => { setDriver(r.data); setPayoutForm({ provider:r.data.payoutProvider||'', account:r.data.payoutAccount||'' }); }).finally(() => setLoading(false));
  }, []);

  const savePayout = async () => {
    setSaving(true);
    try {
      await api.patch('/drivers/profile', { payoutProvider:payoutForm.provider, payoutAccount:payoutForm.account });
      setDriver(d => ({ ...d, ...payoutForm }));
      setEditPayout(false);
    } catch { Alert.alert('Error', 'Failed to update payout info'); }
    finally { setSaving(false); }
  };

  const toggleOnline = async () => {
    const newStatus = !driver?.isOnline;
    try {
      await api.patch('/drivers/profile', { isOnline:newStatus });
      setDriver(d => ({ ...d, isOnline:newStatus }));
    } catch { Alert.alert('Error', 'Failed to update status'); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={C.forest} /></View>;

  return (
    <View style={{ flex:1, backgroundColor:C.cream }}>
      <View style={s.header}>
        <Text style={s.headerKicker}>Driver</Text>
        <Text style={s.headerTitle}>{user?.firstName} {user?.lastName}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:60 }}>
        {/* Online toggle */}
        <View style={s.card}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <View>
              <Text style={{ fontSize:15, fontWeight:'500', color:C.ink }}>Driver status</Text>
              <Text style={{ fontSize:12, color:C.muted, marginTop:3 }}>{driver?.isOnline ? 'You are visible to businesses' : 'You are offline'}</Text>
            </View>
            <TouchableOpacity onPress={toggleOnline}
              style={{ backgroundColor:driver?.isOnline?C.forest:C.border, borderRadius:20, width:50, height:28, justifyContent:'center', paddingHorizontal:2 }}>
              <View style={{ width:24, height:24, borderRadius:12, backgroundColor:C.paper, transform:[{ translateX:driver?.isOnline?22:0 }] }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[['Rating', `${driver?.rating||'—'} ★`],['Deliveries', driver?.totalDeliveries||0],['Completion', `${driver?.completionRate||100}%`]].map(([l,v]) => (
            <View key={l} style={s.statCard}>
              <Text style={s.statLabel}>{l}</Text>
              <Text style={s.statValue}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Vehicle */}
        <View style={s.card}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <Text style={s.sectionLabel}>Vehicle</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Documents')}><Text style={{ fontSize:12, color:C.forest, fontWeight:'500' }}>Documents →</Text></TouchableOpacity>
          </View>
          {[['Type', driver?.vehicleType],['Make / Model', `${driver?.vehicleMake||'—'} ${driver?.vehicleModel||''}`],['Year', driver?.vehicleYear||'—'],['Color', driver?.vehicleColor||'—'],['Plate', driver?.vehiclePlate||'—']].map(([k,v]) => (
            <View key={k} style={s.row}><Text style={s.rowKey}>{k}</Text><Text style={s.rowVal}>{v}</Text></View>
          ))}
        </View>

        {/* Payout */}
        <View style={s.card}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <Text style={s.sectionLabel}>Payout account</Text>
            <TouchableOpacity onPress={() => setEditPayout(!editPayout)}><Text style={{ fontSize:12, color:C.forest, fontWeight:'500' }}>{editPayout ? 'Cancel' : 'Edit'}</Text></TouchableOpacity>
          </View>
          {editPayout ? (
            <>
              <Text style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Provider</Text>
              <TextInput value={payoutForm.provider} onChangeText={t => setPayoutForm(p=>({...p,provider:t}))} placeholder="MTN_MOMO / ORANGE_MONEY / WAVE…"
                style={s.input} />
              <Text style={{ fontSize:12, color:C.muted, marginBottom:6, marginTop:10 }}>Mobile money number</Text>
              <TextInput value={payoutForm.account} onChangeText={t => setPayoutForm(p=>({...p,account:t}))} placeholder="+228 90 00 00 00" keyboardType="phone-pad"
                style={s.input} />
              <TouchableOpacity style={[s.btnSm, { marginTop:12 }]} onPress={savePayout} disabled={saving}>
                <Text style={{ color:C.paper, fontWeight:'600', fontSize:13 }}>{saving ? 'Saving…' : 'Save payout info'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.row}><Text style={s.rowKey}>Provider</Text><Text style={s.rowVal}>{driver?.payoutProvider||'—'}</Text></View>
              <View style={s.row}><Text style={s.rowKey}>Account</Text><Text style={[s.rowVal, { fontFamily:'monospace' }]}>{driver?.payoutAccount||'—'}</Text></View>
            </>
          )}
        </View>

        {/* Invite */}
        <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Invite')} activeOpacity={0.85}>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View style={{ flex:1, paddingRight:12 }}>
              <Text style={s.sectionLabel}>Invite & earn</Text>
              <Text style={{ fontSize:13, color:C.ink, marginTop:6, fontWeight:'500' }}>Bring another driver</Text>
              <Text style={{ fontSize:12, color:C.muted, marginTop:3, lineHeight:17 }}>Earn a bonus paid with your next shift cash-out.</Text>
            </View>
            <Text style={{ fontSize:18, color:C.forest }}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Account */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Account</Text>
          <View style={s.row}><Text style={s.rowKey}>Email</Text><Text style={s.rowVal}>{user?.email}</Text></View>
          <View style={s.row}><Text style={s.rowKey}>Phone</Text><Text style={s.rowVal}>{user?.phone||'—'}</Text></View>
          <View style={[s.row, { borderBottomWidth:0 }]}><Text style={s.rowKey}>Country</Text><Text style={s.rowVal}>{user?.country||'—'}</Text></View>
          <TouchableOpacity style={s.btnSignOut} onPress={() => Alert.alert('Sign out', 'Are you sure?', [{ text:'Cancel', style:'cancel' }, { text:'Sign out', style:'destructive', onPress:logout }])}>
            <Text style={{ color:'#9B2C2C', fontWeight:'500', fontSize:13 }}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  center:{ flex:1, backgroundColor:C.cream, alignItems:'center', justifyContent:'center' },
  header:{ backgroundColor:C.paper, paddingTop:56, paddingHorizontal:20, paddingBottom:16, borderBottomWidth:1, borderBottomColor:C.border },
  headerKicker:{ fontSize:11, color:C.bronze, letterSpacing:2, fontWeight:'600', textTransform:'uppercase', marginBottom:4 },
  headerTitle:{ fontSize:26, fontWeight:'500', color:C.ink, letterSpacing:-0.5 },
  card:{ backgroundColor:C.paper, borderRadius:8, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 },
  statsRow:{ flexDirection:'row', gap:8, marginBottom:12 },
  statCard:{ flex:1, backgroundColor:C.paper, borderRadius:8, borderWidth:1, borderColor:C.border, padding:12, alignItems:'center' },
  statLabel:{ fontSize:10, color:C.muted, fontWeight:'600', letterSpacing:0.5, textTransform:'uppercase', marginBottom:6 },
  statValue:{ fontSize:20, fontWeight:'500', color:C.forest, letterSpacing:-0.5 },
  sectionLabel:{ fontSize:11, color:C.muted, fontWeight:'700', letterSpacing:1.5, textTransform:'uppercase' },
  row:{ flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:C.border },
  rowKey:{ fontSize:12, color:C.muted },
  rowVal:{ fontSize:13, color:C.ink, fontWeight:'500' },
  input:{ borderWidth:1, borderColor:C.border, borderRadius:6, padding:11, fontSize:14, color:C.ink, backgroundColor:C.cream },
  btnSm:{ backgroundColor:C.forest, borderRadius:6, padding:11, alignItems:'center' },
  btnSignOut:{ marginTop:14, padding:10, alignItems:'center', borderRadius:4, borderWidth:1, borderColor:'#F1B9A7' },
});
