'use client';

import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AppShell, { AppView } from '@/components/AppShell';
import EnquiryPicker from '@/components/EnquiryPicker';
import { workDriveNote } from '@/lib/zoho-client';
import type { WorkDriveResult, ZohoEnquiry } from '@/types/zoho';
import { ABOUT_US_HERO } from './aboutUsHero';
import { REPORT_FONT } from './reportFont';
import { GOOGLE_LOGO } from './googleLogo';
import { COMPANY_LOGOS } from './companyLogos';

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
  additionalExcess: string;
  additionalExcessDetails: string;
  premium: number;
  vat: number;
  total: number;
  isRecommended: boolean;
  isRenewal: boolean;
  advisorComment: string;
  recovered?: boolean;
  // Optional Covers. Optional fields so records saved before this section still
  // parse — read them through readDriverCover/readPassengerCover/readRentACar.
  driverCover?: string;
  driverCoverAmount?: number;
  passengerCover?: string;
  passengerCoverAmount?: number;
  rentACar?: boolean;
  rentACarDays?: string;
  rentACarPremium?: number;
  // Rent a Car comes at no extra cost - the charge field is then unused.
  rentACarIncluded?: boolean;
}

interface SavedComparison {
  id: string;
  date: string;
  vehicle: string;
  quotes: Quote[];
  referenceNumber: string;
  fileUrl?: string;
  createdBy?: string;
  rebuilt?: boolean;
  // The Zoho CRM enquiry this comparison is filed under in WorkDrive. Older
  // comparisons carry only the number typed into each quote, and no link.
  enquiry?: ZohoEnquiry | null;
}

interface CompanyDefaults {
  repairType: string;
  thirdPartyLiability: string;
  omanCover: string;
  windscreenExcess: string;
  coverageOptions: string[];
}

// ============ COMPANY LOGOS ============
// Trimmed and embedded in companyLogos.ts so every logo fills the report box.

// ============ CONSTANTS FROM GOOGLE SHEETS ============
const VEHICLE_MAKES = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Avatr', 'BAIC Motor', 'Bentley', 'Bestune', 'BMW',
  'Bugatti', 'Buick', 'BYD', 'Cadillac', 'Changan', 'Chery', 'Chevrolet', 'Chrysler',
  'Citroën', 'CMC', 'Dacia', 'Daewoo', 'Daihatsu', 'Deepal', 'Dodge', 'Dongfeng' , 'DFSK' , 'Ducati', 'Exeed', 'Ferrari',
  'Fiat', 'Ford', 'Foton', 'Force - Urbania(Mini Bus)', 'GAC Motor', 'Geely', 'Genesis', 'GMC', 'Great Wall', 'Haval', 'Higer',
  'Hino 300', 'Honda', 'Hongqi', 'Hummer', 'Hyundai', 'Infiniti', 'Isuzu', 'JAC Motors',
  'Jaecoo', 'Jaguar', 'Jeep', 'Jetour', 'Kia',  'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln',
  'Lotus', 'Maserati', 'Mazda', 'Maxus', 'McLaren', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi',
  'Moto Morini', 'Nio', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'RAM', 'Renault', 'Rolls-Royce',
  'Saab', 'Seat', 'Skoda', 'Smart', 'SsangYong', 'Subaru', 'Suzuki', 'Tesla', 'Tata',
  'Toyota', 'Victory', 'Volkswagen', 'Volvo', 'Wey', 'Zeekr', 'King Long(Bus)', 'King Long(Van)', 'Ashok Leyland (BUS)', 'Ashok Leyland (Pickup)'
];

const YEARS = [
  '2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017',
  '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007',
  '2006', '2005', '2004', '2003', '2002', '2001', '2000', '1999', '1998', '1997',
  '1996', '1995', '1994', '1993', '1992', '1991', '1990'
];

const PRIVATE_INSURANCE_COMPANIES = [
  'SUKOON', 'SUKOON TAKAFUL', 'DNI', 'QATAR', 'WATANIA', 'ADAMJEE', 'FIDELITY', 'LIVA', 'EMIRATES',
  'RAK', 'SALAMA','INSURANCE HOUSE', 'NEW INDIA DXB', 'METHAQ', 'NGI', 'GIG', 'AL WATHBA', 'ORIENT INSRANCE', 'ORIENT TAKAFUL', 'AL ITTIHAD AL WATANI',
  'UNION INSURANCE', 'NIA ABU DHABI', 'AL BUHAIRA', 'AL SAGR'
];

const COMMERCIAL_INSURANCE_COMPANIES = [
  'SUKOON', 'ADAMJEE', 'METHAQ (ind. pickup)', 'NEW INDIA ABU DHABI',
  'DNIRC', 'NIA DXB','INSURANCE HOUSE', 'AL SAGR', 'AL BUHAIRA', 'EMIRATES', 'AL ITTIHAD AL WATANI', 'NGI'
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
  ],
  'GIG': ['MOTOR PRESTIGE', 'MOTOR PERFECT PLUS', 'MOTOR PERFECT']
};

// Insurers that borrow another's defaults. Only getCompanyDefaults follows this
// - deliberately not COMPANY_PRODUCT_TYPES, so Sukoon Takaful quotes on Sukoon's
// terms without offering Sukoon's plan names, and its Product Type field stays
// hidden. The quote also keeps the name that was picked, so the report still
// prints Sukoon Takaful's own name and logo.
const COMPANY_DEFAULTS_ALIASES: Record<string, string> = {
  'SUKOON TAKAFUL': 'SUKOON',
  'ORIENT TAKAFUL': 'ORIENT INSRANCE'
};

const aliasedCompany = (company: string): string =>
  COMPANY_DEFAULTS_ALIASES[company] || company;

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

// Driver Cover, Passengers Cover and Rent a Car used to live here as plain
// checkboxes. They are now structured fields in the Optional Covers section
// below, so they are deliberately absent from this list — see
// LEGACY_BENEFIT_LABELS for how the old values are still read back.
const COVERAGE_OPTIONS = [
  { id: 'fireTheft', label: 'Fire and theft cover' },
  { id: 'floodStormNatural', label: 'Flood, Storm and Natural Calamity damages' },
  { id: 'warRiotStrike', label: 'War, Riot or Strike damages' },
  { id: 'emergencyMedical', label: 'Emergency medical expenses' },
  { id: 'personalBelongings', label: 'Personal belongings' },
  { id: 'offroadCover', label: 'Off-road cover (For 4x4 only)' },
  { id: 'accidentRecovery', label: '24 Hour Accident and Breakdown Recovery' },
  { id: 'ambulanceCover', label: 'Ambulance Cover' }
];

// ============ OPTIONAL COVERS ============
// Configurable option lists — edit these to change what the dropdowns offer.
// No option list for these existed before (they were booleans), so 'NA' is the
// neutral default, matching OMAN_COVER_OPTIONS / WINDSCREEN_EXCESS_OPTIONS.
// Selecting this reveals a free-text AED box under the dropdown.
const MANUAL_AMOUNT_OPTION = 'Amount (AED)';

const DRIVER_COVER_OPTIONS = ['Included', 'Excluded', MANUAL_AMOUNT_OPTION];

const PASSENGER_COVER_OPTIONS = ['Included', 'Excluded', MANUAL_AMOUNT_OPTION];

const RENT_A_CAR_DAYS_OPTIONS = ['5 Days', '7 Days', '10 Days'];

// The labels these three benefits carried while they were coverage checkboxes.
// Kept so per-company defaults and pre-existing saved records still resolve.
const LEGACY_DRIVER_COVER_LABEL = 'Optional Covers Driver Cover';
const LEGACY_PASSENGER_COVER_LABEL = 'Passengers Cover';
const LEGACY_RENT_A_CAR_LABEL = 'Rent a Car';
const LEGACY_BENEFIT_LABELS = [
  LEGACY_DRIVER_COVER_LABEL,
  LEGACY_PASSENGER_COVER_LABEL,
  LEGACY_RENT_A_CAR_LABEL
];

// Splits a legacy coverage list into the remaining checkbox coverages plus the
// three structured benefits, so a company's existing defaults keep their meaning.
const splitLegacyBenefits = (labels: string[] = []) => ({
  coverage: labels.filter(label => !LEGACY_BENEFIT_LABELS.includes(label)),
  driverCover: labels.includes(LEGACY_DRIVER_COVER_LABEL) ? 'Included' : 'Excluded',
  passengerCover: labels.includes(LEGACY_PASSENGER_COVER_LABEL) ? 'Included' : 'Excluded',
  rentACar: labels.includes(LEGACY_RENT_A_CAR_LABEL)
});

// Readers that fall back to the legacy label, so comparisons and reports built
// from records saved before this section still show the right values.
const readDriverCover = (q: Quote) =>
  q.driverCover ?? (q.coverageOptions?.includes(LEGACY_DRIVER_COVER_LABEL) ? 'Included' : 'Excluded');
const readPassengerCover = (q: Quote) =>
  q.passengerCover ?? (q.coverageOptions?.includes(LEGACY_PASSENGER_COVER_LABEL) ? 'Included' : 'Excluded');
const readRentACar = (q: Quote) =>
  q.rentACar ?? Boolean(q.coverageOptions?.includes(LEGACY_RENT_A_CAR_LABEL));

// One number format for every amount on screen and in the report: thousand
// separators, pinned to en-US so a machine set to another locale cannot print
// "1.000". fmtMoney always shows cents (premium, VAT, total); fmtWhole is for
// round figures like an excess or a sum insured, where a trailing ".00" is noise.
const fmtMoney = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtWhole = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 });

// A cover set to "Amount (AED)" displays as the amount that was typed.
const formatCoverValue = (value: string, amount?: number) =>
  value === MANUAL_AMOUNT_OPTION
    ? (amount ? 'AED ' + fmtWhole(amount) : MANUAL_AMOUNT_OPTION)
    : (value || 'Excluded');

// Keeps a stored value selectable even if it predates the current option list
// (e.g. the old 'Covered' / 'Not Covered' wording), so editing never blanks it.
const withStoredValue = (options: string[], value: string) =>
  value && !options.includes(value) ? [value, ...options] : options;

