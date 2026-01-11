/**
 * Example usage of BiasMitigator component
 */

import BiasMitigator from '@/components/dashboard/BiasMitigator'

// Example 1: Before mitigation (button visible)
<BiasMitigator
    originalScore={32}
    mitigatedScore={0}
    onMitigate={async () => {
        // Call mitigation API
        const response = await fetch('/api/mitigate', { method: 'POST', body: formData })
        const data = await response.json()
        // Update state with data.mitigated_score
    }}
/>

// Example 2: After successful mitigation (chart + confetti)
<BiasMitigator
    originalScore={32}
    mitigatedScore={85}
/>

// Example 3: Moderate improvement (chart only, no confetti)
<BiasMitigator
    originalScore={65}
    mitigatedScore={78}
/>
