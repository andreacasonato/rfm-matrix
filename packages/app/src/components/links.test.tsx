// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { bugReportUrl, ExternalLink, feedbackUrl } from './ExternalLink';
import { Page } from './Page';

afterEach(cleanup);

describe('ExternalLink', () => {
  it('opens in a new tab without giving the page a handle on this one', () => {
    render(<ExternalLink href={feedbackUrl}>Feedback</ExternalLink>);
    const link = screen.getByRole('link', { name: 'Feedback (opens in a new tab)' });
    expect(link.getAttribute('href')).toBe(feedbackUrl);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('points only at the project issues on GitHub (PRD §12)', () => {
    expect(feedbackUrl).toBe('https://github.com/andreacasonato/rfm-matrix/issues/new/choose');
    expect(bugReportUrl).toBe(
      'https://github.com/andreacasonato/rfm-matrix/issues/new?template=bug_report.md',
    );
  });
});

describe('Page', () => {
  it('offers Feedback on every screen', () => {
    render(<Page>content</Page>);
    expect(
      screen.getByRole('link', { name: 'Feedback (opens in a new tab)' }).getAttribute('href'),
    ).toBe(feedbackUrl);
  });
});
