export interface ContentTemplate {
  id: string
  title: string
  description: string
  icon: string
  content: string
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: '2-columns',
    title: '2 colonnes',
    description: 'Mise en page à deux colonnes',
    icon: '▐ ▌',
    content: `<div class="content-columns" data-cols="2"><div class="content-column"><p>Contenu de la première colonne...</p></div><div class="content-column"><p>Contenu de la deuxième colonne...</p></div></div>`,
  },
  {
    id: '3-columns',
    title: '3 colonnes',
    description: 'Mise en page à trois colonnes',
    icon: '▐▐▌',
    content: `<div class="content-columns" data-cols="3"><div class="content-column"><p>Colonne 1</p></div><div class="content-column"><p>Colonne 2</p></div><div class="content-column"><p>Colonne 3</p></div></div>`,
  },
  {
    id: 'card-text',
    title: 'Carte + texte',
    description: 'Image à gauche, texte à droite',
    icon: '🖼️',
    content: `<div class="content-columns" data-cols="2"><div class="content-column"><p><em>Insérez une image ici</em></p></div><div class="content-column"><h3>Titre</h3><p>Description du contenu...</p></div></div>`,
  },
  {
    id: 'info-section',
    title: 'Section info',
    description: 'Titre, description et détails',
    icon: 'ℹ️',
    content: `<h2>Titre de la section</h2><p>Description introductive de cette section. Présentez le contexte ici.</p><div class="content-columns" data-cols="2"><div class="content-column"><h3>Détail 1</h3><p>Informations complémentaires...</p></div><div class="content-column"><h3>Détail 2</h3><p>Informations complémentaires...</p></div></div>`,
  },
  {
    id: 'hours-table',
    title: 'Tableau horaires',
    description: 'Horaires d\'ouverture',
    icon: '🕐',
    content: `<h3>Horaires d'ouverture</h3><table><thead><tr><th>Jour</th><th>Matin</th><th>Après-midi</th></tr></thead><tbody><tr><td>Lundi</td><td>8h30 - 12h00</td><td>13h30 - 17h00</td></tr><tr><td>Mardi</td><td>8h30 - 12h00</td><td>13h30 - 17h00</td></tr><tr><td>Mercredi</td><td>8h30 - 12h00</td><td>13h30 - 17h00</td></tr><tr><td>Jeudi</td><td>8h30 - 12h00</td><td>13h30 - 17h00</td></tr><tr><td>Vendredi</td><td>8h30 - 12h00</td><td>13h30 - 17h00</td></tr></tbody></table>`,
  },
  {
    id: 'key-figures',
    title: 'Chiffres clés',
    description: 'Mise en avant de statistiques',
    icon: '📊',
    content: `<div class="content-columns" data-cols="3"><div class="content-column"><p style="text-align: center"><strong style="font-size: 2em">1 234</strong></p><p style="text-align: center">Habitants</p></div><div class="content-column"><p style="text-align: center"><strong style="font-size: 2em">15</strong></p><p style="text-align: center">Associations</p></div><div class="content-column"><p style="text-align: center"><strong style="font-size: 2em">3</strong></p><p style="text-align: center">Écoles</p></div></div>`,
  },
]