// ============ COMPREHENSIVE DEFAULTS SYSTEM ============
// 'War, Riot or Strike damages' is deliberately in no company's coverageOptions:
// it is rarely granted, so it starts unticked everywhere and the advisor ticks it
// per quote. The report builds its benefit rows from the options actually ticked,
// so leaving it alone keeps the row off the sheet entirely.
const getCompanyDefaults = (company: string, productType?: string): CompanyDefaults => {
  const defaultValues: CompanyDefaults = {
    repairType: 'NA',
    thirdPartyLiability: 'NA',
    omanCover: 'NA',
    windscreenExcess: 'NA',
    coverageOptions: []
  };

  const companyDefaults: Record<string, CompanyDefaults> = {
    // Tested against Privilege Club rather than Gold so that picking the company
    // alone - before any plan - already lands on the Gold figures, which is what
    // most Sukoon quotes use. Privilege Club still lifts them when chosen.
    'SUKOON': {
      repairType: '',
      thirdPartyLiability: productType === 'Privilege Club' ? 'UPTO AED 5 Million' : 'UPTO AED 3.5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: productType === 'Privilege Club' ? 'UNLIMITED' : 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'DNI': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: productType === 'Standard' ? 'UPTO AED 3500' : 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'QATAR': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'WATANIA': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'ADAMJEE': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'FIDELITY': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'LIVA': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'EMIRATES': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2500',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'RAK': {
      repairType: 'Non-Agency',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'SALAMA': {
      repairType: 'Non-Agency',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2500',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'NEW INDIA DXB': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'METHAQ': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'NGI': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'GIG': {
      repairType: productType === 'MOTOR PERFECT' ? 'Non-Agency' : 'Agency',
      thirdPartyLiability: productType === 'MOTOR PRESTIGE' ? 'UPTO AED 5 Million' : 'UPTO AED 3.5 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover', 'Rent a Car']
    },
    'AL WATHBA': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 1500',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'ORIENT INSRANCE': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'UNION INSURANCE': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 1000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'NIA ABU DHABI': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'AL SAGR': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    }
  };

  return companyDefaults[aliasedCompany(company)] || defaultValues;
};

// Rent a Car is quoted either at no extra cost or as a separate charge. The
// charge is quoted on its own row and stays out of the total; this only keeps
// the amount honest, so an unticked or no-charge Rent a Car carries no figure.
interface RentACarFields {
  rentACar?: boolean;
  rentACarIncluded?: boolean;
  rentACarPremium?: number;
}

const rentACarCharge = (source: RentACarFields): number =>
  source.rentACar && !source.rentACarIncluded ? source.rentACarPremium || 0 : 0;

const calculateVAT = (premium: number): { vat: number; total: number } => {
  const vat = Math.round(premium * 0.05 * 100) / 100;
  const total = Math.round((premium + vat) * 100) / 100;
  return { vat, total };
};

// Every money figure on screen and in the report is derived from the premium
// rather than read back from the stored total. A record written while the Rent
// a Car charge was briefly rolled into the total would otherwise keep printing
// that inflated figure for good.
const quoteTotals = (q: Quote): { vat: number; total: number } => calculateVAT(q.premium || 0);

// The report's closing figure: the premium sub-total plus whatever the Rent a
// Car cover costs on top, that charge carrying the same 5% VAT as the premium.
// The VAT on it is folded in silently - the report's own VAT (5%) row and the
// Sub-Total stay on the premium alone, and a Rent a Car quoted at no extra cost
// adds nothing. Report only - every on-screen total stays free of the charge.
const grandTotal = (q: Quote): number => {
  const rentACar = rentACarCharge(q);
  const rentACarPayable = rentACar ? calculateVAT(rentACar).total : 0;
  return Math.round((quoteTotals(q).total + rentACarPayable) * 100) / 100;
};

// Column order for the comparison table, on screen and in the report. Quotes
// marked as the renewal come first so the customer reads their existing cover
// before the alternatives; everything else stays cheapest-first.
const sortQuotesForDisplay = (list: Quote[]): Quote[] =>
  [...list].sort((a, b) => {
    if (a.isRenewal !== b.isRenewal) return a.isRenewal ? -1 : 1;
    return quoteTotals(a).total - quoteTotals(b).total;
  });

// The browser cache is a convenience only; the cloud history is the source of
// truth. Capped because localStorage tops out around 5MB and the full shared
// history is far larger than that - an over-quota setItem throws and would
// otherwise abort the caller mid-save.
const LOCAL_CACHE_LIMIT = 50;

// Editing a field in the live comparison fires on every keystroke, so the cloud
// write waits for the typing to stop. Without this each character was its own
// POST to /api/history.
const AUTO_SAVE_DEBOUNCE_MS = 1200;

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

// ============ TOASTS ============
// Everything that only reports progress - quote added, saved, a field left
// blank - used to be an alert(), so building one comparison meant dismissing a
// blocking dialog a dozen times. These stack in the corner and clear
// themselves. Only a genuine failure stays put, since it needs acting on.
type ToastTone = 'success' | 'info' | 'warn' | 'error';
type Toast = { id: number; message: string; tone: ToastTone };

const TOAST_DISMISS_MS: Record<ToastTone, number> = {
  success: 3500,
  info: 3500,
  warn: 5000,
  error: 0, // stays until dismissed
};

// A module-level bus rather than context: the notices are raised from plain
// handlers all over this file, and none of them should have to be passed a
// setter to say "saved".
let toastSeq = 0;
const toastListeners = new Set<(toast: Toast) => void>();
const notify = (message: string, tone: ToastTone = 'info'): void => {
  toastSeq += 1;
  const toast: Toast = { id: toastSeq, message, tone };
  toastListeners.forEach(listener => listener(toast));
};

const TOAST_STYLES: Record<ToastTone, string> = {
  success: 'border-l-emerald-500',
  info: 'border-l-nsib-gold-dark',
  warn: 'border-l-amber-500',
  error: 'border-l-nsib-red',
};

function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const add = (toast: Toast) => {
      // Capped so a burst of validation misses can't fill the screen.
      setToasts(list => [...list, toast].slice(-4));
      const ttl = TOAST_DISMISS_MS[toast.tone];
      if (ttl > 0) {
        timers.push(setTimeout(() => {
          setToasts(list => list.filter(t => t.id !== toast.id));
        }, ttl));
      }
    };

    toastListeners.add(add);
    return () => {
      toastListeners.delete(add);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(24rem,calc(100vw-2.5rem))] print:hidden">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`flex items-start gap-3 bg-white text-nsib-ink text-sm rounded-xl shadow-card ring-1 ring-nsib-sand border-l-4 px-4 py-3 ${TOAST_STYLES[toast.tone]}`}
        >
          <span className="flex-1 whitespace-pre-line">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
            className="text-nsib-muted hover:text-nsib-ink text-lg leading-none px-1"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

const cacheComparisonLocally = (item: SavedComparison): void => {
  try {
    const cached: SavedComparison[] = JSON.parse(localStorage.getItem('quotesHistory') || '[]');
    const existingIndex = cached.findIndex((h: SavedComparison) => h.referenceNumber === item.referenceNumber);

    if (existingIndex !== -1) {
      if (!item.fileUrl && cached[existingIndex].fileUrl) {
        item.fileUrl = cached[existingIndex].fileUrl;
      }
      cached[existingIndex] = item;
    } else {
      cached.unshift(item);
    }

    localStorage.setItem('quotesHistory', JSON.stringify(cached.slice(0, LOCAL_CACHE_LIMIT)));
  } catch (error) {
    console.warn('Local cache write skipped:', error);
  }
};

const generateReferenceNumber = (): string => {
  const timestamp = Date.now();
  const last4 = timestamp.toString().slice(-4);
  const random2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${last4}${random2}`;
};

// Helper function to get current user's name
const getCurrentUserName = (): string => {
  if (typeof window === 'undefined') return 'Unknown';
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.name || user.email || 'Unknown';
    }
  } catch (e) {
    console.error('Error getting user name:', e);
  }
  return 'Unknown';
};

// ============ PAGE 1 (ABOUT US) ICONS ============
// Inline SVG rather than hosted images: the report is a standalone HTML file, so
// every icon has to travel inside it. Gold glyphs sit on the maroon discs.
const GOLD = '#EFC55E';
const AU_ICONS = {
  shield: `<svg viewBox="0 0 24 24"><path d="M12 1.8 3.8 4.9v6.4c0 5.1 3.5 9.4 8.2 10.9 4.7-1.5 8.2-5.8 8.2-10.9V4.9L12 1.8z" fill="${GOLD}"/><path d="M8.2 12.1l2.6 2.6 5-5" fill="none" stroke="#5C1A0F" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  team: `<svg viewBox="0 0 24 24" fill="${GOLD}"><circle cx="8.5" cy="7.5" r="3.3"/><circle cx="17.2" cy="8.3" r="2.5"/><path d="M2.2 19.5c0-3.5 2.9-5.7 6.3-5.7s6.3 2.2 6.3 5.7v.8H2.2v-.8z"/><path d="M16.5 13.9c3 .3 5.3 2 5.3 4.8v1.6h-4.5v-1.8c0-1.7-.4-3.2-1.2-4.6z"/></svg>`,
  scales: `<svg viewBox="0 0 24 24"><g fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.2v16.1"/><path d="M4.6 7 19.4 5.3"/><path d="M8 20.3h8"/><path d="M2.2 14.4 5.2 7.9l3 6.5"/><path d="M2.2 14.4c0 1.5 1.4 2.7 3 2.7s3-1.2 3-2.7"/><path d="M15.8 12.8l3-6.5 3 6.5"/><path d="M15.8 12.8c0 1.5 1.4 2.7 3 2.7s3-1.2 3-2.7"/></g><circle cx="12" cy="4.1" r="1.7" fill="${GOLD}"/></svg>`,
  partners: `<svg viewBox="0 0 24 24"><g stroke="${GOLD}" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M12 7.2 5.6 15.9"/><path d="M12 7.2l6.4 8.7"/><path d="M7.9 17.4h8.2"/></g><g fill="${GOLD}"><circle cx="12" cy="4.9" r="2.9"/><circle cx="5" cy="17.7" r="2.9"/><circle cx="19" cy="17.7" r="2.9"/></g></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="${GOLD}"><path d="M12 1.9l3.1 6.2 6.9 1-5 4.8 1.2 6.8L12 17.5l-6.2 3.2L7 13.9l-5-4.8 6.9-1z"/></svg>`,
  claim: `<svg viewBox="0 0 24 24"><rect x="3.6" y="2.4" width="13" height="19.2" rx="1.9" fill="${GOLD}"/><g stroke="#5C1A0F" stroke-width="1.5" stroke-linecap="round"><path d="M6.8 7.1h6.6"/><path d="M6.8 10.5h6.6"/><path d="M6.8 13.9h3.4"/></g><circle cx="17.6" cy="16.9" r="4.7" fill="${GOLD}" stroke="#5C1A0F" stroke-width="1"/><path d="m15.5 16.9 1.6 1.6 3-3.1" fill="none" stroke="#5C1A0F" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  person: `<svg viewBox="0 0 24 24" fill="${GOLD}"><circle cx="12" cy="7.4" r="4.1"/><path d="M3.8 20.8c0-4.3 3.7-7.1 8.2-7.1s8.2 2.8 8.2 7.1v.6H3.8v-.6z"/></svg>`,
  target: `<svg viewBox="0 0 24 24"><g fill="none" stroke="${GOLD}" stroke-width="1.9"><circle cx="12" cy="12" r="8.7"/><circle cx="12" cy="12" r="4.6"/></g><circle cx="12" cy="12" r="1.9" fill="${GOLD}"/></svg>`,
  clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.8" fill="none" stroke="${GOLD}" stroke-width="1.9"/><path d="M12 6.5V12l3.9 2.4" fill="none" stroke="${GOLD}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// 4.7 of 5: four solid stars plus one filled to 70%.
const AU_STARS = `<svg viewBox="0 0 98 18" class="au-star-row">
                <defs><linearGradient id="auHalf" x1="0" x2="1" y1="0" y2="0"><stop offset="70%" stop-color="${GOLD}"/><stop offset="70%" stop-color="#E2D3BC"/></linearGradient></defs>
                <g fill="${GOLD}"><path d="M9 1.1l2.4 4.9 5.4.8-3.9 3.8.9 5.3L9 13.4l-4.8 2.5.9-5.3L1.2 6.8l5.4-.8z"/><path transform="translate(20 0)" d="M9 1.1l2.4 4.9 5.4.8-3.9 3.8.9 5.3L9 13.4l-4.8 2.5.9-5.3L1.2 6.8l5.4-.8z"/><path transform="translate(40 0)" d="M9 1.1l2.4 4.9 5.4.8-3.9 3.8.9 5.3L9 13.4l-4.8 2.5.9-5.3L1.2 6.8l5.4-.8z"/><path transform="translate(60 0)" d="M9 1.1l2.4 4.9 5.4.8-3.9 3.8.9 5.3L9 13.4l-4.8 2.5.9-5.3L1.2 6.8l5.4-.8z"/></g>
                <path fill="url(#auHalf)" transform="translate(80 0)" d="M9 1.1l2.4 4.9 5.4.8-3.9 3.8.9 5.3L9 13.4l-4.8 2.5.9-5.3L1.2 6.8l5.4-.8z"/>
              </svg>`;

// ============ PAGE 2 MARKS ============
// Inline so they travel inside the standalone HTML file.
const R_YES = `<svg class="r-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1E8E4A"/><path d="M7.4 12.3l3.1 3.1 6.1-6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const R_NO = `<svg class="r-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#C0392B"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;

// ============ PAGE 2 ICONS ============
// Stroke-only line glyphs so a single `color` rule tints them: gold on the
// maroon section bars, maroon beside the row labels.
// Takes a glyph NAME and resolves it here, falling back to the tick, so an
// unmapped name can never render the string "undefined" into the report.

// Ink bounds - x, y, width, height - of every glyph below, measured off the
// rendered drawing (stroke included) in its own 24-unit grid. The set was drawn
// by eye against no common frame, so the artwork runs from 12.4 units across
// (sum) to 20.8 (scales); on one shared viewBox that prints as a column of
// icons at visibly different sizes, the sigma reading small and the scales and
// mountain overflowing their neighbours. Re-measure a row here if its path is
// ever redrawn.
const R_GLYPH_BOX: Record<string, [number, number, number, number]> = {
  shield:       [  4.2,   1.9,  15.6,  19.5],
  shieldCheck:  [  4.2,   1.9,  15.6,  19.5],
  car:          [  3.6,   6.8,  16.8,  11.9],
  calendar:     [  3.8,   3.6,  16.4,  16.6],
  tag:          [    2,   2.6,    19,    19],
  wrench:       [    3,   5.1,  15.8,  15.8],
  glass:        [  4.2,   6.9,  15.6,   9.7],
  scales:       [  1.6,   3.4,  20.8,  17.2],
  globe:        [  2.6,   2.6,  18.8,  18.8],
  coins:        [  4.4,   3.2,  15.2,  17.6],
  percent:      [  4.4,   4.4,  15.2,  15.2],
  sum:          [  5.8,   4.6,  12.4,  14.8],
  wallet:       [  3.6,   3.4,  16.8,    17],
  plus:         [  2.6,   2.6,  18.8,  18.8],
  user:         [  3.9,   3.6,  16.2,    17],
  users:        [  2.2,     4,    20,  16.4],
  key:          [  3.8,   3.2,  15.8,  14.8],
  pencil:       [    5,   3.6,  15.4,  15.4],
  doc:          [  5.4,   2.6,  13.8,  18.8],
  check:        [  3.8,   5.8,  16.4,  12.4],
  clock:        [  2.6,   2.6,  18.8,  18.8],
  flame:        [  6.3,   2.2,  11.4,    16],
  storm:        [  3.1,   3.5,  16.5,  17.1],
  alert:        [  2.9,   2.8,  18.2,  16.8],
  medkit:       [  2.6,   3.5,  18.8,  16.5],
  bag:          [  3.4,   2.6,  17.2,  18.2],
  mountain:     [  1.8,   7.2,  20.4,  12.6],
  ambulance:    [  1.9,   7.7,    20,  12.5],
};

// Share of the icon box the artwork should cover on its longer side. Every
// glyph is framed to this, so a tall one and a wide one read as the same
// weight on the page rather than the same fraction of whatever grid each was
// drawn on. 0.88 leaves just enough air that a round glyph's edge does not
// touch the label beside it.
const R_ICON_FILL = 0.88;
// The stroke is 1.9 units on the original 24-unit grid. Framing a small glyph
// means a smaller viewBox and therefore a bigger scale factor, which would
// fatten its stroke in proportion; holding the stroke to this same share of
// whatever viewBox we end up with keeps one line weight across the set.
const R_ICON_STROKE = 1.9 / 24;

const rNum = (n: number): string => String(Math.round(n * 1000) / 1000);

const rIcon = (name: string, cls: string): string => {
  const key = R_GLYPH[name] ? name : 'check';
  const [bx, by, bw, bh] = R_GLYPH_BOX[key];
  // The measured box includes the stroke - half a stroke either side - so take
  // that back off to get the path's own extent before sizing the frame to it.
  const span = Math.max(bw, bh) - 1.9;
  const side = span / (R_ICON_FILL - R_ICON_STROKE);
  const view = `${rNum(bx + bw / 2 - side / 2)} ${rNum(by + bh / 2 - side / 2)} ${rNum(side)} ${rNum(side)}`;
  return `<svg class="${cls}" viewBox="${view}" fill="none" stroke="currentColor" stroke-width="${rNum(R_ICON_STROKE * side)}" stroke-linecap="round" stroke-linejoin="round">${R_GLYPH[key]}</svg>`;
};

const R_GLYPH: Record<string, string> = {
  shield: '<path d="M12 2.9 5.2 5.6v5.5c0 4.4 2.9 8.2 6.8 9.3 3.9-1.1 6.8-4.9 6.8-9.3V5.6L12 2.9Z"/>',
  shieldCheck: '<path d="M12 2.9 5.2 5.6v5.5c0 4.4 2.9 8.2 6.8 9.3 3.9-1.1 6.8-4.9 6.8-9.3V5.6L12 2.9Z"/><path d="M9 11.9l2.1 2.1 4-4.2"/>',
  car: '<path d="M4.6 16.1v-3l1.6-4.1a1.8 1.8 0 0 1 1.7-1.2h8.2a1.8 1.8 0 0 1 1.7 1.2l1.6 4.1v3"/><path d="M4.6 13.1h14.8"/><path d="M7.7 16.1v1.6"/><path d="M16.3 16.1v1.6"/>',
  calendar: '<path d="M4.8 6.6h14.4v12.6H4.8z"/><path d="M4.8 10.4h14.4"/><path d="M8.6 4.6v4"/><path d="M15.4 4.6v4"/>',
  tag: '<path d="M11.4 3.6H20v8.6l-8.4 8.4-8.6-8.6z"/><path d="M16.2 8h.01"/>',
  wrench: '<path d="M15.4 6.4a4.1 4.1 0 0 0-5.4 5.4L4 17.8v2.1h2.1l6-6a4.1 4.1 0 0 0 5.4-5.4l-2.5 2.5-2.1-2.1z"/>',
  glass: '<path d="M5.2 15.6 7.9 7.9h8.2l2.7 7.7z"/><path d="M9.6 7.9v7.7"/><path d="M14.4 7.9v7.7"/>',
  scales: '<path d="M12 4.4v15.2"/><path d="M7.6 19.6h8.8"/><path d="M4.8 6.6 19.2 5"/><path d="m2.6 14 3-6.4L8.7 14"/><path d="M2.6 14c0 1.4 1.4 2.5 3 2.5s3-1.1 3-2.5"/><path d="m15.3 12.6 3-6.4 3.1 6.4"/><path d="M15.3 12.6c0 1.4 1.4 2.5 3 2.5s3.1-1.1 3.1-2.5"/>',
  globe: '<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/><path d="M12 3.6a13 13 0 0 1 0 16.8 13 13 0 0 1 0-16.8Z"/>',
  coins: '<ellipse cx="12" cy="7" rx="6.6" ry="2.8"/><path d="M5.4 7v5c0 1.5 3 2.8 6.6 2.8s6.6-1.3 6.6-2.8V7"/><path d="M5.4 12v5c0 1.5 3 2.8 6.6 2.8s6.6-1.3 6.6-2.8v-5"/>',
  percent: '<path d="M6.4 17.6 17.6 6.4"/><circle cx="7.6" cy="7.6" r="2.2"/><circle cx="16.4" cy="16.4" r="2.2"/>',
  sum: '<path d="M17.2 5.6H6.8l5.2 6.4-5.2 6.4h10.4"/>',
  wallet: '<path d="M4.6 7.4h12.8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2z"/><path d="M4.6 7.4V6a1.6 1.6 0 0 1 1.6-1.6h9.2"/><path d="M15.6 13.4h.01"/>',
  plus: '<circle cx="12" cy="12" r="8.4"/><path d="M12 8.4v7.2"/><path d="M8.4 12h7.2"/>',
  user: '<circle cx="12" cy="8.2" r="3.6"/><path d="M4.9 19.6c0-3.6 3.2-6 7.1-6s7.1 2.4 7.1 6"/>',
  users: '<circle cx="9.4" cy="8.2" r="3.2"/><path d="M3.2 19.4c0-3.3 2.8-5.5 6.2-5.5s6.2 2.2 6.2 5.5"/><path d="M16.4 5.4a3.1 3.1 0 0 1 0 5.9"/><path d="M17.6 14.3c2.1.5 3.6 2 3.6 4.2"/>',
  key: '<circle cx="8.4" cy="13.4" r="3.6"/><path d="m11.4 11.4 7.2-7.2"/><path d="m16.2 6.6 2 2"/><path d="m14.2 8.6 2 2"/>',
  pencil: '<path d="M16.5 4.6 19.4 7.5 8.9 18H6v-2.9z"/><path d="M14.4 6.7 17.3 9.6"/>',
  doc: '<path d="M6.4 3.6h7.4l4.4 4.4v12.4H6.4z"/><path d="M13.6 3.6V8h4.4"/><path d="M9 12.6h6"/><path d="M9 16h4.2"/>',
  check: '<path d="M4.8 12.6 9.4 17.2 19.2 6.8"/>',
  clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.4 2.1"/>',
  // Benefit glyphs
  flame: '<path d="M12 3.2c3.1 3.3 4.7 5.9 4.7 8.5a4.7 4.7 0 1 1-9.4 0c0-2.6 1.6-5.2 4.7-8.5Z"/><path d="M12 12.9c1 1.1 1.6 1.9 1.6 2.7a1.6 1.6 0 0 1-3.2 0c0-.8.6-1.6 1.6-2.7Z"/>',
  storm: '<path d="M7.3 14.2a3.5 3.5 0 0 1 .5-7 4.9 4.9 0 0 1 9.2 1.3 3.1 3.1 0 0 1-.5 5.7"/><path d="M8.6 17.4 7.8 19.6"/><path d="M12.4 17.4l-.8 2.2"/><path d="M16.2 17.4l-.8 2.2"/>',
  alert: '<path d="M12 3.8 3.9 18.6h16.2z"/><path d="M12 9.4v4.2"/><path d="M12 16.2h.01"/>',
  medkit: '<rect x="3.6" y="7.6" width="16.8" height="11.4" rx="2"/><path d="M9.1 7.6V6.2a1.7 1.7 0 0 1 1.7-1.7h2.4a1.7 1.7 0 0 1 1.7 1.7v1.4"/><path d="M12 10.6v5.2"/><path d="M9.4 13.2h5.2"/>',
  bag: '<path d="M5.4 8.4h13.2l1 11.4H4.4z"/><path d="M9 8.4V6.6a3 3 0 0 1 6 0v1.8"/>',
  mountain: '<path d="M2.8 18.8 9.1 8.2l3.3 5.4 2.1-3.1 6.7 8.3z"/><path d="M2.8 18.8h18.4"/>',
  ambulance: '<path d="M2.9 16.2v-5.9a1.6 1.6 0 0 1 1.6-1.6h8.3v7.5"/><path d="M12.8 11.2h3.5l3.3 3.4v1.6"/><path d="M9.3 16.2h5.5"/><path d="M2.9 16.2h1.5"/><path d="M19.6 16.2h1.3"/><circle cx="6.7" cy="17.7" r="1.5"/><circle cx="17.1" cy="17.7" r="1.5"/><path d="M6.7 10.5v3"/><path d="M5.2 12h3"/>',
};

// Row-label icons. Anything not listed (dynamic coverage benefits) gets a tick.
const R_ROW_ICON: Record<string, string> = {
  'Vehicle Make and Model': 'car',
  'Model Year': 'calendar',
  'Vehicle Value': 'tag',
  'Repair Type': 'wrench',
  'Windscreen Excess': 'glass',
  'Third Party Liability': 'scales',
  'Oman Cover': 'globe',
  'Excess / Deductible': 'wallet',
  'Additional Excess': 'wallet',
  'Premium': 'coins',
  'VAT (5%)': 'percent',
  'Sub-Total': 'sum',
  'Total Payable': 'sum',
  'Driver Cover': 'user',
  'Passenger Cover (per passenger)': 'users',
  'Passenger Cover': 'users',
  'Rent a Car': 'key',
  // Benefit rows
  'Fire and theft cover': 'flame',
  'Flood, Storm and Natural Calamity damages': 'storm',
  'War, Riot or Strike damages': 'alert',
  'Emergency medical expenses': 'medkit',
  'Personal belongings': 'bag',
  'Off-road cover (For 4x4 only)': 'mountain',
  '24 Hour Accident and Breakdown Recovery': 'clock',
  'Ambulance Cover': 'ambulance',
  // Labels only present on records saved before the current option list
  'Natural Calamities Riot and strike': 'storm',
  'Excess for windscreen damage': 'glass',
  'Optional Covers Driver Cover': 'user',
  'Passengers Cover': 'users',
  'Hire car Benefit': 'key',
};

// Plan names are stored in mixed casing ("Gold", "MOTOR PRESTIGE"), so the
// report normalises them to Capital-then-lowercase per word. Display only - the
// stored productType is untouched so it still matches COMPANY_PRODUCT_TYPES.
// Short all-caps runs (WT, NB) are left alone rather than becoming "Wt"/"Nb".
const rTitleCase = (value: string): string =>
  String(value ?? '').replace(/[A-Za-z]+/g, word =>
    word.length <= 2 && word === word.toUpperCase()
      ? word
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );

// Values are stored in whatever case their option list was written in - "UPTO
// AED 2000", "YES(OWN DAMAGE ONLY)", "UNLIMITED" - and a column of shouting
// reads badly beside the sentence-case labels. This brings a word down to a
// capital and lower case only when it is ENTIRELY capitals; anything already
// mixed or lower case was written that way on purpose and is left exactly as
// stored, so "Yes(Orange Card available on request)" survives intact rather
// than being re-cased into "Yes(Orange Card Available On Request)".
// Two letters or fewer stay put, so "NA" does not become "Na". AED is held back
// because rCur still has to find the token to swap it for the dirham mark.
const rDeshout = (value: string): string =>
  String(value ?? '').replace(/[A-Za-z]+/g, word =>
    word !== 'AED' && word.length > 2 && word === word.toUpperCase()
      ? word.charAt(0) + word.slice(1).toLowerCase()
      : word
  );

// Vehicle Value is stored as free text ("85000", "AED 85,000", "Not specified"),
// so the amount is only marked as currency when what remains after stripping any
// prefix the user typed is a plain number. Anything else (blank, "Not specified",
// a range) returns null and is shown exactly as it was entered.
const rVehicleAmount = (value: string): string | null => {
  const raw = String(value ?? '').trim().replace(/^(?:AED|DHS|DH|د\.إ)\.?\s*/i, '');
  const digits = raw.replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(digits)) return null;
  return fmtWhole(Number(digits));
};

// The dirham mark is drawn as a path rather than typed as a character: the report
// is opened as standalone HTML and printed to PDF, and the dirham sign is absent
// from most installed fonts, so the character would print as an empty box.
const R_DIRHAM_PATH =
  '<path d="M8 4.7h3.5c5 0 8 3 8 7.3s-3 7.3-8 7.3H8V4.7Z"/>' +
  '<path d="M3.6 9.9h18.6"/><path d="M3.6 13.6h18.6"/>';

const R_DIRHAM = `<svg class="r-dh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="butt" stroke-linejoin="miter" aria-label="AED">${R_DIRHAM_PATH}</svg>`;

// On-screen twin of the report mark, drawn from the same path so the comparison
// table and the generated report read identically. Sized in em so it tracks
// whatever font size the cell is using.
const DirhamMark = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    role="img"
    aria-label="AED"
    className="inline-block w-[0.92em] h-[0.92em] align-[-0.12em] mr-1"
  >
    <path d="M8 4.7h3.5c5 0 8 3 8 7.3s-3 7.3-8 7.3H8V4.7Z" />
    <path d="M3.6 9.9h18.6" />
    <path d="M3.6 13.6h18.6" />
  </svg>
);

// Matches a currency token and the amount that follows it, so the amount can be
// regrouped as it is swapped: the stored option lists hold "UPTO AED 2000" while
// the entered figures are already grouped, and both must print the same way.
// The amount is optional - "Amount (AED)" carries no figure at all.
const AED_TOKEN = /\bAED\b\.?\s*([\d,]+(?:\.\d+)?)?/gi;

// "2000" -> "2,000", "3.5" -> "3.5" (a Millions option keeps its one decimal).
const fmtAmountText = (amount?: string): string => {
  if (!amount) return '';
  const n = Number(amount.replace(/,/g, ''));
  return Number.isFinite(n) ? fmtWhole(n) : amount;
};

// On-screen twin of rCur: splitting on a capturing pattern alternates plain text
// and captured amounts, so odd indexes are the figures that take the mark.
const CurrencyText = ({ value }: { value?: string | null }) => (
  <>
    {String(value ?? '').split(AED_TOKEN).map((part, i) => (
      i % 2 === 0
        ? <Fragment key={i}>{part}</Fragment>
        : <Fragment key={i}><DirhamMark />{fmtAmountText(part)}</Fragment>
    ))}
  </>
);

const VehicleValueCell = ({ value }: { value: string }) => {
  const amount = rVehicleAmount(value);
  return amount ? <><DirhamMark />{amount}</> : <CurrencyText value={value} />;
};

// Escapes user-entered text before it goes into the report markup.
const rEsc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Report cell text that may carry a currency. Escapes first, then swaps every
// "AED" token for the mark and regroups the amount behind it, so amounts typed
// into free-text fields and the AED-worded dropdown options ("UPTO AED 2000")
// print with the symbol and separators without the stored values changing.
const rCur = (value: unknown): string =>
  rEsc(value).replace(AED_TOKEN, (_match, amount?: string) => R_DIRHAM + fmtAmountText(amount));

