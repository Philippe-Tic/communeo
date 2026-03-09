export interface DilaMenuNode {
  id: string
  title: string
  type: 'theme' | 'sousTheme' | 'dossier'
  children: DilaMenuNode[]
}
