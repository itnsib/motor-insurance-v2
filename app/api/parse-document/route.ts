import { NextRequest, NextResponse } from 'next/server';

// Maps coverage labels as they appear in OLD saved HTML to the labels the
// current app's COVERAGE_OPTIONS use, so editor checkboxes match.
const COVERAGE_LABEL_MAP: Record<string, string> = {
  'Natural Calamities Riot and strike': 'Flood, Storm and Natural Calamity damages',
  'Flood, Storm and Natural Calamity damages': 'Flood, Storm and Natural Calamity damages',
  'Fire and theft cover': 'Fire and theft cover',
  'Emergency medical expenses': 'Emergency medical expenses',
  'Personal belongings': 'Personal belongings',
  'Off-road cover (For 4x4 only)': 'Off-road cover (For 4x4 only)',
  '24 Hour Accident and Breakdown Recovery': '24 Hour Accident and Breakdown Recovery',
  'Ambulance Cover': 'Ambulance Cover',
  'Optional Covers Driver Cover': 'Optional Covers Driver Cover',
  'Passengers Cover': 'Passengers Cover',
  'Hire car Benefit': 'Rent a Car',
  'Rent a Car': 'Rent a Car',
};

// Rows that are NOT coverage toggles — they are fixed attribute rows.
const NON_COVERAGE_ROWS = new Set([
  'Repair Type',
  'Vehicle Value',
  'Third Party Liability',
  'Oman Cover (Own damage only)',
  'Windscreen Excess',
  'Excess',
  'Premium',
  'VAT (5%)',
  'Total',
  'Advisor Comment',
]);

interface ParsedQuote {
  id: string;
  businessType: 'Private' | 'Commercial';
  enquiryNumber: string;
  customerName: string;
  make: string;
  model: string;
  year: string;
  value: string;
  repairType: string;
  company: string;
  productType: string;
  thirdPartyLiability: string;
  coverageOptions: string[];
  omanCover: string;
  windscreenExcess: string;
  excess: number;
  additionalExcess: string;
  additionalExcessDetails: string;
  premium: number;
  vat: number;
  total: number;
  isRecommended: boolean;
  isRenewal: boolean;
  advisorComment: string;
  recovered: boolean;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')).trim();
}

