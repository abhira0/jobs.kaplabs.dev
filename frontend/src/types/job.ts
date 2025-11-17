export type Job = {
  id: string;
  company_name: string;
  title: string;
  locations: string;
  url?: string;
  source?: string;
  date_posted: string; // locale date string
  active: boolean;
};



