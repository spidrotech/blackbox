/* ─── Landing page ───────────────────────────────────────────── */

export const LANDING = {
  hero: {
    badge: 'Logiciel de gestion pour le bâtiment',
    title: 'Pilotez votre activité BTP',
    titleAccent: 'en toute simplicité',
    subtitle:
      'Devis, factures, chantiers, clients — Gestar centralise tout dans un seul outil pensé pour les artisans et PME du bâtiment.',
    cta: 'Créer mon compte gratuit',
    ctaSecondary: 'Découvrir les fonctionnalités',
    loginCta: 'Accéder au tableau de bord',
  },
  nav: [
    { id: 'features', label: 'Fonctionnalités', href: '#features' },
    { id: 'pricing', label: 'Tarifs', href: '/pricing' },
    { id: 'contact', label: 'Contact', href: '/contact' },
    { id: 'about', label: 'À propos', href: '/about' },
  ],
  features: {
    badge: 'Fonctionnalités',
    title: 'Tout ce qu\u2019il faut pour gérer votre entreprise',
    subtitle: 'Chaque fonctionnalité a été conçue avec des professionnels du bâtiment.',
    items: [
      {
        title: 'Devis professionnels',
        description: 'Créez des devis détaillés avec bibliothèque de prix, lots et sous-totaux. Envoyez-les en un clic et suivez leur statut.',
        icon: 'document',
      },
      {
        title: 'Facturation automatisée',
        description: 'Transformez vos devis en factures, générez des situations, des acomptes et des avoirs conformes à la norme Factur-X.',
        icon: 'invoice',
      },
      {
        title: 'Suivi de chantiers',
        description: 'Visualisez vos chantiers sur la carte de France, gérez les plannings et suivez l\u2019avancement en temps réel.',
        icon: 'map',
      },
      {
        title: 'Gestion clients',
        description: 'Centralisez fiches clients, historique des échanges, documents et adresses de chantier dans un espace unique.',
        icon: 'clients',
      },
      {
        title: 'Rapports financiers',
        description: 'Suivez votre chiffre d\u2019affaires, taux de conversion devis, TVA collectée grâce à des graphiques clairs et export CSV.',
        icon: 'chart',
      },
      {
        title: 'Bibliothèque de prix',
        description: 'Constituez votre catalogue d\u2019ouvrages et de fournitures pour chiffrer vos devis en quelques minutes.',
        icon: 'library',
      },
    ],
  },
  stats: [
    { value: '2 500+', label: 'Artisans utilisateurs' },
    { value: '15 000+', label: 'Devis créés par mois' },
    { value: '99,9 %', label: 'Disponibilité serveur' },
    { value: '4,8/5', label: 'Note de satisfaction' },
  ],
  testimonials: [
    {
      quote: 'Depuis que j\u2019utilise Gestar, je gagne 2 heures par jour sur la gestion administrative. Mes devis sont envoyés en 5 minutes.',
      author: 'Marc D.',
      role: 'Artisan plombier — Lyon',
    },
    {
      quote: 'Le suivi des chantiers sur la carte est génial. On voit en un coup d\u2019œil où en sont tous nos projets.',
      author: 'Sophie L.',
      role: 'Gérante — Travaux & Rénovation',
    },
    {
      quote: 'La facturation Factur-X nous a permis d\u2019être conformes du premier coup pour les marchés publics.',
      author: 'Thomas R.',
      role: 'Conducteur de travaux — Bordeaux',
    },
  ],
  cta: {
    title: 'Prêt à simplifier votre gestion ?',
    subtitle: 'Essayez Gestar gratuitement pendant 14 jours, sans engagement et sans carte bancaire.',
    button: 'Démarrer l\u2019essai gratuit',
  },
  pricing: {
    title: 'Un tarif simple, transparent',
    subtitle: 'Découvrez un aperçu de nos offres puis consultez la page dédiée pour le détail complet.',
    plans: [
      {
        name: 'Starter',
        price: '29 €',
        period: '/mois',
        features: ['Jusqu\u2019à 5 projets', 'Facturation basique', 'Support email'],
        popular: false,
      },
      {
        name: 'Pro',
        price: '79 €',
        period: '/mois',
        features: ['Projets illimités', 'Facturation avancée', 'Support prioritaire', 'Rapports détaillés'],
        popular: true,
      },
      {
        name: 'Enterprise',
        price: '199 €',
        period: '/mois',
        features: ['Tout inclus', 'API personnalisée', 'Support 24/7', 'Formation équipe'],
        popular: false,
      },
    ],
    detail: 'Consulter la page tarifs',
  },
} as const;

