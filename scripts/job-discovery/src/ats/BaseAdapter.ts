export interface AtsJob {
    title: string;
    applyLink: string;
    company: string;
    location?: string;
    type?: string;
    source: string; // e.g. 'ATS_GREENHOUSE', 'ATS_LEVER'
    sourceType: 'ATS';
    aggregatorText?: string;
}

export interface AtsAdapter {
    providerName: string;
    /**
     * @param companyId The identifier used by the ATS (e.g. 'canonical' for greenhouse)
     * @param companyName The canonical name of the company (e.g. 'Canonical')
     */
    fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]>;
}
