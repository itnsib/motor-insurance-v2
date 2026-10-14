'use client';

import { useEffect, useRef, useState } from 'react';
import type { ZohoEnquiry } from '@/types/zoho';
import { searchEnquiries } from '@/lib/zoho-client';

// Links the comparison to a Zoho CRM enquiry. The customer name (or, on an
// older comparison, the enquiry number typed in by hand) drives the search as
// it's entered, so the matching enquiries are waiting by the time the advisor
// looks; typing in the box searches by any name or enquiry number instead.
//
// The advisor always picks the enquiry — nothing is chosen automatically. One
// client often has several enquiries, and filing a comparison under the wrong
// one puts it in another client's WorkDrive folder.

const Badge = ({ className, children }: { className: string; children: React.ReactNode }) => (
  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}>
    {children}
  </span>
);

export default function EnquiryPicker({
  defaultQuery,
  enquiry,
  onSelect,
  inputClassName,
  disabled = false,
}: {
  defaultQuery: string;
  enquiry: ZohoEnquiry | null;
  onSelect: (enquiry: ZohoEnquiry | null) => void;
  inputClassName: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  // Once the advisor types in the box, stop overwriting it from the customer name.
  const [typed, setTyped] = useState(false);
  const [results, setResults] = useState<ZohoEnquiry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Responses can arrive out of order; only the latest search may update the list.
  const latest = useRef(0);

  // An emptied box falls back to the customer name rather than searching
  // nothing, so clearing it never leaves the advisor with no list and no reason.
  const effectiveQuery = ((typed && query.trim()) || defaultQuery || '').trim();

  useEffect(() => {
    if (enquiry) return undefined;
    if (effectiveQuery.length < 3) {
      latest.current += 1; // drop any search still in flight
      setResults([]);
      setError('');
      setLoading(false);
      return undefined;
    }
    const id = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchEnquiries(effectiveQuery);
      if (id !== latest.current) return;
      setResults(res.enquiries);
      setError(res.error || '');
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [effectiveQuery, enquiry]);

  if (enquiry) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap px-3.5 py-3 rounded-lg border border-nsib-gold/60 bg-nsib-cream-light">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-nsib-red">{enquiry.enquiryNo}</span>
            <span className="text-sm font-semibold text-nsib-ink truncate">
              {enquiry.contactName || enquiry.enquiryName}
            </span>
            {!enquiry.hasFolder && <Badge className="bg-amber-100 text-amber-800">No WorkDrive folder</Badge>}
          </div>
          <div className="text-xs text-nsib-muted truncate">
            {enquiry.enquiryName}
            {enquiry.insuranceType ? ` · ${enquiry.insuranceType}` : ''}
            {enquiry.hasFolder ? ' · the PDF will be saved to this enquiry’s WorkDrive' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enquiry.folderUrl && (
            <a
              href={enquiry.folderUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-nsib-red text-white hover:bg-nsib-red-dark transition"
            >
              Open WorkDrive
            </a>
          )}
          <button
            type="button"
            onClick={() => onSelect(null)}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-nsib-sand text-nsib-ink bg-white hover:border-nsib-red hover:text-nsib-red transition disabled:opacity-50"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        className={inputClassName}
        value={typed ? query : defaultQuery}
        onChange={(e) => {
          setTyped(true);
          setQuery(e.target.value);
        }}
        disabled={disabled}
        placeholder="Search by client name or enquiry number (e.g. Enq298581)"
      />
      <div className="text-[11px] text-nsib-muted mt-1">
        {loading
          ? 'Searching Zoho…'
          : error
            ? <span className="text-nsib-red">{error}</span>
            : effectiveQuery.length < 3
              ? 'Enter the customer name, or type here, to find the Zoho enquiry.'
              : results.length
                ? `${results.length} enquir${results.length === 1 ? 'y' : 'ies'} found — pick the right one.`
                : 'No matching enquiries in Zoho.'}
        {typed && (
          <button
            type="button"
            className="ml-2 underline hover:text-nsib-red"
            onClick={() => {
              setTyped(false);
              setQuery('');
            }}
          >
            use customer name
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-2 max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {results.map((e) => (
            <button
              type="button"
              key={e.id}
              onClick={() => onSelect(e)}
              disabled={disabled}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-nsib-sand bg-white hover:border-nsib-gold hover:bg-nsib-cream-light transition disabled:opacity-50"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm text-nsib-red">{e.enquiryNo}</span>
                <span className="text-sm font-semibold text-nsib-ink">{e.contactName || e.enquiryName}</span>
                {e.insuranceType === 'Motor' && <Badge className="bg-nsib-gold/25 text-nsib-gold-dark">Motor</Badge>}
                {!e.hasFolder && <Badge className="bg-amber-100 text-amber-800">No WorkDrive folder</Badge>}
              </div>
              <div className="text-xs text-nsib-muted">
                {[e.enquiryName, e.insuranceType, e.subType, e.stage, e.enquiryDate].filter(Boolean).join(' · ')}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