/* ─── About page ──────────────────────────────────────────────── */

export const ABOUT = {
  title: 'À propos de Gestar',
  subtitle: 'Le logiciel de gestion pensé par et pour les professionnels du bâtiment.',
  mission: {
    title: 'Notre mission',
    text: 'Gestar est né d\u2019un constat simple : les artisans et PME du BTP perdent un temps considérable sur la gestion administrative alors qu\u2019ils devraient se concentrer sur leur cœur de métier. Notre mission est de leur offrir un outil puissant, intuitif et 100 % adapté à leur réalité quotidienne.',
  },
  values: [
    {
      title: 'Simplicité',
      text: 'Un outil que l\u2019on prend en main en quelques minutes, sans formation.',
    },
    {
      title: 'Fiabilité',
      text: 'Des documents conformes, des calculs exacts et des données hébergées en France.',
    },
    {
      title: 'Proximité',
      text: 'Un support réactif qui comprend votre métier et parle votre langue.',
    },
    {
      title: 'Innovation',
      text: 'Des fonctionnalités qui évoluent en permanence grâce aux retours terrain.',
    },
  ],
  team: {
    title: 'L\u2019équipe',
    text: 'Une équipe passionnée basée en France, composée de développeurs, designers et experts du bâtiment qui travaillent chaque jour pour améliorer votre quotidien.',
  },
  cta: 'Essayer Gestar gratuitement',
} as const;

/* ─── CGU ──────────────────────────────────────────────────────── */

export const CGU = {
  title: 'Conditions Générales d\u2019Utilisation',
  lastUpdated: '1er mars 2026',
  sections: [
    {
      title: '1. Objet',
      content:
        'Les présentes conditions générales d\u2019utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions dans lesquelles la société Gestar SAS (ci-après « Gestar ») met à disposition ses services de gestion en ligne pour les professionnels du bâtiment (ci-après « le Service »).',
    },
    {
      title: '2. Acceptation des CGU',
      content:
        'L\u2019utilisation du Service implique l\u2019acceptation pleine et entière des présentes CGU. Si vous n\u2019acceptez pas ces conditions, veuillez ne pas utiliser le Service.',
    },
    {
      title: '3. Inscription et comptes',
      content:
        'Pour accéder au Service, l\u2019utilisateur doit créer un compte en fournissant des informations exactes et à jour. L\u2019utilisateur est responsable de la confidentialité de ses identifiants et de toute activité effectuée depuis son compte.',
    },
    {
      title: '4. Description du Service',
      content:
        'Gestar propose un logiciel en mode SaaS (Software as a Service) permettant la gestion de devis, factures, chantiers, clients et rapports financiers. Le Service est accessible via un navigateur web compatible.',
    },
    {
      title: '5. Obligations de l\u2019utilisateur',
      content:
        'L\u2019utilisateur s\u2019engage à utiliser le Service conformément à sa destination, à ne pas porter atteinte à la sécurité du système, à respecter la législation en vigueur et à ne pas transmettre de contenus illicites.',
    },
    {
      title: '6. Propriété intellectuelle',
      content:
        'Le Service et l\u2019ensemble de ses composants (code, design, marque, documentation) sont la propriété exclusive de Gestar SAS. Toute reproduction ou utilisation non autorisée est interdite.',
    },
    {
      title: '7. Données personnelles',
      content:
        'Le traitement des données personnelles est détaillé dans notre Politique de Confidentialité. L\u2019utilisateur dispose d\u2019un droit d\u2019accès, de rectification et de suppression de ses données conformément au RGPD.',
    },
    {
      title: '8. Responsabilité',
      content:
        'Gestar s\u2019efforce d\u2019assurer la disponibilité et la sécurité du Service mais ne saurait être tenu responsable des interruptions, pertes de données ou dommages indirects résultant de l\u2019utilisation du Service.',
    },
    {
      title: '9. Résiliation',
      content:
        'L\u2019utilisateur peut résilier son compte à tout moment depuis les paramètres de son espace. Gestar se réserve le droit de suspendre ou résilier un compte en cas de violation des présentes CGU.',
    },
    {
      title: '10. Droit applicable',
      content:
        'Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation ou leur exécution relève des tribunaux compétents de Paris.',
    },
  ],
} as const;

