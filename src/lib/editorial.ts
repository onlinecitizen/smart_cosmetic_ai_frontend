/**
 * Editorial photography slots.
 *
 * No photography is bundled yet: the project has no images whose licence and
 * model releases have been confirmed. Until a slot below is filled with an
 * approved image (placed in /public/editorial/), EditorialVisual renders an
 * art-directed illustration instead (Stone Town arch, Indian Ocean, sand and
 * blush light), which is decorative and never presented as a product or a
 * person.
 *
 * To add a photo: put the file in public/editorial/, then fill the slot with
 * its path, alt text and the confirmed credit/licence.
 */
export interface EditorialPhoto {
  src: string;
  alt: string;
  credit: string;
}

export type EditorialSlot = "hero" | "studio";

export const EDITORIAL_PHOTOS: Partial<Record<EditorialSlot, EditorialPhoto>> = {};
