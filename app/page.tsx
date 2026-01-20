'use client';

import { useState, useEffect } from 'react';

// ============ TYPES ============
interface Quote {
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
  productType?: string;
  thirdPartyLiability: string;
  coverageOptions: string[];
  omanCover: string;
  windscreenExcess: string;
  excess: number;
  premium: number;
  vat: number;
  total: number;
  isRecommended: boolean;
  isRenewal: boolean;
  advisorComment: string;
}

interface SavedComparison {
  id: string;
  date: string;
  vehicle: string;
  quotes: Quote[];
  referenceNumber: string;
  fileUrl?: string;
}

interface CompanyDefaults {
  repairType: string;
  thirdPartyLiability: string;
  omanCover: string;
  windscreenExcess: string;
  coverageOptions: string[];
}

// ============ CONSTANTS FROM GOOGLE SHEETS ============
const VEHICLE_MAKES = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'BAIC Motor', 'Bentley', 'Bestune', 'BMW',
  'Bugatti', 'Buick', 'BYD', 'Cadillac', 'Changan', 'Chery', 'Chevrolet', 'Chrysler',
  'Citroën', 'Dacia', 'Daewoo', 'Daihatsu', 'Dodge', 'Dongfeng' , 'Ducati', 'Exeed', 'Ferrari',
  'Fiat', 'Ford', 'GAC Motor', 'Geely', 'Genesis', 'GMC', 'Great Wall', 'Haval',
  'Hino 300', 'Honda', 'Hongqi', 'Hummer', 'Hyundai', 'Infiniti', 'Isuzu', 'JAC Motors',
  'Jaguar', 'Jeep', 'Jetour', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln',
  'Lotus', 'Maserati', 'Mazda', 'McLaren', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi',
  'Nio', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'RAM', 'Renault', 'Rolls-Royce',
  'Saab', 'Seat', 'Skoda', 'Smart', 'SsangYong', 'Subaru', 'Suzuki', 'Tesla',
  'Toyota', 'Volkswagen', 'Volvo', 'Wey', 'Ashok Leyland (BUS)', 'Other'
];

const YEARS = [
  '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017',
  '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007',
  '2006', '2005', '2004', '2003', '2002', '2001', '2000', '1999', '1998', '1997',
  '1996', '1995', '1994', '1993', '1992', '1991', '1990'
];

const PRIVATE_INSURANCE_COMPANIES = [
  'SUKOON', 'DNI', 'QATAR', 'WATANIA', 'ADAMJEE', 'FIDELITY', 'LIVA', 'EMIRATES',
  'RAK', 'SALAMA','INSURANCE HOUSE', 'NEW INDIA DXB', 'METHAQ', 'NGI', 'GIG', 'AL WATHBA', 'ORIENT INSRANCE',
  'UNION INSURANCE', 'NIA ABU DHABI', 'AL SAGR'
];

const COMMERCIAL_INSURANCE_COMPANIES = [
  'SUKOON', 'ADAMJEE', 'METHAQ (ind. pickup)', 'NEW INDIA ABU DHABI',
  'DNIRC', 'NIA DXB','INSURANCE HOUSE', 'AL SAGR', 'EMIRATES', 'AL ITTIHAD AL WATANI', 'NGI'
];

const COMPANY_PRODUCT_TYPES: Record<string, string[]> = {
  'SUKOON': ['Gold', 'Privilege Club'],
  'DNI': ['Standard', 'High Value'],
  'QATAR': ['Basic', 'Prestige Plus'],
  'WATANIA': [
    'WT MUMTAZ- NON AGENCY REPAIR PLAN (NB)',
    'WT MUMTAZ- PREMIER REPAIR PLAN (NB)',
    'WT MUMTAZ- DYNATRADE REPAIR PLAN (NB)',
    'WT MUMTAZ- GERMAN EXPERTS REPAIR PLAN (NB)'
  ]
};

const THIRD_PARTY_LIABILITY_OPTIONS = [
  'NA', 'UPTO AED 1 Million', 'UPTO AED 1.5 Million', 'UPTO AED 2 Million',
  'UPTO AED 2.5 Million', 'UPTO AED 3 Million', 'UPTO AED 3.5 Million',
  'UPTO AED 4 Million', 'UPTO AED 4.5 Million', 'UPTO AED 5 Million'
];

const OMAN_COVER_OPTIONS = [
  'NA', 'Yes', 'Yes(Orange Card available on request)', 'YES(OWN DAMAGE ONLY)', 'No'
];

const WINDSCREEN_EXCESS_OPTIONS = [
  'NA', 'UPTO AED 1000', 'UPTO AED 1500', 'UPTO AED 2000', 'UPTO AED 2500',
  'UPTO AED 3000', 'UPTO AED 3500', 'UPTO AED 4000', 'UPTO AED 4500',
  'UPTO AED 5000', 'UNLIMITED'
];

const COVERAGE_OPTIONS = [
  { id: 'fireTheft', label: 'Fire and theft cover' },
  { id: 'naturalCalamities', label: 'Natural Calamities Riot and strike' },
  { id: 'emergencyMedical', label: 'Emergency medical expenses' },
  { id: 'personalBelongings', label: 'Personal belongings' },
  { id: 'offroadCover', label: 'Off-road cover (For 4x4 only)' },
  { id: 'accidentRecovery', label: '24 Hour Accident and Breakdown Recovery' },
  { id: 'ambulanceCover', label: 'Ambulance Cover' },
  { id: 'driverCover', label: 'Optional Covers Driver Cover' },
  { id: 'passengersCover', label: 'Passengers Cover' },
  { id: 'hirecarBenefit', label: 'Hire car Benefit' }
];

