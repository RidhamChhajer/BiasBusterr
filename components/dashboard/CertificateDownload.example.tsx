/**
 * Example usage of CertificateDownload component
 */

import CertificateDownload from '@/components/dashboard/CertificateDownload'

// Example 1: Eligible for certificate (score ≥ 80)
<CertificateDownload
    fairnessScore={92}
    accuracy={0.89}
    datasetName="Loan Approval System"
    companyName="ABC Financial Services"
/>

// Example 2: Not eligible (score < 80) - button disabled
<CertificateDownload
    fairnessScore={65}
    accuracy={0.85}
    datasetName="Hiring System"
    companyName="XYZ Corp"
/>

// Example 3: Minimal props (uses defaults)
<CertificateDownload
    fairnessScore={85}
/>
