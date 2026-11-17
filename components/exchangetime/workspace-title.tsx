'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { navigationTopics } from './navigation-topics';
import { workspaces, workspaceUrl } from './product-model';

type Workspace = (typeof workspaces)[number];

export default function WorkspaceTitle({ title }: { current: Workspace; title: string }) {
  return <span>{title}</span>;
}

export function WorkspaceNavigation({ current }: { current: Workspace }) {
  const navigation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    navigation.current?.querySelectorAll('[aria-current]').forEach(element => {
      const row = element.parentElement;
      if (row instanceof HTMLElement && element instanceof HTMLElement) {
        row.scrollTo({ left: Math.max(0, element.offsetLeft - row.offsetLeft - 16), behavior: 'instant' });
      }
    });
  }, [current.key]);
  return (
    <div ref={navigation} className="workspace-hierarchy">
      <nav aria-label="Main topics" className="workspace-main-topics">
        {navigationTopics.map(({ section, label, Icon, href }) => {
          return <Link key={section} aria-label={section} href={href} aria-current={current.section === section ? 'true' : undefined}>
            <span className="workspace-topic-icon"><Icon size={19} strokeWidth={1.6} aria-hidden /></span>
            <span>{label}</span>
          </Link>
        })}
      </nav>
      <nav aria-label={current.section + ' tools'} className="workspace-subtopics">
        {workspaces.filter(item => item.section === current.section).map(item => (
          <Link key={item.key} href={workspaceUrl(item.key)} aria-current={current.key === item.key ? 'page' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
