import type { Author } from './schema';

// The single real author behind all Conclick content. Drives the byline +
// Article/Person JSON-LD (E-E-A-T). Update sameAs with the real social URLs
// before publishing — Google uses them to resolve the author entity.
export const founderAuthor: Author = {
  name: 'Deepak Yadav',
  role: 'Founder, Conclick',
  bio: 'Deepak Yadav is the founder of Conclick — privacy-first web analytics that ties every visit to real revenue. He has spent years staring at GA4 dashboards trying to answer one question (which traffic actually makes money) and built Conclick to answer it. He writes about analytics, attribution, and what actually moves the needle for bootstrapped founders.',
  photo: '/images/authors/deepak.jpg',
  url: 'https://conclick.io/about',
  sameAs: ['https://x.com/thedeepflux', 'https://www.linkedin.com/in/deepak-yadav-40a202140/'],
};
