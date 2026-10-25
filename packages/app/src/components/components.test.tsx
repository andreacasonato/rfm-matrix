// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { DropZone } from './DropZone';
import { Notice } from './Notice';

afterEach(cleanup);

describe('Button', () => {
  it('runs its action when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Upload orders</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Upload orders' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and does nothing when disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Continue
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(button);
    expect(button).toHaveProperty('disabled', true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows its loading label, is busy and cannot be pressed while loading', () => {
    render(
      <Button loading loadingLabel="Reading file…">
        Continue
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Reading file…' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button).toHaveProperty('disabled', true);
  });

  it('marks the primary variant, which uses dark text on orange', () => {
    render(<Button variant="primary">Run analysis</Button>);
    const button = screen.getByRole('button', { name: 'Run analysis' });
    expect(button.dataset.variant).toBe('primary');
    expect(button.className).toContain('text-on-action');
  });
});

describe('DropZone', () => {
  const file = new File(['a,b\n1,2\n'], 'orders.csv', { type: 'text/csv' });

  it('passes on a file chosen with the button', () => {
    const onFile = vi.fn();
    const { container } = render(<DropZone onFile={onFile} />);
    const input = container.querySelector('input[type=file]');
    if (!input) throw new Error('no file input');
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('passes on a dropped file and shows the drag state while hovering', () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    const zone = screen.getByTestId('drop-zone');
    fireEvent.dragOver(zone, { dataTransfer: { files: [file] } });
    expect(zone.dataset.state).toBe('dragging');
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
    expect(zone.dataset.state).toBe('idle');
  });

  it('ignores drops and disables the button when disabled', () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} disabled />);
    fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files: [file] } });
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Choose a file' })).toHaveProperty('disabled', true);
  });
});

describe('Notice', () => {
  it('announces errors as alerts', () => {
    render(
      <Notice tone="error" title="This file cannot be read">
        Save it as CSV.
      </Notice>,
    );
    expect(screen.getByRole('alert').textContent).toContain('This file cannot be read');
  });

  it('announces warnings politely', () => {
    render(<Notice tone="warning" title="3 rows could not be read" />);
    expect(screen.getByRole('status').textContent).toContain('3 rows could not be read');
  });
});
