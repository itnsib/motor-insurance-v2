// types/zoho.ts

// A Zoho CRM enquiry (the Deals module) as the picker shows it — no premiums,
// commissions or notes leave the server.
export interface ZohoEnquiry {
  id: string;
  enquiryNo: string;
  enquiryName: string;
  contactName: string;
  insuranceType: string;
  subType?: string;
  enquiryDate?: string;
  stage?: string;
  hasFolder: boolean;
  folderUrl: string;
}

// What filing a PDF in WorkDrive came to.
export type WorkDriveResult =
  | { ok: true; enquiryNo: string; fileId: string; fileName: string; link: string }
  | { ok: false; error: string };
