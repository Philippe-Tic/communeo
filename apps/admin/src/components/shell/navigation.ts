/**
 * Navigation de l'admin, dans l'ordre du handoff (6.1). Chaque entrée est une route du routeur.
 */
import {
  Accessibility,
  Bell,
  CalendarDays,
  CloudUpload,
  Database,
  Files,
  FileText,
  HandHeart,
  House,
  Image,
  Landmark,
  LayoutGrid,
  List,
  ListChecks,
  Mail,
  Menu as MenuIcon,
  Newspaper,
  Palette,
  Recycle,
  Scale,
  Send,
  Share2,
  SlidersHorizontal,
  Users,
  UsersRound,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import type { MunicipalityRole } from '@/lib/session';

export interface NavLink {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Réservé aux administrateurs de la commune */
  adminOnly?: boolean;
  /** Compteur affiché à droite (ex. messages non lus) */
  counter?: 'unreadMessages';
  /** Entrée de rubrique affichée en retrait, sans icône, quand la barre est dépliée (maquette 6.1) */
  indented?: boolean;
}

export interface NavGroup {
  /** Rubrique en capitales ; absente pour les entrées isolées */
  heading?: string;
  links: NavLink[];
}

export const MY_SITE: NavLink = { label: 'Mon site', to: '/mon-site', icon: SlidersHorizontal };

export const MY_SITE_LINKS: NavLink[] = [
  { label: 'Apparence', to: '/mon-site/apparence', icon: Palette, adminOnly: true },
  { label: "Page d'accueil", to: '/mon-site/accueil', icon: House },
  { label: 'Menu du site', to: '/mon-site/menu', icon: MenuIcon },
  { label: 'Informations de la commune', to: '/mon-site/informations', icon: Landmark },
  { label: 'Mentions légales et RGPD', to: '/mon-site/legal', icon: Scale, adminOnly: true },
  { label: 'Accessibilité', to: '/mon-site/accessibilite', icon: Accessibility },
  { label: 'Réseaux sociaux', to: '/mon-site/reseaux', icon: Share2 },
  { label: 'Démarches', to: '/mon-site/demarches', icon: List },
  { label: 'Open data', to: '/mon-site/open-data', icon: Database },
];

export const NAVIGATION: NavGroup[] = [
  { links: [{ label: 'Tableau de bord', to: '/', icon: LayoutGrid }] },
  {
    heading: 'Contenus',
    links: [
      { label: 'Pages', to: '/pages', icon: FileText, indented: true },
      { label: 'Actualités', to: '/actualites', icon: Newspaper, indented: true },
      { label: 'Agenda', to: '/agenda', icon: CalendarDays, indented: true },
      { label: 'Documents officiels', to: '/documents', icon: Files, indented: true },
      { label: 'Équipe municipale', to: '/equipe', icon: UsersRound, indented: true },
      { label: 'Associations', to: '/associations', icon: HandHeart, indented: true },
    ],
  },
  {
    heading: 'Vie pratique',
    links: [
      { label: 'Alertes et perturbations', to: '/alertes', icon: Bell, indented: true },
      { label: 'Collecte des déchets', to: '/dechets', icon: Recycle, indented: true },
      { label: 'Cantine', to: '/cantine', icon: Utensils, indented: true },
    ],
  },
  {
    heading: 'Habitants',
    links: [
      { label: 'Messages', to: '/messages', icon: Mail, counter: 'unreadMessages' },
      { label: 'Newsletter', to: '/newsletter', icon: Send },
    ],
  },
  { links: [{ label: 'Médiathèque', to: '/mediatheque', icon: Image }] },
];

/** Après « Mon site » */
export const NAVIGATION_END: NavLink[] = [
  { label: 'Mise en ligne', to: '/mise-en-ligne', icon: CloudUpload },
  { label: 'Utilisateurs', to: '/utilisateurs', icon: Users, adminOnly: true },
  { label: 'Conformité', to: '/conformite', icon: ListChecks },
];

export const canSee = (link: NavLink, role: MunicipalityRole | undefined) => !link.adminOnly || role === 'admin' || role === 'super_admin';
