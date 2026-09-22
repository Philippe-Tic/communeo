import type { ThemeBlocks } from '@communeo/theme-contract';
import Buttons from './Buttons.astro';
import Callout from './Callout.astro';
import Contact from './Contact.astro';
import Documents from './Documents.astro';
import Faq from './Faq.astro';
import Gallery from './Gallery.astro';
import Image from './Image.astro';
import Text from './Text.astro';
import Video from './Video.astro';

export const blocks: ThemeBlocks = {
  text: Text,
  image: Image,
  buttons: Buttons,
  callout: Callout,
  documents: Documents,
  gallery: Gallery,
  faq: Faq,
  contact: Contact,
  video: Video,
};
