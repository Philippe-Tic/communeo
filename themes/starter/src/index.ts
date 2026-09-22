/**
 * Thème de départ : tout le contrat, en HTML sémantique et accessible, sans design.
 * Modèle pour `pnpm create-theme` et référence des tests du renderer.
 */
import { defineTheme } from '@communeo/theme-contract';
import { HOMEPAGE_SECTION_IDS } from '@communeo/core';
import { blocks } from './blocks/index';
import Article from './templates/Article.astro';
import ArticleList from './templates/ArticleList.astro';
import Association from './templates/Association.astro';
import AssociationList from './templates/AssociationList.astro';
import AssociationProposal from './templates/AssociationProposal.astro';
import Canteen from './templates/Canteen.astro';
import Contact from './templates/Contact.astro';
import Disruptions from './templates/Disruptions.astro';
import Document from './templates/Document.astro';
import DocumentList from './templates/DocumentList.astro';
import Event from './templates/Event.astro';
import EventList from './templates/EventList.astro';
import Frame from './templates/Frame.astro';
import Home from './templates/Home.astro';
import NotFound from './templates/NotFound.astro';
import Page from './templates/Page.astro';
import Team from './templates/Team.astro';
import Waste from './templates/Waste.astro';

export default defineTheme({
  manifest: {
    id: 'starter',
    name: 'Départ',
    description: 'Thème de départ sans design, pour créer un nouveau thème.',
    homeSections: HOMEPAGE_SECTION_IDS,
    menus: { main: true, footer: true },
    thumbnail: '',
  },
  templates: {
    Home,
    Page,
    ArticleList,
    Article,
    EventList,
    Event,
    DocumentList,
    Document,
    Team,
    AssociationList,
    Association,
    AssociationProposal,
    Contact,
    Waste,
    Canteen,
    Disruptions,
    Frame,
    NotFound,
  },
  blocks,
});
