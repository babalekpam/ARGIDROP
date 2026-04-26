import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

export default function RoleSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.container}>
        <View style={{ marginTop: 8 }}>
          <Text style={s.brand}>ArgiDrop</Text>
          <Text style={s.brandSub}>Lomé · West Africa</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={s.title}>Welcome</Text>
          <Text style={s.subtitle}>How will you use ArgiDrop today?</Text>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Register', { role: 'BUSINESS' })} activeOpacity={0.85}>
            <View style={s.iconWrap}><Ionicons name="storefront-outline" size={26} color={C.forest} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>I'm a Merchant</Text>
              <Text style={s.cardDesc}>Send packages, manage your shop's deliveries, track orders live.</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.bronze} />
          </TouchableOpacity>

          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Register', { role: 'DRIVER' })} activeOpacity={0.85}>
            <View style={s.iconWrap}><Ionicons name="bicycle-outline" size={26} color={C.forest} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>I'm a Driver</Text>
              <Text style={s.cardDesc}>Earn money on your schedule. Get paid daily to mobile money.</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.bronze} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Text style={s.link}>Already have an account? <Text style={{ color: C.forest, fontWeight: '600' }}>Sign in</Text></Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 24 },
  brand: { fontFamily: 'serif', fontSize: 26, fontWeight: '700', color: C.forest, letterSpacing: -0.5 },
  brandSub: { fontSize: 11, color: C.bronze, fontWeight: '500', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  title: { fontSize: 30, fontWeight: '500', color: C.ink, letterSpacing: -0.8 },
  subtitle: { fontSize: 15, color: C.muted, marginTop: 6, marginBottom: 28 },
  card: { backgroundColor: C.paper, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 17, fontWeight: '600', color: C.ink, marginBottom: 3 },
  cardDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
  link: { fontSize: 13, color: C.muted },
});