// ============ COMPREHENSIVE DEFAULTS SYSTEM ============
const getCompanyDefaults = (company: string, productType?: string): CompanyDefaults => {
  const defaultValues: CompanyDefaults = {
    repairType: 'NA',
    thirdPartyLiability: 'NA',
    omanCover: 'NA',
    windscreenExcess: 'NA',
    coverageOptions: []
  };

  const companyDefaults: Record<string, CompanyDefaults> = {
    'SUKOON': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: productType === 'Gold' ? 'UPTO AED 3.5 Million' : 'UPTO AED 5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: productType === 'Gold' ? 'UPTO AED 3000' : 'UNLIMITED',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'DNI': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: productType === 'Standard' ? 'UPTO AED 3 Million' : 'UPTO AED 3.5 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: productType === 'Standard' ? 'UPTO AED 3500' : 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'QATAR': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: productType === 'Basic' ? 'UPTO AED 3.5 Million' : 'UPTO AED 3 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'WATANIA': {
      repairType: 'Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Emergency medical expenses', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'ADAMJEE': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'FIDELITY': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'LIVA': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2500',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'EMIRATES': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'RAK': {
      repairType: 'Non-Agency',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'YES',
      windscreenExcess: 'UPTO AED 2500',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'SALAMA': {
      repairType: 'Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'NEW INDIA DXB': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'METHAQ': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'NGI': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES',
      windscreenExcess: 'UPTO AED 1500',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'AL WATHBA': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'ORIENT INSRANCE': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 1000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'UNION INSURANCE': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES',
      windscreenExcess: 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'NIA ABU DHABI': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'AL SAGR': {
      repairType: 'Agency/Non-Agency',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Natural Calamities Riot and strike', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    }
  };

  return companyDefaults[company] || defaultValues;
};

const calculateVAT = (premium: number): { vat: number; total: number } => {
  const vat = Math.round(premium * 0.05 * 100) / 100;
  const total = Math.round((premium + vat) * 100) / 100;
  return { vat, total };
};

const generateReferenceNumber = (): string => {
  const timestamp = Date.now();
  const last4 = timestamp.toString().slice(-4);
  const random2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${last4}${random2}`;
};

// ============ HTML GENERATOR ============
function generateHTMLContentHelper(sortedQuotes: Quote[], allCoverageOptions: string[], referenceNumber: string): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NSIB Insurance Comparison</title>
    <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial; font-size: 12px; color: #000; }
        .page1 { width: 210mm; height: 297mm; page-break-after: always; }
        .page1 img { width: 100%; height: 100%; object-fit: contain; }
        .page2 { width: 210mm; min-height: 297mm; padding: 8mm 10mm 25mm 10mm; position: relative; }
        .header-simple { text-align: center; margin-bottom: 5mm; position: relative; height: 12mm; }
        .header-logo { height: 12mm; }
        .header-corner { position: absolute; right: 0; top: 0; height: 15mm; }
        .reference-number { position: absolute; top: 2mm; left: 10mm; font-size: 9px; color: #666; }
        .section-title { font-size: 18px; font-weight: bold; text-align: center; margin: 3mm 0; color: #000; }
        .vehicle-info { background: #f8f9fa; padding: 2mm; text-align: center; margin: 2mm 0; font-size: 12px; color: #000; }
        .comparison-table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 2mm 0; table-layout: fixed; }
        .comparison-table th, .comparison-table td { border: 1px solid #000; padding: 2mm 1.5mm; text-align: center; vertical-align: middle; word-wrap: break-word; }
        .comparison-table th { background: #1e40af; color: #fff !important; font-size: 12px; padding: 2.5mm 1.5mm; font-weight: bold; }
        .comparison-table th:first-child, .comparison-table td:first-child { text-align: left; width: 40mm; }
        .comparison-table td { background: #fff; color: #000 !important; }
        .comparison-table td:first-child { font-weight: bold; background: #f8f9fa; color: #000 !important; }
        .light-blue-row { background: #e3f2fd !important; }
        .light-blue-row td { background: #e3f2fd !important; color: #000 !important; }
        .included { color: #28a745 !important; font-weight: bold; }
        .not-included { color: #dc3545 !important; font-weight: bold; }
        .total-row { background: #e3f2fd !important; font-weight: bold; }
        .total-row td { color: #000 !important; }
        .renewal-badge { background: #ffc107; color: #000 !important; padding: 1mm 2.5mm; border-radius: 10mm; font-size: 9px; font-weight: bold; display: inline-block; margin-top: 1mm; }
        .recommended-badge { background: #28a745; color: #fff !important; padding: 1mm 2.5mm; border-radius: 10mm; font-size: 9px; font-weight: bold; display: inline-block; margin-top: 1mm; }
        .advisor-comment-cell { background: #e3f2fd !important; font-size: 8px; text-align: left !important; padding: 2mm !important; line-height: 1.3; color: #000 !important; vertical-align: top !important; }
        .disclaimer { background: #fff3cd; padding: 2.5mm; margin: 2mm 0; font-size: 9px; line-height: 1.3; border-left: 2mm solid #ffc107; color: #000; }
        .disclaimer h4 { font-size: 11px; margin-bottom: 1.5mm; color: #856404; }
        .footer-contact { position: absolute; bottom: 0; left: 0; right: 0; width: 210mm; background: linear-gradient(135deg, rgba(255, 107, 107, 0.85) 0%, rgba(238, 90, 111, 0.85) 100%); padding: 2.5mm 10mm; display: flex; justify-content: space-between; color: #fff !important; font-size: 9px; line-height: 1.3; }
        .footer-left, .footer-right { flex: 1; color: #fff !important; }
        .footer-right { text-align: right; }
        .footer-contact strong { display: block; margin-bottom: 0.5mm; color: #fff !important; font-size: 9.5px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
</head>
<body>
    <div class="page1">
        <img src="https://i.imgur.com/qgsax5Y.png" alt="About">
    </div>
    
    <div class="page2">
        <div class="reference-number">Ref: ${referenceNumber}</div>
        <div class="header-simple">
            <img src="https://i.imgur.com/GCOPBN1.png" alt="Logo" class="header-logo">
            <img src="https://i.imgur.com/Wsv3Ah2.png" alt="Corner" class="header-corner">
        </div>
        <div class="section-title">MOTOR INSURANCE COMPARISON</div>
        <div class="vehicle-info">
            <strong>Enquiry: ${sortedQuotes[0].enquiryNumber} | Customer: ${sortedQuotes[0].customerName} | Vehicle: ${sortedQuotes[0].make} ${sortedQuotes[0].model} (${sortedQuotes[0].year})</strong>
        </div>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>BENEFITS</th>
                    ${sortedQuotes.map((q) => `
                        <th>
                            <div style="font-size: 10px; margin-bottom: 1mm; color: #fff;">${q.company.length > 30 ? q.company.substring(0, 27) + '...' : q.company}</div>
                            ${q.productType ? `<div style="font-size: 9px; color: #fff; margin-bottom: 1mm;">${q.productType}</div>` : ''}
                            ${q.isRenewal ? '<div class="renewal-badge">RENEWAL</div>' : ''}
                            ${q.isRecommended ? '<div class="recommended-badge">RECOMMENDED</div>' : ''}
                        </th>
                    `).join('')}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Repair Type</td>
                    ${sortedQuotes.map(q => `<td>${q.repairType}</td>`).join('')}
                </tr>
                <tr>
                    <td>Vehicle Value</td>
                    ${sortedQuotes.map(q => `<td>${q.value}</td>`).join('')}
                </tr>
                <tr>
                    <td>Third Party Liability</td>
                    ${sortedQuotes.map(q => `<td>${q.thirdPartyLiability}</td>`).join('')}
                </tr>
                <tr>
                    <td>Oman Cover (Own damage only)</td>
                    ${sortedQuotes.map(q => `<td>${q.omanCover}</td>`).join('')}
                </tr>
                <tr>
                    <td>Windscreen Excess</td>
                    ${sortedQuotes.map(q => `<td>${q.windscreenExcess}</td>`).join('')}
                </tr>
                ${allCoverageOptions.map(option => `
                    <tr>
                        <td>${option}</td>
                        ${sortedQuotes.map(q => {
                            const inc = q.coverageOptions.includes(option);
                            return `<td><span class="${inc ? 'included' : 'not-included'}">${inc ? 'YES' : 'NO'}</span></td>`;
                        }).join('')}
                    </tr>
                `).join('')}
                <tr class="light-blue-row">
                    <td>Excess</td>
                    ${sortedQuotes.map(q => `<td>AED ${q.excess.toLocaleString()}</td>`).join('')}
                </tr>
                <tr class="light-blue-row">
                    <td>Premium</td>
                    ${sortedQuotes.map(q => `<td>AED ${q.premium.toFixed(2)}</td>`).join('')}
                </tr>
                <tr class="light-blue-row">
                    <td>VAT (5%)</td>
                    ${sortedQuotes.map(q => `<td>AED ${q.vat.toFixed(2)}</td>`).join('')}
                </tr>
                <tr class="light-blue-row total-row">
                    <td>Total</td>
                    ${sortedQuotes.map(q => `<td>AED ${q.total.toFixed(2)}</td>`).join('')}
                </tr>
                <tr>
                    <td>Advisor Comment</td>
                    ${sortedQuotes.map(q => `<td class="advisor-comment-cell">${q.advisorComment && q.advisorComment.trim() ? q.advisorComment : '-'}</td>`).join('')}
                </tr>
            </tbody>
        </table>
        
        <div class="disclaimer">
            <h4>Disclaimer</h4>
            <p>While we make every effort to ensure the accuracy and timeliness of the details provided in the comparison table, there may be instances where the actual coverage differs. In such cases, the terms outlined in the insurer&apos;s official policy wording and schedule will take precedence over the information provided by us.</p>
            <p style="margin-top: 1.5mm;">For the complete <strong>Material Information Declaration</strong> and <strong>Disclaimer</strong>, please refer to the quote.</p>
        </div>
        
        <div class="footer-contact">
            <div class="footer-left">
                <strong>Suite 2801, One by Omniyat</strong>
                Al Mustaqbal Street, Business Bay, Dubai, U.A.E | P O BOX 233640<br>
                <strong>UAE Central Bank Registration Number : 200</strong>
            </div>
            <div class="footer-right">
                <strong>Call us on +971 47058000</strong>
                Email us : enquiry@nsib.ae | Visit our website: nsib.ae
            </div>
        </div>
    </div>
</body>
</html>`;
}

function downloadHTMLFile(htmlContent: string, fileName: string) {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============ MAIN APP ============
export default function App() {
  const [currentPage, setCurrentPage] = useState<'generator' | 'history'>('generator');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [businessType, setBusinessType] = useState<'Private' | 'Commercial'>('Private');
  const [formData, setFormData] = useState({
    enquiryNumber: '',
    customerName: '',
    vehicleMake: '',
    vehicleModel: '',
    yearModel: '',
    vehicleValue: '',
    repairType: '',
    insuranceCompany: '',
    productType: '',
    thirdPartyLiability: 'NA',
    excess: 0,
    premium: 0,
    isRecommended: false,
    isRenewal: false,
  });
  const [selectedCoverage, setSelectedCoverage] = useState<string[]>([]);
  const [omanCover, setOmanCover] = useState('NA');
  const [windscreenExcess, setWindscreenExcess] = useState('NA');
  const [advisorComment, setAdvisorComment] = useState('');
  const [vat, setVat] = useState(0);
  const [total, setTotal] = useState(0);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  const insuranceCompanies = businessType === 'Private' ? PRIVATE_INSURANCE_COMPANIES : COMMERCIAL_INSURANCE_COMPANIES;
  const hasProductTypes = Boolean(formData.insuranceCompany && COMPANY_PRODUCT_TYPES[formData.insuranceCompany]);

  const handlePremiumChange = (premium: number) => {
    const { vat: calculatedVat, total: calculatedTotal } = calculateVAT(premium);
    setVat(calculatedVat);
    setTotal(calculatedTotal);
    setFormData({ ...formData, premium });
  };

  const handleCompanyChange = (company: string) => {
    const defaults = getCompanyDefaults(company);
    
    setFormData(prev => ({
      ...prev,
      insuranceCompany: company,
      productType: '',
      repairType: defaults.repairType,
      thirdPartyLiability: defaults.thirdPartyLiability
    }));
    
    setOmanCover(defaults.omanCover);
    setWindscreenExcess(defaults.windscreenExcess);
    setSelectedCoverage(defaults.coverageOptions);
  };

  const handleProductTypeChange = (productType: string) => {
    const defaults = getCompanyDefaults(formData.insuranceCompany, productType);
    
    setFormData(prev => ({
      ...prev,
      productType,
      thirdPartyLiability: defaults.thirdPartyLiability
    }));
    
    setWindscreenExcess(defaults.windscreenExcess);
  };

  const handleCoverageToggle = (label: string) => {
    setSelectedCoverage(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
    );
  };

  const addQuote = () => {
    if (!formData.enquiryNumber || !formData.customerName || !formData.vehicleMake || !formData.vehicleModel || !formData.insuranceCompany || !formData.premium) {
      alert('Please fill required fields: Enquiry Number, Name, Make, Model, Company, and Premium');
      return;
    }

    if (hasProductTypes && !formData.productType) {
      alert('Please select a Product Type for this company');
      return;
    }

    // Advisor comment is now optional - removed validation

    const newQuote: Quote = {
      id: Date.now().toString(),
      businessType,
      enquiryNumber: formData.enquiryNumber,
      customerName: formData.customerName,
      make: formData.vehicleMake,
      model: formData.vehicleModel,
      year: formData.yearModel || 'Not specified',
      value: formData.vehicleValue || 'Not specified',
      repairType: formData.repairType || 'Not specified',
      company: formData.insuranceCompany,
      productType: formData.productType,
      thirdPartyLiability: formData.thirdPartyLiability,
      coverageOptions: selectedCoverage,
      omanCover: omanCover,
      windscreenExcess: windscreenExcess,
      excess: formData.excess,
      premium: formData.premium,
      vat,
      total,
      isRecommended: formData.isRecommended,
      isRenewal: formData.isRenewal,
      advisorComment: advisorComment,
    };

    setQuotes([...quotes, newQuote]);
    clearForm();
    alert('Quote added to comparison!');
  };

  const clearForm = () => {
    setFormData({
      ...formData,
      insuranceCompany: '',
      productType: '',
      repairType: '',
      thirdPartyLiability: 'NA',
      excess: 0,
      premium: 0,
      isRecommended: false,
      isRenewal: false,
    });
    setSelectedCoverage([]);
    setOmanCover('NA');
    setWindscreenExcess('NA');
    setAdvisorComment('');
    setVat(0);
    setTotal(0);
  };

  const removeQuote = (id: string) => {
    setQuotes(quotes.filter(q => q.id !== id));
    if (editingQuoteId === id) setEditingQuoteId(null);
  };

  const updateQuoteField = (id: string, field: keyof Quote, value: string | number | boolean | string[]) => {
    setQuotes(quotes.map(q => {
      if (q.id === id) {
        const updated = { ...q, [field]: value };
        if (field === 'premium') {
          const { vat, total } = calculateVAT(value as number);
          updated.vat = vat;
          updated.total = total;
        }
        return updated;
      }
      return q;
    }));
  };

  const saveAndDownload = async () => {
    if (quotes.length === 0) {
      alert('No quotes to save. Add at least one quote first.');
      return;
    }

    const referenceNumber = generateReferenceNumber();
    const sortedQuotes = [...quotes].sort((a, b) => a.total - b.total);
    const allCoverageOptions = [...new Set(quotes.flatMap(q => q.coverageOptions))];
    
    const htmlContent = generateHTMLContentHelper(sortedQuotes, allCoverageOptions, referenceNumber);
    const fileName = `NSIB_${quotes[0].customerName.replace(/\s/g, '_')}_${quotes[0].make}_${quotes[0].model}_${referenceNumber}.html`;
    
    // Download locally first
    downloadHTMLFile(htmlContent, fileName);
    
    try {
      // Upload to Vercel Blob Storage
      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, htmlContent }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      
      // Save to localStorage AND cloud
      const savedHistory = JSON.parse(localStorage.getItem('quotesHistory') || '[]');
      const newComparison: SavedComparison = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        vehicle: `${quotes[0].make} ${quotes[0].model}`,
        quotes: quotes,
        referenceNumber: referenceNumber,
        fileUrl: result.url,
      };
      savedHistory.unshift(newComparison);
      localStorage.setItem('quotesHistory', JSON.stringify(savedHistory));

      // Save to cloud
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: savedHistory }),
      });
      
      alert(`✅ Success!\n\n📥 File downloaded: ${fileName}\n🔗 Online URL: ${result.url}\n\nYou can continue editing quotes or start a new comparison.`);
      
    } catch (error) {
      console.error('Upload error:', error);
      alert(`⚠️ File downloaded locally, but cloud upload failed:\n${error instanceof Error ? error.message : 'Unknown error'}\n\nYou can continue editing quotes or start a new comparison.`);
      
      // Still save to history without URL
      const savedHistory = JSON.parse(localStorage.getItem('quotesHistory') || '[]');
      const newComparison: SavedComparison = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        vehicle: `${quotes[0].make} ${quotes[0].model}`,
        quotes: quotes,
        referenceNumber: referenceNumber,
      };
      savedHistory.unshift(newComparison);
      localStorage.setItem('quotesHistory', JSON.stringify(savedHistory));
    }
  };

  const startNewComparison = () => {
    if (quotes.length > 0) {
      if (!confirm('Start a new comparison? This will clear all current quotes.')) {
        return;
      }
    }
    setQuotes([]);
    setFormData({
      enquiryNumber: '',
      customerName: '',
      vehicleMake: '',
      vehicleModel: '',
      yearModel: '',
      vehicleValue: '',
      repairType: '',
      insuranceCompany: '',
      productType: '',
      thirdPartyLiability: 'NA',
      excess: 0,
      premium: 0,
      isRecommended: false,
      isRenewal: false,
    });
    clearForm();
    setEditingQuoteId(null);
  };

  const loadComparison = (comparison: SavedComparison) => {
    setQuotes(comparison.quotes);
    setFormData({
      enquiryNumber: comparison.quotes[0].enquiryNumber,
      customerName: comparison.quotes[0].customerName,
      vehicleMake: comparison.quotes[0].make,
      vehicleModel: comparison.quotes[0].model,
      yearModel: comparison.quotes[0].year,
      vehicleValue: comparison.quotes[0].value,
      repairType: '',
      insuranceCompany: '',
      productType: '',
      thirdPartyLiability: 'NA',
      excess: 0,
      premium: 0,
      isRecommended: false,
      isRenewal: false,
    });
    setCurrentPage('generator');
    alert(`✅ Loaded ${comparison.quotes.length} quotes. You can now edit or add more quotes.`);
  };

  const sortedQuotes = [...quotes].sort((a, b) => a.total - b.total);
  const allCoverageOptions = [...new Set(quotes.flatMap(q => q.coverageOptions))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-5">
      <div className="max-w-[1800px] mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">NSIB Insurance Quote System</h1>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => setCurrentPage('generator')} 
              className={`px-8 py-3 rounded-lg font-bold transition ${currentPage === 'generator' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              📝 Quote Generator
            </button>
            <button 
              onClick={() => setCurrentPage('history')} 
              className={`px-8 py-3 rounded-lg font-bold transition ${currentPage === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              📁 Saved History
            </button>
          </div>
        </div>

        {currentPage === 'generator' ? (
          <QuoteGeneratorPage 
            quotes={quotes}
            businessType={businessType}
            setBusinessType={setBusinessType}
            formData={formData}
            setFormData={setFormData}
            selectedCoverage={selectedCoverage}
            omanCover={omanCover}
            setOmanCover={setOmanCover}
            windscreenExcess={windscreenExcess}
            setWindscreenExcess={setWindscreenExcess}
            advisorComment={advisorComment}
            setAdvisorComment={setAdvisorComment}
            vat={vat}
            total={total}
            editingQuoteId={editingQuoteId}
            setEditingQuoteId={setEditingQuoteId}
            insuranceCompanies={insuranceCompanies}
            hasProductTypes={hasProductTypes}
            handlePremiumChange={handlePremiumChange}
            handleCompanyChange={handleCompanyChange}
            handleProductTypeChange={handleProductTypeChange}
            handleCoverageToggle={handleCoverageToggle}
            addQuote={addQuote}
            removeQuote={removeQuote}
            updateQuoteField={updateQuoteField}
            saveAndDownload={saveAndDownload}
            startNewComparison={startNewComparison}
            sortedQuotes={sortedQuotes}
            allCoverageOptions={allCoverageOptions}
          />
        ) : (
          <SavedHistoryPage loadComparison={loadComparison} />
        )}
      </div>
    </div>
  );
}

