import type { AlerteType } from '../types/strapi';

export interface AlertTypeConfig {
  label: string;
  emoji: string;
  classes: string;
}

export const ALERT_TYPE_CONFIG: Record<AlerteType, AlertTypeConfig> = {
  'travaux': {
    label: 'Travaux',
    emoji: '🚧',
    classes: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  'coupure-eau': {
    label: 'Coupure d\'eau',
    emoji: '💧',
    classes: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  'coupure-electricite': {
    label: 'Coupure d\'electricite',
    emoji: '⚡',
    classes: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  'deviation': {
    label: 'Deviation',
    emoji: '↩️',
    classes: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  'intemperie': {
    label: 'Intemperie',
    emoji: '🌧️',
    classes: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  'autre': {
    label: 'Autre',
    emoji: '📋',
    classes: 'bg-gray-50 text-gray-800 border-gray-200',
  },
};

export const ALERT_TYPE_DEFAULT: AlertTypeConfig = {
  label: 'Alerte',
  emoji: '',
  classes: 'bg-gray-50 text-gray-800 border-gray-200',
};

export function getAlertTypeConfig(type?: AlerteType): AlertTypeConfig {
  if (!type) return ALERT_TYPE_DEFAULT;
  return ALERT_TYPE_CONFIG[type] || ALERT_TYPE_DEFAULT;
}
