import type { Metadata } from 'next';
import Demo from '@/components/ui/scroll-expansion-hero.demo';

export const metadata: Metadata = {
  title: 'Sensationalize Science: Reimagined as Video',
  description:
    'Scroll to reveal how Sensationalize Science turns scientific papers into publication-quality video.',
};

export default function ScrollDemoPage() {
  return <Demo />;
}
