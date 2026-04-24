// Bilingual strings — French (fr) and English (en)
// Usage: t('selfie.title', lang)

const strings = {
  // ─── COMMON ───
  'common.continue': { fr: 'Continuer', en: 'Continue' },
  'common.back': { fr: 'Retour', en: 'Back' },
  'common.save': { fr: 'Enregistrer', en: 'Save' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.submit': { fr: 'Soumettre', en: 'Submit' },
  'common.retry': { fr: 'Réessayer', en: 'Try again' },
  'common.uploading': { fr: 'Envoi en cours…', en: 'Uploading…' },
  'common.saving': { fr: 'Sauvegarde…', en: 'Saving…' },
  'common.loading': { fr: 'Chargement…', en: 'Loading…' },
  'common.required': { fr: 'Requis', en: 'Required' },
  'common.optional': { fr: 'Optionnel', en: 'Optional' },
  'common.uploaded': { fr: '✓ Envoyé', en: '✓ Uploaded' },
  'common.approved': { fr: '✓ Approuvé', en: '✓ Approved' },
  'common.rejected': { fr: 'À corriger', en: 'Re-upload needed' },
  'common.pending': { fr: 'En attente', en: 'Under review' },
  'common.replace': { fr: 'Remplacer', en: 'Replace file' },
  'common.choose': { fr: 'Choisir le fichier', en: 'Choose file' },

  // ─── ONBOARDING STEPS ───
  'onboarding.step': { fr: 'Étape', en: 'Step' },
  'onboarding.of': { fr: 'sur', en: 'of' },
  'onboarding.vehicle.title': { fr: 'Votre véhicule', en: 'Your vehicle' },
  'onboarding.vehicle.subtitle': { fr: 'Décrivez votre moyen de livraison', en: 'Tell us what you drive' },
  'onboarding.payout.title': { fr: 'Compte de paiement', en: 'Payout account' },
  'onboarding.payout.subtitle': { fr: 'Où envoyer vos gains après chaque livraison ?', en: 'Where should we send your earnings?' },
  'onboarding.kyc.title': { fr: 'Vérification d\'identité', en: 'Identity verification' },
  'onboarding.kyc.subtitle': { fr: 'Nous vérifions chaque livreur pour protéger nos clients', en: 'We verify every driver to protect our customers' },

  // ─── SELFIE ───
  'selfie.step': { fr: 'Selfie en direct', en: 'Live selfie' },
  'selfie.title': { fr: 'Photo de votre visage', en: 'Your face photo' },
  'selfie.subtitle': { fr: 'Prenez une photo nette de votre visage. Cette photo sera visible par les entreprises clientes.', en: 'Take a clear photo of your face. Businesses will see this on your profile.' },
  'selfie.instructions.title': { fr: 'Conseils pour une bonne photo', en: 'Tips for a good photo' },
  'selfie.instruction.1': { fr: 'Bonne lumière, visage bien visible', en: 'Good lighting, face clearly visible' },
  'selfie.instruction.2': { fr: 'Pas de lunettes de soleil, pas de chapeau', en: 'No sunglasses, no hat' },
  'selfie.instruction.3': { fr: 'Fond neutre (mur blanc ou clair)', en: 'Neutral background (white or light wall)' },
  'selfie.instruction.4': { fr: 'Regardez droit vers l\'appareil photo', en: 'Look directly at the camera' },
  'selfie.take': { fr: 'Prendre la photo', en: 'Take photo' },
  'selfie.retake': { fr: 'Reprendre', en: 'Retake' },
  'selfie.confirm': { fr: 'Confirmer la photo', en: 'Confirm photo' },
  'selfie.with_id.step': { fr: 'Selfie avec pièce d\'identité', en: 'Selfie with ID' },
  'selfie.with_id.title': { fr: 'Tenez votre pièce d\'identité', en: 'Hold your ID document' },
  'selfie.with_id.subtitle': { fr: 'Prenez une photo de vous tenant votre CNI ou passeport ouvert, bien lisible.', en: 'Take a photo of yourself holding your open, readable national ID or passport.' },
  'selfie.with_id.instruction.1': { fr: 'Tenez la pièce d\'identité à hauteur de votre poitrine', en: 'Hold ID at chest height' },
  'selfie.with_id.instruction.2': { fr: 'Les deux visages (vôtre et sur la pièce) doivent être visibles', en: 'Both faces (yours and on ID) must be visible' },
  'selfie.with_id.instruction.3': { fr: 'Le texte de la pièce doit être lisible', en: 'Text on ID must be readable' },

  // ─── KYC DOCUMENTS ───
  'kyc.title': { fr: 'Documents requis', en: 'Required documents' },
  'kyc.subtitle': { fr: 'Tous les documents doivent être clairs et en cours de validité', en: 'All documents must be clear and currently valid' },
  'kyc.submit': { fr: 'Soumettre pour vérification', en: 'Submit for review' },
  'kyc.submit.disabled': { fr: 'Envoyez tous les documents pour soumettre', en: 'Upload all documents to submit' },
  'kyc.pending.title': { fr: 'Dossier en cours d\'examen', en: 'Application under review' },
  'kyc.pending.subtitle': { fr: 'Notre équipe examine généralement les dossiers sous 24 heures. Vous recevrez une notification dès que votre compte sera validé.', en: 'Our team typically reviews applications within 24 hours. You\'ll be notified when your account is verified.' },
  'kyc.rejected.title': { fr: 'Documents à corriger', en: 'Documents need correction' },
  'kyc.rejected.subtitle': { fr: 'Un ou plusieurs documents ont été refusés. Veuillez les corriger.', en: 'One or more documents were rejected. Please correct them.' },

  // ─── DOCUMENT LABELS ───
  'doc.SELFIE.label': { fr: 'Photo de profil (selfie)', en: 'Profile photo (selfie)' },
  'doc.SELFIE.hint': { fr: 'Photo nette de votre visage — visible par les clients', en: 'Clear face photo — visible to customers' },
  'doc.SELFIE_WITH_ID.label': { fr: 'Selfie avec pièce d\'identité', en: 'Selfie holding ID' },
  'doc.SELFIE_WITH_ID.hint': { fr: 'Votre visage + CNI ou passeport tenu dans la main', en: 'Your face + national ID or passport held in hand' },
  'doc.GOVT_ID_FRONT.label': { fr: 'CNI / Passeport — Recto', en: 'National ID / Passport — Front' },
  'doc.GOVT_ID_FRONT.hint': { fr: 'Carte nationale d\'identité ou passeport, côté recto', en: 'National ID card or passport, front side' },
  'doc.GOVT_ID_BACK.label': { fr: 'CNI — Verso', en: 'National ID — Back' },
  'doc.GOVT_ID_BACK.hint': { fr: 'Côté verso de votre carte nationale d\'identité', en: 'Back side of your national ID card' },
  'doc.DRIVERS_LICENSE.label': { fr: 'Permis de conduire', en: 'Driver\'s license' },
  'doc.DRIVERS_LICENSE.hint': { fr: 'Permis valide pour la catégorie de véhicule utilisée', en: 'Valid license for the vehicle category you use' },
  'doc.VEHICLE_REGISTRATION.label': { fr: 'Carte grise', en: 'Vehicle registration' },
  'doc.VEHICLE_REGISTRATION.hint': { fr: 'Certificat d\'immatriculation du véhicule à votre nom', en: 'Vehicle registration certificate in your name' },
  'doc.VEHICLE_INSURANCE.label': { fr: 'Attestation d\'assurance', en: 'Insurance certificate' },
  'doc.VEHICLE_INSURANCE.hint': { fr: 'Assurance en cours de validité (non expirée)', en: 'Currently valid insurance (not expired)' },
  'doc.VEHICLE_PHOTO_FRONT.label': { fr: 'Photo du véhicule (plaque visible)', en: 'Vehicle photo (plate visible)' },
  'doc.VEHICLE_PHOTO_FRONT.hint': { fr: 'Photo de face montrant clairement la plaque d\'immatriculation', en: 'Front-facing photo clearly showing the license plate' },
  'doc.POLICE_CLEARANCE.label': { fr: 'Casier judiciaire (bulletin n°3)', en: 'Police clearance certificate' },
  'doc.POLICE_CLEARANCE.hint': { fr: 'Extrait de casier judiciaire datant de moins de 3 mois', en: 'Criminal record certificate less than 3 months old' },
  'doc.PROOF_OF_ADDRESS.label': { fr: 'Justificatif de domicile', en: 'Proof of address' },
  'doc.PROOF_OF_ADDRESS.hint': { fr: 'Facture d\'eau, d\'électricité ou téléphone fixe, datant de moins de 3 mois', en: 'Water, electricity, or landline phone bill less than 3 months old' },

  // ─── VEHICLE TYPES ───
  'vehicle.BICYCLE': { fr: 'Vélo', en: 'Bicycle' },
  'vehicle.MOTORCYCLE': { fr: 'Moto', en: 'Motorcycle' },
  'vehicle.TRICYCLE': { fr: 'Tricycle', en: 'Tricycle' },
  'vehicle.CAR': { fr: 'Voiture', en: 'Car' },
  'vehicle.VAN': { fr: 'Camionnette', en: 'Van' },
  'vehicle.TRUCK': { fr: 'Camion', en: 'Truck' },

  // ─── VEHICLE FIELDS ───
  'vehicle.type': { fr: 'Type de véhicule', en: 'Vehicle type' },
  'vehicle.make': { fr: 'Marque', en: 'Make' },
  'vehicle.model': { fr: 'Modèle', en: 'Model' },
  'vehicle.year': { fr: 'Année', en: 'Year' },
  'vehicle.color': { fr: 'Couleur', en: 'Color' },
  'vehicle.plate': { fr: 'Plaque d\'immatriculation', en: 'License plate' },

  // ─── PAYOUT ───
  'payout.provider': { fr: 'Opérateur mobile money', en: 'Mobile money provider' },
  'payout.account': { fr: 'Numéro de paiement', en: 'Payout phone number' },
  'payout.hint': { fr: 'Vos gains seront envoyés à ce numéro après chaque livraison', en: 'Your earnings will be sent to this number after each delivery' },

  // ─── ERRORS ───
  'error.camera': { fr: 'Accès à la caméra refusé. Activez-le dans les paramètres.', en: 'Camera access denied. Enable it in settings.' },
  'error.upload': { fr: 'Échec de l\'envoi. Veuillez réessayer.', en: 'Upload failed. Please try again.' },
  'error.missing_docs': { fr: 'Tous les documents sont obligatoires', en: 'All documents are required' },
  'error.vehicle_type': { fr: 'Sélectionnez votre type de véhicule', en: 'Select your vehicle type' },
  'error.payout': { fr: 'L\'opérateur et le numéro de paiement sont requis', en: 'Payout provider and account are required' },
};

/**
 * Get a translated string
 * @param {string} key - string key
 * @param {string} lang - 'fr' | 'en'
 * @returns {string}
 */
export function t(key, lang = 'fr') {
  const entry = strings[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

/**
 * Get the user's preferred language from their profile
 * Falls back to 'fr' (francophone West Africa default)
 */
export function getLang(user) {
  return user?.language === 'en' ? 'en' : 'fr';
}

export default { t, getLang };
