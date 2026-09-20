import type { Metadata } from 'next';
import { DocShell } from '@/components/docs/DocShell';
import { catalogue } from '@/lib/mousefx/catalogue';

type Props = { params: Promise<{ effect: string }> };

export default async function Page({ params }: Props) {
  const { effect } = await params;
  const i = catalogue.findIndex((e) => e.id === effect);
  const n = catalogue.length;
  const { default: Content } = await import(`@/content/docs/${effect}.mdx`);
  return (
    <DocShell info={catalogue[i]} prev={catalogue[(i - 1 + n) % n]} next={catalogue[(i + 1) % n]}>
      <Content />
    </DocShell>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { effect } = await params;
  const info = catalogue.find((e) => e.id === effect);
  return { title: `${info?.title ?? 'docs'} — how it works // MOUSEFX`, description: info?.desc };
}

export function generateStaticParams() {
  return catalogue.map((e) => ({ effect: e.id }));
}

export const dynamicParams = false;
