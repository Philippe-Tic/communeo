import type { SiteConfigFormData } from './types'

export function validateGeneral(formData: SiteConfigFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!formData.name.trim()) {
    errors.name = 'Le nom du site est requis'
  } else if (formData.name.length > 100) {
    errors.name = 'Maximum 100 caractères'
  }
  if (!formData.contact_mail.trim()) {
    errors.contact_mail = 'L\'email de contact est requis'
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.contact_mail)) {
    errors.contact_mail = 'Format d\'email invalide'
  }
  if (formData.colors.trim()) {
    try { JSON.parse(formData.colors) } catch { errors.colors = 'Format JSON invalide' }
  }
  return errors
}

export function validateLegal(formData: SiteConfigFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!formData.siret.trim()) {
    errors.siret = 'Le SIRET est requis'
  } else if (!/^\d{14}$/.test(formData.siret.replace(/\s/g, ''))) {
    errors.siret = 'Le SIRET doit contenir 14 chiffres'
  }
  if (!formData.publication_director.trim()) {
    errors.publication_director = 'Le directeur de publication est requis'
  }
  if (!formData.hebergeur_name.trim()) {
    errors.hebergeur_name = 'Le nom de l\'hébergeur est requis'
  }
  return errors
}

export function validateRgpd(formData: SiteConfigFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!formData.dpo_name.trim()) {
    errors.dpo_name = 'Le nom du DPO est requis'
  }
  if (!formData.dpo_email.trim()) {
    errors.dpo_email = 'L\'email du DPO est requis'
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.dpo_email)) {
    errors.dpo_email = 'Format d\'email invalide'
  }
  if (!formData.rgpd_policy || formData.rgpd_policy.replace(/<[^>]*>/g, '').trim().length < 50) {
    errors.rgpd_policy = 'La politique de confidentialité est requise (min. 50 caractères)'
  }
  return errors
}

export function validateAccessibility(formData: SiteConfigFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!formData.accessibility_level) {
    errors.accessibility_level = 'Le niveau d\'accessibilité est requis'
  }
  return errors
}

export function validateInfo(formData: SiteConfigFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (formData.opening_hours.trim()) {
    try { JSON.parse(formData.opening_hours) } catch { errors.opening_hours = 'Format JSON invalide' }
  }
  if (formData.population && (isNaN(Number(formData.population)) || Number(formData.population) < 0)) {
    errors.population = 'La population doit être un nombre positif'
  }
  if (formData.latitude) {
    const lat = Number(formData.latitude)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = 'La latitude doit être entre -90 et 90'
    }
  }
  if (formData.longitude) {
    const lng = Number(formData.longitude)
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = 'La longitude doit être entre -180 et 180'
    }
  }
  return errors
}

export function validateOpenData(): Record<string, string> { return {} }
export function validateDemarches(formData: SiteConfigFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (formData.comarquage_enabled && !formData.code_insee?.match(/^[0-9]{5}$/)) {
    errors.code_insee = 'Le code INSEE doit contenir 5 chiffres'
  }
  return errors
}
export function validateHomepage(): Record<string, string> { return {} }
export function validateNavigation(): Record<string, string> { return {} }
export function validateSocial(): Record<string, string> { return {} }
