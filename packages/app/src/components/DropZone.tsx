import { Upload } from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import { Button } from './Button';

type Props = { onFile(file: File): void; disabled?: boolean };

export function DropZone({ onFile, disabled = false }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (!disabled) setDragging(true);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (!disabled && file) onFile(file);
  };

  return (
    <section
      aria-label="Upload an order export"
      data-testid="drop-zone"
      data-state={dragging ? 'dragging' : 'idle'}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center gap-3 rounded-panel border-2 border-dashed px-6 py-10 text-center ${
        dragging ? 'border-action-primary bg-heat-1' : 'border-border bg-surface'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <p className="text-section font-semibold">Drop your order export here</p>
      <p className="text-text-secondary">
        A CSV file from Shopify, WooCommerce or any shop. It stays on this device.
      </p>
      <Button
        variant="primary"
        disabled={disabled}
        icon={<Upload aria-hidden size={16} />}
        onClick={() => input.current?.click()}
      >
        Choose a file
      </Button>
      <input
        ref={input}
        type="file"
        accept=".csv,.tsv,.txt,text/csv"
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
    </section>
  );
}
