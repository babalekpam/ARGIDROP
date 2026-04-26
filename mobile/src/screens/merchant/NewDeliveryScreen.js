import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

// Placeholder — full pickup/dropoff/payment flow lands in M4.
export default function NewDeliveryScreen({ navigation }) {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={C.forest} />
        </TouchableOpacity>
        <Text style={s.title}>New delivery</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={s.placeholder}>
          <Ionicons name="construct-outline" size={36} color={C.bronze} />
          <Text style={s.placeholderTitle}>Coming next</Text>
          <Text style={s.placeholderText}>The pickup/drop-off picker, parcel details, and mobile money payment sheet are landing in the next milestone.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.paper },
  title: { fontSize: 17, fontWeight: '600', color: C.ink },
  placeholder: { backgroundColor: C.paper, borderRadius: 12, padding: 28, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  placeholderTitle: { fontSize: 16, fontWeight: '600', color: C.ink, marginTop: 12 },
  placeholderText: { fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
});
