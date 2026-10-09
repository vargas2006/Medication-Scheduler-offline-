export interface User {
  user_id: number;
  username?: string;
  name?: string;
  email?: string;
}

export interface Medication {
  med_id: number;
  name: string;
  dosage?: string;
  strength?: string;
  dosage_form?: string;
  stock: number;
  stock_unit?: string;
  refill_threshold?: number;
  is_low_stock?: boolean;
  image_path?: string | null;
  expiration_date?: string | null;
}

export interface Schedule {
  schedule_id: number;
  med_id: number;
  med_name: string;
  dosage?: string;
  strength?: string;
  time_value: string;
  dose_per_intake?: number;
  dose_unit?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string | null;
  instructions?: string;
  stock?: number;
  stock_unit?: string;
  status?: string;
  schedule_date?: string;
}

export interface HistoryLog {
  log_id: number;
  med_name: string;
  status: string;
  timestamp: string;
}

export interface AlertMedication {
  name: string;
  dosage: string;
  time_value?: string;
}

export interface DueAlert {
  title?: string;
  date?: string;
  timestamp?: string;
  message?: string;
  medications?: AlertMedication[];
}

export interface DashboardDataResponse {
  success: boolean;
  total_meds?: number;
  low_stock?: number;
  doses_taken?: number;
  adherence_rate?: string;
  weekly_counts?: number[];
  due_meds?: Schedule[];
  recent_history?: HistoryLog[];
  message?: string;
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: T | any;
}

declare global {
  interface Window {
    pywebview?: {
      api?: Record<string, (...args: any[]) => Promise<any>>;
    };
  }
}
