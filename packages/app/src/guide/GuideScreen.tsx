// The Guide (U4): what RFM is and how to use the app, in plain words, from any screen. It opens
// over the current screen, which stays as it was, so an analysis in progress is never lost.
import { type ReactNode, useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import { SegmentGuide } from './SegmentGuide';

const panel = 'flex flex-col gap-3 rounded-panel border border-border bg-surface p-6';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={panel}>
      <h3 className="text-section font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function GuideScreen({ onBack }: { onBack(): void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo?.(0, 0);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 ref={heading} tabIndex={-1} className="text-title font-semibold">
          Guide
        </h2>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>

      <Section title="What RFM is">
        <p>
          RFM sorts your customers by three things your order export already holds:{' '}
          <strong>recency</strong>, how recently they last bought; <strong>frequency</strong>, how
          often they buy; and <strong>monetary value</strong>, how much they have spent in total.
        </p>
        <p className="text-text-secondary">
          For example, a customer who last ordered 12 days ago, has ordered 6 times and spent 340 in
          total is recent, frequent and spends well: most likely one of your Champions. One who
          bought once, a year ago, is probably lost.
        </p>
      </Section>

      <Section title="How scores work">
        <p>
          Every customer gets a score from 1 to 5 for recency (R), frequency (F) and monetary value
          (M). 5 is best: R5 bought most recently, F5 most often, M5 spent most.
        </p>
        <p className="text-text-secondary">
          By default the app decides recency and monetary scores for you, by splitting your
          customers into five equal-sized groups. Frequency uses fixed steps instead (1, 2, 3, 4 to
          5, and 6 or more orders), because in most shops many customers have bought only once.
          After an analysis, <strong>How scores work</strong> shows the exact numbers.
        </p>
      </Section>

      <Section title="Choosing your own thresholds">
        <p>
          You know your shop, so you can decide what each score means: for example, how much a
          customer must spend to be an M5. On the grid, open <strong>Score thresholds</strong> (or
          use the same cards on Clean and settings before you run the analysis), choose{' '}
          <strong>Set my own</strong> and type the numbers. The counts beside each score show how
          many of your customers it would hold, then <strong>Apply thresholds</strong>.
        </p>
        <p className="text-text-secondary">
          A coffee shop whose bags last about a month might say: R5 means ordered within the last 30
          days, R1 more than 180 days ago; F5 more than 10 orders; M5 more than 300 spent in total.
          A saved analysis keeps the new thresholds, and next month's export starts from them.
        </p>
      </Section>

      <Section title="From scores to segments">
        <p>
          The scores put each customer in one of 11 segments. By default the segment depends on
          recency and frequency; monetary value is shown with each customer and in every export.
        </p>
        <p className="text-text-secondary">
          To change which scores make each segment, for example to count R3 F3 customers as Loyal
          customers, use <strong>Edit segment rules</strong> on the grid. Score thresholds decide
          what counts as a 1 to 5; segment rules decide which scores make each segment.
        </p>
      </Section>

      <Section title="The 11 segments">
        <SegmentGuide />
      </Section>

      <Section title="Using the app in five steps">
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>
            <strong>Upload orders</strong>: export your orders from Shopify, WooCommerce or any shop
            as a CSV and drop it in. It stays on this device.
          </li>
          <li>
            <strong>Check the columns</strong>: the app guesses which column is the customer, order,
            date and amount. Change any guess that is wrong.
          </li>
          <li>
            <strong>Choose which orders count</strong>: leave out cancelled orders, choose gross or
            net amounts, and set the score thresholds if you like.
          </li>
          <li>
            <strong>Run analysis</strong>: see your customers in the grid, by segment.
          </li>
          <li>
            <strong>Open a segment and Export</strong> its customers as a CSV for your email tool.
          </li>
        </ol>
        <p className="text-text-secondary">
          A month later, add your new export to the same project and open <strong>Movement</strong>{' '}
          to see who moved between segments.
        </p>
      </Section>

      <Section title="What RFM cannot tell you">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>It describes the past. A Champion today can still stop buying tomorrow.</li>
          <li>
            It knows nothing about your margins, returns after the analysis date, or why a customer
            stopped buying.
          </li>
          <li>When most customers bought only once, frequency tells little apart.</li>
        </ul>
      </Section>
    </>
  );
}
