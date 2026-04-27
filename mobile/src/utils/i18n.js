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
  'common.remove': { fr: 'Supprimer', en: 'Remove' },
  'common.apply': { fr: 'Appliquer', en: 'Apply' },

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

  // ─── ROLE SELECT ───
  'role.welcome': { fr: 'Bienvenue', en: 'Welcome' },
  'role.howUse': { fr: 'Comment utiliserez-vous ArgiDrop aujourd\'hui ?', en: 'How will you use ArgiDrop today?' },
  'role.merchant.title': { fr: 'Je suis Marchand', en: 'I\'m a Merchant' },
  'role.merchant.desc': { fr: 'Envoyez des colis, gérez les livraisons de votre boutique, suivez les commandes en direct.', en: 'Send packages, manage your shop\'s deliveries, track orders live.' },
  'role.driver.title': { fr: 'Je suis Livreur', en: 'I\'m a Driver' },
  'role.driver.desc': { fr: 'Gagnez de l\'argent à votre rythme. Soyez payé chaque jour sur mobile money.', en: 'Earn money on your schedule. Get paid daily to mobile money.' },
  'role.alreadyAccount': { fr: 'Vous avez déjà un compte ?', en: 'Already have an account?' },
  'role.signin': { fr: 'Se connecter', en: 'Sign in' },
  'role.brandSub': { fr: 'Lomé · Afrique de l\'Ouest', en: 'Lomé · West Africa' },

  // ─── LOGIN ───
  'login.title': { fr: 'Se connecter', en: 'Sign in' },
  'login.subtitle': { fr: 'Bon retour', en: 'Welcome back' },
  'login.email': { fr: 'Adresse e-mail', en: 'Email address' },
  'login.password': { fr: 'Mot de passe', en: 'Password' },
  'login.submit': { fr: 'Se connecter', en: 'Sign in' },
  'login.newDriver': { fr: 'Nouveau ?', en: 'New here?' },
  'login.registerHere': { fr: 'Inscrivez-vous ici', en: 'Register here' },
  'login.requiredFields': { fr: 'Champs requis', en: 'Required fields' },
  'login.requiredFieldsMsg': { fr: 'Veuillez saisir votre e-mail et votre mot de passe', en: 'Please enter your email and password' },
  'login.failed': { fr: 'Échec de la connexion', en: 'Login failed' },
  'login.invalidCreds': { fr: 'Identifiants invalides', en: 'Invalid credentials' },

  // ─── REGISTER ───
  'register.merchantSub': { fr: 'Inscription marchand', en: 'Merchant registration' },
  'register.driverSub': { fr: 'Inscription livreur', en: 'Driver registration' },
  'register.title': { fr: 'Créer un compte', en: 'Create account' },
  'register.merchantSubtitle': { fr: 'Rejoignez les milliers de marchands qui livrent en Afrique de l\'Ouest', en: 'Join thousands of merchants moving goods across West Africa' },
  'register.driverSubtitle': { fr: 'Rejoignez le réseau de livreurs ArgiDrop', en: 'Join the ArgiDrop driver network' },
  'register.businessName': { fr: 'Nom de l\'entreprise *', en: 'Business name *' },
  'register.firstName': { fr: 'Prénom *', en: 'First name *' },
  'register.lastName': { fr: 'Nom', en: 'Last name' },
  'register.email': { fr: 'Adresse e-mail *', en: 'Email address *' },
  'register.phone': { fr: 'Numéro de téléphone', en: 'Phone number' },
  'register.password': { fr: 'Mot de passe *', en: 'Password *' },
  'register.passwordPlaceholder': { fr: 'Au moins 8 caractères', en: 'At least 8 characters' },
  'register.hideReferral': { fr: 'Masquer le code de parrainage', en: 'Hide referral code' },
  'register.haveReferral': { fr: 'Vous avez un code de parrainage ?', en: 'Have a referral code?' },
  'register.referral': { fr: 'Code de parrainage', en: 'Referral code' },
  'register.submitMerchant': { fr: 'Créer le compte marchand', en: 'Create merchant account' },
  'register.submitDriver': { fr: 'Créer le compte livreur', en: 'Create driver account' },
  'register.alreadyAccount': { fr: 'Vous avez déjà un compte ?', en: 'Already have an account?' },
  'register.signin': { fr: 'Se connecter', en: 'Sign in' },
  'register.requiredFields': { fr: 'Champs requis', en: 'Required fields' },
  'register.requiredMsg': { fr: 'Le prénom, l\'e-mail et le mot de passe sont requis', en: 'First name, email, and password are required' },
  'register.businessRequired': { fr: 'Le nom de l\'entreprise est requis', en: 'Business name is required' },
  'register.passwordTooShort': { fr: 'Mot de passe trop court', en: 'Password too short' },
  'register.passwordTooShortMsg': { fr: 'Le mot de passe doit comporter au moins 8 caractères', en: 'Password must be at least 8 characters' },
  'register.failed': { fr: 'Échec de l\'inscription', en: 'Registration failed' },
  'register.tryAgain': { fr: 'Veuillez réessayer', en: 'Please try again' },

  // ─── DRIVER HOME ───
  'driverHome.hello': { fr: 'Bonjour, {name}', en: 'Hello, {name}' },
  'driverHome.online': { fr: 'En ligne', en: 'Online' },
  'driverHome.offline': { fr: 'Hors ligne', en: 'Offline' },
  'driverHome.activeLabel': { fr: 'LIVRAISON EN COURS', en: 'ACTIVE DELIVERY' },
  'driverHome.continue': { fr: 'Continuer →', en: 'Continue →' },
  'driverHome.readyCashout': { fr: 'PRÊT À ENCAISSER', en: 'READY TO CASH OUT' },
  'driverHome.xofPending': { fr: 'XOF en attente', en: 'XOF pending' },
  'driverHome.endShift': { fr: 'Fin de service', en: 'End shift' },
  'driverHome.deliveriesLabel': { fr: 'LIVRAISONS', en: 'DELIVERIES' },
  'driverHome.allTime': { fr: 'depuis le début', en: 'all time' },
  'driverHome.availableNear': { fr: 'Disponibles près de vous', en: 'Available near you' },
  'driverHome.jobOne': { fr: 'job', en: 'job' },
  'driverHome.jobMany': { fr: 'jobs', en: 'jobs' },
  'driverHome.goOnline': { fr: 'Passez en ligne pour recevoir des jobs', en: 'Go online to receive jobs' },
  'driverHome.goOnlineDesc': { fr: 'Activez l\'interrupteur ci-dessus pour voir les livraisons disponibles.', en: 'Turn on the switch above to see available deliveries.' },
  'driverHome.noJobs': { fr: 'Aucun job à proximité pour le moment', en: 'No jobs nearby right now' },
  'driverHome.noJobsDesc': { fr: 'Nous vous notifierons dès qu\'un job apparaît.', en: 'We\'ll notify you the moment one appears.' },
  'driverHome.setupPayout': { fr: 'Configurez d\'abord le paiement', en: 'Set up payout first' },
  'driverHome.setupPin': { fr: 'Configurer le PIN', en: 'Set up PIN' },
  'driverHome.cantOnline': { fr: 'Impossible de passer en ligne', en: 'Can\'t go online' },
  'driverHome.couldNotStart': { fr: 'Impossible de démarrer le service', en: 'Could not start shift' },

  // ─── MERCHANT HOME ───
  'merchantHome.hello': { fr: 'Bonjour, {name}', en: 'Hello, {name}' },
  'merchantHome.thereName': { fr: 'cher partenaire', en: 'there' },
  'merchantHome.yourBusiness': { fr: 'Votre entreprise', en: 'Your business' },
  'merchantHome.send': { fr: 'Envoyer une livraison', en: 'Send a delivery' },
  'merchantHome.sendSub': { fr: 'Trouvez un livreur en quelques minutes', en: 'Get a driver in minutes' },
  'merchantHome.activeDeliveries': { fr: 'Livraisons en cours', en: 'Active deliveries' },
  'merchantHome.noActive': { fr: 'Aucune livraison en cours', en: 'No active deliveries' },
  'merchantHome.noActiveSub': { fr: 'Touchez « Envoyer une livraison » pour commencer.', en: 'Tap "Send a delivery" above to get started.' },
  'merchantHome.pickup': { fr: 'Ramassage', en: 'Pickup' },
  'merchantHome.dropoff': { fr: 'Livraison', en: 'Drop-off' },

  // ─── JOB STATUS ───
  'status.AWAITING_PAYMENT': { fr: 'En attente de paiement', en: 'Awaiting payment' },
  'status.POSTED': { fr: 'Recherche d\'un livreur', en: 'Looking for driver' },
  'status.MATCHED': { fr: 'Livreur assigné', en: 'Driver assigned' },
  'status.IN_TRANSIT': { fr: 'En route', en: 'On the way' },
  'status.DELIVERED': { fr: 'Livré', en: 'Delivered' },
  'status.COMPLETED': { fr: 'Terminé', en: 'Completed' },
  'status.CANCELLED': { fr: 'Annulé', en: 'Cancelled' },
  'status.DISPUTED': { fr: 'En litige', en: 'Disputed' },

  // ─── NEW DELIVERY ───
  'newDelivery.title': { fr: 'Nouvelle livraison', en: 'New delivery' },
  'newDelivery.pickup': { fr: 'Ramassage', en: 'Pickup' },
  'newDelivery.dropoff': { fr: 'Livraison', en: 'Drop-off' },
  'newDelivery.package': { fr: 'Colis', en: 'Package' },
  'newDelivery.urgency': { fr: 'Urgence', en: 'Urgency' },
  'newDelivery.choosePickup': { fr: 'Choisir le point de ramassage sur la carte', en: 'Choose pickup on map' },
  'newDelivery.chooseDropoff': { fr: 'Choisir le point de livraison sur la carte', en: 'Choose drop-off on map' },
  'newDelivery.contactName': { fr: 'Nom du contact (optionnel)', en: 'Contact name (optional)' },
  'newDelivery.contactNamePh': { fr: 'ex. Yawa', en: 'e.g. Yawa' },
  'newDelivery.contactPhone': { fr: 'Téléphone du contact (optionnel)', en: 'Contact phone (optional)' },
  'newDelivery.pickupNotes': { fr: 'Notes pour le ramassage (optionnel)', en: 'Pickup notes (optional)' },
  'newDelivery.pickupNotesPh': { fr: 'Code portail, étage, instructions', en: 'Gate code, floor, instructions' },
  'newDelivery.recipientName': { fr: 'Nom du destinataire *', en: 'Recipient name *' },
  'newDelivery.recipientNamePh': { fr: 'Qui reçoit le colis ?', en: 'Who receives the package?' },
  'newDelivery.recipientPhone': { fr: 'Téléphone du destinataire *', en: 'Recipient phone *' },
  'newDelivery.dropNotes': { fr: 'Notes pour la livraison (optionnel)', en: 'Drop-off notes (optional)' },
  'newDelivery.dropNotesPh': { fr: 'Numéro d\'appartement, point de repère…', en: 'Apartment number, landmark…' },
  'newDelivery.type': { fr: 'Type', en: 'Type' },
  'newDelivery.weight': { fr: 'Poids (kg, optionnel)', en: 'Weight (kg, optional)' },
  'newDelivery.weightPh': { fr: 'ex. 2,5', en: 'e.g. 2.5' },
  'newDelivery.fragile': { fr: 'Colis fragile', en: 'Fragile package' },
  'newDelivery.description': { fr: 'Description (optionnel)', en: 'Description (optional)' },
  'newDelivery.descriptionPh': { fr: 'Que contient le colis ?', en: 'What\'s inside?' },
  'newDelivery.estimated': { fr: 'Prix estimé', en: 'Estimated price' },
  'newDelivery.priceLabel': { fr: 'Prix', en: 'Price' },
  'newDelivery.quoteOnce': { fr: 'Obtenez un devis une fois les deux adresses définies', en: 'Get a quote once both locations are set' },
  'newDelivery.couldNotQuote': { fr: 'Impossible d\'obtenir un devis', en: 'Could not get a price quote' },
  'newDelivery.getQuote': { fr: 'Obtenir un devis', en: 'Get price quote' },
  'newDelivery.continuePay': { fr: 'Continuer vers le paiement', en: 'Continue to payment' },
  'newDelivery.promoCode': { fr: 'Code promo (optionnel)', en: 'Promo code (optional)' },
  'newDelivery.promoFirst': { fr: 'Obtenez un devis d\'abord', en: 'Get a price quote first' },
  'newDelivery.invalidPromo': { fr: 'Code promo invalide', en: 'Invalid promo code' },
  'newDelivery.youPay': { fr: 'Vous payez', en: 'You pay' },
  'newDelivery.promo': { fr: 'Promo', en: 'Promo' },
  // Package types
  'pkg.DOCS': { fr: 'Documents', en: 'Documents' },
  'pkg.FOOD': { fr: 'Nourriture', en: 'Food' },
  'pkg.SMALL_BOX': { fr: 'Petit colis', en: 'Small box' },
  'pkg.LARGE_BOX': { fr: 'Grand colis', en: 'Large box' },
  'pkg.OTHER': { fr: 'Autre', en: 'Other' },
  // Urgencies
  'urgency.STANDARD': { fr: 'Standard', en: 'Standard' },
  'urgency.STANDARD.sub': { fr: '~30–60 min', en: '~30–60 min' },
  'urgency.EXPRESS': { fr: 'Express', en: 'Express' },
  'urgency.EXPRESS.sub': { fr: 'Envoi prioritaire', en: 'Priority dispatch' },

  // ─── LANGUAGE SWITCHER ───
  'lang.switch': { fr: 'Langue', en: 'Language' },
  'lang.fr': { fr: 'Français', en: 'French' },
  'lang.en': { fr: 'Anglais', en: 'English' },
  'lang.switchTo': { fr: 'Passer en {lang}', en: 'Switch to {lang}' },

  // ─── BOTTOM TAB BAR LABELS ───
  'tab.merchant.home': { fr: 'Accueil', en: 'Home' },
  'tab.merchant.history': { fr: 'Historique', en: 'History' },
  'tab.merchant.new': { fr: 'Envoyer', en: 'New' },
  'tab.merchant.more': { fr: 'Plus', en: 'More' },
  'tab.driver.home': { fr: 'Accueil', en: 'Home' },
  'tab.driver.earnings': { fr: 'Gains', en: 'Earnings' },
  'tab.driver.notifications': { fr: 'Notifications', en: 'Notifications' },
  'tab.driver.profile': { fr: 'Profil', en: 'Profile' },
};

/**
 * Get a translated string. Supports {name} interpolation.
 * @param {string} key - string key
 * @param {string} lang - 'fr' | 'en'
 * @param {object} [vars] - optional interpolation map { name: 'Kodjo' }
 * @returns {string}
 */
export function t(key, lang = 'fr', vars) {
  const entry = strings[key];
  if (!entry) return key;
  let str = entry[lang] || entry.en || key;
  if (vars) {
    Object.keys(vars).forEach(k => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
    });
  }
  return str;
}

/**
 * Get the user's preferred language from their profile.
 * Falls back to 'fr' (francophone West Africa default).
 */
export function getLang(user) {
  return user?.language === 'en' ? 'en' : 'fr';
}

export default { t, getLang };
