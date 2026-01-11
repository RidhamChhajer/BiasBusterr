/**
 * Example usage of BiasDetective component
 */

import BiasDetective from '@/components/dashboard/BiasDetective'

// Example 1: With both legal opinion and SHAP values
const shapData = [
    { feature: 'Caste_Category', importance: 0.92 },
    { feature: 'Religion', importance: 0.65 },
    { feature: 'Credit_Score', importance: 0.45 },
    { feature: 'Income', importance: 0.23 },
    { feature: 'Age', importance: 0.12 },
]

const legalText = `⚠️ **CRITICAL REGULATORY ALERT:** The model is unfairly penalizing **Caste_Category** (Disparate Impact: 0.32). This aligns with a prohibited bias under **Article 15 of the Constitution of India** and **RBI FREE-AI Guidelines**. Estimated regulatory liability is **₹50 Lakhs - ₹5 Crores**. ⚖️ **Legal Recommendation:** Immediate suspension of model deployment is advised.`

    < BiasDetective
shapValues = { shapData }
legalOpinion = { legalText }
    />

// Example 2: Without data (shows button to trigger analysis)
const handleAnalyze = async () => {
    // Call API to get SHAP values
    const response = await fetch('/api/explain', { method: 'POST', body: formData })
    const data = await response.json()
    // Update state with data.top_features
}

<BiasDetective
    shapValues={null}
    legalOpinion={null}
    onAnalyze={handleAnalyze}
/>

// Example 3: With legal opinion but pending SHAP analysis
<BiasDetective
    shapValues={null}
    legalOpinion={legalText}
    onAnalyze={handleAnalyze}
/>
