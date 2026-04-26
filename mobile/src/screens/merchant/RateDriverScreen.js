import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import api from '../../utils/api';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

const LABELS = ['', 'Poor', 'Below average', 'Average', 'Good', 'Excellent'];

// route.params: { jobId, driverName? }
export default function RateDriverScreen({ route, navigation }) {
  const { jobId, driverName } = route.params || {};
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (score === 0) return Alert.alert('Rate the delivery', 'Please select a star rating first');
    setSubmitting(true);
    try {
      // Backend derives ratedUserId from caller role + job.driverId
      await api.post(`/jobs/${jobId}/rate`, { score, comment });
      navigation.replace('MerchantTabs');
    } catch (e) {
      const msg = e.response?.data?.message || 'Could not submit rating';
      if (msg.toLowerCase().includes('already rated')) {
        navigation.replace('MerchantTabs');
      } else {
        Alert.alert('Failed', msg);
      }
    } finally { setSubmitting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={s.header}>
        <Text style={s.kicker}>Delivery complete</Text>
        <Text style={s.title}>Rate your driver</Text>
        {driverName ? <Text style={s.subtitle}>How was your experience with {driverName}?</Text> : null}
      </View>

      <View style={s.card}>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => setScore(n)} style={s.star}>
              <Text style={{ fontSize: 40, color: n <= score ? '#E4A011' : C.border }}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        {score > 0 && <Text style={s.scoreLabel}>{LABELS[score]}</Text>}

        <View style={{ marginTop: 20 }}>
          <Text style={s.inputLabel}>Add a comment (optional)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="On time, friendly, careful with the package…"
            placeholderTextColor={C.subtle}
            multiline
            numberOfLines={4}
            style={s.input}
          />
        </View>

        <TouchableOpacity style={[s.btnSubmit, score === 0 && { opacity: 0.5 }]} onPress={submit} disabled={submitting || score === 0}>
          <Text style={s.btnText}>{submitting ? 'Submitting…' : 'Submit rating'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.btnSkip} onPress={() => navigation.replace('MerchantTabs')}>
          <Text style={{ color: C.muted, fontSize: 13 }}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { padding: 24, paddingTop: 56, backgroundColor: C.paper, borderBottomWidth: 1, borderBottomColor: C.border },
  kicker: { fontSize: 11, color: C.bronze, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '500', color: C.ink, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.muted },
  card: { margin: 16, backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 24 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  star: { padding: 4 },
  scoreLabel: { textAlign: 'center', fontSize: 14, fontWeight: '500', color: C.ink, marginTop: 8 },
  inputLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 12, fontSize: 14, color: C.ink, backgroundColor: C.cream, minHeight: 80, textAlignVertical: 'top' },
  btnSubmit: { backgroundColor: C.forest, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 20 },
  btnText: { color: C.paper, fontWeight: '600', fontSize: 14 },
  btnSkip: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
});
