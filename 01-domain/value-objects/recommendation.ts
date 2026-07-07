export interface Recommendation {
  id?: string;
  text: string;
  severity?: 'low' | 'medium' | 'high';
}