function toNumber(s: string): number {
  const n = parseFloat(s.replace(/AED/gi, '').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

// Extract the <td>...</td> cells of a row, skipping the first (label) cell.
function rowValueCells(rowHtml: string): string[] {
  const cells = rowHtml.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
  // first cell is the label; rest are per-company values
  return cells.slice(1).map(c => c.replace(/^<td[^>]*>/i, '').replace(/<\/td>$/i, ''));
}

function rowLabel(rowHtml: string): string {
  const first = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
  return first ? stripTags(first[1]) : '';
}

function parseHtmlToQuotes(html: string): ParsedQuote[] {
  // --- Header info ---
  const refMatch = html.match(/Ref:\s*([0-9]+)/);
  const referenceNumber = refMatch ? refMatch[1] : '';

  let enquiryNumber = '';
  let customerName = '';
  let make = '';
  let model = '';
  let year = '';
  const info = html.match(/Enquiry:\s*([\s\S]*?)\s*\|\s*Customer:\s*([\s\S]*?)\s*\|\s*Vehicle:\s*([\s\S]*?)<\/strong>/i);
  if (info) {
    enquiryNumber = stripTags(info[1]);
    customerName = stripTags(info[2]);
    const vehicleRaw = stripTags(info[3]); // e.g. "Toyota Land cruizer (2024)"
    const ym = vehicleRaw.match(/\(([^)]*)\)\s*$/);
    if (ym) year = ym[1].trim();
    const vehicleNoYear = vehicleRaw.replace(/\([^)]*\)\s*$/, '').trim();
    const parts = vehicleNoYear.split(' ');
    make = parts[0] || '';
    model = parts.slice(1).join(' ') || '';
  }

  // --- Company names from the header row ---
  const theadMatch = html.match(/<thead>([\s\S]*?)<\/thead>/i);
  const companies: string[] = [];
  const productTypes: string[] = [];
  if (theadMatch) {
    const ths = theadMatch[1].match(/<th[^>]*>[\s\S]*?<\/th>/gi) || [];
    // skip the first <th> (BENEFITS)
    for (let i = 1; i < ths.length; i++) {
      const th = ths[i];
      // company name: the company-header-cell div, or the first styled div
      let name = '';
      let product = '';
      const cellMatch = th.match(/company-header-cell[\s\S]*?<\/div>\s*<\/div>/i);
      if (cellMatch) {
        // newer format: name is the div right after the <img>, product is the next div
        const divs = th.match(/<div[^>]*color:\s*#fff[^>]*>([\s\S]*?)<\/div>/gi) || [];
        const texts = divs.map(d => stripTags(d)).filter(Boolean);
        name = texts[0] || '';
        product = texts[1] || '';
      } else {
        // older flat format
        const divs = th.match(/<div[^>]*>([\s\S]*?)<\/div>/gi) || [];
        const texts = divs.map(d => stripTags(d)).filter(Boolean);
        name = texts[0] || '';
      }
      companies.push(name);
      productTypes.push(product);
    }
  }

  const numCompanies = companies.length;
  if (numCompanies === 0) return [];

  // --- Body rows ---
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  const rows = tbodyMatch ? (tbodyMatch[1].match(/<tr[\s\S]*?<\/tr>/gi) || []) : [];

  // Per-company accumulators
  const repairType = new Array(numCompanies).fill('');
  const value = new Array(numCompanies).fill('');
  const tpl = new Array(numCompanies).fill('');
  const oman = new Array(numCompanies).fill('');
  const windscreen = new Array(numCompanies).fill('');
  const excess = new Array(numCompanies).fill(0);
  const premium = new Array(numCompanies).fill(0);
  const vat = new Array(numCompanies).fill(0);
  const total = new Array(numCompanies).fill(0);
  const advisor = new Array(numCompanies).fill('');
  const coverage: string[][] = Array.from({ length: numCompanies }, () => []);

  for (const row of rows) {
    const label = rowLabel(row);
    if (!label) continue;
    const cells = rowValueCells(row);

    if (label === 'Repair Type') cells.forEach((c, i) => { if (i < numCompanies) repairType[i] = stripTags(c); });
    else if (label === 'Vehicle Value') cells.forEach((c, i) => { if (i < numCompanies) value[i] = stripTags(c); });
    else if (label === 'Third Party Liability') cells.forEach((c, i) => { if (i < numCompanies) tpl[i] = stripTags(c); });
    else if (label === 'Oman Cover (Own damage only)') cells.forEach((c, i) => { if (i < numCompanies) oman[i] = stripTags(c); });
    else if (label === 'Windscreen Excess') cells.forEach((c, i) => { if (i < numCompanies) windscreen[i] = stripTags(c); });
    else if (label === 'Excess') cells.forEach((c, i) => { if (i < numCompanies) excess[i] = toNumber(stripTags(c)); });
    else if (label === 'Premium') cells.forEach((c, i) => { if (i < numCompanies) premium[i] = toNumber(stripTags(c)); });
    else if (label === 'VAT (5%)') cells.forEach((c, i) => { if (i < numCompanies) vat[i] = toNumber(stripTags(c)); });
    else if (label === 'Total') cells.forEach((c, i) => { if (i < numCompanies) total[i] = toNumber(stripTags(c)); });
    else if (label === 'Advisor Comment') cells.forEach((c, i) => { if (i < numCompanies) { const t = stripTags(c); advisor[i] = t === '-' ? '' : t; } });
    else if (!NON_COVERAGE_ROWS.has(label)) {
      // coverage row: included if cell text is YES
      const mapped = COVERAGE_LABEL_MAP[label] || label;
      cells.forEach((c, i) => {
        if (i < numCompanies && /YES/i.test(stripTags(c))) coverage[i].push(mapped);
      });
    }
  }

  const quotes: ParsedQuote[] = [];
  for (let i = 0; i < numCompanies; i++) {
    quotes.push({
      id: `${referenceNumber}_${i}_${Date.now()}`,
      businessType: 'Private',
      enquiryNumber,
      customerName,
      make,
      model,
      year: year || 'Not specified',
      value: value[i] || 'Not specified',
      repairType: repairType[i] || 'Not specified',
      company: companies[i],
      productType: productTypes[i] || '',
      thirdPartyLiability: tpl[i] || 'NA',
      coverageOptions: coverage[i],
      omanCover: oman[i] || 'NA',
      windscreenExcess: windscreen[i] || 'NA',
      excess: excess[i],
      additionalExcess: '',
      additionalExcessDetails: '',
      premium: premium[i],
      vat: vat[i],
      total: total[i],
      isRecommended: false,
      isRenewal: false,
      advisorComment: advisor[i],
      recovered: false, // now fully reconstructed — editable
    });
  }
  return quotes;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('url');
    if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'Missing url parameter' }, { status: 400 });
    }
    // Only allow fetching from the Vercel Blob store, for safety.
    if (!/\.public\.blob\.vercel-storage\.com\//.test(fileUrl)) {
      return NextResponse.json({ success: false, error: 'Invalid url' }, { status: 400 });
    }

    const res = await fetch(fileUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Fetch failed: ${res.status}` }, { status: 502 });
    }
    const html = await res.text();
    const quotes = parseHtmlToQuotes(html);

    if (quotes.length === 0) {
      return NextResponse.json({ success: false, error: 'Could not parse any quotes from document' }, { status: 422 });
    }

    return NextResponse.json({ success: true, quotes });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Parse failed', detail: String(err) }, { status: 500 });
  }
}