// The option lists write a qualifier hard against the word it qualifies -
// "Yes(Own damage only)" - which reads as one run rather than an answer and an
// aside. Only inserted where there is no space already, so values that were
// written properly are untouched.
const rSpaceBracket = (value: string): string => value.replace(/(\S)\(/g, '$1 (');

// A comparison-grid value: de-shouted and spaced, then escaped and
// currency-marked. Both passes run on the plain string before rCur, so neither
// can reach into the markup rCur produces.
// Used for the cells fed by the option lists, where the vocabulary is known and
// the only all-capital words are ones that should come down. Free text the user
// authored - the vehicle make and model, the advisor's comments - deliberately
// does NOT go through here: those can carry real acronyms (BMW, GMC, AMG) that
// a blanket rule would turn into "Bmw", which is worse than leaving them shouting.
const rVal = (value: unknown): string => rCur(rSpaceBracket(rDeshout(String(value ?? ''))));

// Cell renderer for the Vehicle Value row - returns report markup, so the
// fallback text is escaped here while the mark itself stays as live SVG.
const rVehicleValue = (value: string): string => {
  const amount = rVehicleAmount(value);
  return amount ? `${R_DIRHAM}${amount}` : rVal(value);
};

// A bracketed qualifier is one unit, not a continuation of the words before it.
// Left to wrap freely, "Passenger Cover (per passenger)" broke after "(per" and
// stranded the opening bracket at the end of the first line. Holding the spaces
// inside the brackets non-breaking moves the whole parenthetical down together,
// so the break falls in front of the bracket where it reads as an aside.
// Only the spaces between the brackets are touched, so the label can still wrap
// anywhere in the words ahead of them.
const rNoSplitBrackets = (label: string): string =>
  label.replace(/\(([^)]*)\)/g, (_match, inner: string) => '(' + inner.replace(/ /g, '&nbsp;') + ')');

// One data row across every insurer column. `render` receives each quote.
// The label is prefixed with its mapped glyph, falling back to a tick for the
// dynamically generated benefit rows. The glyph is looked up on the label as
// given, before the brackets are touched, so the lookup key still matches.
const rLab = (label: string): string =>
  rIcon(R_ROW_ICON[label] || 'check', 'r-li') + rNoSplitBrackets(label);

const rRow = (label: string, quotes: Quote[], render: (q: Quote) => string): string =>
  `<tr class="r-row"><td class="r-lab">${rLab(label)}</td>${quotes.map(q => `<td class="r-val">${render(q)}</td>`).join('')}</tr>`;

// table-layout:fixed takes its widths from the FIRST row. The section-bar row
// spans every column, so without an explicit colgroup those tables split evenly
// and their columns stop lining up with the insurer header above them.
const rCols = (insurers: number, labelWidth: string): string =>
  `<colgroup><col style="width:${labelWidth}">${Array.from({ length: insurers }, () => '<col>').join('')}</colgroup>`;

// Full-width maroon section bar: one unbroken line rather than a small tab with
// empty cells beside it.
const rSection = (label: string, glyph: string, span: number): string =>
  `<tr class="r-sec"><td colspan="${span}"><div class="r-bar">${rIcon(glyph, 'r-si')}${label}</div></td></tr>`;

