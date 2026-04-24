import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };
const STATUS_LABELS = { POSTED:'Available', MATCHED:'Accepted', IN_TRANSIT:'In transit', DELIVERED:'Delivered', COMPLETED:'Completed', CANCELLED:'Cancelled' };
const STATUS_COLORS = { POSTED:C.bronze, MATCHED:C.forest, IN_TRANSIT:C.forest, DELIVERED:C.muted, COMPLETED:C.muted, CANCELLED:'#9B2C2C' };

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/jobs/${jobId}`).then(r => setJob(r.data.job || r.data)).finally(() => setLoading(false));
  }, [jobId]);

  if (loading) return <View style={s.center}><ActivityIndicator color={C.forest} /></View>;
  if (!job) return <View style={s.center}><Text style={{ color:C.muted }}>Job not found</Text></View>;

  const statusColor = STATUS_COLORS[job.status] || C.muted;
  const statusLabel = STATUS_LABELS[job.status] || job.status;
  const isActive = ['MATCHED','IN_TRANSIT'].includes(job.status);

  return (
    <View style={{ flex:1, backgroundColor:C.cream }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={{ color:C.forest, fontSize:15, fontWeight:'500' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Delivery detail</Text>
        <View style={{ width:60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>
        {/* Status + price */}
        <View style={s.card}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <View>
              <Text style={[s.kicker]}>{job.urgency}</Text>
              <Text style={s.price}>{job.priceOffered} <Text style={s.currency}>{job.currency}</Text></Text>
            </View>
            <View style={{ alignItems:'flex-end' }}>
              <Text style={{ fontSize:10, color:C.muted, letterSpacing:1, marginBottom:4 }}>STATUS</Text>
              <Text style={{ fontSize:13, fontWeight:'600', color:statusColor }}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={s.ref}>{job.trackingToken}</Text>
        </View>

        {/* Route */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Route</Text>
          {[['Pickup', job.pickupAddress, job.pickupContactName, job.pickupContactPhone, C.bronze],
            ['Dropoff', job.dropoffAddress, job.dropoffContactName, job.dropoffContactPhone, C.forest]].map(([l,a,name,phone,color]) => (
            <View key={l} style={[s.routeRow, { borderTopWidth:l==='Dropoff'?1:0, borderTopColor:C.border, paddingTop:l==='Dropoff'?12:0, marginTop:l==='Dropoff'?12:0 }]}>
              <View style={[s.routeBar, { backgroundColor:color }]} />
              <View style={{ flex:1 }}>
                <Text style={s.routeLabel}>{l}</Text>
                <Text style={s.routeAddr}>{a}</Text>
                {name && <Text style={s.routeContact}>{name}{phone ? ` · ${phone}` : ''}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Package */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Package</Text>
          {[['Type', job.packageType], ['Weight', job.weightKg ? `${job.weightKg} kg` : '—'], ['Fragile', job.isFragile ? 'Yes' : 'No']].map(([k,v]) => (
            <View key={k} style={s.row}>
              <Text style={s.rowKey}>{k}</Text>
              <Text style={s.rowVal}>{v}</Text>
            </View>
          ))}
          {job.packageDescription && <Text style={{ fontSize:13, color:C.muted, marginTop:8, lineHeight:18 }}>{job.packageDescription}</Text>}
        </View>

        {/* Notes */}
        {(job.pickupNotes || job.dropoffNotes) && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>Notes</Text>
            {job.pickupNotes && <View><Text style={s.rowKey}>Pickup</Text><Text style={{ fontSize:13, color:C.ink, marginTop:3 }}>{job.pickupNotes}</Text></View>}
            {job.dropoffNotes && <View style={{ marginTop:job.pickupNotes?10:0 }}><Text style={s.rowKey}>Dropoff</Text><Text style={{ fontSize:13, color:C.ink, marginTop:3 }}>{job.dropoffNotes}</Text></View>}
          </View>
        )}

        {isActive && (
          <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('ActiveDelivery', { jobId:job.id })}>
            <Text style={s.btnText}>Continue delivery</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  center:{ flex:1, backgroundColor:C.cream, alignItems:'center', justifyContent:'center' },
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, paddingTop:52, backgroundColor:C.paper, borderBottomWidth:1, borderBottomColor:C.border },
  backBtn:{ width:60 },
  headerTitle:{ fontSize:15, fontWeight:'600', color:C.ink },
  card:{ backgroundColor:C.paper, borderRadius:8, borderWidth:1, borderColor:C.border, padding:16, marginBottom:12 },
  kicker:{ fontSize:10, color:C.bronze, letterSpacing:1.5, fontWeight:'600', textTransform:'uppercase', marginBottom:6 },
  price:{ fontSize:34, fontWeight:'500', color:C.forest, letterSpacing:-0.5 },
  currency:{ fontSize:14, color:C.muted, fontWeight:'400' },
  ref:{ fontFamily:'monospace', fontSize:12, color:C.subtle, marginTop:8, letterSpacing:0.5 },
  sectionLabel:{ fontSize:10, color:C.muted, fontWeight:'600', textTransform:'uppercase', letterSpacing:1, marginBottom:12 },
  routeRow:{ flexDirection:'row', gap:12 },
  routeBar:{ width:4, borderRadius:2 },
  routeLabel:{ fontSize:10, color:C.muted, fontWeight:'600', letterSpacing:0.8, textTransform:'uppercase', marginBottom:3 },
  routeAddr:{ fontSize:14, color:C.ink, lineHeight:18 },
  routeContact:{ fontSize:12, color:C.muted, marginTop:2 },
  row:{ flexDirection:'row', justifyContent:'space-between', paddingVertical:6, borderBottomWidth:1, borderBottomColor:C.border },
  rowKey:{ fontSize:12, color:C.muted, fontWeight:'500' },
  rowVal:{ fontSize:13, color:C.ink, fontWeight:'500' },
  btnPrimary:{ backgroundColor:C.forest, borderRadius:6, padding:14, alignItems:'center', marginTop:8 },
  btnText:{ color:C.paper, fontWeight:'600', fontSize:14 },
});
