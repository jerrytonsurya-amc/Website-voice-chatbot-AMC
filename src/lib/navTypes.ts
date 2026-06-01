export interface NavRow {
  "Net Asset Value": number;
  Date: string;
  "Scheme ": string;
  "Scheme Name ": string;
  "Type ": string;
}

export interface FundPerformanceSummary {
  schemeName: string;
  scheme: string;
  type: string;
  recordCount: number;
  firstDate: string;
  lastDate: string;
  firstNav: number;
  lastNav: number;
  totalReturnPercent: number;
  cagrPercent: number | null;
  bestMonth: { date: string; nav: number } | null;
  worstMonth: { date: string; nav: number } | null;
  yearlyReturns: { year: string; startNav: number; endNav: number; returnPercent: number }[];
}
