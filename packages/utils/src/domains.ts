export const BRAND_DOMAINS: Record<string, string> = {
    // IT & Tech
    wipro: 'wipro.com',
    infosys: 'infosys.com',
    tcs: 'tcs.com',
    'tata consultancy services': 'tcs.com',
    accenture: 'accenture.com',
    deloitte: 'deloitte.com',
    cognizant: 'cognizant.com',
    capgemini: 'capgemini.com',
    'tech mahindra': 'techmahindra.com',
    hcl: 'hcltech.com',
    'hcl technologies': 'hcltech.com',
    ibm: 'ibm.com',
    oracle: 'oracle.com',
    sap: 'sap.com',
    atlassian: 'atlassian.com',

    // Big Tech
    amazon: 'amazon.com',
    google: 'google.com',
    microsoft: 'microsoft.com',
    meta: 'meta.com',
    apple: 'apple.com',
    netflix: 'netflix.com',

    // Consumer & Social
    uber: 'uber.com',
    zomato: 'zomato.com',
    swiggy: 'swiggy.com',
    flipkart: 'flipkart.com',
    meesho: 'meesho.com',
    phonepe: 'phonepe.com',
    paytm: 'paytm.com',
    cred: 'cred.club',
    ola: 'olacabs.com',
    'ola electric': 'olaelectric.com',
    razorpay: 'razorpay.com',
    unacademy: 'unacademy.com',
    byju: 'byjus.com',
    upgrad: 'upgrad.com',
    nykaa: 'nykaa.com',
    myntra: 'myntra.com',

    // Telecom & Media
    reliance: 'ril.com',
    jio: 'jio.com',
    airtel: 'airtel.in',
    'bharti airtel': 'airtel.in',

    // Requested Social Domains
    'x': 'x.com',
    'twitter': 'x.com',
    'whatsapp': 'whatsapp.com',
    'telegram': 'telegram.org',
    'linkedin': 'linkedin.com',
    'instagram': 'instagram.com',
    'facebook': 'facebook.com',
    'youtube': 'youtube.com'
};

export const getRootDomain = (urlOrDomain: string): string | null => {
    try {
        let domain = urlOrDomain;
        if (domain.includes('://')) {
            domain = new URL(domain).hostname;
        }

        domain = domain.toLowerCase().replace(/^www\./, '');

        const parts = domain.split('.').filter(Boolean);
        if (parts.length <= 2) return domain;

        const tld = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
        // Support common double TLDs
        if (['co.in', 'com.au', 'co.uk', 'gov.in', 'org.in', 'edu.in'].includes(tld)) {
            return parts.slice(-3).join('.');
        }
        return parts.slice(-2).join('.');
    } catch {
        return null;
    }
};

/**
 * Returns the canonical root domain for a company by checking its website,
 * apply link, and source link in order. Used to group jobs across variant
 * company names (e.g. "Wipro Ltd" and "Wipro" both resolve to "wipro.com").
 */
export const getCompanyDomain = ({
    companyWebsite,
    applyLink,
    sourceLink,
}: {
    companyWebsite?: string | null;
    applyLink?: string | null;
    sourceLink?: string | null;
}): string | null => {
    for (const url of [companyWebsite, applyLink, sourceLink]) {
        if (url) {
            const domain = getRootDomain(url);
            if (domain) return domain;
        }
    }
    return null;
};
