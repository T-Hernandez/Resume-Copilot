export interface PipelineConfig {
  algorithmVersion: string;
  weights: {
    skills: number;
    experience: number;
    education: number;
    keywords: number;
    certifications?: number;
    languages?: number;
    [key: string]: number | undefined;
  };
  // other configurable rules can be added here
}
