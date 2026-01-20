// utils/coverageDefaults.ts

export const getCoverageDefaults = (company: string): string[] => {
  const defaults: Record<string, string[]> = {
    'UNITED FIDELITY INSURANCE COMPANY PSC': [
      'Fire and theft cover',
      'Natural Calamities Riot and strike',
      'Emergency medical expenses',
      'Personal belongings',
      'Oman Cover (Own damage only)',
      '24 Hour Accident and Breakdown Recovery',
      'Passengers Cover',
      'Optional Covers Driver Cover'
    ],
    'EMIRATES INSURANCE CO. (PSC)': [
      'Fire and theft cover',
      'Natural Calamities Riot and strike',
      'Emergency medical expenses',
      'Oman Cover (Own damage only)',
      '24 Hour Accident and Breakdown Recovery',
      'Excess for windscreen damage',
      'Passengers Cover',
      'Optional Covers Driver Cover'
    ],
    'Liva Insurance': [
      'Fire and theft cover',
      'Natural Calamities Riot and strike',
      'Emergency medical expenses',
      'Oman Cover (Own damage only)',
      'Off-road cover (For 4x4 only)',
      '24 Hour Accident and Breakdown Recovery',
      'Excess for windscreen damage',
      'Passengers Cover',
      'Optional Covers Driver Cover',
      'Hire car Benefit'
    ],
    'AXA INSURANCE (GULF) B.S.C.(C)': [
      'Fire and theft cover',
      'Natural Calamities Riot and strike',
      'Emergency medical expenses',
      '24 Hour Accident and Breakdown Recovery',
      'Ambulance Cover',
      'Excess for windscreen damage'
    ],
    'DUBAI INSURANCE CO. PSC': [
      'Fire and theft cover',
      'Natural Calamities Riot and strike',
      'Emergency medical expenses',
      'Passengers Cover',
      'Optional Covers Driver Cover',
      '24 Hour Accident and Breakdown Recovery'
    ],
    'TAKAFUL EMARAT': [
      'Fire and theft cover',
      'Natural Calamities Riot and strike',
      'Emergency medical expenses',
      'Oman Cover (Own damage only)',
      '24 Hour Accident and Breakdown Recovery',
      'Excess for windscreen damage'
    ],
    'AL SAGR NATIONAL INSURANCE COMPANY': [
      'Fire and theft cover',
      'Natural Calamities Riot and strike',
      'Emergency medical expenses',
      'Ambulance Cover',
      '24 Hour Accident and Breakdown Recovery'
    ],
    'QATAR INSURANCE COMPANY': [
      'Fire and theft cover',
      'Natural Calamities Riot and strike',
      'Emergency medical expenses',
      'Passengers Cover',
      'Optional Covers Driver Cover',
      '24 Hour Accident and Breakdown Recovery',
      'Excess for windscreen damage'
    ]
  };

  return defaults[company] || [];
};

export const calculateVAT = (premium: number): { vat: number; total: number } => {
  const vat = Math.round(premium * 0.05);
  const total = premium + vat;
  return { vat, total };
};
