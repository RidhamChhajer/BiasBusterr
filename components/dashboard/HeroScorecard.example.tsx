/**
 * Example usage of HeroScorecard component
 */

import HeroScorecard from '@/components/dashboard/HeroScorecard'

// Example 1: Non-compliant scenario (low fairness score)
<HeroScorecard
    fairnessScore={32}
    rbiStatus="VIOLATION"
    financialRisk="₹50 Lakhs - ₹5 Crores"
/>

// Example 2: Compliant scenario (high fairness score)
<HeroScorecard
    fairnessScore={92}
    rbiStatus="COMPLIANT"
    financialRisk="₹0"
/>

// Example 3: Borderline scenario (medium fairness score)
<HeroScorecard
    fairnessScore={85}
    rbiStatus="COMPLIANT"
    financialRisk="₹10-20 Lakhs"
/>
