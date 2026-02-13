export interface RingoverCall {
  id: number;
  call_id: string;
  direction: 'in' | 'out';
  is_answered: boolean;
  status: 'ANSWERED' | 'CANCELLED' | 'VOICEMAIL' | 'FAILED' | 'MISSED';
  start_time: string;
  duration: string;
  from: string;
  to: string;
  recording_url: string | null;
  country: string;
  flag_url: string | null;
  contact_name: string;
  note: string; // The AI-generated summary
}