// Component props interfaces
interface QuoteGeneratorPageProps {
  quotes: Quote[];
  businessType: 'Private' | 'Commercial';
  setBusinessType: (type: 'Private' | 'Commercial') => void;
  formData: {
    enquiryNumber: string;
    customerName: string;
    vehicleMake: string;
    vehicleModel: string;
    yearModel: string;
    vehicleValue: string;
    repairType: string;
    insuranceCompany: string;
    productType: string;
    thirdPartyLiability: string;
    excess: number;
    premium: number;
    isRecommended: boolean;
    isRenewal: boolean;
  };
  setFormData: (data: QuoteGeneratorPageProps['formData']) => void;
  selectedCoverage: string[];
  omanCover: string;
  setOmanCover: (cover: string) => void;
  windscreenExcess: string;
  setWindscreenExcess: (excess: string) => void;
  advisorComment: string;
  setAdvisorComment: (comment: string) => void;
  vat: number;
  total: number;
  editingQuoteId: string | null;
  setEditingQuoteId: (id: string | null) => void;
  insuranceCompanies: string[];
  hasProductTypes: boolean;
  handlePremiumChange: (premium: number) => void;
  handleCompanyChange: (company: string) => void;
  handleProductTypeChange: (productType: string) => void;
  handleCoverageToggle: (label: string) => void;
  addQuote: () => void;
  removeQuote: (id: string) => void;
  updateQuoteField: (id: string, field: keyof Quote, value: string | number | boolean | string[]) => void;
  saveAndDownload: () => void;
  startNewComparison: () => void;
  sortedQuotes: Quote[];
  allCoverageOptions: string[];
}

