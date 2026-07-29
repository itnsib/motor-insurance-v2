'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AppShell, { AppView } from '@/components/AppShell';

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
}

interface CompanyDefaults {
  repairType: string;
  thirdPartyLiability: string;
  omanCover: string;
  windscreenExcess: string;
  coverageOptions: string[];
}

// ============ COMPANY LOGOS ============
const COMPANY_LOGOS: Record<string, string> = {
  'SUKOON': 'https://i.imgur.com/hCWlUMe.jpeg',
  'DNI': 'https://i.imgur.com/HKXpfsU.jpeg',
  'QATAR': 'https://i.imgur.com/5d63cLP.png',
  'WATANIA': 'https://i.imgur.com/KaVFAu6.jpeg',
  'ADAMJEE': 'https://i.imgur.com/dufDDqK.jpeg',
  'FIDELITY': 'https://i.imgur.com/T26OgNE.jpeg',
  'LIVA': 'https://i.imgur.com/BqDrkcY.jpeg',
  'EMIRATES': 'https://i.imgur.com/8cnZRff.jpeg',
  'RAK': 'https://i.imgur.com/HS6ctxT.png',
  'SALAMA': 'https://i.imgur.com/Kx5sGSA.jpeg',
  'INSURANCE HOUSE': 'https://i.imgur.com/OodWGYQ.jpeg',
  'NEW INDIA DXB': 'https://i.imgur.com/oUeb8HP.png',
  'METHAQ': 'https://i.imgur.com/FjNhizV.jpeg',
  'NGI': 'https://i.imgur.com/ye6IvRS.jpeg',
  'GIG': 'https://i.imgur.com/Kho3VbT.png',
  'AL WATHBA': 'https://i.imgur.com/eulYgMf.jpeg',
  'ORIENT INSRANCE': 'https://i.imgur.com/eIN9e72.png',
  'UNION INSURANCE': 'https://i.imgur.com/sdmPCNl.jpeg',
  'NIA ABU DHABI': 'https://i.imgur.com/oUeb8HP.png',
  'AL SAGR': 'https://i.imgur.com/U2CmHX4.jpeg',
  'NEW INDIA ABU DHABI': 'https://i.imgur.com/oUeb8HP.png',
  'DNIRC': 'https://i.imgur.com/HKXpfsU.jpeg',
  'NIA DXB': 'https://i.imgur.com/oUeb8HP.png',
  'AL ITTIHAD AL WATANI': 'https://i.imgur.com/UpraA62.jpeg',
  'METHAQ (ind. pickup)': 'https://i.imgur.com/FjNhizV.jpeg',
};

// ============ CONSTANTS FROM GOOGLE SHEETS ============
const VEHICLE_MAKES = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Avatr', 'BAIC Motor', 'Bentley', 'Bestune', 'BMW',
  'Bugatti', 'Buick', 'BYD', 'Cadillac', 'Changan', 'Chery', 'Chevrolet', 'Chrysler',
  'Citroën', 'CMC', 'Dacia', 'Daewoo', 'Daihatsu', 'Deepal', 'Dodge', 'Dongfeng' , 'DFSK' , 'Ducati', 'Exeed', 'Ferrari',
  'Fiat', 'Ford', 'Foton', 'Force - Urbania(Mini Bus)', 'GAC Motor', 'Geely', 'Genesis', 'GMC', 'Great Wall', 'Haval', 'Higer',
  'Hino 300', 'Honda', 'Hongqi', 'Hummer', 'Hyundai', 'Infiniti', 'Isuzu', 'JAC Motors',
  'Jaguar', 'Jeep', 'Jetour', 'Kia',  'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln',
  'Lotus', 'Maserati', 'Mazda', 'Maxus', 'McLaren', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi',
  'Nio', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'RAM', 'Renault', 'Rolls-Royce',
  'Saab', 'Seat', 'Skoda', 'Smart', 'SsangYong', 'Subaru', 'Suzuki', 'Tesla', 'Tata',
  'Toyota', 'Victory', 'Volkswagen', 'Volvo', 'Wey', 'Zeekr', 'King Long(Bus)', 'King Long(Van)', 'Ashok Leyland (BUS)', 'Ashok Leyland (Pickup)'
];

