export function rankWorkspaceCommand(value: string, search: string, keywords: string[] = []) {
  const query = search.trim().toLowerCase();
  const label = value.toLowerCase();
  if (!query || label === query) return 1;
  if (label.startsWith(query)) return 0.95;
  if (label.includes(query)) return 0.85;
  const words = query.split(/\s+/);
  if (words.every((word) => label.includes(word))) return 0.75;
  const searchable = [label, ...keywords].join(' ').toLowerCase();
  return words.every((word) => searchable.includes(word)) ? 0.5 : 0;
}