// ============ QUOTE GENERATOR PAGE ============
function QuoteGeneratorPage(props: QuoteGeneratorPageProps) {
  const {
    quotes,
    businessType,
    setBusinessType,
    formData,
    setFormData,
    selectedCoverage,
    omanCover,
    setOmanCover,
    windscreenExcess,
    setWindscreenExcess,
    advisorComment,
    setAdvisorComment,
    vat,
    total,
    editingQuoteId,
    setEditingQuoteId,
    insuranceCompanies,
    hasProductTypes,
    handlePremiumChange,
    handleCompanyChange,
    handleProductTypeChange,
    handleCoverageToggle,
    addQuote,
    removeQuote,
    updateQuoteField,
    saveAndDownload,
    startNewComparison,
    sortedQuotes,
    allCoverageOptions,
  } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-5">
      {/* LEFT PANEL - FORM */}
      <div className="bg-white rounded-xl p-5 shadow-2xl max-h-[calc(100vh-150px)] overflow-y-auto">
        <h2 className="text-xl font-bold text-center mb-5 text-gray-800">Add Quote</h2>

        {/* Business Type */}
        <div className="bg-indigo-50 p-4 rounded-lg mb-4 border-2 border-indigo-200">
          <label className="block text-sm font-bold mb-2 text-gray-800">Business Type *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setBusinessType('Private')}
              className={`p-3 rounded-lg font-bold transition ${businessType === 'Private' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border-2 border-gray-300'}`}
            >
              🚗 Private
            </button>
            <button
              onClick={() => setBusinessType('Commercial')}
              className={`p-3 rounded-lg font-bold transition ${businessType === 'Commercial' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border-2 border-gray-300'}`}
            >
              🚚 Commercial
            </button>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-bold text-sm mb-3 text-gray-800">Vehicle Information</h3>
          
          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-gray-800">Enquiry Number *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
              placeholder="Enter enquiry number"
              value={formData.enquiryNumber}
              onChange={(e) => setFormData({ ...formData, enquiryNumber: e.target.value })}
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-gray-800">Customer Name *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm text-gray-900 bg-white"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-800">Vehicle Make *</label>
              <select className="w-full p-2 border rounded text-sm text-gray-900 bg-white" value={formData.vehicleMake} onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}>
                <option value="">Select Make</option>
                {VEHICLE_MAKES.map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-800">Vehicle Model *</label>
              <input type="text" className="w-full p-2 border rounded text-sm text-gray-900 bg-white" placeholder="e.g., Camry" value={formData.vehicleModel} onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-800">Year Model</label>
              <select className="w-full p-2 border rounded text-sm text-gray-900 bg-white" value={formData.yearModel} onChange={(e) => setFormData({ ...formData, yearModel: e.target.value })}>
                <option value="">Select Year</option>
                {YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-800">Vehicle Value</label>
              <input type="text" className="w-full p-2 border rounded text-sm text-gray-900 bg-white" placeholder="e.g., AED 85,000" value={formData.vehicleValue} onChange={(e) => setFormData({ ...formData, vehicleValue: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Quote Details */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-bold text-sm mb-3 text-gray-800">Quote Details</h3>

          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-gray-800">Insurance Company *</label>
            <select className="w-full p-2 border rounded text-sm text-gray-900 bg-white" value={formData.insuranceCompany} onChange={(e) => handleCompanyChange(e.target.value)}>
              <option value="">Select Company</option>
              {insuranceCompanies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>

          {hasProductTypes && (
            <div className="mb-3">
              <label className="block text-xs font-bold mb-1 text-gray-800">Product Type *</label>
              <select 
                className="w-full p-2 border rounded text-sm text-gray-900 bg-white" 
                value={formData.productType} 
                onChange={(e) => handleProductTypeChange(e.target.value)}
              >
                <option value="">Select Product Type</option>
                {COMPANY_PRODUCT_TYPES[formData.insuranceCompany].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-gray-800">Repair Type</label>
            <select className="w-full p-2 border rounded text-sm text-gray-900 bg-white" value={formData.repairType} onChange={(e) => setFormData({ ...formData, repairType: e.target.value })}>
              <option value="">Select Type</option>
              <option value="NA">NA</option>
              <option value="Agency">Agency</option>
              <option value="Non-Agency">Non-Agency</option>
              <option value="Agency/Non-Agency">Agency/Non-Agency</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-gray-800">Third Party Liability</label>
            <select className="w-full p-2 border rounded text-sm text-gray-900 bg-white" value={formData.thirdPartyLiability} onChange={(e) => setFormData({ ...formData, thirdPartyLiability: e.target.value })}>
              {THIRD_PARTY_LIABILITY_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-gray-800">Oman Cover</label>
            <select className="w-full p-2 border rounded text-sm text-gray-900 bg-white" value={omanCover} onChange={(e) => setOmanCover(e.target.value)}>
              {OMAN_COVER_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-gray-800">Windscreen Excess</label>
            <select className="w-full p-2 border rounded text-sm text-gray-900 bg-white" value={windscreenExcess} onChange={(e) => setWindscreenExcess(e.target.value)}>
              {WINDSCREEN_EXCESS_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-gray-800">Coverage Options</label>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-white p-2 rounded border">
              {COVERAGE_OPTIONS.map(option => (
                <label key={option.id} className="flex items-center gap-2 text-xs cursor-pointer text-gray-800">
                  <input type="checkbox" checked={selectedCoverage.includes(option.label)} onChange={() => handleCoverageToggle(option.label)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-800">Excess</label>
              <input type="number" className="w-full p-2 border rounded text-sm text-gray-900 bg-white" placeholder="1000" value={formData.excess || ''} onChange={(e) => setFormData({ ...formData, excess: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-800">Premium *</label>
              <input type="number" step="0.01" className="w-full p-2 border rounded text-sm text-gray-900 bg-white" placeholder="2500.00" value={formData.premium || ''} onChange={(e) => handlePremiumChange(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-800">VAT (5%)</label>
              <input type="text" className="w-full p-2 border rounded text-sm bg-gray-100 text-gray-900 font-semibold" value={vat.toFixed(2)} readOnly />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-800">Total Amount</label>
              <input type="text" className="w-full p-2 border rounded text-sm bg-gray-100 font-bold text-indigo-600" value={total.toFixed(2)} readOnly />
            </div>
          </div>

          <div className="flex gap-3 mb-3">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
              <input type="checkbox" checked={formData.isRecommended} onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })} />
              Recommended
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
              <input type="checkbox" checked={formData.isRenewal} onChange={(e) => setFormData({ ...formData, isRenewal: e.target.checked })} />
              Renewal
            </label>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-bold mb-1 text-gray-800">
              Advisor Comment (Optional)
            </label>
            <textarea
              className="w-full p-2 border-2 rounded text-sm text-gray-900 bg-white focus:border-indigo-500"
              placeholder="Enter specific comment for this insurance company..."
              rows={3}
              value={advisorComment}
              onChange={(e) => setAdvisorComment(e.target.value)}
            />
          </div>

          <button onClick={addQuote} className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition">
            ➕ Add Quote to Comparison
          </button>
        </div>

        {quotes.length > 0 && (
          <>
            <button onClick={saveAndDownload} className="w-full bg-green-600 text-white p-3 rounded-lg font-bold hover:bg-green-700 transition mb-2">
              💾 Save & Download ({quotes.length} quotes)
            </button>
            <button onClick={startNewComparison} className="w-full bg-orange-600 text-white p-3 rounded-lg font-bold hover:bg-orange-700 transition">
              🔄 Start New Comparison
            </button>
          </>
        )}
      </div>

      {/* RIGHT PANEL - COMPARISON TABLE */}
      <div className="bg-white rounded-xl p-5 shadow-2xl max-h-[calc(100vh-150px)] overflow-auto">
        <h2 className="text-xl font-bold text-center mb-5 text-gray-800">Live Comparison ({quotes.length})</h2>
        
        {quotes.length === 0 ? (
          <div className="text-center text-gray-400 italic py-20">
            Add quotes to see comparison table
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="sticky top-0 bg-white z-20">
                  <th className="bg-gray-200 p-2 border text-left sticky left-0 z-30 min-w-[150px] text-gray-900">Field</th>
                  {sortedQuotes.map((q) => (
                    <th key={q.id} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 border text-center min-w-[180px]">
                      <div className="font-bold text-sm mb-1">{q.company}</div>
                      {q.productType && <div className="text-xs mb-1 opacity-90">{q.productType.substring(0, 30)}{q.productType.length > 30 ? '...' : ''}</div>}
                      <div className="text-base font-bold">AED {q.total.toFixed(2)}</div>
                      <div className="flex gap-1 justify-center mt-2">
                        {editingQuoteId === q.id ? (
                          <button onClick={() => setEditingQuoteId(null)} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">
                            ✓ Done
                          </button>
                        ) : (
                          <button onClick={() => setEditingQuoteId(q.id)} className="bg-yellow-500 text-gray-900 px-2 py-1 rounded text-xs hover:bg-yellow-600">
                            ✏️ Edit
                          </button>
                        )}
                        <button onClick={() => removeQuote(q.id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                          🗑️
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Company */}
                <tr>
                  <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">Company</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-white text-gray-900">{q.company}</td>
                  ))}
                </tr>

                {/* Product Type */}
                <tr>
                  <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">Product Type</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-white text-gray-900 text-xs">{q.productType || 'N/A'}</td>
                  ))}
                </tr>

                {/* Repair Type */}
                <tr>
                  <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">Repair Type</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-white text-gray-900">
                      {editingQuoteId === q.id ? (
                        <select 
                          value={q.repairType} 
                          onChange={(e) => updateQuoteField(q.id, 'repairType', e.target.value)}
                          className="w-full p-1 border rounded text-xs text-gray-900"
                        >
                          <option value="NA">NA</option>
                          <option value="Agency">Agency</option>
                          <option value="Non-Agency">Non-Agency</option>
                          <option value="Agency/Non-Agency">Agency/Non-Agency</option>
                        </select>
                      ) : (
                        q.repairType
                      )}
                    </td>
                  ))}
                </tr>

                {/* Vehicle Value */}
                <tr>
                  <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">Vehicle Value</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-white text-gray-900">
                      {editingQuoteId === q.id ? (
                        <input 
                          type="text" 
                          value={q.value}
                          onChange={(e) => updateQuoteField(q.id, 'value', e.target.value)}
                          className="w-full p-1 border rounded text-xs text-gray-900"
                        />
                      ) : (
                        q.value
                      )}
                    </td>
                  ))}
                </tr>

                {/* Third Party Liability */}
                <tr>
                  <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">Third Party Liability</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-white text-gray-900">
                      {editingQuoteId === q.id ? (
                        <select 
                          value={q.thirdPartyLiability}
                          onChange={(e) => updateQuoteField(q.id, 'thirdPartyLiability', e.target.value)}
                          className="w-full p-1 border rounded text-xs text-gray-900"
                        >
                          {THIRD_PARTY_LIABILITY_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        q.thirdPartyLiability
                      )}
                    </td>
                  ))}
                </tr>

                {/* Oman Cover */}
                <tr>
                  <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">Oman Cover</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-white text-gray-900">
                      {editingQuoteId === q.id ? (
                        <select 
                          value={q.omanCover}
                          onChange={(e) => updateQuoteField(q.id, 'omanCover', e.target.value)}
                          className="w-full p-1 border rounded text-xs text-gray-900"
                        >
                          {OMAN_COVER_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        q.omanCover
                      )}
                    </td>
                  ))}
                </tr>

                {/* Windscreen Excess */}
                <tr>
                  <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">Windscreen Excess</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-white text-gray-900">
                      {editingQuoteId === q.id ? (
                        <select 
                          value={q.windscreenExcess}
                          onChange={(e) => updateQuoteField(q.id, 'windscreenExcess', e.target.value)}
                          className="w-full p-1 border rounded text-xs text-gray-900"
                        >
                          {WINDSCREEN_EXCESS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        q.windscreenExcess
                      )}
                    </td>
                  ))}
                </tr>

                {/* Coverage Options - SHOW ALL OPTIONS when editing */}
                {COVERAGE_OPTIONS.map(option => (
                  <tr key={option.id}>
                    <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">{option.label}</td>
                    {sortedQuotes.map(q => {
                      const included = q.coverageOptions.includes(option.label);
                      return (
                        <td key={q.id} className="p-2 border text-center bg-white">
                          {editingQuoteId === q.id ? (
                            <input 
                              type="checkbox"
                              checked={included}
                              onChange={(e) => {
                                const newOptions = e.target.checked 
                                  ? [...q.coverageOptions, option.label]
                                  : q.coverageOptions.filter(o => o !== option.label);
                                updateQuoteField(q.id, 'coverageOptions', newOptions);
                              }}
                            />
                          ) : (
                            <span className={included ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                              {included ? 'YES' : 'NO'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Excess */}
                <tr className="bg-blue-50">
                  <td className="p-2 border font-bold bg-gray-100 sticky left-0 z-10 text-gray-900">Excess</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-blue-50 text-gray-900">
                      {editingQuoteId === q.id ? (
                        <input 
                          type="number"
                          value={q.excess}
                          onChange={(e) => updateQuoteField(q.id, 'excess', parseFloat(e.target.value) || 0)}
                          className="w-full p-1 border rounded text-xs text-gray-900"
                        />
                      ) : (
                        `AED ${q.excess.toLocaleString()}`
                      )}
                    </td>
                  ))}
                </tr>

                {/* Premium */}
                <tr className="bg-blue-50">
                  <td className="p-2 border font-bold bg-gray-100 sticky left-0 z-10 text-gray-900">Premium</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-blue-50 text-gray-900">
                      {editingQuoteId === q.id ? (
                        <input 
                          type="number"
                          step="0.01"
                          value={q.premium}
                          onChange={(e) => updateQuoteField(q.id, 'premium', parseFloat(e.target.value) || 0)}
                          className="w-full p-1 border rounded text-xs text-gray-900"
                        />
                      ) : (
                        `AED ${q.premium.toFixed(2)}`
                      )}
                    </td>
                  ))}
                </tr>

                {/* VAT */}
                <tr className="bg-blue-50">
                  <td className="p-2 border font-bold bg-gray-100 sticky left-0 z-10 text-gray-900">VAT (5%)</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-blue-50 text-gray-900">
                      AED {q.vat.toFixed(2)}
                    </td>
                  ))}
                </tr>

                {/* Total */}
                <tr className="bg-blue-100">
                  <td className="p-2 border font-bold bg-gray-100 sticky left-0 z-10 text-gray-900">Total Premium</td>
                  {sortedQuotes.map((q) => (
                    <td key={q.id} className="p-2 border text-center font-bold bg-blue-100 text-gray-900 text-base">
                      AED {q.total.toFixed(2)}
                    </td>
                  ))}
                </tr>

                {/* Advisor Comment */}
                <tr>
                  <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">Advisor Comment</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-white text-gray-900">
                      {editingQuoteId === q.id ? (
                        <textarea 
                          value={q.advisorComment}
                          onChange={(e) => updateQuoteField(q.id, 'advisorComment', e.target.value)}
                          className="w-full p-1 border rounded text-xs text-gray-900"
                          rows={2}
                          placeholder="Optional"
                        />
                      ) : (
                        <div className="text-xs text-left">{q.advisorComment || '-'}</div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Status */}
                <tr>
                  <td className="p-2 border font-bold bg-gray-50 sticky left-0 z-10 text-gray-900">Status</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border text-center bg-white">
                      <div className="flex flex-col gap-1">
                        {editingQuoteId === q.id ? (
                          <>
                            <label className="flex items-center justify-center gap-1 text-xs text-gray-900">
                              <input 
                                type="checkbox"
                                checked={q.isRecommended}
                                onChange={(e) => updateQuoteField(q.id, 'isRecommended', e.target.checked)}
                              />
                              Recommended
                            </label>
                            <label className="flex items-center justify-center gap-1 text-xs text-gray-900">
                              <input 
                                type="checkbox"
                                checked={q.isRenewal}
                                onChange={(e) => updateQuoteField(q.id, 'isRenewal', e.target.checked)}
                              />
                              Renewal
                            </label>
                          </>
                        ) : (
                          <>
                            {q.isRecommended && <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">⭐ Recommended</span>}
                            {q.isRenewal && <span className="bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-xs">🔄 Renewal</span>}
                            {!q.isRecommended && !q.isRenewal && <span className="text-gray-400 text-xs">-</span>}
                          </>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ SAVED HISTORY PAGE ============
interface SavedHistoryPageProps {
  loadComparison: (comparison: SavedComparison) => void;
}

function SavedHistoryPage({ loadComparison }: SavedHistoryPageProps) {
  const [history, setHistory] = useState<SavedComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Try to load from cloud first
      const response = await fetch('/api/history');
      const result = await response.json();
      
      if (result.success && result.history.length > 0) {
        setHistory(result.history);
        // Also save to localStorage as backup
        localStorage.setItem('quotesHistory', JSON.stringify(result.history));
      } else {
        // Fallback to localStorage if cloud is empty
        const localHistory = JSON.parse(localStorage.getItem('quotesHistory') || '[]');
        setHistory(localHistory);
        
        // If localStorage has data, sync it to cloud
        if (localHistory.length > 0) {
          await saveHistoryToCloud(localHistory);
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
      // Fallback to localStorage on error
      const localHistory = JSON.parse(localStorage.getItem('quotesHistory') || '[]');
      setHistory(localHistory);
    } finally {
      setLoading(false);
    }
  };

  const saveHistoryToCloud = async (historyData: SavedComparison[]) => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyData }),
      });
    } catch (error) {
      console.error('Error saving history to cloud:', error);
    }
  };

  const deleteComparison = async (id: string) => {
    if (!confirm('Delete this comparison?')) return;
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('quotesHistory', JSON.stringify(updated));
    await saveHistoryToCloud(updated);
  };

  const downloadComparison = (comparison: SavedComparison) => {
    const sortedQuotes = [...comparison.quotes].sort((a, b) => a.total - b.total);
    const allCoverageOptions = [...new Set(comparison.quotes.flatMap(q => q.coverageOptions))];
    
    const htmlContent = generateHTMLContentHelper(sortedQuotes, allCoverageOptions, comparison.referenceNumber);
    const fileName = `NSIB_${comparison.quotes[0].customerName.replace(/\s/g, '_')}_${comparison.quotes[0].make}_${comparison.quotes[0].model}_${comparison.referenceNumber}.html`;
    
    downloadHTMLFile(htmlContent, fileName);
    alert(`✅ Downloaded: ${fileName}`);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-2xl">
        <div className="text-center py-20">
          <div className="text-xl font-bold text-gray-600">☁️ Loading history from cloud...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Saved History</h2>
          <p className="text-sm text-gray-600">☁️ Synced across all devices • Survives cache clearing</p>
        </div>
        <button 
          onClick={loadHistory}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          🔄 Refresh
        </button>
      </div>
      
      {history.length === 0 ? (
        <div className="text-center text-gray-400 italic py-20">
          No saved comparisons yet. Create a comparison and save it to see it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map(comparison => (
            <div key={comparison.id} className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-lg border-2 border-gray-200 hover:border-indigo-400 transition shadow-sm hover:shadow-md">
              <div className="mb-3">
                <div className="font-bold text-lg text-gray-900">{comparison.vehicle}</div>
                <div className="text-xs text-gray-500">{formatDate(comparison.date)}</div>
                <div className="text-xs text-indigo-600 font-mono">Ref: {comparison.referenceNumber}</div>
              </div>
              
              <div className="mb-3">
                <div className="text-sm text-gray-700 mb-2"><strong>Quotes:</strong> {comparison.quotes.length}</div>
                <div className="text-xs text-gray-600 max-h-24 overflow-y-auto">
                  {comparison.quotes.map(q => (
                    <div key={q.id} className="truncate">
                      • {q.company} - AED {q.total.toFixed(2)}
                      {q.isRenewal && ' 🔄'}
                      {q.isRecommended && ' ⭐'}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => loadComparison(comparison)} 
                  className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-indigo-700 transition"
                >
                  ✏️ Load & Edit
                </button>
                {comparison.fileUrl && (
                  <a 
                    href={comparison.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-700 transition text-center"
                  >
                    🔗 View
                  </a>
                )}
                <button 
                  onClick={() => downloadComparison(comparison)} 
                  className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-purple-700 transition"
                >
                  📥
                </button>
                <button onClick={() => deleteComparison(comparison.id)} className="bg-red-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-red-700 transition">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