const YEARS = [
  '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017',
  '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007',
  '2006', '2005', '2004', '2003', '2002', '2001', '2000', '1999', '1998', '1997',
  '1996', '1995', '1994', '1993', '1992', '1991', '1990'
];

const PRIVATE_INSURANCE_COMPANIES = [
  'SUKOON', 'DNI', 'QATAR', 'WATANIA', 'ADAMJEE', 'FIDELITY', 'LIVA', 'EMIRATES',
  'RAK', 'SALAMA','INSURANCE HOUSE', 'NEW INDIA DXB', 'METHAQ', 'NGI', 'GIG', 'AL WATHBA', 'ORIENT INSRANCE', 'AL ITTIHAD AL WATANI',
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
  { id: 'floodStormNatural', label: 'Flood, Storm and Natural Calamity damages' },
  { id: 'warRiotStrike', label: 'War, Riot or Strike damages' },
  { id: 'emergencyMedical', label: 'Emergency medical expenses' },
  { id: 'personalBelongings', label: 'Personal belongings' },
  { id: 'offroadCover', label: 'Off-road cover (For 4x4 only)' },
  { id: 'accidentRecovery', label: '24 Hour Accident and Breakdown Recovery' },
  { id: 'ambulanceCover', label: 'Ambulance Cover' },
  { id: 'driverCover', label: 'Optional Covers Driver Cover' },
  { id: 'passengersCover', label: 'Passengers Cover' },
  { id: 'rentACar', label: 'Rent a Car' }
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
      repairType: '',
      thirdPartyLiability: productType === 'Gold' ? 'UPTO AED 3.5 Million' : 'UPTO AED 5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: productType === 'Gold' ? 'UPTO AED 3000' : 'UNLIMITED',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'DNI': {
      repairType: '',
      thirdPartyLiability: productType === 'Standard' ? 'UPTO AED 3.5 Million' : 'UPTO AED 3.5 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: productType === 'Standard' ? 'UPTO AED 3500' : 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'QATAR': {
      repairType: '',
      thirdPartyLiability: productType === 'Basic' ? 'UPTO AED 3.5 Million' : 'UPTO AED 3 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'WATANIA': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'ADAMJEE': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'FIDELITY': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'LIVA': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'EMIRATES': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2500',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'RAK': {
      repairType: 'Non-Agency',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes(Orange Card available on request)',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'SALAMA': {
      repairType: 'Non-Agency',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2500',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'NEW INDIA DXB': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'METHAQ': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'NGI': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'GIG': {
      repairType: productType === 'MOTOR PERFECT' ? 'Non-Agency' : 'Agency',
      thirdPartyLiability: productType === 'MOTOR PRESTIGE' ? 'UPTO AED 5 Million' : 'UPTO AED 3.5 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover', 'Rent a Car']
    },
    'AL WATHBA': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 1500',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', 'Off-road cover (For 4x4 only)', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'ORIENT INSRANCE': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 3000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'UNION INSURANCE': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 3.5 Million',
      omanCover: 'YES(OWN DAMAGE ONLY)',
      windscreenExcess: 'UPTO AED 1000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'NIA ABU DHABI': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'Yes',
      windscreenExcess: 'UPTO AED 5000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', 'Personal belongings', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    },
    'AL SAGR': {
      repairType: '',
      thirdPartyLiability: 'UPTO AED 2 Million',
      omanCover: 'No',
      windscreenExcess: 'UPTO AED 2000',
      coverageOptions: ['Fire and theft cover', 'Flood, Storm and Natural Calamity damages', 'War, Riot or Strike damages', 'Emergency medical expenses', '24 Hour Accident and Breakdown Recovery', 'Ambulance Cover', 'Optional Covers Driver Cover', 'Passengers Cover']
    }
  };

  return companyDefaults[company] || defaultValues;
};

const calculateVAT = (premium: number): { vat: number; total: number } => {
  const vat = Math.round(premium * 0.05 * 100) / 100;
  const total = Math.round((premium + vat) * 100) / 100;
  return { vat, total };
};

// The browser cache is a convenience only; the cloud history is the source of
// truth. Capped because localStorage tops out around 5MB and the full shared
// history is far larger than that - an over-quota setItem throws and would
// otherwise abort the caller mid-save.
const LOCAL_CACHE_LIMIT = 50;

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

