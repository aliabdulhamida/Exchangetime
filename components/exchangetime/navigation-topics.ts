import { BookOpen, CalendarDays, ChartNoAxesCombined, Globe2, Landmark, Wallet } from 'lucide-react';

import { sections, workspaceUrl } from './product-model';

const icons = [Globe2, Wallet, BookOpen, ChartNoAxesCombined, Landmark, CalendarDays];

export const navigationTopics = Object.entries(sections).map(([section, tools], index) => ({
  section,
  label: section === 'Personal Finance' ? 'Finance' : section,
  Icon: icons[index],
  href: workspaceUrl(Object.keys(tools)[0]),
  tools,
}));
