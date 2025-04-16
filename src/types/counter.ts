export interface Counter {
  id: string;
  user_id: string;
  count: number;
  created_at: string;
  updated_at: string;
}

export interface CounterState {
  count: number;
  error: string | null;
  isLoading: boolean;
} 