/* ─── Politique de confidentialité ────────────────────────────── */

export const PRIVACY = {
  title: 'Politique de Confidentialité',
  lastUpdated: '1er mars 2026',
  intro:
    'Gestar SAS accorde une importance particulière à la protection des données personnelles de ses utilisateurs. La présente politique vise à vous informer sur la manière dont nous collectons, utilisons et protégeons vos données.',
  sections: [
    {
      title: '1. Responsable du traitement',
      content:
        'Le responsable du traitement est la société Gestar SAS, dont le siège social est situé en France. Pour toute question, vous pouvez nous contacter à l\u2019adresse : contact@gestar.fr.',
    },
    {
      title: '2. Données collectées',
      content:
        'Nous collectons les données suivantes : nom, prénom, adresse email, numéro de téléphone, informations de l\u2019entreprise (SIRET, adresse, etc.), données de facturation et d\u2019utilisation du Service.',
    },
    {
      title: '3. Finalités du traitement',
      content:
        'Vos données sont traitées pour : la gestion de votre compte, la fourniture du Service, l\u2019amélioration de nos fonctionnalités, le support client et le respect de nos obligations légales (facturation, fiscalité).',
    },
    {
      title: '4. Base légale',
      content:
        'Le traitement de vos données repose sur : l\u2019exécution du contrat (fourniture du Service), votre consentement (newsletter), nos intérêts légitimes (amélioration du Service) et nos obligations légales.',
    },
    {
      title: '5. Durée de conservation',
      content:
        'Vos données sont conservées pendant la durée de votre abonnement et jusqu\u2019à 3 ans après la dernière activité sur votre compte. Les documents comptables sont conservés 10 ans conformément à la législation française.',
    },
    {
      title: '6. Hébergement et sécurité',
      content:
        'Vos données sont hébergées en France chez des prestataires certifiés. Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles (chiffrement, contrôle d\u2019accès, sauvegardes) pour protéger vos données.',
    },
    {
      title: '7. Vos droits',
      content:
        'Conformément au RGPD, vous disposez des droits suivants : accès, rectification, effacement, portabilité, limitation et opposition au traitement de vos données. Pour exercer vos droits, contactez-nous à contact@gestar.fr.',
    },
    {
      title: '8. Cookies',
      content:
        'Gestar utilise des cookies strictement nécessaires au fonctionnement du Service (authentification, préférences). Aucun cookie publicitaire ou de tracking tiers n\u2019est utilisé.',
    },
    {
      title: '9. Modifications',
      content:
        'Nous nous réservons le droit de modifier cette politique. Toute modification sera notifiée via le Service et prendra effet après publication.',
    },
  ],
} as const;

/* ─── Mentions légales ────────────────────────────────────────── */

export const LEGAL = {
  title: 'Mentions Légales',
  lastUpdated: '1er mars 2026',
  sections: [
    {
      title: 'Éditeur du site',
      items: [
        { label: 'Raison sociale', value: 'Gestar SAS' },
        { label: 'Forme juridique', value: 'Société par Actions Simplifiée (SAS)' },
        { label: 'Siège social', value: 'France' },
        { label: 'Email', value: 'contact@gestar.fr' },
        { label: 'Numéro SIRET', value: 'En cours d\u2019immatriculation' },
        { label: 'TVA intracommunautaire', value: 'En cours d\u2019attribution' },
      ],
    },
    {
      title: 'Directeur de la publication',
      items: [{ label: '', value: 'Le représentant légal de Gestar SAS' }],
    },
    {
      title: 'Hébergement',
      items: [
        { label: 'Hébergeur', value: 'Serveurs situés en France' },
        { label: 'Infrastructure', value: 'Hébergement cloud sécurisé avec sauvegardes quotidiennes' },
      ],
    },
    {
      title: 'Propriété intellectuelle',
      items: [
        {
          label: '',
          value:
            'L\u2019ensemble du contenu du site (textes, images, logo, logiciel) est protégé par le droit de la propriété intellectuelle. Toute reproduction est interdite sans autorisation préalable.',
        },
      ],
    },
    {
      title: 'Protection des données',
      items: [
        {
          label: '',
          value:
            'Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d\u2019un droit d\u2019accès, de rectification et de suppression de vos données. Consultez notre Politique de Confidentialité pour en savoir plus.',
        },
      ],
    },
  ],
} as const;
