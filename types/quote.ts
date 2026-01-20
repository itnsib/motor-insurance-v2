// types/quote.ts

export interface Quote {
  id: string;
  make: string;
  model: string;
  year: string;
  value: string;
  repairType: string;
  company: string;
  lossOrDamage: number;
  coverageOptions: string[];
  excess: number;
  premium: number;
  vat: number;
  total: number;
}

export interface QuoteFormData {
  vehicleMake: string;
  vehicleModel: string;
  yearModel: string;
  vehicleValue: string;
  repairType: string;
  insuranceCompany: string;
  lossOrDamage: number;
  excess: number;
  premium: number;
}

export const VEHICLE_MAKES = [
  'Toyota', 'Nissan', 'Hyundai', 'Mercedes-Benz', 'Ford', 'BMW', 
  'Audi', 'Lexus', 'Honda', 'Volkswagen', 'Chevrolet', 'Kia', 
  'Land Rover', 'Porsche', 'Jeep', 'Mazda', 'Mitsubishi', 
  'Tesla', 'Jaguar', 'Volvo'
];

export const YEARS = Array.from(
  { length: 17 }, 
  (_, i) => (2026 - i).toString()
);

export const INSURANCE_COMPANIES = [
  'UNION INSURANCE COMPANY',
  'METHAQ TAKAFUL INSURANCE COMPANY',
  'NATIONAL LIFE & GENERAL INSURANCE COMPANY',
  'ISLAMIC ARAB INSURANCE CO - SALAMA',
  'WATANIA TAKAFUL GENERAL P.J.S.C',
  'DUBAI INSURANCE CO. PSC',
  'TAKAFUL EMARAT',
  'AL SAGR NATIONAL INSURANCE COMPANY',
  'DUBAI NATIONAL INSURANCE & REINSURANCE',
  'ABU DHABI NATIONAL TAKAFUL COMPANY PSC',
  'QATAR INSURANCE COMPANY',
  'THE MEDITERRANEAN AND GULF INS. AND REINSURANCE CO',
  'SUKOON INSURANCE PJSC',
  'ORIENT INSURANCE PJSC',
  'ABU DHABI NATIONAL INSURANCE COMPANY',
  'EMIRATES INSURANCE CO. (PSC)',
  'INSURANCE HOUSE P.S.C',
  'ORIENT TAKAFUL PJSC',
  'Liva Insurance',
  'AL WATHBA NATIONAL INSURANCE COMPANY',
  'UNITED FIDELITY INSURANCE COMPANY PSC',
  'AL BUHAIRA NATIONAL INSURANCE COMPANY',
  'SHARJAH INSURANCE COMPANY',
  'RAK INSURANCE',
  'ALLIANCE INSURANCE P.S.C',
  'YAS TAKAFUL PJSC',
  'AXA INSURANCE (GULF) B.S.C.(C)'
];

export const COVERAGE_OPTIONS = [
  { id: 'fireTheft', label: 'Fire and theft cover' },
  { id: 'naturalCalamities', label: 'Natural Calamities Riot and strike' },
  { id: 'emergencyMedical', label: 'Emergency medical expenses' },
  { id: 'personalBelongings', label: 'Personal belongings' },
  { id: 'omanCover', label: 'Oman Cover (Own damage only)' },
  { id: 'offroadCover', label: 'Off-road cover (For 4x4 only)' },
  { id: 'accidentRecovery', label: '24 Hour Accident and Breakdown Recovery' },
  { id: 'ambulanceCover', label: 'Ambulance Cover' },
  { id: 'windscreenDamage', label: 'Excess for windscreen damage' },
  { id: 'driverCover', label: 'Optional Covers Driver Cover' },
  { id: 'passengersCover', label: 'Passengers Cover' },
  { id: 'hirecarBenefit', label: 'Hire car Benefit' }
];
