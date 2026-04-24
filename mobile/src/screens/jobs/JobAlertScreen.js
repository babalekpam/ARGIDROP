import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration } from 'react-native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function JobAlertScreen({ route, navigation }) {
  const { job } = route.params;
  const [accepting, setAccepting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    Vibration.vibrate([0, 300, 100, 300]);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }).start();
    timerRef.current = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { clearInterval(timerRef.current); navigation.goBack(); return 0; }
      return t - 1;
    }), 1000);
    return () => { clearInterval(timerRef.current); Vibration.cancel(); };
  }, []);

  const accept = async () => {
    clearInterval(timerRef.current);
    setAccepting(true);
    try {
      await api.post(`/jobs/${job.id}/accept`);
      navigation.replace('ActiveDelivery', { jobId: job.id });
    } catch (err) {
      setAccepting(false);
      navigation.goBack();
    }
  };

  const urgencyColor = job.urgency === 'INSTANT' ? '#9B2C2C' : job.urgency === 'EXPRESS' ? C.bronze : C.forest;

  return (
    <View style={s.overlay}>
      <Animated.View style={[s.card, { transform: [{ translateY: slideAnim }] }]}>
        {/* Timer ring */}
        <View style={s.timerWrap}>
          <View style={[s.timerRing, { borderColor: timeLeft > 10 ? C.forest : '#B87333' }]}>
            <Text style={[s.timerNum, { color: timeLeft > 10 ? C.forest : '#B87333' }]}>{timeLeft}</Text>
            <Text style={s.timerSec}>sec</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal:24 }}>
          <View style={s.kicker}>
            <Text style={{ fontSize:10, color:urgencyColor, fontWeight:'700', letterSpacing:2 }}>{job.urgency} DELIVERY</Text>
          </View>

          <Text style={s.price}>{job.priceOffered}</Text>
          <Text style={s.currency}>{job.currency}</Text>

          <View style={s.divider} />

          {[['From', job.pickupAddress, C.bronze], ['To', job.dropoffAddress, C.forest]].map(([l,a,color]) => (
            <View key={l} style={s.routeRow}>
              <View style={[s.routeBar, { backgroundColor:color }]} />
              <View style={{ flex:1 }}>
                <Text style={s.routeLabel}>{l}</Text>
                <Text style={s.routeAddr} numberOfLines={2}>{a}</Text>
              </View>
            </View>
          ))}

          <View style={s.divider} />

          <View style={s.meta}>
            <Text style={s.metaItem}>{job.packageType}</Text>
            {job.weightKg && <Text style={s.metaItem}>{job.weightKg} kg</Text>}
            {job.isFragile && <Text style={[s.metaItem, { color:C.bronze }]}>Fragile</Text>}
          </View>
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.btnSkip} onPress={() => navigation.goBack()}>
            <Text style={s.btnSkipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnAccept, accepting && { opacity:0.7 }]} onPress={accept} disabled={accepting}>
            <Text style={s.btnAcceptText}>{accepting ? 'Accepting…' : 'Accept job'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  card:{ backgroundColor:C.paper, borderTopLeftRadius:20, borderTopRightRadius:20, paddingTop:20, paddingBottom:32, borderTopWidth:1, borderTopColor:C.border },
  timerWrap:{ alignItems:'center', marginBottom:16 },
  timerRing:{ width:60, height:60, borderRadius:30, borderWidth:2, alignItems:'center', justifyContent:'center' },
  timerNum:{ fontSize:22, fontWeight:'700' },
  timerSec:{ fontSize:9, color:C.muted, marginTop:-2 },
  kicker:{ alignSelf:'flex-start', backgroundColor:C.cream, paddingHorizontal:10, paddingVertical:4, borderRadius:3, marginBottom:10, borderWidth:1, borderColor:C.border },
  price:{ fontSize:44, fontWeight:'500', color:C.forest, letterSpacing:-1, lineHeight:48 },
  currency:{ fontSize:14, color:C.muted, marginBottom:16 },
  divider:{ height:1, backgroundColor:C.border, marginVertical:14 },
  routeRow:{ flexDirection:'row', gap:12, marginBottom:10 },
  routeBar:{ width:4, borderRadius:2 },
  routeLabel:{ fontSize:10, color:C.muted, fontWeight:'600', letterSpacing:1, textTransform:'uppercase', marginBottom:3 },
  routeAddr:{ fontSize:14, color:C.ink, lineHeight:18 },
  meta:{ flexDirection:'row', flexWrap:'wrap', gap:8 },
  metaItem:{ fontSize:12, color:C.muted, backgroundColor:C.cream, paddingHorizontal:10, paddingVertical:4, borderRadius:3, borderWidth:1, borderColor:C.border },
  actions:{ flexDirection:'row', gap:10, paddingHorizontal:24, marginTop:20 },
  btnSkip:{ flex:1, borderWidth:1, borderColor:C.border, borderRadius:6, paddingVertical:13, alignItems:'center' },
  btnSkipText:{ color:C.muted, fontWeight:'500', fontSize:14 },
  btnAccept:{ flex:2, backgroundColor:C.forest, borderRadius:6, paddingVertical:13, alignItems:'center' },
  btnAcceptText:{ color:C.paper, fontWeight:'600', fontSize:14 },
});
