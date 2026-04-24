import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function EarningsScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/drivers/earnings').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color={C.forest} /></View>;

  const payouts = data?.payouts || [];

  return (
    <View style={{ flex:1, backgroundColor:C.cream }}>
      <View style={s.header}>
        <Text style={s.headerKicker}>Earnings</Text>
        <Text style={s.headerTitle}>My earnings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>
        {/* Summary cards */}
        <View style={s.summaryRow}>
          {[['All time', data?.totalEarnings || 0], ['This month', data?.thisMonth || 0]].map(([l,v]) => (
            <View key={l} style={s.summaryCard}>
              <Text style={s.summaryLabel}>{l}</Text>
              <Text style={s.summaryValue}>{parseFloat(v).toFixed(0)}</Text>
              <Text style={s.summaryCurrency}>XOF</Text>
            </View>
          ))}
        </View>
        <View style={[s.summaryCard, { marginBottom:20 }]}>
          <Text style={s.summaryLabel}>Completed deliveries</Text>
          <Text style={[s.summaryValue, { fontSize:32 }]}>{data?.totalDeliveries || 0}</Text>
        </View>

        {/* Payout history */}
        <Text style={s.sectionLabel}>Payout history</Text>
        {payouts.length === 0 ? (
          <View style={[s.card, { alignItems:'center', padding:32 }]}>
            <Text style={{ color:C.muted, fontSize:14 }}>No payouts yet</Text>
            <Text style={{ color:C.subtle, fontSize:12, marginTop:6, textAlign:'center' }}>Complete your first delivery to start earning</Text>
          </View>
        ) : payouts.map((p, i) => (
          <View key={p.id} style={[s.card, { flexDirection:'row', justifyContent:'space-between', alignItems:'center' }]}>
            <View>
              <Text style={{ fontSize:13, fontWeight:'500', color:C.ink }}>
                {new Date(p.releasedAt).toLocaleDateString('en', { day:'numeric', month:'short', year:'numeric' })}
              </Text>
              <Text style={{ fontSize:11, color:C.muted, marginTop:2 }}>{p.currency}</Text>
            </View>
            <View style={{ alignItems:'flex-end' }}>
              <Text style={{ fontFamily:'Fraunces', fontSize:20, fontWeight:'500', color:C.forest }}>+{parseFloat(p.driverPayout).toFixed(0)}</Text>
              <Text style={{ fontSize:10, color:C.muted, marginTop:2 }}>{p.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  center:{ flex:1, backgroundColor:C.cream, alignItems:'center', justifyContent:'center' },
  header:{ backgroundColor:C.paper, paddingTop:56, paddingHorizontal:20, paddingBottom:16, borderBottomWidth:1, borderBottomColor:C.border },
  headerKicker:{ fontSize:11, color:C.bronze, letterSpacing:2, fontWeight:'600', textTransform:'uppercase', marginBottom:4 },
  headerTitle:{ fontSize:26, fontWeight:'500', color:C.ink, letterSpacing:-0.5 },
  summaryRow:{ flexDirection:'row', gap:10, marginBottom:10 },
  summaryCard:{ flex:1, backgroundColor:C.paper, borderRadius:8, borderWidth:1, borderColor:C.border, padding:16 },
  summaryLabel:{ fontSize:11, color:C.muted, fontWeight:'600', letterSpacing:0.5, textTransform:'uppercase', marginBottom:8 },
  summaryValue:{ fontSize:38, fontWeight:'500', color:C.forest, letterSpacing:-1, lineHeight:44 },
  summaryCurrency:{ fontSize:13, color:C.muted, marginTop:2 },
  sectionLabel:{ fontSize:11, color:C.muted, fontWeight:'600', letterSpacing:1.5, textTransform:'uppercase', marginBottom:10 },
  card:{ backgroundColor:C.paper, borderRadius:8, borderWidth:1, borderColor:C.border, padding:14, marginBottom:8 },
});
