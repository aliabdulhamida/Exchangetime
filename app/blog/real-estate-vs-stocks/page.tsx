import { permanentRedirect } from 'next/navigation';

export default function RemovedPage() {
  permanentRedirect('/blog');
}
