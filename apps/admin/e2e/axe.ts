import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const violations = results.violations.map((v) => ({ rule: v.id, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}
