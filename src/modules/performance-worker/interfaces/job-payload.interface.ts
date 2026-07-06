export interface FinancialReportMetadata {
  amount: number;      
  currency: string;     
  exchangeRate: number;
}

export interface JobPayload {
  jobId: string;
  taskType: 'FILE_PROCESSING' | 'EMAIL_BATCH' | 'FINANCIAL_REPORT';
  
  targetEmail: string;

  lang: string; 

  financialData?: FinancialReportMetadata;
}