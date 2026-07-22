// DriverKYCScreen — Complete rigorous bilingual KYC onboarding
// Replaces DriverOnboardingScreen + DriverDocumentsScreen
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TextInput, Alert,
  ActivityIndicator, Animated, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { t, getLang } from '../../utils/i18n';

const C = {
  cream:'#F7F3EB', paper:'#FDFBF6', forest:'#1B4332', forestSoft:'#2D5E3E',
  bronze:'#8B6F47', bronzeSoft:'#B89872', ink:'#1A1A1A', muted:'#6B6560',
  subtle:'#9A9489', border:'#E4DCC9', borderSoft:'#EFE8D7',
  success:'#2D5E3E', warn:'#B87333', alert:'#9B2C2C',
};

const TOTAL_STEPS = 4;

const VEHICLE_TYPES = ['BICYCLE','MOTORCYCLE','TRICYCLE','CAR','VAN','TRUCK'];
const VEHICLE_HINTS = {
  fr: { BICYCLE:'Petits colis, même zone', MOTORCYCLE:'Express, jusqu\'à 15 kg', TRICYCLE:'Charges moyennes, jusqu\'à 100 kg', CAR:'Jusqu\'à 200 kg, longues distances', VAN:'Grandes charges, jusqu\'à 800 kg', TRUCK:'Transport lourd' },
  en: { BICYCLE:'Small parcels, same zone', MOTORCYCLE:'Express, up to 15 kg', TRICYCLE:'Medium loads, up to 100 kg', CAR:'Up to 200 kg, longer routes', VAN:'Large loads, up to 800 kg', TRUCK:'Heavy transport' },
};

const PAYOUT_PROVIDERS = [
  { id:'MTN_MOMO', label:'MTN MoMo', countries:'TG, CI, BJ, GH' },
  { id:'ORANGE_MONEY', label:'Orange Money', countries:'CI, SN, BF, ML, TG' },
  { id:'MOOV', label:'Moov Money', countries:'TG, CI, BJ, BF' },
  { id:'TMONEY', label:'T-Money', countries:'TG' },
  { id:'WAVE', label:'Wave', countries:'SN, CI' },
];

// Documents required — in order
const REQUIRED_DOCS = [
  'SELFIE',
  'SELFIE_WITH_ID',
  'GOVT_ID_FRONT',
  'GOVT_ID_BACK',
  'DRIVERS_LICENSE',
  'VEHICLE_REGISTRATION',
  'VEHICLE_INSURANCE',
  'VEHICLE_PHOTO_FRONT',
  'POLICE_CLEARANCE',
  'PROOF_OF_ADDRESS',
];

