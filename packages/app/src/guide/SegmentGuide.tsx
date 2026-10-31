// The 11 default segments in the guide (U4), with the same meaning and suggested action as
// segment detail (ADR-0014), so the two can never disagree.
import { defaultSegmentMap } from '@rfm-matrix/core';
import { familyOf } from '../grid/families';

export function SegmentGuide() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">The 11 segments</caption>
        <thead className="text-small text-text-secondary">
          <tr className="border-b border-border">
            <th scope="col" className="py-2 pr-3 font-normal">
              Segment
            </th>
            <th scope="col" className="py-2 pr-3 font-normal">
              Who they are
            </th>
            <th scope="col" className="py-2 font-normal">
              What to do
            </th>
          </tr>
        </thead>
        <tbody>
          {defaultSegmentMap.segments.map((segment) => {
            const family = familyOf(segment.id);
            return (
              <tr key={segment.id} className="border-b border-border align-top">
                <th scope="row" className="py-3 pr-3 font-semibold">
                  <span className="block">{segment.name}</span>{' '}
                  <span
                    className={`mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-small font-normal ${family.pill}`}
                  >
                    {family.name}
                  </span>
                </th>
                <td className="py-3 pr-3">{segment.description}</td>
                <td className="py-3 text-text-secondary">{segment.suggestedAction}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
