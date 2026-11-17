'use client';

import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { rankWorkspaceCommand } from '@/lib/workspace-search';

import {
  sections,
  workflows,
  workspaceAliases,
  workspaceDescriptions,
  workspaces,
  workspaceUrl,
} from './product-model';
import { usePinnedWorkspaces } from './use-pinned-workspaces';

export default function WorkspaceDirectory() {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const { pins } = usePinnedWorkspaces();
  const searching = Boolean(query.trim());
  const matches = workspaces
    .filter(
      (item) =>
        !section || item.section === section || (section === 'pinned' && pins.includes(item.key)),
    )
    .map((item) => ({
      ...item,
      rank: rankWorkspaceCommand(item.label, query, [
        item.section,
        workspaceDescriptions[item.key],
        ...(workspaceAliases[item.key] ?? []),
        ...workflows.filter((flow) => flow.steps.includes(item.key)).map((flow) => flow.title),
      ]),
    }))
    .filter((item) => item.rank > 0)
    .sort((left, right) => right.rank - left.rank);
  return (
    <>
      <header className="terminal-heading">
        <div>
          <h1>Workspace directory</h1>
        </div>
      </header>
      <div className="directory-controls">
        <label className="directory-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            aria-label="Find a workspace"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools and tasks"
          />
        </label>
        <select
          className="et-tool-select"
          aria-label="Filter by area"
          value={section}
          onChange={(event) => setSection(event.target.value)}
        >
          <option value="">All areas</option>
          <option value="pinned">Pinned workspaces</option>
          {Object.keys(sections).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </div>
      {!query && !section && (
        <section className="directory-flows" aria-label="Guided workflows">
          <h2>Start with a task</h2>
          <div>
            {workflows.map((flow) => (
              <details key={flow.title}>
                <summary>{flow.title}</summary>
                <ol>
                  {flow.steps.map((key) => (
                    <li key={key}>
                      <Link href={workspaceUrl(key)}>
                        {workspaces.find((item) => item.key === key)?.label}
                      </Link>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </section>
      )}
      <p role="status" className="directory-count">
        {matches.length} {matches.length === 1 ? 'workspace' : 'workspaces'}
        {!matches.length && ' · Try a different term or area.'}
      </p>
      {(searching ? ['Search results'] : Object.keys(sections)).map((name) => {
        const items = searching ? matches : matches.filter((item) => item.section === name);
        return (
          items.length > 0 && (
            <section className="directory-group" key={name}>
              <h2>{name}</h2>
              <div>
                {items.map((item) => (
                  <Link key={item.key} href={workspaceUrl(item.key)}>
                    <span>
                      <strong>{item.label}</strong>
                      {searching && <small>{item.section}</small>}
                    </span>
                    <ArrowRight size={15} aria-hidden />
                  </Link>
                ))}
              </div>
            </section>
          )
        );
      })}
    </>
  );
}
