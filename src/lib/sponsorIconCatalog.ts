// Dynamic names require the complete catalog. Keep its separate CJS distribution
// inside sponsor/admin route chunks so named ESM icons can still be tree-shaken
// for the public shell. Both distributions ship identical icons and aliases.
import catalog from 'lucide-react/dist/cjs/lucide-react.js';

export const SponsorIconCatalog = catalog;