// ============ HTML GENERATOR WITH LOGOS ============
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
        .page2 { width: 210mm; height: 297mm; padding: 8mm 10mm 55mm 10mm; position: relative; overflow: hidden; }
        .disclaimer { background: #fff3cd; padding: 2mm 3mm; font-size: 8px; line-height: 1.35; border-left: 2mm solid #ffc107; color: #000; position: absolute; bottom: 20mm; left: 10mm; right: 10mm; }
        .disclaimer h4 { font-size: 9px; margin-bottom: 1mm; color: #856404; text-decoration: underline; font-weight: bold; }
        .disclaimer p { margin-bottom: 0.8mm; }
        .disclaimer ul { margin: 0.5mm 0 0.5mm 4mm; padding: 0; list-style-type: disc; }
        .disclaimer li { margin-bottom: 0.3mm; }
        .header-simple { text-align: center; margin-bottom: 4mm; position: relative; height: 12mm; }
        .header-logo { height: 12mm; }
        .header-corner { position: absolute; right: 0; top: 0; height: 15mm; }
        .reference-number { position: absolute; top: 2mm; left: 10mm; font-size: 9px; color: #666; }
        .section-title { font-size: 16px; font-weight: bold; text-align: center; margin: 2mm 0; color: #000; }
        .vehicle-info { background: #f8f9fa; padding: 1.5mm; text-align: center; margin: 1.5mm 0; font-size: 11px; color: #000; }
        .comparison-table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 1.5mm 0; table-layout: fixed; }
        .comparison-table th, .comparison-table td { border: 1px solid #000; padding: 1.5mm 1mm; text-align: center; vertical-align: middle; word-wrap: break-word; }
        .comparison-table th { background: #1e40af; color: #fff !important; font-size: 10px; padding: 2mm 1mm; font-weight: bold; }
        .comparison-table th:first-child, .comparison-table td:first-child { text-align: left; width: 38mm; }
        .comparison-table td { background: #fff; color: #000 !important; }
        .comparison-table td:first-child { font-weight: bold; background: #f8f9fa; color: #000 !important; }
        .light-blue-row { background: #e3f2fd !important; }
        .light-blue-row td { background: #e3f2fd !important; color: #000 !important; }
        .included { color: #28a745 !important; font-weight: bold; }
        .not-included { color: #dc3545 !important; font-weight: bold; }
        .total-row { background: #e3f2fd !important; font-weight: bold; }
        .total-row td { color: #000 !important; }
        .renewal-badge { background: #ffc107; color: #000 !important; padding: 0.5mm 2mm; border-radius: 10mm; font-size: 8px; font-weight: bold; display: inline-block; margin-top: 0.5mm; }
        .recommended-badge { background: #28a745; color: #fff !important; padding: 0.5mm 2mm; border-radius: 10mm; font-size: 8px; font-weight: bold; display: inline-block; margin-top: 0.5mm; }
        .advisor-comment-cell { background: #e3f2fd !important; font-size: 7px; text-align: left !important; padding: 1.5mm !important; line-height: 1.2; color: #000 !important; vertical-align: top !important; }
        .footer-contact { position: absolute; bottom: 0; left: 0; right: 0; width: 210mm; background: linear-gradient(135deg, rgba(255, 107, 107, 0.85) 0%, rgba(238, 90, 111, 0.85) 100%); padding: 2mm 10mm; display: flex; justify-content: space-between; color: #fff !important; font-size: 8px; line-height: 1.2; }
        .footer-left, .footer-right { flex: 1; color: #fff !important; }
        .footer-right { text-align: right; }
        .footer-contact strong { display: block; margin-bottom: 0.3mm; color: #fff !important; font-size: 8.5px; }
        .company-logo { height: 8mm; max-width: 22mm; object-fit: contain; margin-bottom: 0.5mm; background: #fff; padding: 0.5mm; border-radius: 1mm; }
        .company-header-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page2 { height: 297mm; overflow: hidden; } }
    </style>
</head>
<body>
    <div class="page1">
        <img src="https://i.imgur.com/M1MHi9j.png" alt="About">
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
                    ${sortedQuotes.map((q) => {
                      const logoUrl = COMPANY_LOGOS[q.company] || '';
                      return `
                        <th>
                            <div class="company-header-cell">
                                ${logoUrl ? `<img src="${logoUrl}" alt="${q.company}" class="company-logo">` : ''}
                                <div style="font-size: 10px; color: #fff;">${q.company.length > 30 ? q.company.substring(0, 27) + '...' : q.company}</div>
                                ${q.productType ? `<div style="font-size: 9px; color: #fff; margin-top: 1mm;">${q.productType}</div>` : ''}
                                ${q.isRenewal ? '<div class="renewal-badge">RENEWAL</div>' : ''}
                                ${q.isRecommended ? '<div class="recommended-badge">RECOMMENDED</div>' : ''}
                            </div>
                        </th>
                    `;
                    }).join('')}
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
                    <td>Excess / Deductible</td>
                    ${sortedQuotes.map(q => `<td>AED ${q.excess.toLocaleString()}</td>`).join('')}
                </tr>
                ${sortedQuotes.some(q => q.additionalExcess === 'Applicable') ? `
                <tr class="light-blue-row">
                    <td>Additional Excess</td>
                    ${sortedQuotes.map(q => `<td>${q.additionalExcess === 'Applicable' ? q.additionalExcessDetails : 'Not Applicable'}</td>`).join('')}
                </tr>
                ` : ''}
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
  const [currentPage, setCurrentPage] = useState<AppView>('dashboard');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [businessType, setBusinessType] = useState<'Private' | 'Commercial'>('Private');
  
  // CRITICAL: Track current comparison - these persist the identity of the comparison being edited
  const [currentComparisonId, setCurrentComparisonId] = useState<string | null>(null);
  const [currentReferenceNumber, setCurrentReferenceNumber] = useState<string | null>(null);
  
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

  // Auto-save. The cloud write runs FIRST and is never gated behind the
  // localStorage write, which can throw once the cached history exceeds quota.
  const autoSaveQuotes = useCallback(async (updatedQuotes: Quote[], refNum: string, compId: string) => {
    if (updatedQuotes.length === 0) return;

    const comparisonData: SavedComparison = {
      id: compId,
      date: new Date().toISOString(),
      vehicle: updatedQuotes[0].make + ' ' + updatedQuotes[0].model,
      quotes: updatedQuotes,
      referenceNumber: refNum,
      createdBy: getCurrentUserName(),
    };

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
    } catch (error) {
      console.error('Auto-save to cloud failed:', error);
      alert('WARNING: Ref ' + refNum + ' did NOT save to the cloud. Use "Save & Download" to retry.');
    }

    cacheComparisonLocally(comparisonData);
  }, []);

  const addQuote = () => {
    if (!formData.enquiryNumber || !formData.customerName || !formData.vehicleMake || !formData.vehicleModel || !formData.insuranceCompany || !formData.premium) {
      alert('Please fill required fields: Enquiry Number, Name, Make, Model, Company, and Premium');
      return;
    }

    if (hasProductTypes && !formData.productType) {
      alert('Please select a Product Type for this company');
      return;
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
    
    alert('Quote added! Ref: ' + refNum);
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
    });
    setSelectedCoverage([]);
    setOmanCover('NA');
    setWindscreenExcess('NA');
    setAdvisorComment('');
    setVat(0);
    setTotal(0);
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

  const saveAndDownload = async () => {
    if (quotes.length === 0) {
      alert('No quotes to save. Add at least one quote first.');
      return;
    }

    // Use existing reference number (should already be set from addQuote)
    const referenceNumber = currentReferenceNumber || generateReferenceNumber();
    const comparisonId = currentComparisonId || Date.now().toString();
    
    // Update state if we had to generate new ones
    if (!currentReferenceNumber) {
      setCurrentReferenceNumber(referenceNumber);
      setCurrentComparisonId(comparisonId);
    }
    
    const sortedQuotes = [...quotes].sort((a, b) => a.total - b.total);
    const allCoverageOptions: string[] = Array.from(new Set(quotes.flatMap((q: Quote) => q.coverageOptions)));
    
    const htmlContent = generateHTMLContentHelper(sortedQuotes, allCoverageOptions, referenceNumber);
    const fileName = `NSIB_${quotes[0].customerName.replace(/\s/g, '_')}_${quotes[0].make}_${quotes[0].model}_${referenceNumber}.html`;
    
    // Download locally first
    downloadHTMLFile(htmlContent, fileName);
    
    // The document upload and the history record are independent. A failed
    // upload must not stop the comparison from being recorded, and neither may
    // depend on localStorage, which throws once the cache is over quota.
    let fileUrl: string | undefined;
    let uploadError = '';

    try {
      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, htmlContent }),
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + (await response.text()));
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      fileUrl = result.url;
    } catch (error) {
      console.error('Document upload failed:', error);
      uploadError = error instanceof Error ? error.message : String(error);
    }

    const comparisonData: SavedComparison = {
      id: comparisonId,
      date: new Date().toISOString(),
      vehicle: quotes[0].make + ' ' + quotes[0].model,
      quotes: quotes,
      referenceNumber: referenceNumber,
      fileUrl: fileUrl,
      createdBy: getCurrentUserName(),
    };

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

    if (historyError) {
      alert(
        'SAVE FAILED - Ref ' + referenceNumber + ' is NOT in the shared history.\n' +
        historyError + '\n\nThe file was downloaded to your computer. Please retry.'
      );
    } else if (uploadError) {
      alert(
        'Saved to history! Ref: ' + referenceNumber + '\n\n' +
        'The document upload failed, so "View" will be unavailable for this record.\n' + uploadError
      );
    } else {
      alert('Saved! Ref: ' + referenceNumber + '\nFile: ' + fileName);
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
    setCurrentComparisonId(null);
    setCurrentReferenceNumber(null);
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
        alert('This recovered record has no document to reconstruct from.');
        return;
      }
      try {
        const res = await fetch('/api/parse-document?url=' + encodeURIComponent(comparison.fileUrl));
        const data = await res.json();
        if (!data.success || !Array.isArray(data.quotes) || data.quotes.length === 0) {
          alert('Could not reconstruct this record for editing.\n' + (data.error || '') + '\n\nYou can still use View to open the document.');
          return;
        }
        quotesToLoad = data.quotes as Quote[];
      } catch {
        alert('Could not reach the document to reconstruct it. Try again, or use View.');
        return;
      }
    }

    setQuotes(quotesToLoad);
    // CRITICAL: Set tracking state when loading - this ensures edits update the same record
    setCurrentComparisonId(comparison.id);
    setCurrentReferenceNumber(comparison.referenceNumber);
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
    });
    setCurrentPage('generator');
    alert('Loaded ' + quotesToLoad.length + ' quotes.\nRef: ' + comparison.referenceNumber + '\n\nAny changes will update THIS comparison.');
  };

  const sortedQuotes = [...quotes].sort((a, b) => a.total - b.total);
  const allCoverageOptions: string[] = Array.from(new Set(quotes.flatMap((q: Quote) => q.coverageOptions)));

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
          <div className="hidden md:block bg-white/15 border border-white/25 px-3 py-1.5 rounded-lg font-mono text-xs shrink-0">
            Editing Ref {currentReferenceNumber} · {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
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
          />
        )}

        {currentPage === 'history' && (
          <SavedHistoryPage loadComparison={loadComparison} />
        )}
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

  const cards = [
    { label: 'Total Comparisons', value: stats.total, accent: 'bg-nsib-red' },
    { label: 'This Month', value: stats.thisMonth, accent: 'bg-nsib-gold' },
    { label: "Today's Comparisons", value: stats.today, accent: 'bg-nsib-red' },
    { label: 'Quotes Compared', value: stats.quoteCount, accent: 'bg-nsib-gold' },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-nsib-sand shadow-card overflow-hidden"
          >
            <div className="p-5">
              <div className="text-3xl font-bold text-nsib-ink">{loading ? '—' : card.value}</div>
              <div className="text-sm text-nsib-muted mt-1">{card.label}</div>
            </div>
            <div className={`h-1 ${card.accent}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent comparisons */}
        <div className="bg-white rounded-2xl border border-nsib-sand shadow-card flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-nsib-sand">
            <span className="w-9 h-9 rounded-xl bg-nsib-red text-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.6.8l.9 1.2h7.3A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
              </svg>
            </span>
            <h3 className="text-lg font-bold text-nsib-red">Recent Comparisons</h3>
          </div>

          <div className="p-4 space-y-2 flex-1">
            {loading ? (
              <div className="text-center text-nsib-muted py-10">Loading...</div>
            ) : recent.length === 0 ? (
              <div className="text-center text-nsib-muted py-10">No comparisons yet</div>
            ) : (
              recent.map(comparison => (
                <div
                  key={comparison.id}
                  className="flex items-center justify-between gap-3 bg-nsib-cream/60 hover:bg-nsib-gold-soft rounded-xl px-4 py-3 transition"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-nsib-ink truncate">{comparison.vehicle}</div>
                    <div className="text-xs text-nsib-muted">
                      Ref: {comparison.referenceNumber} • {new Date(comparison.date).toLocaleString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span className="shrink-0 bg-nsib-gold-soft text-nsib-gold-dark border border-nsib-gold/30 px-2.5 py-1 rounded-lg text-xs font-semibold">
                    {comparison.quotes?.length || 0} quotes
                  </span>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => onNavigate('history')}
            className="border-t border-nsib-sand py-3.5 text-sm font-bold text-nsib-red hover:bg-nsib-red-soft transition rounded-b-2xl"
          >
            View All Comparisons →
          </button>
        </div>

        {/* Most quoted insurers */}
        <div className="bg-white rounded-2xl border border-nsib-sand shadow-card flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-nsib-sand">
            <span className="w-9 h-9 rounded-xl bg-nsib-gold text-nsib-red-dark flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19V10M10 19V5M16 19v-6M22 19H2" strokeLinecap="round" />
              </svg>
            </span>
            <h3 className="text-lg font-bold text-nsib-red">Most Quoted Insurers</h3>
          </div>

          <div className="p-5 space-y-3 flex-1">
            {loading ? (
              <div className="text-center text-nsib-muted py-10">Loading...</div>
            ) : stats.topInsurers.length === 0 ? (
              <div className="text-center text-nsib-muted py-10">No quotes yet</div>
            ) : (
              stats.topInsurers.map(([company, count]) => (
                <div key={company}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-nsib-ink truncate">{company}</span>
                    <span className="text-nsib-muted shrink-0 ml-2">{count}</span>
                  </div>
                  <div className="h-2 bg-nsib-cream rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-nsib-red to-nsib-gold rounded-full"
                      style={{ width: `${Math.max(6, (count / maxInsurerCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => onNavigate('generator')}
            className="border-t border-nsib-sand py-3.5 text-sm font-bold text-nsib-red hover:bg-nsib-red-soft transition rounded-b-2xl"
          >
            + Create New Comparison
          </button>
        </div>
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
}

// ============ QUOTE GENERATOR PAGE ============
// Shared control styling, so every field in the form and in the live table reads
// as one set rather than a pile of one-off class strings.
const FIELD = 'w-full px-3 py-2.5 border border-nsib-sand rounded-lg text-sm text-nsib-ink bg-white focus:border-nsib-red focus:outline-none transition';
const LABEL = 'block text-xs font-bold mb-1.5 text-nsib-ink';
const CELL_FIELD = 'w-full p-1 border border-nsib-sand rounded text-xs text-nsib-ink bg-white focus:border-nsib-red focus:outline-none';
const PANEL = 'bg-white rounded-2xl border border-nsib-sand shadow-card';

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
  } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* LEFT PANEL - FORM */}
      <div className={`${PANEL} p-5 max-h-[calc(100vh-160px)] overflow-y-auto`}>
        <h2 className="text-lg font-bold mb-5 text-nsib-red">Add Quote</h2>

        {/* Business Type */}
        <div className="bg-nsib-gold-soft p-4 rounded-xl mb-4 border border-nsib-gold/30">
          <label className="block text-sm font-bold mb-2 text-nsib-ink">Business Type *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setBusinessType('Private')}
              className={`p-3 rounded-lg font-bold transition ${businessType === 'Private' ? 'bg-nsib-red text-white shadow-card' : 'bg-white text-nsib-muted border border-nsib-sand hover:border-nsib-red'}`}
            >
              Private
            </button>
            <button
              onClick={() => setBusinessType('Commercial')}
              className={`p-3 rounded-lg font-bold transition ${businessType === 'Commercial' ? 'bg-nsib-red text-white shadow-card' : 'bg-white text-nsib-muted border border-nsib-sand hover:border-nsib-red'}`}
            >
              Commercial
            </button>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-nsib-cream/70 border border-nsib-sand p-4 rounded-xl mb-4">
          <h3 className="font-bold text-sm mb-3 text-nsib-red uppercase tracking-wide">Vehicle Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={LABEL}>Enquiry Number *</label>
              <input
                type="text"
                className={FIELD}
                placeholder="Enter enquiry number"
                value={formData.enquiryNumber}
                onChange={(e) => setFormData({ ...formData, enquiryNumber: e.target.value })}
              />
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={LABEL}>Vehicle Make *</label>
              <select className={FIELD} value={formData.vehicleMake} onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Year Model</label>
              <select className={FIELD} value={formData.yearModel} onChange={(e) => setFormData({ ...formData, yearModel: e.target.value })}>
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

        {/* Quote Details */}
        <div className="bg-nsib-cream/70 border border-nsib-sand p-4 rounded-xl mb-4">
          <h3 className="font-bold text-sm mb-3 text-nsib-red uppercase tracking-wide">Quote Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className={hasProductTypes ? '' : 'md:col-span-2'}>
              <label className={LABEL}>Insurance Company *</label>
              <select className={FIELD} value={formData.insuranceCompany} onChange={(e) => handleCompanyChange(e.target.value)}>
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
                  className={FIELD}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={LABEL}>Repair Type</label>
              <select className={FIELD} value={formData.repairType} onChange={(e) => setFormData({ ...formData, repairType: e.target.value })}>
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
              <select className={FIELD} value={formData.thirdPartyLiability} onChange={(e) => setFormData({ ...formData, thirdPartyLiability: e.target.value })}>
                {THIRD_PARTY_LIABILITY_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={LABEL}>Oman Cover</label>
              <select className={FIELD} value={omanCover} onChange={(e) => setOmanCover(e.target.value)}>
                {OMAN_COVER_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Windscreen Excess</label>
              <select className={FIELD} value={windscreenExcess} onChange={(e) => setWindscreenExcess(e.target.value)}>
                {WINDSCREEN_EXCESS_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className={LABEL}>
              Coverage Options
              {selectedCoverage.length > 0 && (
                <span className="ml-2 font-normal text-nsib-muted">({selectedCoverage.length} selected)</span>
              )}
            </label>
            {/* Two columns: the full option list fits without a cramped inner scroll */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 max-h-64 overflow-y-auto bg-white p-3 rounded-lg border border-nsib-sand">
              {COVERAGE_OPTIONS.map(option => (
                <label key={option.id} className="flex items-center gap-2 text-xs cursor-pointer text-nsib-ink hover:text-nsib-red transition">
                  <input type="checkbox" className="shrink-0" checked={selectedCoverage.includes(option.label)} onChange={() => handleCoverageToggle(option.label)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={LABEL}>Excess / Deductible</label>
              <input type="number" className={FIELD} placeholder="1000" value={formData.excess || ''} onChange={(e) => setFormData({ ...formData, excess: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className={LABEL}>Additional Excess</label>
              <select 
                className={FIELD} 
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
            <div className="mb-3">
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className={LABEL}>Premium *</label>
              <input type="number" step="0.01" className={FIELD} placeholder="2500.00" value={formData.premium || ''} onChange={(e) => handlePremiumChange(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className={LABEL}>VAT (5%)</label>
              <input type="text" className="w-full px-3 py-2.5 border border-nsib-sand rounded-lg text-sm bg-nsib-cream text-nsib-ink font-semibold" value={vat.toFixed(2)} readOnly />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className={LABEL}>Total Amount</label>
              <input type="text" className="w-full px-3 py-2.5 border border-nsib-gold/40 rounded-lg text-sm bg-nsib-gold-soft font-bold text-nsib-red" value={total.toFixed(2)} readOnly />
            </div>
          </div>

          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 text-xs font-bold text-nsib-ink cursor-pointer">
              <input type="checkbox" checked={formData.isRecommended} onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })} />
              Recommended
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-nsib-ink cursor-pointer">
              <input type="checkbox" checked={formData.isRenewal} onChange={(e) => setFormData({ ...formData, isRenewal: e.target.checked })} />
              Renewal
            </label>
          </div>

          <div className="mb-3">
            <label className={LABEL}>Advisor Comment (Optional)</label>
            <textarea
              className={FIELD}
              placeholder="Enter specific comment for this insurance company..."
              rows={3}
              value={advisorComment}
              onChange={(e) => setAdvisorComment(e.target.value)}
            />
          </div>

          <button onClick={addQuote} className="w-full bg-nsib-red text-white p-3 rounded-lg font-bold hover:bg-nsib-red-dark transition shadow-card">
            Add Quote to Comparison
          </button>
        </div>

        {quotes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={saveAndDownload} className="bg-nsib-gold text-nsib-red-dark p-3 rounded-lg font-bold hover:bg-nsib-gold-dark hover:text-white transition shadow-card">
              {currentReferenceNumber ? 'Update & Download' : 'Save & Download'} ({quotes.length})
            </button>
            <button onClick={startNewComparison} className="bg-white text-nsib-red border-2 border-nsib-red p-3 rounded-lg font-bold hover:bg-nsib-red-soft transition">
              Start New Comparison
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - COMPARISON TABLE */}
      <div className={`${PANEL} p-5 max-h-[calc(100vh-160px)] overflow-auto`}>
        <h2 className="text-lg font-bold mb-5 text-nsib-red">Live Comparison ({quotes.length})</h2>

        {quotes.length === 0 ? (
          <div className="text-center text-nsib-muted italic py-20">
            Add quotes to see the comparison table
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="sticky top-0 bg-white z-20">
                  <th className="bg-nsib-cream p-2 border border-nsib-sand text-left sticky left-0 z-30 min-w-[150px] text-nsib-ink">Field</th>
                  {sortedQuotes.map((q) => (
                    <th key={q.id} className="bg-gradient-to-b from-nsib-red to-nsib-red-dark text-white p-3 border border-nsib-red-dark text-center min-w-[180px]">
                      {COMPANY_LOGOS[q.company] && (
                        <img src={COMPANY_LOGOS[q.company]} alt={q.company} className="h-8 mx-auto mb-1 bg-white rounded p-1" />
                      )}
                      <div className="font-bold text-sm mb-1">{q.company}</div>
                      {q.productType && <div className="text-xs mb-1 opacity-90">{q.productType.substring(0, 30)}{q.productType.length > 30 ? '...' : ''}</div>}
                      <div className="text-base font-bold">AED {q.total.toFixed(2)}</div>
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
                        q.value
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
                        q.thirdPartyLiability
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
                        q.omanCover
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
                        q.windscreenExcess
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
                            <span className={included ? 'text-emerald-700 font-bold' : 'text-nsib-muted font-bold'}>
                              {included ? 'YES' : 'NO'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

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
                        `AED ${q.excess.toLocaleString()}`
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
                        q.additionalExcess === 'Applicable' ? q.additionalExcessDetails : (q.additionalExcess || '-')
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
                        `AED ${q.premium.toFixed(2)}`
                      )}
                    </td>
                  ))}
                </tr>

                {/* VAT */}
                <tr className="bg-nsib-gold-soft">
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-gold-soft sticky left-0 z-10 text-nsib-ink">VAT (5%)</td>
                  {sortedQuotes.map(q => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center bg-nsib-gold-soft text-nsib-ink">
                      AED {q.vat.toFixed(2)}
                    </td>
                  ))}
                </tr>

                {/* Total */}
                <tr className="bg-nsib-red-soft">
                  <td className="p-2 border border-nsib-sand font-bold bg-nsib-red text-white sticky left-0 z-10">Total Premium</td>
                  {sortedQuotes.map((q) => (
                    <td key={q.id} className="p-2 border border-nsib-sand text-center font-bold bg-nsib-red-soft text-nsib-red text-base">
                      AED {q.total.toFixed(2)}
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
                        <div className="text-xs text-left">{q.advisorComment || '-'}</div>
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
      alert('Delete failed. The record is still in the shared history.');
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
                      {q.company} — AED {q.total?.toFixed(2) || '0.00'}
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
