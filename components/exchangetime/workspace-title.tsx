'use client';

import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { workspaceSwipe } from '@/lib/workspace-gesture';

import { sections, workspaces, workspaceDescriptions, workspaceUrl } from './product-model';

export default function WorkspaceTitle({
  current,
  title,
}: {
  current: (typeof workspaces)[number];
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(current.section);
  const [query, setQuery] = useState('');
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const ignoreClick = useRef(false);
  const peers = workspaces.filter((item) => item.section === current.section);
  const index = peers.findIndex((item) => item.key === current.key);
  function move(direction: number) {
    const next = peers[index + direction];
    if (next) router.push(workspaceUrl(next.key));
  }
  const matches = workspaces.filter((item) =>
    query.trim()
      ? (item.label + ' ' + item.section + ' ' + (workspaceDescriptions[item.key] || ''))
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      : item.section === section,
  );
  return (
    <>
      <span className="workspace-desktop-title">{title}</span>
      <span className="workspace-mobile-title">
        <span className="workspace-title-context">{current.section}</span>
        <button
          className="workspace-title-trigger"
          aria-label={'Choose workspace: ' + title}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-describedby="workspace-swipe-hint"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            ignoreClick.current = false;
            start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            start.current = null;
          }}
          onPointerUp={(event) => {
            const origin = start.current;
            start.current = null;
            if (!origin || origin.id !== event.pointerId) return;
            const direction = workspaceSwipe(origin, { x: event.clientX, y: event.clientY });
            if (direction) {
              ignoreClick.current = true;
              move(direction);
            }
          }}
          onClick={() => {
            if (ignoreClick.current) {
              ignoreClick.current = false;
              return;
            }
            setSection(current.section);
            setQuery('');
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(event.key === 'ArrowLeft' ? -1 : 1);
            }
          }}
        >
          <span>{title}</span>
          <ChevronDown size={20} aria-hidden />
        </button>
        <span id="workspace-swipe-hint" className="sr-only">
          Swipe the title to switch. Tap to choose.
        </span>
      </span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mobile-navigation-sheet workspace-chooser">
          <SheetHeader>
            <SheetTitle>Your workspace</SheetTitle>
            <SheetDescription>Find the right tool for your next question.</SheetDescription>
          </SheetHeader>
          <div className="workspace-chooser-controls">
            <label className="planner-field">
              Search
              <input
                type="search"
                className="terminal-input"
                placeholder="Find a tool…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {query.trim() ? (
              <p className="terminal-note">Results across all areas</p>
            ) : (
              <div className="workspace-area-chips" role="group" aria-label="Workspace areas">
                {Object.keys(sections).map((name) => (
                  <button
                    key={name}
                    type="button"
                    data-area={name}
                    aria-pressed={section === name}
                    onClick={() => setSection(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <nav aria-label="Choose workspace" className="workspace-chooser-list">
            {matches.map((item) => (
              <Link
                key={item.key}
                href={workspaceUrl(item.key)}
                onClick={() => setOpen(false)}
                aria-current={item.key === current.key ? 'page' : undefined}
              >
                <span>
                  <strong>{item.label}</strong>
                  <small>
                    {query.trim() ? item.section + ' · ' : ''}
                    {workspaceDescriptions[item.key]}
                  </small>
                </span>
                {item.key === current.key && <Check size={18} aria-label="Current workspace" />}
              </Link>
            ))}
            {!matches.length && <p role="status">No matching tools. Try another name.</p>}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
