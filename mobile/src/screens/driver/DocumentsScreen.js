import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { t, getLang } from '../../utils/i18n';

const C = { cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', bronze:'#8B6F47', ink:'#1A1A1A', muted:'#6B6560', subtle:'#9A9489', border:'#E4DCC9' };

const DOC_TYPES = ['GOVT_ID_FRONT','GOVT_ID_BACK','DRIVERS_LICENSE','VEHICLE_REGISTRATION','VEHICLE_INSURANCE','VEHICLE_PHOTO_FRONT','POLICE_CLEARANCE','PROOF_OF_ADDRESS'];

export default function DocumentsScreen({ navigation }) {
  const { user } = useAuth();
  const lang = getLang(user);
  const [docs, setDocs] = useState({});
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    api.get('/drivers/me/documents').then(r => {
      const map = {};
      (r.data.documents || []).forEach(d => { map[d.docType] = d; });
      setDocs(map);
    }).catch(() => {});
  }, []);

  const pick = async (docType) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    Alert.alert(
      lang === 'fr' ? 'Choisir la source' : 'Choose source',
      '',
      [
        { text: lang === 'fr' ? 'Prendre une photo' : 'Take photo', onPress: async () => {
          const r = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: true });
          if (!r.canceled) upload(docType, r.assets[0]);
        }},
        { text: lang === 'fr' ? 'Galerie' : 'Gallery', onPress: async () => {
          const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.9, allowsEditing: true });
          if (!r.canceled) upload(docType, r.assets[0]);
        }},
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' }
      ]
    );
  };

  const upload = async (docType, asset) => {
    setUploading(docType);
    try {
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: `${docType}.jpg`, type: 'image/jpeg' });
      form.append('docType', docType);
      await api.post('/drivers/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const r = await api.get('/drivers/me/documents');
      const map = {};
      (r.data.documents || []).forEach(d => { map[d.docType] = d; });
      setDocs(map);
    } catch (e) { Alert.alert(lang === 'fr' ? 'Échec' : 'Failed', e.response?.data?.message || ''); }
    finally { setUploading(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← {lang === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{lang === 'fr' ? 'Mes documents' : 'My documents'}</Text>
        <Text style={s.subtitle}>{lang === 'fr' ? 'Gérez vos pièces justificatives' : 'Manage your verification documents'}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {DOC_TYPES.map(docType => {
          const doc = docs[docType];
          const status = doc?.status;
          return (
            <TouchableOpacity key={docType} style={[s.card, status === 'APPROVED' && s.cardApproved, status === 'REJECTED' && s.cardRejected]}
              onPress={() => pick(docType)} disabled={uploading === docType}>
              <View style={{ flex: 1 }}>
                <Text style={s.docLabel}>{t(`doc.${docType}.label`, lang)}</Text>
                <Text style={s.docHint}>{t(`doc.${docType}.hint`, lang)}</Text>
                {doc?.rejectionReason && <Text style={s.rejection}>⚠ {doc.rejectionReason}</Text>}
              </View>
              <View style={{ minWidth: 80, alignItems: 'flex-end' }}>
                {uploading === docType ? <ActivityIndicator color={C.forest} size="small" /> :
                  status === 'APPROVED' ? <Text style={s.statusApproved}>✓ {t('common.approved', lang)}</Text> :
                  status === 'REJECTED' ? <Text style={s.statusRejected}>{t('common.rejected', lang)}</Text> :
                  status === 'PENDING' ? <Text style={s.statusPending}>{t('common.uploaded', lang)}</Text> :
                  <Text style={s.statusUpload}>{t('common.choose', lang)}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.paper, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  back: { color: C.forest, fontSize: 14, fontWeight: '500', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '500', color: C.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  cardApproved: { borderColor: '#2D5E3E', backgroundColor: '#F0F5F1' },
  cardRejected: { borderColor: '#9B2C2C', backgroundColor: '#FCEDE9' },
  docLabel: { fontSize: 14, fontWeight: '500', color: C.ink, marginBottom: 3 },
  docHint: { fontSize: 11, color: C.muted, lineHeight: 15 },
  rejection: { fontSize: 11, color: '#9B2C2C', fontWeight: '500', marginTop: 5 },
  statusUpload: { color: C.forest, fontSize: 12, fontWeight: '700' },
  statusPending: { color: C.bronze, fontSize: 11, fontWeight: '500' },
  statusApproved: { color: '#2D5E3E', fontSize: 11, fontWeight: '700' },
  statusRejected: { color: '#9B2C2C', fontSize: 12, fontWeight: '700' },
});