// ============ HTML GENERATOR WITH LOGOS ============
function generateHTMLContentHelper(sortedQuotes: Quote[], allCoverageOptions: string[], referenceNumber: string): string {
  // Column count = label column + one per insurer, so 1, 2, 3 or more all work.
  const cols = sortedQuotes.length + 1;
  const first = sortedQuotes[0];
  const hasAdditionalExcess = sortedQuotes.some(q => q.additionalExcess === 'Applicable');
  const advisorNotes = sortedQuotes.filter(q => q.advisorComment && q.advisorComment.trim());
  // Narrow columns wrap more, so four or more insurers tighten the type scale
  // rather than letting the sheet run past the page.
  const dense = sortedQuotes.length >= 4;
  const labW = dense ? '37mm' : '44mm';
  const colGroup = rCols(sortedQuotes.length, labW);

  // The vehicle is a fact about the enquiry, not about any one insurer: reopening
  // an enquiry refills the form from its first quote, so every quote normally
  // carries the same make, model and year. Printed as comparison rows those read
  // as two to four identical columns saying nothing, so when they do agree they
  // move up into the header pill and drop out of the grid.
  // rShared returns null the moment a quote disagrees, which puts the row back -
  // the vehicle fields are editable per quote, and a discrepancy is worth seeing
  // rather than quietly reducing to whatever the first quote happened to say.
  const rShared = (read: (q: Quote) => string): string | null => {
    const value = read(sortedQuotes[0]);
    return sortedQuotes.every(q => read(q) === value) ? value : null;
  };
  const readVehicle = (q: Quote): string => `${q.make} ${q.model}`.trim();
  const sharedVehicle = rShared(readVehicle);
  const sharedYear = rShared(q => q.year);

  // Rendered as label/value pairs joined by rules. Each pair is one nowrap unit,
  // so if the pill ever runs wider than the sheet it breaks between fields
  // rather than between a label and its value.
  const metaFields: [string, string][] = [
    ['Enquiry:', first.enquiryNumber],
    ['Customer:', first.customerName],
  ];
  if (sharedVehicle) metaFields.push(['Vehicle:', sharedVehicle]);
  if (sharedYear) metaFields.push(['Model Year:', sharedYear]);
  const metaPill = metaFields
    .map(([label, value]) => `<span class="r-mf"><b>${rEsc(label)}</b> ${rEsc(value)}</span>`)
    .join('<span class="r-msep">|</span>');

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NSIB Insurance Comparison</title>
    <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        /* Page 1 renders in Inter, the same face the app uses, so the About Us
           cards read exactly as they do on screen. Page 2's tables stay on Arial -
           their column widths are tuned to it. */
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 100 900; src: url('${REPORT_FONT}') format('woff2'); }
        body { font-family: Arial; font-size: 12px; color: #000; }
        /* ---------- PAGE 1 : ABOUT US ---------- */
        /* Page 1 is the supplied artwork plus live text on top. The artwork carries
           the ribbon, the six empty boxes with their icon discs, the feature strip
           and its discs; only the copy is HTML, so it stays vector-sharp in print
           and editable here.
           Every overlay coordinate below is a percentage of the artwork, measured
           out of public/aboutus-bg.png (1023x1537) in pixels - e.g. the left column
           of boxes runs x 27-225, so 27/1023 = 2.639%. Re-measure if the artwork is
           ever regenerated. */
        .page1 { width: 210mm; height: 297mm; page-break-after: always; background: #FBEEE2; color: #5C4A40; position: relative; overflow: hidden; font-family: 'Inter', Arial, Helvetica, sans-serif; }
        /* The artwork is 1023x1537 (2:3), taller than A4's 1:1.414, so it is fitted
           to the full 297mm height and centred. That leaves ~6mm of page either
           side, painted in the artwork's own cream (#FBEEE2) so the seam is invisible
           - fitting to width instead would crop 18mm off the strip and the ribbon. */
        /* Held in a custom property because the strip's discs are cut from this
           same image further down; a second url() would embed the artwork twice
           and add ~250KB to every report. */
        :root { --au-art: url('${ABOUT_US_HERO}'); }
        .au-art { position: absolute; top: 0; left: 50%; margin-left: -98.83mm; width: 197.66mm; height: 297mm; background-image: var(--au-art); background-repeat: no-repeat; background-size: 100% 100%; }
        /* The artwork's cream band above its ribbon is 152px ~ 29mm tall; the lockup
           is sized to sit inside it with clearance. */
        .au-head { position: absolute; top: 3.6mm; left: 0; right: 0; text-align: center; }
        .au-brand { font-family: "Arial Black", "Arial Bold", Arial, Helvetica, sans-serif; font-size: 46px; font-weight: 900; letter-spacing: 0.5px; line-height: 1; color: #111111; }
        .au-brand-sub { font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: bold; letter-spacing: 0.8px; line-height: 1; color: #111111; margin-top: 1.5mm; }
        /* Crest in the top-left of the same cream band. Left edge matches the box
           column below (x 27 -> 2.639%) so the two line up; its 17.3mm width keeps
           it clear of both the ribbon, whose left tail starts at x 205 (~39.6mm),
           and the centred lockup, which starts around 61mm.
           top:4.8mm puts it on the heading's line rather than the page edge - it
           lands on the cap-top of NEW SHIELD (the 46px box starts at 3.6mm and
           Arial Black's caps begin ~1.2mm into it), which optically centres the
           shield on the lockup and drops the logo's own wordmark level with the
           subtitle. The 22mm height then runs to 26.8mm, still well above the
           icon disc at ~44mm. Same asset the page 2 header pulls. */
        .au-logo { position: absolute; top: 4.8mm; left: 2.639%; height: 22mm; width: auto; display: block; }
        /* Box copy. Each region starts just below its disc (y 334, 785 and 1218 for
           the three rows) and stops 3px above the decorative dot the artwork draws
           at the box's bottom centre (y 587, 1040/1042 and 1365) - not at the
           border, or the text would run into the dot. Content is centred in what is
           left, because the top two rows of boxes are half again as tall as the
           bottom row. */
        .au-box { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 2.6mm; }
        .au-b1 { left: 2.639%; width: 19.355%; top: 21.731%; height: 16.266%; }
        .au-b2 { left: 77.419%; width: 19.257%; top: 21.731%; height: 16.266%; }
        .au-b3 { left: 2.639%; width: 19.355%; top: 51.074%; height: 16.396%; }
        .au-b4 { left: 77.419%; width: 19.257%; top: 51.074%; height: 16.526%; }
        .au-b5 { left: 2.639%; width: 19.355%; top: 79.245%; height: 9.369%; }
        .au-b6 { left: 77.419%; width: 19.257%; top: 79.245%; height: 9.369%; }
        /* The bottom row of boxes is a third shorter than the other two, so its copy
           gets a little more width to wrap into. Its content still ran ~4mm taller
           than the box, and because the copy is centred the overflow split evenly:
           the title pushed up under the icon disc and the last line dropped onto
           the dot. The row therefore steps its type down a touch (12.6/10.4px
           against 13.5/11px elsewhere - not readable as a different size from a
           page away) and the top padding drops what is left clear of the disc. */
        .au-b5, .au-b6 { padding: 2.4mm 1.8mm 0; }
        .au-b5 .au-title, .au-b6 .au-title { font-size: 12.6px; }
        .au-b5 .au-text, .au-b6 .au-text { font-size: 10.4px; line-height: 1.38; }
        /* 13.5px is the ceiling for the titles: above it "COMPARE &amp; SAVE" no longer
           holds one line, and the bottom row of boxes runs out of height. */
        /* The titles break over two lines and the body sets at 1.45, so tight
           leading here made the whole card read as one clump. The title now
           carries its own leading and a clear gap before the paragraph. */
        .au-title { font-size: 13.5px; font-weight: 700; letter-spacing: 0.2px; line-height: 1.35; color: #7A1F13; margin-bottom: 2mm; }
        /* The bottom row is a third shorter than the others, so it keeps the new
           leading but a smaller gap under the title - the copy is centred in the
           box, and any more would push its last line into the dot the artwork
           draws at the bottom. */
        .au-b5 .au-title, .au-b6 .au-title { margin-bottom: 1.2mm; }
        .au-text { font-size: 11px; font-weight: 400; line-height: 1.45; color: #5C4A40; }
        /* Rating box: stars, score and the Google wordmark share one line. The box
           has ~28mm between its disc and its dot, all of it spoken for, so the logo
           rides the existing line rather than taking a line of its own - it is set
           no taller than the stars, which keeps the row height unchanged. */
        .au-rate { display: flex; align-items: center; justify-content: center; margin-bottom: 0.8mm; }
        .au-star-row { display: block; flex: 0 0 auto; width: 15mm; height: 2.75mm; }
        .au-score { flex: 0 0 auto; font-size: 10px; font-weight: 700; color: #7A1F13; letter-spacing: 0.2px; margin-left: 1.5mm; }
        .au-gl { flex: 0 0 auto; display: block; height: 2.9mm; width: 8.73mm; margin-left: 1.7mm; }
        /* Strip labels sit to the right of the discs the artwork already draws, one
           per cell. Measured off the artwork at the discs' own centre row (y 1470),
           the strip's inner edges are x 30 and x 989 and the three dividers occupy
           x 263-266, 496-498 and 720-723, so the four usable cells are 30-262,
           267-495, 499-719 and 724-989. They are not equal: cell 3 is the narrowest
           at 221px and carries the longest word, while cell 4 is the widest at
           266px. */
        /* 10.8px with a 2.2mm gap, down from 11.2px/2.6mm. "SOLUTIONS" is the
           binding word - a single word has no break opportunity, so overshooting
           overflows the cell rather than wrapping. At the old size cell 3's pair
           measured 32mm against a 42.7mm cell and cleared its divider by 5.4mm;
           the step down leaves 5.8mm on each side, which is what lets cell 3 read
           with the same air as its neighbours. The 0.4px is invisible from a page
           away but is the difference between the cell looking set and looking
           jammed. */
        /* The box spans the strip (y 1424-1516) so the label centres on the discs
           (y 1470), which sit fractionally above the band's own centre. */
        .au-lab { position: absolute; top: 92.648%; height: 5.986%; display: flex; align-items: center; justify-content: center; gap: 2.2mm; font-size: 10.8px; font-weight: 700; letter-spacing: 0.2px; line-height: 1.3; color: #6E1F13; }
        /* Each label box spans its own cell exactly (percentages of the artwork's
           1023px width) and holds the disc as its first flex child, so the icon and
           its words centre in the cell as one pair. The previous cell 4 ran to
           97.263%, past the strip's inner edge and into the border itself, which
           pushed that pair further right still. */
        .au-s1 { left: 2.933%; width: 22.776%; }
        .au-s2 { left: 26.099%; width: 22.386%; }
        .au-s3 { left: 48.778%; width: 21.603%; }
        /* Cell 4 is 45px wider than cell 3, so centring its pair the way the other
           three are centred strands the clock 12mm off the divider while "TAILORED
           SOLUTIONS" next door sits 5.8mm off the same line - the two cells read as
           differently aligned even though each is centred in its own box. Cell 4
           therefore takes a fixed 9.6mm inset instead, which puts its icon in step
           with the other three (centres 241/220/246px apart, against 242/221/257
           when it was centred) and spends the leftover width at the strip's rounded
           end, where there is no divider to measure it against. */
        .au-s4 { left: 70.772%; width: 26.002%; justify-content: flex-start; padding-left: 9.6mm; }
        /* The discs the artwork prints are covered in the band's own flat cream
           (sampled at #FBEDE0, uniform across the whole band) and redrawn from
           the same image as a sprite: identical pixels at the identical scale,
           only free to move. Measured from public/aboutus-bg.png - each disc is
           54x57px at y 1442-1498, and the sprite window adds 4px of cream on
           every side so its edges blend into the band. */
        .au-discpatch { position: absolute; top: 277.48mm; width: 12.75mm; height: 13.33mm; background: #FBEDE0; }
        .au-dp1 { left: 11.40mm; }
        .au-dp2 { left: 57.77mm; }
        .au-dp3 { left: 106.08mm; }
        .au-dp4 { left: 149.55mm; }
        .au-disc { flex: 0 0 auto; width: 11.98mm; height: 12.56mm; background-image: var(--au-art); background-repeat: no-repeat; background-size: 197.66mm 297mm; }
        .au-d1 { background-position: -11.79mm -277.87mm; }
        .au-d2 { background-position: -58.16mm -277.87mm; }
        .au-d3 { background-position: -106.46mm -277.87mm; }
        .au-d4 { background-position: -149.94mm -277.87mm; }
        /* The band left between the strip's lower border (1517) and the foot of the
           artwork is only 20px, so the tagline fills it and centres at y 1527. */
        .au-tag { position: absolute; left: 0; right: 0; top: 98.699%; height: 1.301%; display: flex; align-items: center; justify-content: center; font-size: 9.5px; font-weight: 600; letter-spacing: 2.2px; color: #6E1F13; }
        /* ---------- PAGE 2 : COMPARISON SHEET ---------- */
        /* The page is a flex column pinned to exactly 297mm: every section takes
           its natural height and the advisor box absorbs whatever is left, so the
           sheet always fills the page without overflowing regardless of how many
           benefit rows or insurers the data produces. */
        .page2 { width: 210mm; height: 297mm; padding: 5mm 8mm 0 8mm; position: relative; overflow: hidden;
                 background: #FBEEE2; color: #2B2118; display: flex; flex-direction: column; }
        .r-ref { position: absolute; top: 2.2mm; left: 8mm; font-size: 7.5px; color: #A2907C; letter-spacing: 0.3px; }

        /* Header: supplied logo, wordmark, supplied mascot */
        .r-head { display: flex; align-items: center; gap: 3mm; flex: 0 0 auto; }
        .r-logo { height: 24mm; width: auto; flex: 0 0 auto; }
        .r-mascot { height: 26mm; width: auto; flex: 0 0 auto; }
        /* The wordmark used to be the flex filler between the two pictures, which
           centred it on whatever space they left rather than on the sheet: both are
           sized by height with width:auto, so their widths are whatever the supplied
           artwork happens to be, and the title sat half their difference off centre
           - visibly out of step with the pill below it, which centres on the page.
           The pictures now sit in equal-width slots instead. Each takes half of what
           the wordmark leaves, so the wordmark lands on the page's centre line while
           the logo stays flush left and the mascot flush right, exactly where they
           were. Width-agnostic, so re-supplying either picture cannot knock the
           title off centre again. */
        .r-headside { flex: 1 1 0; min-width: 0; display: flex; align-items: center; }
        .r-headside-r { justify-content: flex-end; }
        .r-titlewrap { flex: 0 1 auto; text-align: center; }
        .r-title { font-size: 27px; font-weight: 900; letter-spacing: 1.4px; line-height: 1; color: #7A1024; }
        .r-subtitle { font-size: 13.5px; font-weight: 700; letter-spacing: 4.2px; line-height: 1; color: #B08A2E; margin-top: 1.4mm; }
        .r-diamond { display: flex; align-items: center; justify-content: center; gap: 1.4mm; margin-top: 1.6mm; }
        .r-diamond i { display: block; width: 16mm; height: 0.45mm; background: #D9BC6A; }
        .r-diamond b { display: block; width: 1.6mm; height: 1.6mm; background: #B08A2E; transform: rotate(45deg); }

        /* Enquiry / customer pill */
        /* Carries the facts that belong to the enquiry rather than to any one
           insurer, so it holds up to four fields. max-width and wrapping are the
           safety net for a long customer or vehicle name: the pill stays on one
           line at any realistic length, but breaks between fields instead of
           running off the sheet. */
        .r-meta { flex: 0 0 auto; margin: 1.6mm auto 2.2mm; display: inline-flex; align-items: center;
                  flex-wrap: wrap; justify-content: center; max-width: 100%; gap: 0.8mm 2.5mm;
                  background: #FFFDF7; border: 0.3mm solid #E2CB93; border-radius: 6mm; padding: 1.5mm 6mm;
                  font-size: 9.6px; color: #5E4632; }
        .r-meta b { color: #7A1024; font-weight: 700; }
        /* One flex item per field, so a label never parts from its value. */
        .r-mf { white-space: nowrap; }
        .r-msep { color: #E2CB93; }

        /* Section tables */
        .r-tbl { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; flex: 0 0 auto; margin-bottom: 1.6mm; }
        /* Type sizes here and below are paired with their vertical padding: the
           sheet has to stay exactly 297mm, so a size bump buys its extra line
           height back out of the padding rather than out of the page. */
        .r-tbl td { font-size: 9.2px; padding: 0.85mm 1.6mm; text-align: center; vertical-align: middle; word-wrap: break-word; line-height: 1.22; }
        .r-tbl td.r-lab { width: 44mm; text-align: left; font-weight: 700; color: #4A3728; background: #FBF4E5; }
        /* The gutter the row glyph is positioned into: the cell's own 1.6mm, the
           3.7mm glyph, then 1.5mm before the text. A label long enough to wrap
           ("Flood, Storm and Natural Calamity damages") used to drop its second line
           back under the icon; with the glyph out of flow every line starts here
           instead, so wrapped labels read as one left-aligned block.
           td.r-lab and :not(), rather than plain .r-lab: the padding shorthands on
           .r-tbl td, tr.r-total td and their .r-dense twins are each more specific
           than a lone class and would win the left padding back, dropping the text
           on top of the glyph. The extra class here outranks all of them. The
           insurer cell borrows .r-lab for its width but holds a flex tab rather than
           a glyph and a run of text, so it is excluded rather than reset. */
        .r-tbl td.r-lab:not(.r-instab) { position: relative; padding-left: 6.8mm; }
        /* The value columns read darker than the body brown - at 9.2px on white the
           warm brown greys out, so these go near-black while staying regular
           weight (the labels keep the bold). */
        .r-tbl .r-val { background: #FFFFFF; color: #17100A; font-weight: 400; }
        .r-tbl tr.r-row td { border-bottom: 0.2mm solid #EFE4CE; }
        .r-tbl tr.r-row:last-child td { border-bottom: 0; }
        .r-tbl tr.r-row td.r-lab { border-right: 0.2mm solid #EFE4CE; }
        /* Section header row: one maroon bar across the full table width.
           Written as .r-tbl tr.r-sec td rather than .r-sec td so it outranks
           .r-dense .r-tbl td, which is more specific than a lone class and was
           winning 1.1mm of horizontal padding back on the four-insurer layout.
           That inset every section bar by 1.1mm while the data rows below still
           reached the table edges, so the right-hand ends stopped lining up. */
        .r-tbl tr.r-sec td { padding: 0 0 0.8mm 0; border: 0; text-align: left; }
        /* Left padding is the row glyph's gutter (.r-li left), not a round number
           of its own: the tab's glyph then starts on the same vertical line as
           every row glyph beneath it, and its text on the same line as every row
           label. See .r-si for the rest of that column. */
        .r-tab { display: inline-block; background: linear-gradient(100deg, #7A1024 0%, #5E0C1B 100%); color: #FFFFFF;
                 font-size: 8.8px; font-weight: 700; letter-spacing: 1.2px; padding: 1.35mm 3.2mm 1.35mm 1.6mm; border-radius: 1.8mm;
                 white-space: nowrap; }
        /* height:1px on the cell lets the child's height:100% resolve against the
           row's real height, so the maroon block matches the white insurer card
           instead of sitting beside it as a short pill. */
        /* No right padding: the tab now fills the label column to its edge, so it
           ends on the same vertical line as the label cells and the maroon
           Sub-Total / Total Payable cells running down that column beneath it.
           The 2.2mm gap it used to hold left this one bar short of every other. */
        .r-instab { background: transparent !important; border-right: 0 !important; border-bottom: 0 !important;
                    padding: 0 !important; height: 1px; }
        .r-tabfill { display: flex; align-items: center; height: 100%; }
        .r-bar { background: linear-gradient(100deg, #7A1024 0%, #5E0C1B 100%); color: #FFFFFF; font-size: 8.8px; font-weight: 700; letter-spacing: 1.2px; padding: 1.1mm 3.2mm 1.1mm 1.6mm; border-radius: 1.6mm; display: block; }
        /* Glyph boxes. Each one is framed to a common fill by rIcon, so these are
           the box the artwork lands in rather than a loose bound it may or may not
           reach - the drawing now grows with the box instead of floating in it. */
        /* The bar glyph stays in the text flow, where it is the tallest thing on the
           line and so sets the pill's height; .r-bar gives back the 0.5mm this size
           costs out of its own padding.
           Sized and spaced to the row glyph rather than to itself: same 3.7mm box,
           and a margin that lands the bar's text on 6.8mm - the label padding every
           row below it starts from. Bar and row now read as one column of glyphs
           with one column of text beside it, instead of the headers standing a
           couple of millimetres in from their own rows. */
        .r-si { width: 3.7mm; height: 3.7mm; vertical-align: -1.05mm; margin-right: 1.5mm; color: #E4C46A; }
        /* The row glyph is taken out of the line box and parked in the gutter the
           label's padding already reserves. Inline it was the tallest thing on the
           line - at 3.7mm it stood 2.7mm over the baseline against the text's 2.33mm
           - so every one of the ~22 rows grew by half a millimetre and the sheet ran
           past 297mm. Out of flow the row is text-height again whatever size the
           glyph takes, which is what lets it be this big at all. It also means the
           label no longer needs a hanging indent: with nothing inline ahead of it,
           every line starts at the padding edge on its own.
           top/bottom/margin auto rather than a translate: it centres the glyph on
           the cell without a transform, including on the deeper Total row. */
        .r-li { position: absolute; left: 1.6mm; top: 0; bottom: 0; margin: auto 0;
                width: 3.7mm; height: 3.7mm; color: #A8232F; }
        .r-total .r-li { color: #E4C46A; }
        /* Dirham mark sits inside the value cell, so it tracks the cell's text
           colour and sits slightly below the baseline like the row glyphs. */
        .r-dh { width: 2.9mm; height: 2.9mm; vertical-align: -0.5mm; margin-right: 1mm; color: inherit; }
        /* Rounded card edges on the data block */
        .r-tbl tr.r-row:first-of-type td:first-child { border-top-left-radius: 1.6mm; }
        .r-tbl tr.r-row:first-of-type td:last-child { border-top-right-radius: 1.6mm; }
        .r-tbl tr.r-row:last-of-type td:first-child { border-bottom-left-radius: 1.6mm; }
        .r-tbl tr.r-row:last-of-type td:last-child { border-bottom-right-radius: 1.6mm; }

        /* Insurer & plan */
        .r-ins { padding: 1.8mm 1.5mm !important; background: #FFFFFF; vertical-align: top; }
        /* Logos differ in aspect ratio, so each one is centred inside a fixed
           height box. Without it a wide logo renders shorter than a square one
           and the plan names below them stop lining up across the columns. */
        .r-ins-logobox { height: 8mm; width: 100%; display: flex; align-items: center; justify-content: center; margin-bottom: 1.2mm; overflow: hidden; }
        /* The logos are supplied at wildly different pixel sizes, so the img is
           given the box rather than its natural size: object-fit scales each one
           UP or down to fill the 8mm band while keeping its aspect ratio, and
           every insurer ends up occupying the same area. Sizing by max-* instead
           would leave a small source file printing as a postage stamp.
           min(34mm, 100%): capped so a logo never dwarfs a wide single-insurer
           column, but always bounded by the cell so it cannot spill left/right
           once the columns get narrow. The cap allows for the widest mark in the
           set (about 4.4:1) still reaching the full 8mm height. */
        .r-ins-logo { width: min(34mm, 100%); height: 8mm; object-fit: contain; object-position: center; display: block; margin: 0 auto; }
        .r-ins-name { font-size: 9.6px; font-weight: 700; color: #7A1024; line-height: 1.15; text-align: center; }
        .r-ins-plan { font-size: 9.6px; font-weight: 700; color: #7A1024; line-height: 1.18; min-height: 3.4mm; }
        .r-badge { display: inline-block; border-radius: 6mm; padding: 0.35mm 2.2mm; font-size: 7.2px; font-weight: 700; margin-top: 0.8mm; }
        .r-badge-rec { background: #7A1024; color: #FFFFFF; }
        .r-badge-ren { background: #E4C46A; color: #5E0C1B; }

        /* Yes / no marks */
        .r-ic { width: 3.3mm; height: 3.3mm; display: inline-block; vertical-align: middle; }

        /* Premium block */
        .r-tbl tr.r-money td { background: #FFFCF5; }
        .r-tbl tr.r-money td.r-lab { background: #FBF4E5; }
        .r-tbl tr.r-total td { background: #7A1024; color: #E4C46A; font-weight: 700; font-size: 10.7px; padding: 1.5mm 1.6mm; border-bottom: 0; }
        .r-tbl tr.r-total td.r-lab { background: #5E0C1B; color: #FFFFFF; border-right-color: rgba(228,196,106,0.35); }

        /* Advisor comments - the only elastic block on the page */
        .r-adv { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 12mm; max-height: 20mm; margin-bottom: 1.8mm; }
        .r-adv-body { flex: 1 1 auto; background: #FFFFFF; border: 0.3mm solid #EFE4CE; border-radius: 1.8mm;
                      padding: 2mm 3mm; font-size: 9.1px; line-height: 1.35; color: #2B2118; overflow: hidden; }
        .r-adv-item { margin-bottom: 1.2mm; }

        /* Disclaimer */
        .r-disc { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; background: #FFFBF0; border: 0.3mm solid #E2CB93; border-radius: 1.8mm;
                  padding: 1.8mm 3mm; margin-bottom: 1.8mm; }
        .r-disc h4 { font-size: 9.2px; font-weight: 700; color: #7A1024; margin-bottom: 0.9mm; letter-spacing: 0.2px; }
        .r-disc p { font-size: 8px; line-height: 1.3; margin-bottom: 0.45mm; color: #3C2E22; }
        .r-disc ul { margin: 0.5mm 0 0.8mm 0; padding: 0; list-style: none; column-count: 2; column-gap: 6mm; }
        .r-disc li { font-size: 7.8px; line-height: 1.3; margin-bottom: 0.25mm; color: #3C2E22;
                     padding-left: 2.6mm; position: relative; break-inside: avoid; }
        .r-disc li:before { content: ''; position: absolute; left: 0; top: 1.05mm; width: 1.1mm; height: 1.1mm;
                            border-radius: 50%; background: #B08A2E; }

        /* Footer */
        .r-foot { flex: 0 0 auto; margin: 0 -8mm; width: 210mm; background: linear-gradient(100deg, #7A1024 0%, #5E0C1B 100%);
                  padding: 2.5mm 8mm; display: flex; justify-content: space-between; align-items: center;
                  color: #FFFFFF; font-size: 8px; line-height: 1.28; }
        .r-foot-col { flex: 1 1 0; }
        .r-foot-col + .r-foot-col { padding-left: 4mm; border-left: 0.2mm solid rgba(228,196,106,0.35); }
        .r-foot b { display: block; color: #E4C46A; font-size: 8.4px; font-weight: 700; margin-bottom: 0.35mm; }
        .r-dense .r-tbl td { font-size: 8.2px; padding: 0.66mm 1.1mm; }
        .r-dense .r-tbl td.r-lab { width: 37mm; }
        /* Same gutter, re-measured for the dense glyph (3.2mm) and the dense cell
           padding (1.1mm either side of it). Dense is the 4-insurer layout, where
           the label column is down to 37mm, so this was checked line by line
           against the old geometry: the wrapped rows are the same five either way. */
        .r-dense .r-tbl td.r-lab:not(.r-instab) { padding-left: 5.4mm; }
        .r-dense .r-li { left: 1.1mm; width: 3.2mm; height: 3.2mm; }
        /* The same column, re-measured for the dense gutter: glyphs on 1.1mm, text
           on 5.4mm, headers and rows alike. */
        .r-dense .r-bar, .r-dense .r-tab { padding-left: 1.1mm; }
        .r-dense .r-si { width: 3.2mm; height: 3.2mm; vertical-align: -0.9mm; margin-right: 1.1mm; }
        .r-dense .r-dh { width: 2.6mm; height: 2.6mm; margin-right: 0.8mm; vertical-align: -0.45mm; }
        .r-dense .r-ins-plan { font-size: 8.6px; }
        .r-dense .r-ins-logobox { height: 7mm; }
        .r-dense .r-ins-logo { height: 7mm; }
        .r-dense .r-tbl tr.r-total td { font-size: 9.7px; padding: 1.22mm 1.1mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page2 { height: 297mm; overflow: hidden; } }
    </style>
</head>
<body>
    <div class="page1">
        <div class="au-art" role="img" aria-label="New Shield Insurance Brokers - your insurance channel partner">
            <img src="https://i.imgur.com/GCOPBN1.png" alt="New Shield Insurance Brokers" class="au-logo">

            <div class="au-head">
                <div class="au-brand">NEW SHIELD</div>
                <div class="au-brand-sub">INSURANCE BROKERS L.L.C.</div>
            </div>

            <div class="au-box au-b1">
                <div class="au-title">15+ YEARS<br>OF EXPERIENCE</div>
                <div class="au-text">With over 15 years of experience, New Shield Insurance Brokers delivers tailored protection that transforms risk into reassurance.</div>
            </div>
            <div class="au-box au-b2">
                <div class="au-title">DEDICATED<br>EXPERT TEAM</div>
                <div class="au-text">A team of dedicated professionals offers clients expert service and a wide range of insurer products.</div>
            </div>

            <div class="au-box au-b3">
                <div class="au-title">COMPARE &amp; SAVE</div>
                <div class="au-text">We compare multiple insurers to provide the best coverage at the right cost.</div>
            </div>
            <div class="au-box au-b4">
                <div class="au-title">40+ CHANNEL<br>PARTNERS</div>
                <div class="au-text">We work with over 40 channel partners as an insurance broker.</div>
            </div>

            <div class="au-box au-b5">
                <div class="au-title">TOP RATED<br>BY CLIENTS</div>
                <div class="au-rate">${AU_STARS}<span class="au-score">4.7/5</span><img class="au-gl" src="${GOOGLE_LOGO}" alt="Google"></div>
                <div class="au-text">Proudly rated 4.7 on Google for service excellence.</div>
            </div>
            <div class="au-box au-b6">
                <div class="au-title">CLAIMS<br>MADE SIMPLE</div>
                <div class="au-text">We guide you through claims, handling insurers and paperwork to secure a fair, timely settlement.</div>
            </div>

            ${/* Patches first so the labels' own discs paint over them. */ ''}
            <div class="au-discpatch au-dp1"></div>
            <div class="au-discpatch au-dp2"></div>
            <div class="au-discpatch au-dp3"></div>
            <div class="au-discpatch au-dp4"></div>

            <div class="au-lab au-s1"><span class="au-disc au-d1"></span><span>TRUSTED<br>EXPERTISE</span></div>
            <div class="au-lab au-s2"><span class="au-disc au-d2"></span><span>CLIENT<br>FOCUSED</span></div>
            <div class="au-lab au-s3"><span class="au-disc au-d3"></span><span>TAILORED<br>SOLUTIONS</span></div>
            <div class="au-lab au-s4"><span class="au-disc au-d4"></span><span>TIMELY<br>SUPPORT</span></div>

            <div class="au-tag">Your Shield. Our Commitment.</div>
        </div>
    </div>
    
    <div class="page2${dense ? ' r-dense' : ''}">
        <div class="r-ref">Ref: ${referenceNumber}</div>

        <div class="r-head">
            <div class="r-headside"><img src="https://i.imgur.com/GCOPBN1.png" alt="New Shield Insurance Brokers" class="r-logo"></div>
            <div class="r-titlewrap">
                <div class="r-title">MOTOR INSURANCE</div>
                <div class="r-subtitle">COMPARISON SHEET</div>
                <div class="r-diamond"><i></i><b></b><i></i></div>
            </div>
            <div class="r-headside r-headside-r"><img src="https://i.imgur.com/Wsv3Ah2.png" alt="" class="r-mascot"></div>
        </div>

        <div style="text-align:center;flex:0 0 auto;">
            <div class="r-meta">${metaPill}</div>
        </div>

        <table class="r-tbl">${colGroup}
            <tr class="r-row">
                <td class="r-lab r-instab">
                    <div class="r-tab r-tabfill">${rIcon('shield', 'r-si')}INSURER &amp; PLAN</div>
                </td>
                ${sortedQuotes.map(q => {
                  const logoUrl = COMPANY_LOGOS[q.company] || '';
                  return `<td class="r-val r-ins">
                        <div class="r-ins-logobox">${logoUrl
                          ? `<img src="${logoUrl}" alt="${rEsc(q.company)}" class="r-ins-logo">`
                          : `<div class="r-ins-name">${rEsc(q.company)}</div>`}</div>
                        ${q.productType ? `<div class="r-ins-plan">${rEsc(rTitleCase(q.productType))}</div>` : ''}
                        ${q.isRecommended ? '<div><span class="r-badge r-badge-rec">RECOMMENDED</span></div>' : ''}
                        ${q.isRenewal ? '<div><span class="r-badge r-badge-ren">RENEWAL</span></div>' : ''}
                    </td>`;
                }).join('')}
            </tr>
        </table>

        <table class="r-tbl">${colGroup}
            ${rSection('VEHICLE DETAILS', 'car', cols)}
            ${sharedVehicle ? '' : rRow('Vehicle Make and Model', sortedQuotes, q => rEsc(readVehicle(q)))}
            ${sharedYear ? '' : rRow('Model Year', sortedQuotes, q => rEsc(q.year))}
            ${rRow('Vehicle Value', sortedQuotes, q => rVehicleValue(q.value))}
            ${rRow('Repair Type', sortedQuotes, q => rVal(q.repairType))}
            ${rRow('Windscreen Excess', sortedQuotes, q => rVal(q.windscreenExcess))}
        </table>

        <table class="r-tbl">${colGroup}
            ${rSection('BENEFITS', 'shieldCheck', cols)}
            ${rRow('Third Party Liability', sortedQuotes, q => rVal(q.thirdPartyLiability))}
            ${rRow('Oman Cover', sortedQuotes, q => rVal(q.omanCover))}
            ${allCoverageOptions.map(option =>
              rRow(rEsc(option), sortedQuotes, q => (q.coverageOptions.includes(option) ? R_YES : R_NO))
            ).join('')}
        </table>

        <table class="r-tbl">${colGroup}
            ${rSection('PREMIUM', 'coins', cols)}
            <tr class="r-row r-money"><td class="r-lab">${rLab('Excess / Deductible')}</td>${sortedQuotes.map(q => `<td class="r-val">${R_DIRHAM}${fmtWhole(q.excess)}</td>`).join('')}</tr>
            ${hasAdditionalExcess
              ? `<tr class="r-row r-money"><td class="r-lab">${rLab('Additional Excess')}</td>${sortedQuotes.map(q => `<td class="r-val">${q.additionalExcess === 'Applicable' ? rVal(q.additionalExcessDetails) : 'Not Applicable'}</td>`).join('')}</tr>`
              : ''}
            <tr class="r-row r-money"><td class="r-lab">${rLab('Premium')}</td>${sortedQuotes.map(q => `<td class="r-val">${R_DIRHAM}${fmtMoney(q.premium)}</td>`).join('')}</tr>
            <tr class="r-row r-money"><td class="r-lab">${rLab('VAT (5%)')}</td>${sortedQuotes.map(q => `<td class="r-val">${R_DIRHAM}${fmtMoney(quoteTotals(q).vat)}</td>`).join('')}</tr>
            <tr class="r-row r-total"><td class="r-lab">${rLab('Sub-Total')}</td>${sortedQuotes.map(q => `<td class="r-val">${R_DIRHAM}${fmtMoney(quoteTotals(q).total)}</td>`).join('')}</tr>
        </table>

        <table class="r-tbl">${colGroup}
            ${rSection('OPTIONAL COVERS', 'plus', cols)}
            ${/* Printed as the selected dropdown value, not a mark, so "Included",
                  "Excluded" and a manual amount all read literally. */ ''}
            ${rRow('Driver Cover', sortedQuotes, q => rVal(formatCoverValue(readDriverCover(q), q.driverCoverAmount)))}
            ${rRow('Passenger Cover (per passenger)', sortedQuotes, q => rVal(formatCoverValue(readPassengerCover(q), q.passengerCoverAmount)))}
            ${/* Always listed, even when no plan takes it, so the reader sees the
                  cover was considered and crossed off rather than omitted. */ ''}
            ${rRow('Rent a Car', sortedQuotes, q => {
              if (!readRentACar(q)) return R_NO;
              // At no extra cost it reads "No Charges"; otherwise the
              // charge, which is quoted here only and not in any Total.
              const amount = q.rentACarIncluded
                ? 'No Charges'
                : q.rentACarPremium ? R_DIRHAM + fmtMoney(q.rentACarPremium) : '';
              const days = q.rentACarDays ? '(' + rEsc(q.rentACarDays) + ')' : '';
              return (amount + ' ' + days).trim() || R_YES;
            })}
            ${/* Closes the report out: the Sub-Total above plus the Rent a Car
                  charge listed here. Report only - the Live Comparison has no
                  equivalent row. */ ''}
            <tr class="r-row r-total"><td class="r-lab">${rLab('Total Payable')}</td>${sortedQuotes.map(q => `<td class="r-val">${R_DIRHAM}${fmtMoney(grandTotal(q))}</td>`).join('')}</tr>
        </table>

        <div class="r-adv">
            <table class="r-tbl" style="margin-bottom:0;">${colGroup}<tr class="r-sec"><td colspan="${cols}"><div class="r-bar">${rIcon('pencil', 'r-si')}ADVISOR COMMENTS</div></td></tr></table>
            <div class="r-adv-body">
                ${/* Only what the advisor actually typed - no generated labels. */ ''}
                ${advisorNotes.map(q => `<div class="r-adv-item">${rCur(q.advisorComment.trim())}</div>`).join('')}
            </div>
        </div>

        <div class="r-disc">
            <h4>Disclaimer &amp; Special Conditions</h4>
            <p>The insured vehicle must comply with GCC specifications. Any vehicle modifications are excluded from coverage.</p>
            <p>Additional excesses shall apply as follows, in addition to the standard policy excess stated in the Policy Schedule:</p>
            <ul>
                <li>Drivers under 25 years of age: 10% of the claim amount</li>
                <li>Drivers holding a UAE driving license for less than one year: 10% of the claim amount</li>
                <li>Sports/High Performance vehicles: 15% of the claim amount</li>
                <li>Factory-modified vehicles: 15% of the claim amount</li>
                <li>Non-factory modified vehicles: 20% of the claim amount</li>
            </ul>
            <p>Spare parts excess, where applicable, shall be governed by the terms and conditions of the policy.</p>
            <p>This quotation is valid for 7 days from the date of issuance and is subject to change in accordance with the insurer&apos;s tariff. By accepting this quotation, the proposer confirms that all information provided is true, accurate, and complete.</p>
            <p><strong>While reasonable care has been taken to ensure the accuracy of the information provided, the terms, conditions, and exclusions contained in the insurer&apos;s official policy wording and schedule shall prevail in all circumstances.</strong></p>
            <p><strong>For complete details, including the Material Information Declaration and full disclaimer, please refer to the official quotation document.</strong></p>
        </div>

        <div class="r-foot">
            <div class="r-foot-col">
                <b>Suite 2801, One by Omniyat</b>
                Al Mustaqbal Street, Business Bay, Dubai, U.A.E | P O BOX 233640<br>
                UAE Central Bank Registration Number : 200
            </div>
            <div class="r-foot-col">
                <b>Call us on +971 47058000</b>
                Email us : enquiry@nsib.ae | Visit our website: nsib.ae
            </div>
        </div>
    </div>
</body>
</html>`;
}

// The report for a set of quotes - one builder for the download, the copy kept
// for "View", and the PDF filed in WorkDrive, so all three always agree.
// Legacy benefit labels are excluded — they render as Optional Covers rows.
const buildReportHtml = (quotes: Quote[], referenceNumber: string): string => {
  const allCoverageOptions: string[] = Array.from(
    new Set(quotes.flatMap((q: Quote) => q.coverageOptions))
  ).filter(option => !LEGACY_BENEFIT_LABELS.includes(option));
  return generateHTMLContentHelper(sortQuotesForDisplay(quotes), allCoverageOptions, referenceNumber);
};

const reportFileBase = (quotes: Quote[], referenceNumber: string): string =>
  `NSIB_${quotes[0].customerName}_${quotes[0].make}_${quotes[0].model}_${referenceNumber}`
    .replace(/[^\w.-]+/g, '_');

// Asks the server to turn the report into a PDF. With an enquiry, the server
// also files it in that enquiry's WorkDrive, and with workdriveOnly it answers
// with the filing outcome instead of the file.
const requestPdf = (
  html: string,
  fileBase: string,
  referenceNumber: string,
  enquiry: ZohoEnquiry | null,
  workdriveOnly = false
) =>
  fetch('/api/render-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html,
      filename: `${fileBase}.pdf`,
      enquiryId: enquiry?.id,
      reference: referenceNumber,
      workdriveOnly,
    }),
  });

// Downloads the report as a PDF and files the same PDF in WorkDrive when an
// enquiry is given. Returns the WorkDrive outcome (null when nothing was filed).
const downloadReport = async (
  html: string,
  fileBase: string,
  referenceNumber: string,
  enquiry: ZohoEnquiry | null
): Promise<WorkDriveResult | null> => {
  try {
    const response = await requestPdf(html, fileBase, referenceNumber, enquiry);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `PDF server responded ${response.status}`);
    }
    const header = response.headers.get('X-WorkDrive-Result');
    downloadBlob(await response.blob(), `${fileBase}.pdf`);
    return header ? (JSON.parse(decodeURIComponent(header)) as WorkDriveResult) : null;
  } catch (error) {
    // A failed PDF should not cost the advisor the report, so fall back to the
    // HTML they used to get, which every browser can print to PDF.
    console.error('PDF export failed, falling back to HTML download:', error);
    downloadHTMLFile(html, `${fileBase}.html`);
    return enquiry ? { ok: false, error: 'the PDF server was unavailable, so an HTML copy was downloaded instead.' } : null;
  }
};

// Files the comparison's PDF in its enquiry's WorkDrive, with nothing downloaded.
const fileReportInWorkDrive = async (comparison: SavedComparison): Promise<WorkDriveResult> => {
  if (!comparison.enquiry) return { ok: false, error: 'Link a Zoho enquiry first.' };
  try {
    const html = buildReportHtml(comparison.quotes, comparison.referenceNumber);
    const fileBase = reportFileBase(comparison.quotes, comparison.referenceNumber);
    const response = await requestPdf(html, fileBase, comparison.referenceNumber, comparison.enquiry, true);
    const body = await response.json().catch(() => ({}));
    return body.workdrive || { ok: false, error: body.error || `PDF server responded ${response.status}.` };
  } catch {
    return { ok: false, error: 'The PDF server is unavailable. Check your connection.' };
  }
};

function downloadHTMLFile(htmlContent: string, fileName: string) {
  downloadBlob(new Blob([htmlContent], { type: 'text/html' }), fileName);
}

function downloadBlob(blob: Blob, fileName: string) {
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
  const [currentPage, setCurrentPage] = useState<AppView>('dashboard');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [businessType, setBusinessType] = useState<'Private' | 'Commercial'>('Private');
  
  // CRITICAL: Track current comparison - these persist the identity of the comparison being edited
  const [currentComparisonId, setCurrentComparisonId] = useState<string | null>(null);
  const [currentReferenceNumber, setCurrentReferenceNumber] = useState<string | null>(null);

  // The Zoho CRM enquiry this comparison belongs to. When set, its PDF is also
  // filed in that enquiry's WorkDrive folder. Mirrored in a ref because the
  // debounced auto-save reads it after the render that set it.
  const [enquiry, setEnquiryState] = useState<ZohoEnquiry | null>(null);
  const enquiryRef = useRef<ZohoEnquiry | null>(null);
  const setEnquiry = (value: ZohoEnquiry | null) => {
    enquiryRef.current = value;
    setEnquiryState(value);
  };
  // Opened from Saved History rather than built in this session. Linking an
  // enquiry then files the PDF straight away: nobody re-downloads a quote that
  // was already sent, so older comparisons would otherwise never be filed.
  const [openedFromHistory, setOpenedFromHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filing, setFiling] = useState(false);
  // What the last WorkDrive filing came to, shown beside the save buttons.
  const [filingNote, setFilingNote] = useState<{ ok: boolean; text: string; link?: string } | null>(null);

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
    additionalExcess: '',
    additionalExcessDetails: '',
    premium: 0,
    isRecommended: false,
    isRenewal: false,
    driverCover: 'Excluded',
    driverCoverAmount: 0,
    passengerCover: 'Excluded',
    passengerCoverAmount: 0,
    rentACar: false,
    rentACarDays: '',
    rentACarPremium: 0,
    rentACarIncluded: false,
  });
  const [selectedCoverage, setSelectedCoverage] = useState<string[]>([]);
  const [omanCover, setOmanCover] = useState('NA');
  const [windscreenExcess, setWindscreenExcess] = useState('NA');
  const [advisorComment, setAdvisorComment] = useState('');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  // Derived, not state: three separate setters kept falling out of step with
  // the premium they were supposed to follow.
  const { vat, total } = useMemo(() => calculateVAT(formData.premium), [formData.premium]);

  // Auto-save bookkeeping. `pendingSave` holds the newest unsaved snapshot: it
  // survives a failed write so the status chip can retry it, and is cleared only
  // once that exact snapshot reaches the cloud.
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<SavedComparison | null>(null);
  const saveSeqRef = useRef(0);

  const insuranceCompanies = businessType === 'Private' ? PRIVATE_INSURANCE_COMPANIES : COMMERCIAL_INSURANCE_COMPANIES;
  const hasProductTypes = Boolean(formData.insuranceCompany && COMPANY_PRODUCT_TYPES[formData.insuranceCompany]);

  const handlePremiumChange = (premium: number) => {
    setFormData({ ...formData, premium });
  };

  const handleCompanyChange = (company: string) => {
    const defaults = getCompanyDefaults(company);
    // The company defaults still list the three benefits by their old coverage
    // labels, so route them to the structured fields instead of the checkboxes.
    const benefits = splitLegacyBenefits(defaults.coverageOptions);

    setFormData(prev => ({
      ...prev,
      insuranceCompany: company,
      productType: '',
      repairType: defaults.repairType,
      thirdPartyLiability: defaults.thirdPartyLiability,
      driverCover: benefits.driverCover,
      driverCoverAmount: 0,
      passengerCover: benefits.passengerCover,
      passengerCoverAmount: 0,
      rentACar: benefits.rentACar,
      rentACarDays: benefits.rentACar ? prev.rentACarDays : '',
      rentACarPremium: benefits.rentACar ? prev.rentACarPremium : 0,
      rentACarIncluded: benefits.rentACar ? prev.rentACarIncluded : false
    }));

    setOmanCover(defaults.omanCover);
    setWindscreenExcess(defaults.windscreenExcess);
    setSelectedCoverage(benefits.coverage);
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

  // One cloud write. Only the newest request may set the final status, so a slow
  // earlier save can never report over a newer one's result.
  const writeToCloud = useCallback(async (comparisonData: SavedComparison) => {
    const seq = ++saveSeqRef.current;
    setSaveState('saving');

    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: comparisonData }),
      });

      // fetch() resolves on 4xx/5xx, so the status has to be checked explicitly.
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + (await response.text()));
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Save failed');
      }

      if (pendingSaveRef.current === comparisonData) pendingSaveRef.current = null;
      if (seq === saveSeqRef.current) setSaveState('saved');
    } catch (error) {
      // Never alert() here. This runs on every edit, so a failing cloud made the
      // form unusable behind one blocking dialog per keystroke; the header chip
      // reports the failure and offers a retry instead.
      console.error('Auto-save to cloud failed:', error);
      if (seq === saveSeqRef.current) setSaveState('error');
    }
  }, []);

  const cancelPendingAutoSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingSaveRef.current = null;
  }, []);

  // Auto-save. The local cache is written straight away; the cloud write is
  // debounced to the last edit of a typing burst. The cloud write is never gated
  // behind the localStorage write, which can throw once the cache exceeds quota.
  const autoSaveQuotes = useCallback((updatedQuotes: Quote[], refNum: string, compId: string) => {
    if (updatedQuotes.length === 0) return;

    const comparisonData: SavedComparison = {
      id: compId,
      date: new Date().toISOString(),
      vehicle: updatedQuotes[0].make + ' ' + updatedQuotes[0].model,
      quotes: updatedQuotes,
      referenceNumber: refNum,
      createdBy: getCurrentUserName(),
      enquiry: enquiryRef.current,
    };

    cacheComparisonLocally(comparisonData);

    pendingSaveRef.current = comparisonData;
    setSaveState('pending');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const item = pendingSaveRef.current;
      if (item) writeToCloud(item);
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [writeToCloud]);

  const retryAutoSave = useCallback(() => {
    const item = pendingSaveRef.current;
    if (item) writeToCloud(item);
  }, [writeToCloud]);

  // Leaving with a rejected save would lose those edits silently. A write that
  // is merely queued or in flight raises nothing: the debounce is barely over a
  // second and the local cache already holds it, so warning there put a browser
  // dialog in front of an ordinary tab close.
  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (saveState === 'error') {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', warnIfUnsaved);
    return () => window.removeEventListener('beforeunload', warnIfUnsaved);
  }, [saveState]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const addQuote = () => {
    if (!formData.enquiryNumber || !formData.customerName || !formData.vehicleMake || !formData.vehicleModel || !formData.insuranceCompany || !formData.premium) {
      notify('Please fill required fields: Customer Name, Zoho Enquiry, Make, Model, Company, and Premium', 'warn');
      return;
    }

    if (hasProductTypes && !formData.productType) {
      notify('Please select a Product Type for this company', 'warn');
      return;
    }

    // Rent a Car is optional, but once ticked the days are always required and
    // the charge only when it is not included in the premium.
    if (formData.rentACar) {
      if (!formData.rentACarDays) {
        notify('Please select the No. of Days for Rent a Car', 'warn');
        return;
      }
      if (!formData.rentACarIncluded && (!formData.rentACarPremium || formData.rentACarPremium <= 0)) {
        notify('Please enter Rent a Car Charges greater than 0, or tick No Charges', 'warn');
        return;
      }
    }

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
      additionalExcess: formData.additionalExcess,
      additionalExcessDetails: formData.additionalExcessDetails,
      premium: formData.premium,
      vat,
      total,
      isRecommended: formData.isRecommended,
      isRenewal: formData.isRenewal,
      advisorComment: advisorComment,
      driverCover: formData.driverCover,
      // The amount only means anything while the manual option is selected.
      driverCoverAmount: formData.driverCover === MANUAL_AMOUNT_OPTION ? formData.driverCoverAmount : 0,
      passengerCover: formData.passengerCover,
      passengerCoverAmount: formData.passengerCover === MANUAL_AMOUNT_OPTION ? formData.passengerCoverAmount : 0,
      // Never carry stale Rent a Car values through once the box is unticked,
      // nor a charge that the No Charges tick has made meaningless.
      rentACar: formData.rentACar,
      rentACarDays: formData.rentACar ? formData.rentACarDays : '',
      rentACarIncluded: formData.rentACar ? formData.rentACarIncluded : false,
      rentACarPremium: rentACarCharge(formData),
    };

    const updatedQuotes = [...quotes, newQuote];
    setQuotes(updatedQuotes);
    clearForm();
    
    // FIXED: Generate reference number ONCE if not exists, then always use it
    let refNum = currentReferenceNumber;
    let compId = currentComparisonId;
    
    if (!refNum) {
      refNum = generateReferenceNumber();
      compId = Date.now().toString();
      setCurrentReferenceNumber(refNum);
      setCurrentComparisonId(compId);
    }
    
    // Auto-save with the SAME reference number
    autoSaveQuotes(updatedQuotes, refNum, compId!);
    
    notify('Quote added · Ref ' + refNum, 'success');
  };

  const clearForm = () => {
    setFormData({
      ...formData,
      insuranceCompany: '',
      productType: '',
      repairType: '',
      thirdPartyLiability: 'NA',
      excess: 0,
      additionalExcess: '',
      additionalExcessDetails: '',
      premium: 0,
      isRecommended: false,
      isRenewal: false,
      driverCover: 'Excluded',
      driverCoverAmount: 0,
      passengerCover: 'Excluded',
      passengerCoverAmount: 0,
      rentACar: false,
      rentACarDays: '',
      rentACarPremium: 0,
      rentACarIncluded: false,
    });
    setSelectedCoverage([]);
    setOmanCover('NA');
    setWindscreenExcess('NA');
    setAdvisorComment('');
  };

  const removeQuote = (id: string) => {
    const updatedQuotes = quotes.filter(q => q.id !== id);
    setQuotes(updatedQuotes);
    if (editingQuoteId === id) setEditingQuoteId(null);
    
    // Auto-save after removing quote (if quotes remain)
    if (updatedQuotes.length > 0 && currentReferenceNumber && currentComparisonId) {
      autoSaveQuotes(updatedQuotes, currentReferenceNumber, currentComparisonId);
    }
  };

  const updateQuoteField = (id: string, field: keyof Quote, value: string | number | boolean | string[]) => {
    const updatedQuotes = quotes.map(q => {
      if (q.id === id) {
        const updated = { ...q, [field]: value };

        // Rent a Car keeps its own fields consistent - its charge is quoted on
        // its own row and never reaches the total.
        if (field === 'rentACar' && !value) {
          updated.rentACarDays = '';
          updated.rentACarPremium = 0;
          updated.rentACarIncluded = false;
        }
        if (field === 'rentACarIncluded' && value) {
          updated.rentACarPremium = 0;
        }

        if (field === 'premium') {
          const { vat, total } = calculateVAT(value as number);
          updated.vat = vat;
          updated.total = total;
        }

        return updated;
      }
      return q;
    });
    setQuotes(updatedQuotes);
    
    // Auto-save after updating quote field
    if (currentReferenceNumber && currentComparisonId) {
      autoSaveQuotes(updatedQuotes, currentReferenceNumber, currentComparisonId);
    }
  };

  // Writes the comparison to the shared history, with its report kept in Blob
  // storage for "View". The two are independent: a failed upload must not stop
  // the comparison from being recorded, and neither may depend on localStorage,
  // which throws once the cache is over quota. Returns the history error, if any.
  const persistComparison = async (
    comparisonData: SavedComparison,
    htmlContent: string
  ): Promise<{ historyError: string; uploadError: string }> => {
    // This save supersedes anything the debounce still has queued; letting a
    // stale snapshot land after it would undo the record just written.
    cancelPendingAutoSave();

    // Named as it always was, so re-saving an older comparison overwrites the
    // copy "View" already points at.
    const first = comparisonData.quotes[0];
    const blobName = `NSIB_${first.customerName.replace(/\s/g, '_')}_${first.make}_${first.model}_${comparisonData.referenceNumber}.html`;
    let uploadError = '';

    try {
      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: blobName, htmlContent }),
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + (await response.text()));
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      comparisonData.fileUrl = result.url;
    } catch (error) {
      console.error('Document upload failed:', error);
      uploadError = error instanceof Error ? error.message : String(error);
    }

    let historyError = '';

    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: comparisonData }),
      });

      // fetch() resolves on 4xx/5xx, so the status has to be checked explicitly.
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + (await response.text()));
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      console.error('History save failed:', error);
      historyError = error instanceof Error ? error.message : String(error);
    }

    cacheComparisonLocally(comparisonData);

    // Owns the status from here: the bump makes any auto-save still in flight
    // report nothing, since this write is the newer one.
    saveSeqRef.current++;
    pendingSaveRef.current = historyError ? comparisonData : null;
    setSaveState(historyError ? 'error' : 'saved');

    return { historyError, uploadError };
  };

  // The comparison as it stands, under its existing reference (or a new one).
  const buildComparisonData = (
    quoteList: Quote[] = quotes,
    linked: ZohoEnquiry | null = enquiry
  ): SavedComparison => {
    const referenceNumber = currentReferenceNumber || generateReferenceNumber();
    const comparisonId = currentComparisonId || Date.now().toString();

    // Update state if we had to generate new ones
    if (!currentReferenceNumber) {
      setCurrentReferenceNumber(referenceNumber);
      setCurrentComparisonId(comparisonId);
    }

    return {
      id: comparisonId,
      date: new Date().toISOString(),
      vehicle: quoteList[0].make + ' ' + quoteList[0].model,
      quotes: quoteList,
      referenceNumber,
      createdBy: getCurrentUserName(),
      enquiry: linked,
    };
  };

  const saveAndDownload = async () => {
    if (quotes.length === 0) {
      notify('No quotes to save. Add at least one quote first.', 'warn');
      return;
    }

    setSaving(true);
    setFilingNote(null);
    try {
      const comparisonData = buildComparisonData();
      const { referenceNumber } = comparisonData;
      const htmlContent = buildReportHtml(quotes, referenceNumber);
      const fileBase = reportFileBase(quotes, referenceNumber);

      // The PDF (and its WorkDrive copy) and the history record don't depend on
      // each other, so neither waits for the other.
      const [workdrive, { historyError, uploadError }] = await Promise.all([
        downloadReport(htmlContent, fileBase, referenceNumber, enquiry),
        persistComparison(comparisonData, htmlContent),
      ]);
      const filed = workDriveNote(enquiry, workdrive);

      if (enquiry) {
        setFilingNote(
          workdrive?.ok
            ? { ok: true, text: `Filed in WorkDrive as ${workdrive.fileName}.`, link: workdrive.link }
            : { ok: false, text: filed }
        );
      }

      if (historyError) {
        notify(
          'SAVE FAILED - Ref ' + referenceNumber + ' is NOT in the shared history.\n' +
          historyError + '\n\nThe file was downloaded to your computer. Please retry.',
          'error'
        );
      } else if (uploadError) {
        notify(
          'Saved to history · Ref ' + referenceNumber + '\n' +
          'The document upload failed, so "View" will be unavailable for this record.' +
          (filed ? '\n' + filed : ''),
          'error'
        );
      } else {
        notify(
          'Saved · Ref ' + referenceNumber + (filed ? '\n' + filed : ''),
          enquiry && !workdrive?.ok ? 'warn' : 'success'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // Saves the comparison and files its PDF in the enquiry's WorkDrive, with
  // nothing downloaded — for an advisor who edits a comparison but doesn't need
  // another local copy.
  const saveToWorkDrive = async (linked: ZohoEnquiry | null = enquiry, quoteList: Quote[] = quotes) => {
    if (!linked) {
      setFilingNote({ ok: false, text: 'Link a Zoho enquiry first.' });
      return;
    }
    if (quoteList.length === 0) {
      notify('No quotes to save. Add at least one quote first.', 'warn');
      return;
    }

    setFiling(true);
    setFilingNote({ ok: true, text: `Saving to ${linked.enquiryNo}'s WorkDrive…` });
    try {
      const comparisonData = buildComparisonData(quoteList, linked);
      const htmlContent = buildReportHtml(quoteList, comparisonData.referenceNumber);
      const [result, { historyError }] = await Promise.all([
        fileReportInWorkDrive(comparisonData),
        persistComparison(comparisonData, htmlContent),
      ]);

      if (historyError) {
        notify('SAVE FAILED - Ref ' + comparisonData.referenceNumber + ' is NOT in the shared history.\n' + historyError, 'error');
      }
      setFilingNote(
        result.ok
          ? { ok: true, text: `Filed in WorkDrive as ${result.fileName}.`, link: result.link }
          : { ok: false, text: workDriveNote(linked, result) }
      );
    } finally {
      setFiling(false);
    }
  };

  // Links (or unlinks) the Zoho enquiry. Its number replaces whatever was typed
  // on the quotes already added, since the report prints it. On a comparison
  // opened from Saved History, linking files its PDF straight away; one still
  // being built is filed when it is saved.
  const selectEnquiry = (picked: ZohoEnquiry | null) => {
    setEnquiry(picked);
    setFilingNote(null);
    setFormData(prev => ({
      ...prev,
      enquiryNumber: picked ? picked.enquiryNo : '',
      customerName: picked && !prev.customerName.trim() ? (picked.contactName || picked.enquiryName) : prev.customerName,
    }));
    if (!picked || quotes.length === 0) return;

    const relinked = quotes.map(q => ({ ...q, enquiryNumber: picked.enquiryNo }));
    setQuotes(relinked);
    if (openedFromHistory) {
      void saveToWorkDrive(picked, relinked);
    } else if (currentReferenceNumber && currentComparisonId) {
      autoSaveQuotes(relinked, currentReferenceNumber, currentComparisonId);
    }
  };

  const startNewComparison = () => {
    if (quotes.length > 0) {
      if (!confirm('Start a new comparison? This will clear all current quotes.')) {
        return;
      }
    }
    setQuotes([]);
    // CRITICAL: Clear tracking state for new comparison
    cancelPendingAutoSave();
    saveSeqRef.current++;
    setSaveState('idle');
    setCurrentComparisonId(null);
    setCurrentReferenceNumber(null);
    setEnquiry(null);
    setOpenedFromHistory(false);
    setFilingNote(null);
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
      additionalExcess: '',
      additionalExcessDetails: '',
      premium: 0,
      isRecommended: false,
      isRenewal: false,
      driverCover: 'Excluded',
      driverCoverAmount: 0,
      passengerCover: 'Excluded',
      passengerCoverAmount: 0,
      rentACar: false,
      rentACarDays: '',
      rentACarPremium: 0,
      rentACarIncluded: false,
    });
    clearForm();
    setEditingQuoteId(null);
  };

  const loadComparison = async (comparison: SavedComparison) => {
    let quotesToLoad: Quote[] = comparison.quotes;

    // Recovered records carry only a placeholder quote. Reconstruct the real
    // quotes from the saved HTML document before loading into the editor.
    const isRecovered = comparison.rebuilt || comparison.quotes?.[0]?.recovered;
    if (isRecovered) {
      if (!comparison.fileUrl) {
        notify('This recovered record has no document to reconstruct from.', 'error');
        return;
      }
      try {
        const res = await fetch('/api/parse-document?url=' + encodeURIComponent(comparison.fileUrl));
        const data = await res.json();
        if (!data.success || !Array.isArray(data.quotes) || data.quotes.length === 0) {
          notify('Could not reconstruct this record for editing.\n' + (data.error || '') + '\nYou can still use View to open the document.', 'error');
          return;
        }
        quotesToLoad = data.quotes as Quote[];
      } catch {
        notify('Could not reach the document to reconstruct it. Try again, or use View.', 'error');
        return;
      }
    }

    // Heal any total stored under an older rule, so the next save writes the
    // corrected figures back rather than carrying them forever.
    setQuotes(quotesToLoad.map(q => ({ ...q, ...quoteTotals(q) })));
    // CRITICAL: Set tracking state when loading - this ensures edits update the same record
    setCurrentComparisonId(comparison.id);
    setCurrentReferenceNumber(comparison.referenceNumber);
    setEnquiry(comparison.enquiry || null);
    setOpenedFromHistory(true);
    setFilingNote(null);
    setFormData({
      enquiryNumber: quotesToLoad[0]?.enquiryNumber || '',
      customerName: quotesToLoad[0]?.customerName || '',
      vehicleMake: quotesToLoad[0]?.make || '',
      vehicleModel: quotesToLoad[0]?.model || '',
      yearModel: quotesToLoad[0]?.year || '',
      vehicleValue: quotesToLoad[0]?.value || '',
      repairType: '',
      insuranceCompany: '',
      productType: '',
      thirdPartyLiability: 'NA',
      excess: 0,
      additionalExcess: '',
      additionalExcessDetails: '',
      premium: 0,
      isRecommended: false,
      isRenewal: false,
      driverCover: 'Excluded',
      driverCoverAmount: 0,
      passengerCover: 'Excluded',
      passengerCoverAmount: 0,
      rentACar: false,
      rentACarDays: '',
      rentACarPremium: 0,
      rentACarIncluded: false,
    });
    setCurrentPage('generator');
    notify(
      'Loaded ' + quotesToLoad.length + ' quote' + (quotesToLoad.length === 1 ? '' : 's') +
      ' · Ref ' + comparison.referenceNumber + '\nChanges now update this comparison.',
      'success'
    );
  };

  const sortedQuotes = sortQuotesForDisplay(quotes);
  // Legacy benefit labels are excluded so older records don't render a coverage
  // row that duplicates the Optional Covers rows below it.
  const allCoverageOptions: string[] = Array.from(
    new Set(quotes.flatMap((q: Quote) => q.coverageOptions))
  ).filter(option => !LEGACY_BENEFIT_LABELS.includes(option));

  const viewMeta: Record<AppView, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'NSIB Motor Comparison' },
    generator: { title: 'Create Comparison', subtitle: 'Build and edit a motor quote comparison' },
    history: { title: 'Saved History', subtitle: 'Every saved comparison' },
  };

  return (
    <AppShell
      active={currentPage}
      onNavigate={setCurrentPage}
      title={viewMeta[currentPage].title}
      subtitle={viewMeta[currentPage].subtitle}
      headerExtra={
        currentReferenceNumber && currentPage === 'generator' ? (
          <div className="hidden md:flex items-center gap-3 bg-white/12 border border-nsib-gold/45 text-nsib-gold-light px-3.5 py-2 rounded-lg font-mono text-xs shrink-0 backdrop-blur-sm">
            <span>
              Editing Ref {currentReferenceNumber} · {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
            </span>
            {saveState !== 'idle' && (
              <span className="flex items-center gap-2 border-l border-nsib-gold/35 pl-3">
                {saveState === 'error' ? (
                  <>
                    <span className="text-red-300">Not saved to cloud</span>
                    <button
                      type="button"
                      onClick={retryAutoSave}
                      className="border border-red-300/60 text-red-200 hover:bg-red-300/15 px-2 py-0.5 rounded"
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <span className={saveState === 'saved' ? 'text-emerald-300' : 'text-nsib-gold-light/70'}>
                    {saveState === 'saved' ? 'Saved to cloud' : 'Saving…'}
                  </span>
                )}
              </span>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="max-w-[1800px] mx-auto">
        {currentPage === 'dashboard' && (
          <DashboardHome onNavigate={setCurrentPage} />
        )}

        {currentPage === 'generator' && (
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
            currentReferenceNumber={currentReferenceNumber}
            enquiry={enquiry}
            selectEnquiry={selectEnquiry}
            saveToWorkDrive={() => { void saveToWorkDrive(); }}
            saving={saving}
            filing={filing}
            filingNote={filingNote}
          />
        )}

        {currentPage === 'history' && (
          <SavedHistoryPage loadComparison={loadComparison} />
        )}

        <ToastHost />
      </div>
    </AppShell>
  );
}

// ============ DASHBOARD HOME ============
function DashboardHome({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const [history, setHistory] = useState<SavedComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/history?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data?.success) setHistory(data.history || []);
      })
      .catch(error => console.error('Error loading history:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = now.toDateString();

    let thisMonth = 0;
    let todayCount = 0;
    let quoteCount = 0;
    const insurers = new Map<string, number>();

    history.forEach(comparison => {
      const date = new Date(comparison.date);
      if (!isNaN(date.getTime())) {
        if (date >= monthStart) thisMonth++;
        if (date.toDateString() === today) todayCount++;
      }
      comparison.quotes?.forEach(quote => {
        quoteCount++;
        if (quote.company) insurers.set(quote.company, (insurers.get(quote.company) || 0) + 1);
      });
    });

    const topInsurers = Array.from(insurers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return { total: history.length, thisMonth, today: todayCount, quoteCount, topInsurers };
  }, [history]);

  const recent = history.slice(0, 5);
  const maxInsurerCount = stats.topInsurers[0]?.[1] || 1;

  // Metric definitions for the executive band. Labels and values are the
  // existing ones verbatim — only their presentation changed.
  const metrics = [
    { label: 'Total Comparisons', value: stats.total },
    { label: 'This Month', value: stats.thisMonth },
    { label: "Today's Comparisons", value: stats.today },
    { label: 'Quotes Compared', value: stats.quoteCount },
  ];

  return (
    <div className="space-y-6 lg:space-y-7">
      {/* ============ EXECUTIVE OVERVIEW BAND ============ */}
      {/* Maroon is concentrated here rather than in the chrome: the figures and
          the primary action share one editorial band instead of six boxes. */}
      <section className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-nsib-red via-nsib-red-dark to-nsib-red-deep text-white shadow-card-hover ring-1 ring-nsib-gold/30">
        <div aria-hidden="true" className="absolute inset-0 nsib-band-weave" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-nsib-gold/55" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-nsib-gold via-nsib-gold-dark to-transparent"
        />

        <div className="relative px-6 sm:px-8 lg:px-10 py-7 lg:py-9 flex flex-col 2xl:flex-row 2xl:items-center gap-8 2xl:gap-12">
          {/* Figures sit on one baseline, parted by gold hairlines */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-y-7">
            {metrics.map((metric, i) => (
              <div key={metric.label} className="relative px-2 sm:px-4 lg:px-6 first:pl-0">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-16 w-px bg-gradient-to-b from-transparent via-nsib-gold/50 to-transparent ${
                      i % 2 === 1 ? '' : 'hidden lg:block'
                    }`}
                  />
                )}
                <span aria-hidden="true" className="block h-[2px] w-7 rounded-full bg-nsib-gold/85" />
                <div className="mt-4 text-[2.4rem] sm:text-[2.7rem] leading-none font-bold tabular-nums tracking-tight">
                  {loading ? '—' : metric.value}
                </div>
                <div className="mt-2.5 text-[0.62rem] sm:text-[0.66rem] font-bold uppercase tracking-[0.15em] leading-snug text-nsib-gold-light/90">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>

          {/* Primary action — lifted out of the nav so it reads as the main verb */}
          {/* Sits beside the figures on wide screens; drops to a right-aligned
              action below them once the strip needs the full width. */}
          <div className="shrink-0 flex justify-end 2xl:block 2xl:pl-12 2xl:border-l 2xl:border-nsib-gold/25">
            <button
              onClick={() => onNavigate('generator')}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-3.5 rounded-2xl bg-nsib-cream-light px-6 py-4 text-[0.95rem] font-bold text-nsib-red-dark ring-1 ring-nsib-gold/50 shadow-card-hover transition-all duration-200 hover:bg-white hover:ring-nsib-gold hover:-translate-y-0.5"
            >
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-nsib-red to-nsib-red-dark text-white flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </span>
              Create Comparison
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M4 12h14m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ============ WORKSPACE — asymmetric: activity left, insight right ============ */}
      {/* items-start: the rail sizes to its own content instead of padding out to
          match the activity list — the asymmetry is the point. */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6 items-start">
        {/* --- Recent comparisons: the dashboard's main surface --- */}
        <section className="xl:col-span-2 flex flex-col rounded-[1.25rem] nsib-panel-wash border border-nsib-sand shadow-card overflow-hidden">
          <header className="px-6 lg:px-7 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="text-[0.6rem] font-bold tracking-[0.32em] text-nsib-gold-dark">
                01
              </span>
              <span aria-hidden="true" className="h-px w-8 bg-nsib-gold/60" />
            </div>
            <h2 className="mt-2.5 text-[1.35rem] leading-tight font-bold text-nsib-red tracking-tight">
              Recent Comparisons
            </h2>
          </header>

          <div className="flex-1 px-3 sm:px-4 lg:px-5 pb-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span aria-hidden="true" className="w-12 h-12 rounded-full bg-nsib-cream ring-1 ring-nsib-sand animate-pulse" />
                <div className="text-sm text-nsib-muted">Loading...</div>
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14 lg:py-[4.5rem]">
                <span
                  aria-hidden="true"
                  className="w-16 h-16 rounded-full bg-white ring-1 ring-nsib-gold/45 shadow-card text-nsib-gold-dark flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.6.8l.9 1.2h7.3A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
                  </svg>
                </span>
                <span aria-hidden="true" className="mt-5 h-px w-10 bg-nsib-gold/55" />
                <p className="mt-5 text-sm font-semibold text-nsib-muted">No comparisons yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-nsib-sand/70">
                {recent.map(comparison => (
                  <li
                    key={comparison.id}
                    className="group flex items-center justify-between gap-4 rounded-xl px-3 sm:px-4 py-4 transition-colors duration-200 hover:bg-nsib-gold-soft/45"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        aria-hidden="true"
                        className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-white ring-1 ring-nsib-sand text-nsib-red items-center justify-center transition-all duration-200 group-hover:ring-nsib-gold/60"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M4 16.5V13l1.7-4.4A2 2 0 0 1 7.6 7.3h8.8a2 2 0 0 1 1.9 1.3L20 13v3.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M4 13h16" strokeLinecap="round" />
                          <circle cx="7.5" cy="16.4" r="1.3" />
                          <circle cx="16.5" cy="16.4" r="1.3" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-nsib-ink truncate">{comparison.vehicle}</div>
                        <div className="text-xs text-nsib-muted mt-1">
                          Ref: {comparison.referenceNumber} • {new Date(comparison.date).toLocaleString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 bg-white text-nsib-red border border-nsib-gold/40 px-3 py-1.5 rounded-full text-xs font-bold tabular-nums transition-colors duration-200 group-hover:border-nsib-gold">
                      {comparison.quotes?.length || 0} quotes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="mt-auto flex justify-end px-6 lg:px-7 py-4 border-t border-nsib-sand/80">
            <button
              onClick={() => onNavigate('history')}
              className="group/cta inline-flex items-center gap-2 rounded-lg px-3 py-1.5 -mr-3 text-sm font-bold text-nsib-red hover:text-nsib-red-dark transition-colors duration-200"
            >
              View All Comparisons
              <span aria-hidden="true" className="transition-transform duration-200 group-hover/cta:translate-x-1">
                →
              </span>
            </button>
          </footer>
        </section>

        {/* --- Insurer insight rail: narrower, warmer, deliberately not a twin --- */}
        <section className="flex flex-col rounded-[1.25rem] bg-gradient-to-b from-nsib-gold-soft/70 via-nsib-cream-light to-nsib-cream-light border border-nsib-gold/30 shadow-card overflow-hidden">
          <header className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="text-[0.6rem] font-bold tracking-[0.32em] text-nsib-gold-dark">
                02
              </span>
              <span aria-hidden="true" className="h-px w-8 bg-nsib-gold/60" />
            </div>
            <h2 className="mt-2.5 text-[1.15rem] leading-tight font-bold text-nsib-red tracking-tight">
              Most Quoted Insurers
            </h2>
          </header>

          <div className="flex-1 px-6 pb-3 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span aria-hidden="true" className="w-12 h-12 rounded-full bg-white ring-1 ring-nsib-sand animate-pulse" />
                <div className="text-sm text-nsib-muted">Loading...</div>
              </div>
            ) : stats.topInsurers.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14 lg:py-[4.5rem]">
                <span
                  aria-hidden="true"
                  className="w-16 h-16 rounded-full bg-white ring-1 ring-nsib-gold/45 shadow-card text-nsib-gold-dark flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 19V10M10 19V5M16 19v-6M22 19H2" strokeLinecap="round" />
                  </svg>
                </span>
                <span aria-hidden="true" className="mt-5 h-px w-10 bg-nsib-gold/55" />
                <p className="mt-5 text-sm font-semibold text-nsib-muted">No quotes yet</p>
              </div>
            ) : (
              stats.topInsurers.map(([company, count], i) => (
                <div key={company}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2.5 min-w-0">
                      <span aria-hidden="true" className="w-4 shrink-0 text-[0.62rem] font-bold tabular-nums text-nsib-gold-dark">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-semibold text-nsib-ink truncate">{company}</span>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-nsib-red">{count}</span>
                  </div>
                  <div className="mt-2 ml-[1.625rem] h-1.5 rounded-full bg-white ring-1 ring-nsib-sand overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-nsib-red to-nsib-gold transition-[width] duration-500"
                      style={{ width: `${Math.max(6, (count / maxInsurerCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <footer className="mt-auto px-5 py-4 border-t border-nsib-gold/30">
            <button
              onClick={() => onNavigate('generator')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-nsib-red/25 bg-white px-4 py-3 text-sm font-bold text-nsib-red shadow-sm hover:bg-nsib-red hover:text-white hover:border-nsib-red hover:shadow-nav-active transition-all duration-200"
            >
              <span aria-hidden="true">+</span> Create New Comparison
            </button>
          </footer>
        </section>
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
    additionalExcess: string;
    additionalExcessDetails: string;
    premium: number;
    isRecommended: boolean;
    isRenewal: boolean;
    driverCover: string;
    driverCoverAmount: number;
    passengerCover: string;
    passengerCoverAmount: number;
    rentACar: boolean;
    rentACarDays: string;
    rentACarPremium: number;
    rentACarIncluded: boolean;
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
  currentReferenceNumber: string | null;
  enquiry: ZohoEnquiry | null;
  selectEnquiry: (enquiry: ZohoEnquiry | null) => void;
  saveToWorkDrive: () => void;
  saving: boolean;
  filing: boolean;
  filingNote: { ok: boolean; text: string; link?: string } | null;
}

// ============ QUOTE GENERATOR PAGE ============
// Shared control styling, so every field in the form and in the live table reads
// as one set rather than a pile of one-off class strings.
// ---- Premium field system -------------------------------------------------
// Crisp white field on cream section bodies, gold on hover, maroon on focus.
const FIELD =
  'w-full h-11 px-3.5 border border-nsib-sand rounded-lg text-sm text-nsib-ink bg-white shadow-[inset_0_1px_2px_rgba(43,33,24,0.05)] hover:border-nsib-gold/70 focus:border-nsib-red focus:ring-2 focus:ring-nsib-red/15 focus:outline-none transition duration-200';
// Same field, plus the maroon chevron (see .nsib-select in globals.css).
const SELECT = `${FIELD} nsib-select`;
// Textareas cannot take a fixed height.
const AREA_FIELD =
  'w-full px-3.5 py-2.5 border border-nsib-sand rounded-lg text-sm text-nsib-ink bg-white shadow-[inset_0_1px_2px_rgba(43,33,24,0.05)] hover:border-nsib-gold/70 focus:border-nsib-red focus:ring-2 focus:ring-nsib-red/15 focus:outline-none transition duration-200';
// Split so a label sharing a row with a control can drop the bottom margin.
const LABEL_BASE = 'block text-[0.68rem] font-bold uppercase tracking-[0.09em] text-nsib-ink/80';
const LABEL = `${LABEL_BASE} mb-1.5`;
const CELL_FIELD = 'w-full p-1 border border-nsib-sand rounded text-xs text-nsib-ink bg-white focus:border-nsib-red focus:outline-none';
const PANEL = 'bg-white rounded-2xl border border-nsib-sand shadow-card';
// Quote-builder section shell: maroon header bar over a cream body.
const SECTION = 'rounded-2xl overflow-hidden border border-nsib-gold/30 shadow-card bg-nsib-cream-light';

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
    currentReferenceNumber,
    enquiry,
    selectEnquiry,
    saveToWorkDrive,
    saving,
    filing,
    filingNote,
  } = props;

  return (
    // 7/5 split rather than 50/50 — the builder is the work surface, the
    // comparison is the reference rail beside it.
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* ============ LEFT — QUOTE BUILDER WORKSPACE ============ */}
      <div className="xl:col-span-7 space-y-4 xl:max-h-[calc(100vh-11rem)] xl:overflow-y-auto xl:pr-1.5">
        {/* Workspace bar: title + business type as a true segmented control */}
        <div className="rounded-2xl border border-nsib-gold/30 shadow-card bg-nsib-cream-light overflow-hidden">
          <div className="nsib-section-head relative flex items-center gap-3 px-5 py-3.5">
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-lg bg-nsib-gold/20 ring-1 ring-nsib-gold/50 text-nsib-gold-light flex items-center justify-center shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.12em]">Add Quote</h2>
            <span aria-hidden="true" className="absolute inset-x-5 bottom-0 h-px bg-nsib-gold/40" />
          </div>

          <div className="p-5">
            <label className="block text-[0.68rem] font-bold uppercase tracking-[0.09em] mb-2.5 text-nsib-ink/80">
              Business Type *
            </label>
            <div className="inline-flex w-full sm:w-auto p-1 rounded-xl bg-white ring-1 ring-nsib-gold/40 shadow-[inset_0_1px_2px_rgba(43,33,24,0.06)]">
              <button
                onClick={() => setBusinessType('Private')}
                className={`flex-1 sm:flex-none sm:min-w-[9rem] px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${businessType === 'Private' ? 'bg-gradient-to-b from-nsib-red to-nsib-red-dark text-white shadow-nav-active' : 'text-nsib-muted hover:text-nsib-red'}`}
              >
                Private
              </button>
              <button
                onClick={() => setBusinessType('Commercial')}
                className={`flex-1 sm:flex-none sm:min-w-[9rem] px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${businessType === 'Commercial' ? 'bg-gradient-to-b from-nsib-red to-nsib-red-dark text-white shadow-nav-active' : 'text-nsib-muted hover:text-nsib-red'}`}
              >
                Commercial
              </button>
            </div>
          </div>
        </div>

        {/* ---- Section 01 · Vehicle Information ---- */}
        <div className={SECTION}>
          <div className="nsib-section-head relative flex items-center gap-3 px-5 py-3.5">
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-lg bg-nsib-gold/20 ring-1 ring-nsib-gold/50 text-nsib-gold-light text-[0.68rem] font-bold flex items-center justify-center shrink-0 tabular-nums"
            >
              01
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.12em]">Vehicle Information</h3>
            <span aria-hidden="true" className="absolute inset-x-5 bottom-0 h-px bg-nsib-gold/40" />
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className={LABEL}>Customer Name *</label>
              <input
                type="text"
                className={FIELD}
                placeholder="Enter customer name"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              />
            </div>

            {/* The enquiry number comes only from the linked enquiry, so a
                comparison can't carry a number that isn't in Zoho. */}
            <div>
              <label className={LABEL}>Zoho Enquiry *</label>
              {/* Older comparisons hold a hand-typed number and no link; it
                  seeds the search so linking them is one click. */}
              <EnquiryPicker
                defaultQuery={(!enquiry && formData.enquiryNumber) || formData.customerName}
                enquiry={enquiry}
                onSelect={selectEnquiry}
                inputClassName={FIELD}
                disabled={saving || filing}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Vehicle Make *</label>
                <select className={SELECT} value={formData.vehicleMake} onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}>
                  <option value="">Select Make</option>
                  {VEHICLE_MAKES.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Vehicle Model *</label>
                <input type="text" className={FIELD} placeholder="e.g., Camry" value={formData.vehicleModel} onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Year Model</label>
                <select className={SELECT} value={formData.yearModel} onChange={(e) => setFormData({ ...formData, yearModel: e.target.value })}>
                  <option value="">Select Year</option>
                  {YEARS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Vehicle Value</label>
                <input type="text" className={FIELD} placeholder="e.g., AED 85,000" value={formData.vehicleValue} onChange={(e) => setFormData({ ...formData, vehicleValue: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Section 02 · Quote Details ---- */}
        <div className={SECTION}>
          <div className="nsib-section-head relative flex items-center gap-3 px-5 py-3.5">
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-lg bg-nsib-gold/20 ring-1 ring-nsib-gold/50 text-nsib-gold-light text-[0.68rem] font-bold flex items-center justify-center shrink-0 tabular-nums"
            >
              02
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.12em]">Quote Details</h3>
            <span aria-hidden="true" className="absolute inset-x-5 bottom-0 h-px bg-nsib-gold/40" />
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={hasProductTypes ? '' : 'md:col-span-2'}>
                <label className={LABEL}>Insurance Company *</label>
                <select className={SELECT} value={formData.insuranceCompany} onChange={(e) => handleCompanyChange(e.target.value)}>
                  <option value="">Select Company</option>
                  {insuranceCompanies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>

              {hasProductTypes && (
                <div>
                  <label className={LABEL}>Product Type *</label>
                  <select
                    className={SELECT}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Repair Type</label>
                <select className={SELECT} value={formData.repairType} onChange={(e) => setFormData({ ...formData, repairType: e.target.value })}>
                  <option value="">Select Type</option>
                  <option value="NA">NA</option>
                  <option value="Agency">Agency</option>
                  <option value="Non-Agency">Non-Agency</option>
                  <option value="Agency/Non-Agency">Agency/Non-Agency</option>
                  <option value="Dyna Trade">Dyna Trade</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Third Party Liability</label>
                <select className={SELECT} value={formData.thirdPartyLiability} onChange={(e) => setFormData({ ...formData, thirdPartyLiability: e.target.value })}>
                  {THIRD_PARTY_LIABILITY_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Oman Cover</label>
                <select className={SELECT} value={omanCover} onChange={(e) => setOmanCover(e.target.value)}>
                  {OMAN_COVER_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Windscreen Excess</label>
                <select className={SELECT} value={windscreenExcess} onChange={(e) => setWindscreenExcess(e.target.value)}>
                  {WINDSCREEN_EXCESS_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Coverage picker gets its own inset surface so it stops reading as
                one more field in the stack. */}
            <div className="rounded-xl bg-white ring-1 ring-nsib-gold/35 shadow-card p-4">
              <label className={LABEL}>
                Coverage Options
                {selectedCoverage.length > 0 && (
                  <span className="ml-2 font-bold normal-case tracking-normal text-nsib-red">({selectedCoverage.length} selected)</span>
                )}
              </label>
              {/* Two columns: the full option list fits without a cramped inner scroll */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1 max-h-64 overflow-y-auto pr-1">
                {COVERAGE_OPTIONS.map(option => (
                  <label
                    key={option.id}
                    className="flex items-center gap-2.5 text-xs cursor-pointer text-nsib-ink rounded-lg px-2 py-1.5 hover:bg-nsib-gold-soft transition-colors duration-150"
                  >
                    <input type="checkbox" className="shrink-0 w-3.5 h-3.5" checked={selectedCoverage.includes(option.label)} onChange={() => handleCoverageToggle(option.label)} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional Covers — same inset surface as the coverage picker */}
            <div className="rounded-xl bg-white ring-1 ring-nsib-gold/35 shadow-card p-4 space-y-4">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.09em] text-nsib-red">
                Optional Covers
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Driver Cover</label>
                  <select
                    className={SELECT}
                    value={formData.driverCover}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        driverCover: e.target.value,
                        // Drop the typed amount when leaving the manual option.
                        driverCoverAmount: e.target.value === MANUAL_AMOUNT_OPTION ? formData.driverCoverAmount : 0,
                      })
                    }
                  >
                    {withStoredValue(DRIVER_COVER_OPTIONS, formData.driverCover).map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {formData.driverCover === MANUAL_AMOUNT_OPTION && (
                    <div className="mt-3">
                      <label className={LABEL}>Amount (AED)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={FIELD}
                        placeholder="Enter amount in AED"
                        value={formData.driverCoverAmount || ''}
                        onChange={(e) => setFormData({ ...formData, driverCoverAmount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className={LABEL}>Passenger Cover (per passenger)</label>
                  <select
                    className={SELECT}
                    value={formData.passengerCover}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passengerCover: e.target.value,
                        passengerCoverAmount: e.target.value === MANUAL_AMOUNT_OPTION ? formData.passengerCoverAmount : 0,
                      })
                    }
                  >
                    {withStoredValue(PASSENGER_COVER_OPTIONS, formData.passengerCover).map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {formData.passengerCover === MANUAL_AMOUNT_OPTION && (
                    <div className="mt-3">
                      <label className={LABEL}>Amount (AED)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={FIELD}
                        placeholder="Enter amount in AED"
                        value={formData.passengerCoverAmount || ''}
                        onChange={(e) => setFormData({ ...formData, passengerCoverAmount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <label
                className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold cursor-pointer ring-1 transition-all duration-200 ${formData.rentACar ? 'bg-nsib-red text-white ring-nsib-red shadow-card' : 'bg-white text-nsib-ink ring-nsib-sand hover:ring-nsib-gold/70'}`}
              >
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5"
                  checked={formData.rentACar}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rentACar: e.target.checked,
                      // Clear the dependents on untick so nothing stale is submitted.
                      rentACarDays: e.target.checked ? formData.rentACarDays : '',
                      rentACarPremium: e.target.checked ? formData.rentACarPremium : 0,
                      rentACarIncluded: e.target.checked ? formData.rentACarIncluded : false,
                    })
                  }
                />
                Rent a Car
              </label>

              {formData.rentACar && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>No. of Days *</label>
                    <select
                      className={SELECT}
                      value={formData.rentACarDays}
                      onChange={(e) => setFormData({ ...formData, rentACarDays: e.target.value })}
                    >
                      <option value="">Select Days</option>
                      {RENT_A_CAR_DAYS_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {/* No Charges means the cover costs nothing extra, so the
                        charge is cleared, locked and left out of the total. */}
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <label className={LABEL_BASE}>Charges {formData.rentACarIncluded ? '' : '*'}</label>
                      <label className="inline-flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.09em] text-nsib-ink/70 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5"
                          checked={formData.rentACarIncluded}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              rentACarIncluded: e.target.checked,
                              rentACarPremium: e.target.checked ? 0 : formData.rentACarPremium,
                            })
                          }
                        />
                        No Charges
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`${FIELD} disabled:bg-nsib-cream disabled:text-nsib-ink/40 disabled:cursor-not-allowed`}
                      placeholder={formData.rentACarIncluded ? 'No charges' : '0.00'}
                      disabled={formData.rentACarIncluded}
                      value={formData.rentACarIncluded ? '' : formData.rentACarPremium || ''}
                      onChange={(e) => setFormData({ ...formData, rentACarPremium: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Excess / Deductible</label>
                <input type="number" className={FIELD} placeholder="1000" value={formData.excess || ''} onChange={(e) => setFormData({ ...formData, excess: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className={LABEL}>Additional Excess</label>
                <select
                  className={SELECT}
                  value={formData.additionalExcess}
                  onChange={(e) => setFormData({ ...formData, additionalExcess: e.target.value, additionalExcessDetails: e.target.value === 'Not Applicable' ? '' : formData.additionalExcessDetails })}
                >
                  <option value="">Select</option>
                  <option value="Applicable">Applicable</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>
            </div>

            {formData.additionalExcess === 'Applicable' && (
              <div>
                <label className={LABEL}>Additional Excess Details</label>
                <input
                  type="text"
                  className={FIELD}
                  placeholder="Enter additional excess details..."
                  value={formData.additionalExcessDetails}
                  onChange={(e) => setFormData({ ...formData, additionalExcessDetails: e.target.value })}
                />
              </div>
            )}

            {/* Money block: maroon so the figures carry the most weight on the page */}
            <div className="rounded-xl bg-gradient-to-br from-nsib-red via-nsib-red-dark to-nsib-red-deep ring-1 ring-nsib-gold/35 shadow-card p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[0.68rem] font-bold uppercase tracking-[0.09em] mb-1.5 text-nsib-gold-light/90">Premium *</label>
                  <input type="number" step="0.01" className={FIELD} placeholder="2500.00" value={formData.premium || ''} onChange={(e) => handlePremiumChange(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-[0.68rem] font-bold uppercase tracking-[0.09em] mb-1.5 text-nsib-gold-light/90">VAT (5%)</label>
                  <input type="text" className="w-full h-11 px-3.5 rounded-lg text-sm bg-white/10 ring-1 ring-white/25 text-white font-semibold tabular-nums" value={fmtMoney(vat)} readOnly />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[0.68rem] font-bold uppercase tracking-[0.09em] mb-1.5 text-nsib-gold-light/90">Total Amount</label>
                  <input type="text" className="w-full h-11 px-3.5 rounded-lg text-sm bg-nsib-gold-soft ring-1 ring-nsib-gold font-bold text-nsib-red-dark tabular-nums" value={fmtMoney(total)} readOnly />
                </div>
              </div>
            </div>

            {/* Flags as selectable chips rather than bare checkboxes */}
            <div className="flex flex-wrap gap-3">
              <label
                className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold cursor-pointer ring-1 transition-all duration-200 ${formData.isRecommended ? 'bg-nsib-red text-white ring-nsib-red shadow-card' : 'bg-white text-nsib-ink ring-nsib-sand hover:ring-nsib-gold/70'}`}
              >
                <input type="checkbox" className="w-3.5 h-3.5" checked={formData.isRecommended} onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })} />
                Recommended
              </label>
              <label
                className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold cursor-pointer ring-1 transition-all duration-200 ${formData.isRenewal ? 'bg-nsib-gold text-nsib-red-dark ring-nsib-gold-dark shadow-card' : 'bg-white text-nsib-ink ring-nsib-sand hover:ring-nsib-gold/70'}`}
              >
                <input type="checkbox" className="w-3.5 h-3.5" checked={formData.isRenewal} onChange={(e) => setFormData({ ...formData, isRenewal: e.target.checked })} />
                Renewal
              </label>
            </div>

            <div>
              <label className={LABEL}>Advisor Comment (Optional)</label>
              <textarea
                className={AREA_FIELD}
                placeholder="Enter specific comment for this insurance company..."
                rows={3}
                value={advisorComment}
                onChange={(e) => setAdvisorComment(e.target.value)}
              />
            </div>

            <button
              onClick={addQuote}
              className="group w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-nsib-red to-nsib-red-dark text-white py-3.5 font-bold ring-1 ring-nsib-gold/30 shadow-nav-active hover:from-nsib-red-dark hover:to-nsib-red-deep hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add Quote to Comparison
            </button>
          </div>
        </div>

        {filingNote && (
          <div className={`p-3 rounded-xl border text-sm font-semibold ${filingNote.ok ? 'bg-green-50 border-green-300 text-green-800' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
            {filingNote.text}
            {filingNote.link && (
              <a href={filingNote.link} target="_blank" rel="noreferrer" className="ml-2 underline">
                Open in WorkDrive
              </a>
            )}
          </div>
        )}

        {quotes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={saveAndDownload}
              disabled={saving || filing}
              className="disabled:opacity-50 disabled:cursor-not-allowed rounded-xl bg-gradient-to-b from-nsib-gold-light to-nsib-gold text-nsib-red-dark py-3.5 font-bold ring-1 ring-nsib-gold-dark/40 shadow-card hover:from-nsib-gold hover:to-nsib-gold-dark hover:text-white hover:-translate-y-0.5 transition-all duration-200"
            >
              {currentReferenceNumber ? 'Update & Download' : 'Save & Download'} ({quotes.length})
            </button>
            <button
              onClick={saveToWorkDrive}
              disabled={!enquiry || saving || filing}
              title={
                enquiry
                  ? `Save this comparison and file its PDF in ${enquiry.enquiryNo}'s WorkDrive, with no download`
                  : 'Link a Zoho enquiry first'
              }
              className="rounded-xl bg-white text-nsib-red-dark border-2 border-nsib-gold py-3.5 font-bold hover:bg-nsib-gold/15 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {filing ? 'Saving to WorkDrive…' : 'Save to WorkDrive'}
            </button>
            <button
              onClick={startNewComparison}
              className="rounded-xl bg-white text-nsib-red border-2 border-nsib-red/70 py-3.5 font-bold hover:bg-nsib-red hover:text-white hover:border-nsib-red transition-all duration-200"
            >
              Start New Comparison
            </button>
          </div>
        )}
      </div>

      {/* ============ RIGHT — LIVE COMPARISON WORKSPACE ============ */}
      <div className="xl:col-span-5">
        {/* Fixed-height rail: reads as a workspace whether it holds a table or
            the empty state, instead of collapsing to a stub. */}
        <div className="xl:sticky xl:top-[6.75rem] flex flex-col rounded-2xl overflow-hidden border border-nsib-gold/30 shadow-card-hover bg-white xl:h-[calc(100vh-11rem)]">
          {/* Workspace header */}
          <div className="nsib-section-head relative flex items-center gap-3 px-5 py-3.5 shrink-0">
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-lg bg-nsib-gold/20 ring-1 ring-nsib-gold/50 text-nsib-gold-light flex items-center justify-center shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M12 4v16M5 8h14M7.5 8 5 14h5L7.5 8ZM16.5 8 14 14h5l-2.5-6Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.12em]">Live Comparison ({quotes.length})</h2>
            <span aria-hidden="true" className="absolute inset-x-5 bottom-0 h-px bg-nsib-gold/40" />
          </div>

          <div className="flex-1 overflow-auto">
        {quotes.length === 0 ? (
          <div className="relative h-full min-h-[24rem]">
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-nsib-gold-soft/60 via-nsib-cream-light to-white" />
            <div className="relative h-full flex flex-col items-center justify-center text-center px-8 py-20">
              <span
                aria-hidden="true"
                className="w-20 h-20 rounded-2xl bg-white ring-1 ring-nsib-gold/45 shadow-card text-nsib-red flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M12 4v16M5 8h14M7.5 8 5 14h5L7.5 8ZM16.5 8 14 14h5l-2.5-6Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span aria-hidden="true" className="mt-6 h-px w-12 bg-nsib-gold/60" />
              <p className="mt-6 text-base font-bold text-nsib-ink max-w-xs">
                Add quotes to see the comparison table
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="sticky top-0 bg-white z-20">
                  <th className="bg-nsib-gold-soft p-2.5 border border-nsib-sand text-left sticky left-0 z-30 min-w-[150px] text-nsib-ink uppercase tracking-[0.08em] text-[0.68rem]">Field</th>
                  {sortedQuotes.map((q) => (
                    <th key={q.id} className="nsib-section-head text-white p-3 border border-nsib-red-deep text-center min-w-[180px]">
                      {COMPANY_LOGOS[q.company] && (
                        <img src={COMPANY_LOGOS[q.company]} alt={q.company} className="h-8 w-full max-w-[145px] object-contain mx-auto mb-1 bg-white rounded p-1" />
                      )}
                      <div className="font-bold text-sm mb-1">{q.company}</div>
                      {q.productType && <div className="text-xs mb-1 opacity-90">{q.productType.substring(0, 30)}{q.productType.length > 30 ? '...' : ''}</div>}
                      <div className="text-base font-bold"><DirhamMark />{fmtMoney(quoteTotals(q).total)}</div>
                      <div className="flex gap-1 justify-center mt-2">
                        {editingQuoteId === q.id ? (
                          <button onClick={() => setEditingQuoteId(null)} className="bg-white text-nsib-red px-2 py-1 rounded text-xs font-bold hover:bg-nsib-gold-soft">
                            Done
                          </button>
                        ) : (
                          <button onClick={() => setEditingQuoteId(q.id)} className="bg-nsib-gold text-nsib-red-dark px-2 py-1 rounded text-xs font-bold hover:bg-nsib-gold-dark hover:text-white">
                            Edit
                          </button>
                        )}
                        <button onClick={() => removeQuote(q.id)} className="bg-white/15 border border-white/40 text-white px-2 py-1 rounded text-xs font-bold hover:bg-white/25">
                          Del
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Company */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Company</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">{q.company}</td>
                  ))}
                </tr>

                {/* Product Type */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Product Type</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink text-xs">{q.productType || 'N/A'}</td>
                  ))}
                </tr>

                {/* Repair Type */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Repair Type</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <select 
                          value={q.repairType} 
                          onChange={(e) => updateQuoteField(q.id, 'repairType', e.target.value)}
                          className={CELL_FIELD}
                        >
                          <option value="NA">NA</option>
                          <option value="Agency">Agency</option>
                          <option value="Non-Agency">Non-Agency</option>
                          <option value="Agency/Non-Agency">Agency/Non-Agency</option>
                          <option value="Dyna Trade">Dyna Trade</option>
                        </select>
                      ) : (
                        q.repairType
                      )}
                    </td>
                  ))}
                </tr>

                {/* Vehicle Value */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Vehicle Value</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <input 
                          type="text" 
                          value={q.value}
                          onChange={(e) => updateQuoteField(q.id, 'value', e.target.value)}
                          className={CELL_FIELD}
                        />
                      ) : (
                        <VehicleValueCell value={q.value} />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Third Party Liability */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Third Party Liability</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <select 
                          value={q.thirdPartyLiability}
                          onChange={(e) => updateQuoteField(q.id, 'thirdPartyLiability', e.target.value)}
                          className={CELL_FIELD}
                        >
                          {THIRD_PARTY_LIABILITY_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <CurrencyText value={q.thirdPartyLiability} />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Oman Cover */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Oman Cover</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <select 
                          value={q.omanCover}
                          onChange={(e) => updateQuoteField(q.id, 'omanCover', e.target.value)}
                          className={CELL_FIELD}
                        >
                          {OMAN_COVER_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <CurrencyText value={q.omanCover} />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Windscreen Excess */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Windscreen Excess</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <select 
                          value={q.windscreenExcess}
                          onChange={(e) => updateQuoteField(q.id, 'windscreenExcess', e.target.value)}
                          className={CELL_FIELD}
                        >
                          {WINDSCREEN_EXCESS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <CurrencyText value={q.windscreenExcess} />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Coverage Options */}
                {COVERAGE_OPTIONS.map(option => (
                  <tr key={option.id}>
                    <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">{option.label}</td>
                    {sortedQuotes.map(q => {
                      const included = q.coverageOptions.includes(option.label);
                      return (
                        <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white">
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
                            <span className={included ? 'text-nsib-red font-bold' : 'text-nsib-muted/70 font-bold'}>
                              {included ? 'YES' : 'NO'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Optional Covers */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Driver Cover</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <div className="flex flex-col gap-1">
                          <select
                            value={readDriverCover(q)}
                            onChange={(e) => {
                              updateQuoteField(q.id, 'driverCover', e.target.value);
                              if (e.target.value !== MANUAL_AMOUNT_OPTION) updateQuoteField(q.id, 'driverCoverAmount', 0);
                            }}
                            className={CELL_FIELD}
                          >
                            {withStoredValue(DRIVER_COVER_OPTIONS, readDriverCover(q)).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {readDriverCover(q) === MANUAL_AMOUNT_OPTION && (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={q.driverCoverAmount || 0}
                              onChange={(e) => updateQuoteField(q.id, 'driverCoverAmount', parseFloat(e.target.value) || 0)}
                              className={CELL_FIELD}
                              placeholder="Amount (AED)"
                            />
                          )}
                        </div>
                      ) : (
                        <CurrencyText value={formatCoverValue(readDriverCover(q), q.driverCoverAmount)} />
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Passenger Cover (per passenger)</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <div className="flex flex-col gap-1">
                          <select
                            value={readPassengerCover(q)}
                            onChange={(e) => {
                              updateQuoteField(q.id, 'passengerCover', e.target.value);
                              if (e.target.value !== MANUAL_AMOUNT_OPTION) updateQuoteField(q.id, 'passengerCoverAmount', 0);
                            }}
                            className={CELL_FIELD}
                          >
                            {withStoredValue(PASSENGER_COVER_OPTIONS, readPassengerCover(q)).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {readPassengerCover(q) === MANUAL_AMOUNT_OPTION && (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={q.passengerCoverAmount || 0}
                              onChange={(e) => updateQuoteField(q.id, 'passengerCoverAmount', parseFloat(e.target.value) || 0)}
                              className={CELL_FIELD}
                              placeholder="Amount (AED)"
                            />
                          )}
                        </div>
                      ) : (
                        <CurrencyText value={formatCoverValue(readPassengerCover(q), q.passengerCoverAmount)} />
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Rent a Car</td>
                  {sortedQuotes.map(q => {
                    const hasRental = readRentACar(q);
                    return (
                      <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">
                        {editingQuoteId === q.id ? (
                          <div className="flex flex-col gap-1">
                            <label className="flex items-center justify-center gap-1 text-xs text-nsib-ink">
                              <input
                                type="checkbox"
                                checked={hasRental}
                                // One call only: updateQuoteField clears the
                                // dependents itself. Chained calls each mapped
                                // over the same stale quotes, so only the last
                                // one survived.
                                onChange={(e) => updateQuoteField(q.id, 'rentACar', e.target.checked)}
                              />
                              Rent a Car
                            </label>
                            {hasRental && (
                              <>
                                <select
                                  value={q.rentACarDays || ''}
                                  onChange={(e) => updateQuoteField(q.id, 'rentACarDays', e.target.value)}
                                  className={CELL_FIELD}
                                >
                                  <option value="">Select Days</option>
                                  {withStoredValue(RENT_A_CAR_DAYS_OPTIONS, q.rentACarDays || '').map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                                <label className="flex items-center justify-center gap-1 text-xs text-nsib-ink">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(q.rentACarIncluded)}
                                    onChange={(e) => updateQuoteField(q.id, 'rentACarIncluded', e.target.checked)}
                                  />
                                  No Charges
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={q.rentACarIncluded ? '' : q.rentACarPremium || 0}
                                  onChange={(e) => updateQuoteField(q.id, 'rentACarPremium', parseFloat(e.target.value) || 0)}
                                  className={`${CELL_FIELD} disabled:bg-nsib-cream disabled:text-nsib-ink/40 disabled:cursor-not-allowed`}
                                  placeholder={q.rentACarIncluded ? 'No Charges' : 'Charges'}
                                  disabled={Boolean(q.rentACarIncluded)}
                                />
                              </>
                            )}
                          </div>
                        ) : hasRental ? (
                          <>
                            {q.rentACarDays || '-'}
                            {q.rentACarIncluded
                              ? ' · No Charges'
                              : q.rentACarPremium
                                ? <> · <DirhamMark />{fmtMoney(q.rentACarPremium)}</>
                                : ''}
                          </>
                        ) : (
                          'NO'
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Excess */}
                <tr className="bg-nsib-gold-soft">
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-gold-soft sticky left-0 z-10 text-nsib-ink">Excess / Deductible</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-nsib-gold-soft text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <input 
                          type="number"
                          value={q.excess}
                          onChange={(e) => updateQuoteField(q.id, 'excess', parseFloat(e.target.value) || 0)}
                          className={CELL_FIELD}
                        />
                      ) : (
                        <><DirhamMark />{fmtWhole(q.excess)}</>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Additional Excess */}
                <tr className="bg-nsib-gold-soft">
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-gold-soft sticky left-0 z-10 text-nsib-ink">Additional Excess</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-nsib-gold-soft text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <div>
                          <select 
                            value={q.additionalExcess || ''}
                            onChange={(e) => updateQuoteField(q.id, 'additionalExcess', e.target.value)}
                            className={`${CELL_FIELD} mb-1`}
                          >
                            <option value="">Select</option>
                            <option value="Applicable">Applicable</option>
                            <option value="Not Applicable">Not Applicable</option>
                          </select>
                          {q.additionalExcess === 'Applicable' && (
                            <input 
                              type="text"
                              value={q.additionalExcessDetails || ''}
                              onChange={(e) => updateQuoteField(q.id, 'additionalExcessDetails', e.target.value)}
                              className={CELL_FIELD}
                              placeholder="Details..."
                            />
                          )}
                        </div>
                      ) : (
                        <CurrencyText value={q.additionalExcess === 'Applicable' ? q.additionalExcessDetails : (q.additionalExcess || '-')} />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Premium */}
                <tr className="bg-nsib-gold-soft">
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-gold-soft sticky left-0 z-10 text-nsib-ink">Premium</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-nsib-gold-soft text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <input 
                          type="number"
                          step="0.01"
                          value={q.premium}
                          onChange={(e) => updateQuoteField(q.id, 'premium', parseFloat(e.target.value) || 0)}
                          className={CELL_FIELD}
                        />
                      ) : (
                        <><DirhamMark />{fmtMoney(q.premium)}</>
                      )}
                    </td>
                  ))}
                </tr>

                {/* VAT */}
                <tr className="bg-nsib-gold-soft">
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-gold-soft sticky left-0 z-10 text-nsib-ink">VAT (5%)</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-nsib-gold-soft text-nsib-ink">
                      <DirhamMark />{fmtMoney(quoteTotals(q).vat)}
                    </td>
                  ))}
                </tr>

                {/* Total */}
                <tr className="bg-nsib-red-soft">
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-red text-white sticky left-0 z-10">Total Premium</td>
                  {sortedQuotes.map((q) => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center font-bold bg-nsib-red-soft text-nsib-red text-base">
                      <DirhamMark />{fmtMoney(quoteTotals(q).total)}
                    </td>
                  ))}
                </tr>

                {/* Advisor Comment */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Advisor Comment</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white text-nsib-ink">
                      {editingQuoteId === q.id ? (
                        <textarea 
                          value={q.advisorComment}
                          onChange={(e) => updateQuoteField(q.id, 'advisorComment', e.target.value)}
                          className={CELL_FIELD}
                          rows={2}
                          placeholder="Optional"
                        />
                      ) : (
                        <div className="text-xs text-left"><CurrencyText value={q.advisorComment || '-'} /></div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Status */}
                <tr>
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-cream/60 sticky left-0 z-10 text-nsib-ink">Status</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-white">
                      <div className="flex flex-col gap-1">
                        {editingQuoteId === q.id ? (
                          <>
                            <label className="flex items-center justify-center gap-1 text-xs text-nsib-ink">
                              <input 
                                type="checkbox"
                                checked={q.isRecommended}
                                onChange={(e) => updateQuoteField(q.id, 'isRecommended', e.target.checked)}
                              />
                              Recommended
                            </label>
                            <label className="flex items-center justify-center gap-1 text-xs text-nsib-ink">
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
                            {q.isRecommended && <span className="bg-nsib-red text-white px-2 py-1 rounded-full text-xs font-semibold">Recommended</span>}
                            {q.isRenewal && <span className="bg-nsib-gold text-nsib-red-dark px-2 py-1 rounded-full text-xs font-semibold">Renewal</span>}
                            {!q.isRecommended && !q.isRenewal && <span className="text-nsib-muted text-xs">-</span>}
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
      </div>
    </div>
  );
}

// ============ SAVED HISTORY PAGE ============
interface SavedHistoryPageProps {
  loadComparison: (comparison: SavedComparison) => void | Promise<void>;
}

function SavedHistoryPage({ loadComparison }: SavedHistoryPageProps) {
  const [history, setHistory] = useState<SavedComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  // Custom range bounds, as yyyy-mm-dd from the date inputs. Either side may be
  // left blank for an open-ended range.
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/history?t=' + Date.now());
      const result = await response.json();
      
      if (result.success && result.history && result.history.length > 0) {
        setHistory(result.history);
        // Cache only a recent slice. Mirroring the whole shared history here is
        // what pushed localStorage past its ~5MB quota, which made every
        // subsequent setItem throw and silently killed saving.
        try {
          localStorage.setItem(
            'quotesHistory',
            JSON.stringify(result.history.slice(0, LOCAL_CACHE_LIMIT))
          );
        } catch (error) {
          console.warn('Local cache write skipped:', error);
        }
      } else {
        const localHistory = JSON.parse(localStorage.getItem('quotesHistory') || '[]');
        setHistory(localHistory);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      const localHistory = JSON.parse(localStorage.getItem('quotesHistory') || '[]');
      setHistory(localHistory);
    } finally {
      setLoading(false);
    }
  };

  const deleteComparison = async (id: string) => {
    if (!confirm('Delete this comparison?')) return;
    
    try {
      const response = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + (await response.text()));
      }
      const updated = history.filter(h => h.id !== id);
      setHistory(updated);
      try {
        localStorage.setItem('quotesHistory', JSON.stringify(updated.slice(0, LOCAL_CACHE_LIMIT)));
      } catch (error) {
        console.warn('Local cache write skipped:', error);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      notify('Delete failed. The record is still in the shared history.', 'error');
    }
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

  // Unique "Created by" values, so the dropdown only offers advisors who
  // actually have saved records.
  const creators = useMemo(() => {
    const names = new Set<string>();
    history.forEach(comparison => {
      if (comparison.createdBy) names.add(comparison.createdBy);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [history]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let thisMonth = 0;
    let lastMonth = 0;

    history.forEach(comparison => {
      const date = new Date(comparison.date);
      if (isNaN(date.getTime())) return;
      if (date >= thisMonthStart) thisMonth++;
      else if (date >= lastMonthStart) lastMonth++;
    });

    return { total: history.length, thisMonth, lastMonth };
  }, [history]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last7Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // A yyyy-mm-dd string parses as UTC midnight, which shifts the boundary by
    // the timezone offset. Build local dates so "from 29 Jul" means 29 Jul here.
    const parseLocal = (value: string, endOfDay: boolean) => {
      const [y, m, d] = value.split('-').map(Number);
      if (!y || !m || !d) return null;
      return endOfDay
        ? new Date(y, m - 1, d, 23, 59, 59, 999)
        : new Date(y, m - 1, d, 0, 0, 0, 0);
    };

    const rangeStart = periodFilter === 'custom' && fromDate ? parseLocal(fromDate, false) : null;
    const rangeEnd = periodFilter === 'custom' && toDate ? parseLocal(toDate, true) : null;

    return history.filter(comparison => {
      if (createdByFilter !== 'all' && comparison.createdBy !== createdByFilter) {
        return false;
      }

      if (periodFilter !== 'all') {
        const date = new Date(comparison.date);
        if (isNaN(date.getTime())) return false;

        if (periodFilter === 'thisMonth' && date < thisMonthStart) return false;
        if (periodFilter === 'lastMonth' && (date < lastMonthStart || date >= thisMonthStart)) return false;
        if (periodFilter === 'last7' && date < last7Start) return false;
        if (periodFilter === 'last30' && date < last30Start) return false;
        if (rangeStart && date < rangeStart) return false;
        if (rangeEnd && date > rangeEnd) return false;
      }

      if (!searchTerm.trim()) return true;

      const search = searchTerm.toLowerCase().trim();
      const customerName = comparison.quotes?.[0]?.customerName?.toLowerCase() || '';
      const enquiryNumber = comparison.quotes?.[0]?.enquiryNumber?.toLowerCase() || '';
      const referenceNumber = comparison.referenceNumber?.toLowerCase() || '';
      const vehicle = comparison.vehicle?.toLowerCase() || '';

      return customerName.includes(search) ||
             enquiryNumber.includes(search) ||
             referenceNumber.includes(search) ||
             vehicle.includes(search);
    });
  }, [history, searchTerm, createdByFilter, periodFilter, fromDate, toDate]);

  const filtersActive = searchTerm.trim() !== '' || createdByFilter !== 'all' || periodFilter !== 'all';
  const invalidRange = periodFilter === 'custom' && fromDate !== '' && toDate !== '' && fromDate > toDate;

  const clearFilters = () => {
    setSearchTerm('');
    setCreatedByFilter('all');
    setPeriodFilter('all');
    setFromDate('');
    setToDate('');
  };

  if (loading) {
    return (
      <div className={`${PANEL} p-5`}>
        <div className="text-center py-20 text-nsib-muted font-semibold">Loading history...</div>
      </div>
    );
  }

  return (
    <div className={`${PANEL} p-5`}>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-bold text-nsib-red">Saved History</h2>
          <p className="text-sm text-nsib-muted">Every saved comparison, synced across devices</p>
        </div>
        <button
          onClick={loadHistory}
          className="bg-white border border-nsib-sand text-nsib-ink px-4 py-2 rounded-lg font-bold text-sm hover:bg-nsib-gold-soft hover:border-nsib-gold transition"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Total Saved', value: stats.total, tone: 'text-nsib-red', accent: 'bg-nsib-red' },
          { label: 'This Month', value: stats.thisMonth, tone: 'text-emerald-700', accent: 'bg-emerald-600' },
          { label: 'Last Month', value: stats.lastMonth, tone: 'text-nsib-gold-dark', accent: 'bg-nsib-gold' },
          { label: 'Showing', value: filteredHistory.length, tone: 'text-nsib-ink', accent: 'bg-nsib-muted' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-nsib-sand rounded-2xl shadow-card overflow-hidden">
            <div className="p-4">
              <div className="text-[11px] font-bold text-nsib-muted uppercase tracking-wide">{card.label}</div>
              <div className={`text-3xl font-bold mt-1 ${card.tone}`}>{card.value}</div>
            </div>
            <div className={`h-1 ${card.accent}`} />
          </div>
        ))}
      </div>

      <div className="bg-nsib-cream/70 border border-nsib-sand rounded-2xl p-4 mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-3">
          <div>
            <label className="block text-xs font-bold text-nsib-muted mb-1">🔍 Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Customer Name, Enquiry Number, or Reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-4 pr-10 border border-nsib-sand rounded-lg text-sm focus:border-nsib-red focus:outline-none text-nsib-ink bg-white transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-nsib-muted hover:text-nsib-red font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-nsib-muted mb-1">👤 Created by</label>
            <select
              value={createdByFilter}
              onChange={(e) => setCreatedByFilter(e.target.value)}
              className="w-full p-3 border border-nsib-sand rounded-lg text-sm focus:border-nsib-red focus:outline-none text-nsib-ink bg-white transition"
            >
              <option value="all">Everyone</option>
              {creators.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-nsib-muted mb-1">📅 Period</label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full p-3 border border-nsib-sand rounded-lg text-sm focus:border-nsib-red focus:outline-none text-nsib-ink bg-white transition"
            >
              <option value="all">All time</option>
              <option value="thisMonth">This month</option>
              <option value="lastMonth">Last month</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="custom">Custom date range</option>
            </select>
          </div>
        </div>

        {periodFilter === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-nsib-sand">
            <div>
              <label className="block text-xs font-bold text-nsib-muted mb-1">From date</label>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full p-3 border border-nsib-sand rounded-lg text-sm focus:border-nsib-red focus:outline-none text-nsib-ink bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-nsib-muted mb-1">To date</label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full p-3 border border-nsib-sand rounded-lg text-sm focus:border-nsib-red focus:outline-none text-nsib-ink bg-white transition"
              />
            </div>
            {invalidRange && (
              <p className="sm:col-span-2 text-xs font-semibold text-nsib-red">
                The From date is after the To date — no records can match.
              </p>
            )}
            {!fromDate && !toDate && (
              <p className="sm:col-span-2 text-xs text-nsib-muted">
                Pick one or both dates. Leaving one blank keeps that end of the range open.
              </p>
            )}
          </div>
        )}

        {filtersActive && (
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-nsib-muted">
              Found {filteredHistory.length} of {history.length} records
            </p>
            <button
              onClick={clearFilters}
              className="text-sm font-bold text-nsib-red hover:text-nsib-red-dark"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center text-nsib-muted italic py-20">
          No saved comparisons yet.
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center text-nsib-muted italic py-20">
          No records match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredHistory.map(comparison => (
            <div
              key={comparison.id}
              className="bg-white p-5 rounded-2xl border border-nsib-sand shadow-card hover:shadow-card-hover hover:border-nsib-gold transition flex flex-col"
            >
              <div className="mb-3">
                <div className="font-bold text-lg text-nsib-ink">{comparison.vehicle}</div>
                {comparison.quotes?.[0]?.customerName && (
                  <div className="text-sm text-nsib-ink/80">{comparison.quotes[0].customerName}</div>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] font-mono">
                  <span className="text-nsib-red">Ref: {comparison.referenceNumber}</span>
                  {comparison.quotes?.[0]?.enquiryNumber && (
                    <span className="text-nsib-gold-dark">Enq: {comparison.quotes[0].enquiryNumber}</span>
                  )}
                </div>
                <div className="text-xs text-nsib-muted mt-1">
                  {formatDate(comparison.date)}
                  {comparison.createdBy && ` • ${comparison.createdBy}`}
                </div>
              </div>

              <div className="mb-4 flex-1">
                <div className="text-xs font-bold text-nsib-muted uppercase tracking-wide mb-1">
                  {comparison.quotes?.length || 0} Quotes
                </div>
                <div className="text-xs text-nsib-ink/80 max-h-24 overflow-y-auto space-y-0.5">
                  {comparison.quotes?.map(q => (
                    <div key={q.id} className="truncate">
                      {q.company} — <DirhamMark />{fmtMoney(quoteTotals(q).total)}
                      {q.isRenewal && ' (R)'}
                      {q.isRecommended && ' ★'}
                    </div>
                  )) || <div className="text-nsib-muted">No quote details</div>}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => loadComparison(comparison)}
                  className="flex-1 bg-nsib-red text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-nsib-red-dark transition"
                  title={(comparison.rebuilt || comparison.quotes?.[0]?.recovered) ? 'Reconstructs the full quotes from the saved document, then opens for editing.' : undefined}
                >
                  {(comparison.rebuilt || comparison.quotes?.[0]?.recovered) ? 'Rebuild & Edit' : 'Edit'}
                </button>
                {comparison.fileUrl && (
                  <a
                    href={comparison.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-nsib-gold text-nsib-red-dark px-3 py-2 rounded-lg text-sm font-bold hover:bg-nsib-gold-dark hover:text-white transition text-center"
                  >
                    View
                  </a>
                )}
                <button
                  onClick={() => deleteComparison(comparison.id)}
                  className="px-3 py-2 rounded-lg text-sm font-bold text-nsib-red border border-nsib-sand hover:bg-nsib-red-soft hover:border-nsib-red transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