export default function DriverKYCScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const lang = getLang(user);
  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState({ vehicleType:'', vehicleMake:'', vehicleModel:'', vehicleYear:'', vehiclePlate:'', vehicleColor:'' });
  const [payout, setPayout] = useState({ provider:'', account:'' });
  const [docs, setDocs] = useState({});
  const [uploading, setUploading] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: step / TOTAL_STEPS, duration: 300, useNativeDriver: false }).start();
    // Load any already-uploaded docs
    api.get('/drivers/me/documents').then(r => {
      const map = {};
      (r.data.documents || []).forEach(d => { map[d.docType] = d; });
      setDocs(map);
    }).catch(() => {});
  }, [step]);

  const progressWidth = progress.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] });

  // ─── STEP 1: Vehicle ───
  const submitVehicle = async () => {
    if (!vehicle.vehicleType) return Alert.alert(t('error.vehicle_type', lang));
    setSubmitting(true);
    try {
      await api.post('/drivers/onboarding', vehicle);
      setStep(2);
    } catch (e) { Alert.alert(e.response?.data?.message || t('error.upload', lang)); }
    finally { setSubmitting(false); }
  };

  // ─── STEP 2: Payout ───
  const submitPayout = async () => {
    if (!payout.provider || !payout.account) return Alert.alert(t('error.payout', lang));
    setSubmitting(true);
    try {
      await api.patch('/drivers/profile', { payoutProvider: payout.provider, payoutAccount: payout.account });
      setStep(3);
    } catch (e) { Alert.alert(e.response?.data?.message || t('error.upload', lang)); }
    finally { setSubmitting(false); }
  };

  // ─── STEP 3 & 4: Documents ───
  const captureDoc = async (docType) => {
    const isSelfie = docType === 'SELFIE' || docType === 'SELFIE_WITH_ID';

    if (isSelfie) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') return Alert.alert(t('error.camera', lang));
    }

    Alert.alert(
      lang === 'fr' ? 'Choisir la source' : 'Choose source',
      '',
      [
        {
          text: lang === 'fr' ? 'Prendre une photo' : 'Take photo',
          onPress: () => captureFromCamera(docType)
        },
        ...(!isSelfie ? [{
          text: lang === 'fr' ? 'Choisir depuis la galerie' : 'Choose from gallery',
          onPress: () => captureFromLibrary(docType)
        }] : []),
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const captureFromCamera = async (docType) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: docType === 'SELFIE',
      aspect: docType === 'SELFIE' ? [1,1] : [4,3],
      quality: 0.9,
      cameraType: docType === 'SELFIE' || docType === 'SELFIE_WITH_ID'
        ? ImagePicker.CameraType.front
        : ImagePicker.CameraType.back,
    });
    if (!result.canceled) await uploadDoc(docType, result.assets[0]);
  };

  const captureFromLibrary = async (docType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.9,
    });
    if (!result.canceled) await uploadDoc(docType, result.assets[0]);
  };

  const uploadDoc = async (docType, asset) => {
    setUploading(docType);
    try {
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: `${docType}.jpg`, type: 'image/jpeg' });
      form.append('docType', docType);

      // Selfie goes to dedicated selfie endpoint
      if (docType === 'SELFIE' || docType === 'SELFIE_WITH_ID') {
        await api.post('/drivers/selfie', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setDocs(d => ({ ...d, [docType]: { docType, fileUrl: asset.uri, status: 'PENDING' } }));
      } else {
        await api.post('/drivers/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setDocs(d => ({ ...d, [docType]: { docType, fileUrl: asset.uri, status: 'PENDING' } }));
      }
    } catch (e) {
      Alert.alert(t('error.upload', lang), e.response?.data?.message || '');
    } finally { setUploading(null); }
  };

  const submitForReview = async () => {
    const uploaded = REQUIRED_DOCS.filter(dt => docs[dt]);
    if (uploaded.length < REQUIRED_DOCS.length) {
      return Alert.alert(t('error.missing_docs', lang));
    }
    setSubmitting(true);
    try {
      await api.post('/drivers/submit-for-review');
      await refreshUser();
      navigation.replace('DriverPending');
    } catch (e) { Alert.alert(e.response?.data?.message || t('error.upload', lang)); }
    finally { setSubmitting(false); }
  };

  // Split docs into two groups for step 3 and step 4
  const STEP3_DOCS = ['SELFIE','SELFIE_WITH_ID','GOVT_ID_FRONT','GOVT_ID_BACK','DRIVERS_LICENSE'];
  const STEP4_DOCS = ['VEHICLE_REGISTRATION','VEHICLE_INSURANCE','VEHICLE_PHOTO_FRONT','POLICE_CLEARANCE','PROOF_OF_ADDRESS'];
  const allStep3Done = STEP3_DOCS.every(d => docs[d]);
  const allStep4Done = STEP4_DOCS.every(d => docs[d]);

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:C.cream }} behavior={Platform.OS==='ios'?'padding':undefined}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <Text style={s.kicker}>{t('onboarding.step', lang)} {step} {t('onboarding.of', lang)} {TOTAL_STEPS}</Text>
          <Text style={s.langNote}>{lang === 'fr' ? 'Français' : 'English'}</Text>
        </View>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: progressWidth }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding:20, paddingBottom:60 }}>
        {/* ─── STEP 1: Vehicle ─── */}
        {step === 1 && (
          <View>
            <Text style={s.title}>{t('onboarding.vehicle.title', lang)}</Text>
            <Text style={s.subtitle}>{t('onboarding.vehicle.subtitle', lang)}</Text>

            <Text style={s.fieldLabel}>{t('vehicle.type', lang)}</Text>
            {VEHICLE_TYPES.map(vt => (
              <TouchableOpacity key={vt} style={[s.optCard, vehicle.vehicleType===vt && s.optCardActive]}
                onPress={() => setVehicle(v => ({ ...v, vehicleType:vt }))}>
                <View style={{ flex:1 }}>
                  <Text style={[s.optLabel, vehicle.vehicleType===vt && { color:C.forest }]}>{t(`vehicle.${vt}`, lang)}</Text>
                  <Text style={s.optHint}>{VEHICLE_HINTS[lang][vt]}</Text>
                </View>
                <View style={[s.radio, vehicle.vehicleType===vt && s.radioActive]} />
              </TouchableOpacity>
            ))}

            <View style={{ height:16 }} />
            <View style={{ flexDirection:'row', gap:10 }}>
              <F lang={lang} labelKey="vehicle.make" value={vehicle.vehicleMake} onChange={v => setVehicle(p => ({...p, vehicleMake:v}))} />
              <F lang={lang} labelKey="vehicle.model" value={vehicle.vehicleModel} onChange={v => setVehicle(p => ({...p, vehicleModel:v}))} />
            </View>
            <View style={{ flexDirection:'row', gap:10 }}>
              <F lang={lang} labelKey="vehicle.year" value={vehicle.vehicleYear} onChange={v => setVehicle(p => ({...p, vehicleYear:v}))} kb="numeric" />
              <F lang={lang} labelKey="vehicle.color" value={vehicle.vehicleColor} onChange={v => setVehicle(p => ({...p, vehicleColor:v}))} />
            </View>
            <F lang={lang} labelKey="vehicle.plate" value={vehicle.vehiclePlate} onChange={v => setVehicle(p => ({...p, vehiclePlate:v.toUpperCase()}))} caps />

            <Btn lang={lang} labelKey="common.continue" onPress={submitVehicle} loading={submitting} />
          </View>
        )}

        {/* ─── STEP 2: Payout ─── */}
        {step === 2 && (
          <View>
            <Text style={s.title}>{t('onboarding.payout.title', lang)}</Text>
            <Text style={s.subtitle}>{t('onboarding.payout.subtitle', lang)}</Text>

            <Text style={s.fieldLabel}>{t('payout.provider', lang)}</Text>
            {PAYOUT_PROVIDERS.map(p => (
              <TouchableOpacity key={p.id} style={[s.optCard, payout.provider===p.id && s.optCardActive]}
                onPress={() => setPayout(prev => ({ ...prev, provider:p.id }))}>
                <View style={{ flex:1 }}>
                  <Text style={[s.optLabel, payout.provider===p.id && { color:C.forest }]}>{p.label}</Text>
                  <Text style={s.optHint}>{p.countries}</Text>
                </View>
                <View style={[s.radio, payout.provider===p.id && s.radioActive]} />
              </TouchableOpacity>
            ))}

            <View style={{ height:14 }} />
            <Text style={s.fieldLabel}>{t('payout.account', lang)}</Text>
            <TextInput
              value={payout.account}
              onChangeText={v => setPayout(p => ({ ...p, account:v }))}
              placeholder="+228 90 00 00 00"
              placeholderTextColor={C.subtle}
              keyboardType="phone-pad"
              style={s.input}
            />
            <Text style={s.hint}>{t('payout.hint', lang)}</Text>

            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity style={[s.btnSecondary, { flex:1 }]} onPress={() => setStep(1)}>
                <Text style={s.btnSecondaryText}>{t('common.back', lang)}</Text>
              </TouchableOpacity>
              <Btn lang={lang} labelKey="common.continue" onPress={submitPayout} loading={submitting} flex={2} />
            </View>
          </View>
        )}

        {/* ─── STEP 3: Identity docs ─── */}
        {step === 3 && (
          <View>
            <Text style={s.title}>{lang==='fr' ? 'Identité & permis' : 'Identity & license'}</Text>
            <Text style={s.subtitle}>{lang==='fr' ? 'Photos nettes, bien éclairées, non rognées' : 'Clear, well-lit, uncropped photos'}</Text>

            {/* Selfie special section */}
            <View style={s.selfieSection}>
              <Text style={s.sectionHeader}>{lang==='fr' ? 'Photos de vous' : 'Photos of you'}</Text>
              {STEP3_DOCS.slice(0,2).map(dt => <DocCard key={dt} docType={dt} doc={docs[dt]} lang={lang} onCapture={captureDoc} uploading={uploading} isSelfie />)}
            </View>

            <View style={s.selfieSection}>
              <Text style={s.sectionHeader}>{lang==='fr' ? 'Pièces d\'identité' : 'Identity documents'}</Text>
              {STEP3_DOCS.slice(2).map(dt => <DocCard key={dt} docType={dt} doc={docs[dt]} lang={lang} onCapture={captureDoc} uploading={uploading} />)}
            </View>

            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity style={[s.btnSecondary, { flex:1 }]} onPress={() => setStep(2)}>
                <Text style={s.btnSecondaryText}>{t('common.back', lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimary, { flex:2, opacity: allStep3Done ? 1 : 0.45 }]}
                onPress={() => allStep3Done ? setStep(4) : Alert.alert(t('error.missing_docs', lang))}
                disabled={!allStep3Done}>
                <Text style={s.btnText}>{t('common.continue', lang)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── STEP 4: Vehicle docs ─── */}
        {step === 4 && (
          <View>
            <Text style={s.title}>{lang==='fr' ? 'Documents véhicule' : 'Vehicle documents'}</Text>
            <Text style={s.subtitle}>{lang==='fr' ? 'Documents en cours de validité obligatoires' : 'Currently valid documents are required'}</Text>

            {STEP4_DOCS.map(dt => <DocCard key={dt} docType={dt} doc={docs[dt]} lang={lang} onCapture={captureDoc} uploading={uploading} />)}

            <View style={{ backgroundColor:C.cream, borderWidth:1, borderColor:C.border, borderRadius:8, padding:14, marginBottom:20 }}>
              <Text style={{ fontSize:13, fontWeight:'600', color:C.ink, marginBottom:6 }}>
                {lang==='fr' ? 'Engagement de confidentialité' : 'Privacy commitment'}
              </Text>
              <Text style={{ fontSize:12, color:C.muted, lineHeight:18 }}>
                {lang==='fr'
                  ? 'Vos documents sont chiffrés et examinés uniquement par notre équipe de vérification. Ils ne sont jamais partagés avec les clients.'
                  : 'Your documents are encrypted and reviewed only by our verification team. They are never shared with customers.'}
              </Text>
            </View>

            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity style={[s.btnSecondary, { flex:1 }]} onPress={() => setStep(3)}>
                <Text style={s.btnSecondaryText}>{t('common.back', lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimary, { flex:2, opacity: allStep4Done ? 1 : 0.45 }]}
                onPress={allStep4Done ? submitForReview : () => Alert.alert(t('error.missing_docs', lang))}
                disabled={!allStep4Done || submitting}>
                {submitting ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{t('kyc.submit', lang)}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── DocCard component ───
function DocCard({ docType, doc, lang, onCapture, uploading, isSelfie }) {
  const isUploading = uploading === docType;
  const status = doc?.status;

  return (
    <View style={[
      dc.card,
      status === 'APPROVED' && dc.cardApproved,
      status === 'REJECTED' && dc.cardRejected,
    ]}>
      {/* Left: selfie preview or status dot */}
      {isSelfie && doc?.fileUrl ? (
        <Image source={{ uri: doc.fileUrl }} style={dc.selfieThumb} />
      ) : (
        <View style={[dc.dot, { backgroundColor: status==='APPROVED' ? C.forest : status==='REJECTED' ? C.alert : status==='PENDING' ? C.bronze : C.border }]} />
      )}

      <View style={{ flex:1 }}>
        <Text style={dc.label}>{t(`doc.${docType}.label`, lang)}</Text>
        <Text style={dc.hint}>{t(`doc.${docType}.hint`, lang)}</Text>
        {doc?.rejectionReason && (
          <View style={dc.rejectionBox}>
            <Text style={dc.rejectionText}>⚠ {doc.rejectionReason}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={dc.action} onPress={() => onCapture(docType)} disabled={isUploading}>
        {isUploading
          ? <ActivityIndicator color={C.forest} size="small" />
          : status === 'APPROVED'
            ? <Text style={dc.statusApproved}>{t('common.approved', lang)}</Text>
            : status === 'REJECTED'
              ? <Text style={dc.statusRejected}>{t('common.rejected', lang)}</Text>
              : status === 'PENDING'
                ? <Text style={dc.statusPending}>{t('common.uploaded', lang)}</Text>
                : <Text style={dc.statusCapture}>{isSelfie ? (lang==='fr'?'Photo':'Photo') : (lang==='fr'?'Capturer':'Capture')}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ─── Field component ───
function F({ lang, labelKey, value, onChange, kb, caps }) {
  return (
    <View style={{ flex:1, marginBottom:12 }}>
      <Text style={s.fieldLabel}>{t(labelKey, lang)}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={kb || 'default'}
        autoCapitalize={caps ? 'characters' : 'words'}
        placeholderTextColor={C.subtle}
        style={s.input}
      />
    </View>
  );
}

// ─── Button component ───
function Btn({ lang, labelKey, onPress, loading, flex=1 }) {
  return (
    <TouchableOpacity style={[s.btnPrimary, { flex }]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={C.paper} /> : <Text style={s.btnText}>{t(labelKey, lang)}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  header:{ backgroundColor:C.paper, paddingTop:52, paddingHorizontal:20, paddingBottom:16, borderBottomWidth:1, borderBottomColor:C.border },
  kicker:{ fontSize:11, color:C.bronze, letterSpacing:2, fontWeight:'700', textTransform:'uppercase' },
  langNote:{ fontSize:11, color:C.subtle },
  progressTrack:{ height:3, backgroundColor:C.border, borderRadius:2, overflow:'hidden', marginTop:10 },
  progressFill:{ height:3, backgroundColor:C.forest, borderRadius:2 },
  title:{ fontSize:26, fontWeight:'500', color:C.ink, letterSpacing:-0.5, marginBottom:6, marginTop:4 },
  subtitle:{ fontSize:14, color:C.muted, lineHeight:20, marginBottom:22 },
  fieldLabel:{ fontSize:12, color:C.muted, fontWeight:'700', marginBottom:7, letterSpacing:0.3 },
  optCard:{ flexDirection:'row', alignItems:'center', backgroundColor:C.paper, borderWidth:1, borderColor:C.border, borderRadius:8, padding:14, marginBottom:8 },
  optCardActive:{ borderColor:C.forest, backgroundColor:'#F0EDE0' },
  optLabel:{ fontSize:15, fontWeight:'500', color:C.ink, marginBottom:2 },
  optHint:{ fontSize:12, color:C.muted },
  radio:{ width:20, height:20, borderRadius:10, borderWidth:1.5, borderColor:C.border },
  radioActive:{ borderColor:C.forest, backgroundColor:C.forest },
  input:{ backgroundColor:C.cream, borderWidth:1, borderColor:C.border, borderRadius:6, padding:12, fontSize:14, color:C.ink, marginBottom:0 },
  hint:{ fontSize:11, color:C.subtle, marginTop:5, marginBottom:12, lineHeight:15 },
  sectionHeader:{ fontSize:11, color:C.muted, fontWeight:'700', letterSpacing:1.5, textTransform:'uppercase', marginBottom:10, marginTop:4 },
  selfieSection:{ marginBottom:16 },
  btnPrimary:{ backgroundColor:C.forest, borderRadius:6, padding:14, alignItems:'center', marginTop:20, justifyContent:'center' },
  btnSecondary:{ backgroundColor:C.paper, borderWidth:1, borderColor:C.border, borderRadius:6, padding:14, alignItems:'center', marginTop:20 },
  btnSecondaryText:{ color:C.ink, fontWeight:'500', fontSize:14 },
  btnText:{ color:C.paper, fontWeight:'600', fontSize:14 },
});

const dc = StyleSheet.create({
  card:{ flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.paper, borderWidth:1, borderColor:C.border, borderRadius:8, padding:14, marginBottom:8 },
  cardApproved:{ borderColor:C.success, backgroundColor:'#F0F5F1' },
  cardRejected:{ borderColor:C.alert, backgroundColor:'#FCEDE9' },
  dot:{ width:10, height:10, borderRadius:5, flexShrink:0 },
  selfieThumb:{ width:44, height:44, borderRadius:22, borderWidth:1.5, borderColor:C.border },
  label:{ fontSize:14, fontWeight:'500', color:C.ink, marginBottom:3 },
  hint:{ fontSize:11, color:C.muted, lineHeight:15 },
  rejectionBox:{ marginTop:6, backgroundColor:'#FCEDE9', borderRadius:4, padding:6 },
  rejectionText:{ fontSize:11, color:C.alert, fontWeight:'500' },
  action:{ minWidth:70, alignItems:'flex-end', flexShrink:0 },
  statusCapture:{ color:C.forest, fontSize:12, fontWeight:'700' },
  statusPending:{ color:C.bronze, fontSize:11, fontWeight:'500' },
  statusApproved:{ color:C.success, fontSize:11, fontWeight:'700' },
  statusRejected:{ color:C.alert, fontSize:12, fontWeight:'700' },
});
