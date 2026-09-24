/** Thème Bourg. */
import { defineTheme } from '@communeo/theme-contract';
import { themeHomeSections } from '@communeo/core';
import { blocks } from './blocks/index';
import stylesheet from './styles.css?url';
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
import RightsRequest from './templates/RightsRequest.astro';
import Team from './templates/Team.astro';
import Waste from './templates/Waste.astro';

export default defineTheme({
  manifest: {
    id: 'bourg',
    name: 'Bourg',
    description:
      'Chaleureux et pratique : le panneau « Pratique » (mairie, alertes, collectes, météo) sur toutes les pages. Titres Nunito, sarcelle, encarts teintés.',
    homeSections: [...themeHomeSections('bourg')],
    menus: { main: true, footer: true },
    thumbnail: '',
  },
  stylesheet,
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
    RightsRequest,
    Contact,
    Waste,
    Canteen,
    Disruptions,
    Frame,
    NotFound,
  },
  blocks,
});
