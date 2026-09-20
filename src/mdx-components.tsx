import type { MDXComponents } from 'mdx/types';
import { Excerpt } from '@/components/docs/Excerpt';
import { Formula, Measured, Param, ParamTable, Pipeline, Section, Step, Table } from '@/components/docs/blocks';

const components: MDXComponents = { Excerpt, Formula, Measured, Param, ParamTable, Pipeline, Section, Step, Table };

export function useMDXComponents(): MDXComponents {
  return components;
}
