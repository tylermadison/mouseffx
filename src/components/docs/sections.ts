// The eight sections of an effect docs page, in the required order.
// scripts/check-docs.mjs checks the MDX files against the same list.
export const SECTIONS = [
  { id: 'overview', title: 'Overview' },
  { id: 'interaction', title: 'Interaction' },
  { id: 'model', title: 'Model' },
  { id: 'pipeline', title: 'Frame pipeline' },
  { id: 'code', title: 'Code' },
  { id: 'constants', title: 'Tuned constants' },
  { id: 'performance', title: 'Performance' },
  { id: 'references', title: 'References' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];
