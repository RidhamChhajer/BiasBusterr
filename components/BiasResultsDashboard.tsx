/**
 * Bias Results Dashboard
 * 
 * Main visualization component for bias analysis results
 * Displays risk summary, detected biases, and explanations
 */

import React, { useState } from 'react'

interface BiasDetail {
    type: string
    confidence: number
    evidence: string
}

interface BiasResultsDashboardProps {
    result: {
        analysis: {
            biasSignals: {
                overallRisk: 'low' | 'medium' | 'high' | 'unknown' | 'inconclusive'
                detectedBiases: string[]
                uncertaintyLevel?: string
            }
            statisticalResults: {
                bias_details?: BiasDetail[]
                severity?: string
                affectedAttributes?: string[]
                [key: string]: any
            }
            limitations: string[]
        }
        bias_result?: any  // Phase 1 result
        explanation?: {    // Phase 3 explanation
            summary?: string
            findings?: string[]
            severity_explanation?: string
            affected_groups?: string[]
        }
    }
}

export default function BiasResultsDashboard({ result }: BiasResultsDashboardProps) {
    const { biasSignals, statisticalResults, limitations } = result.analysis

    // V2: Extract Phase 1 bias metrics and Phase 3 explanation
    const biasResult = result.bias_result
    const explanation = result.explanation

    // SAFETY: Ensure ONLY sensitive attributes are shown as biased
    // Merit attributes (income, creditScore, education, etc.) must NEVER appear
    const FORBIDDEN_MERIT_KEYWORDS = ['score', 'income', 'salary', 'education', 'experience', 'years', 'amount', 'credit', 'loan']

    // Get affected attributes from Phase 1 or fallback to old structure
    const rawAttributes = biasResult?.affected_sensitive_attributes ||
        statisticalResults.affectedAttributes || []

    // Filter out any merit attributes (defense in depth)
    const affectedAttributes = rawAttributes.filter((attr: string) => {
        const lowerAttr = attr.toLowerCase()
        const isForbidden = FORBIDDEN_MERIT_KEYWORDS.some(keyword => lowerAttr.includes(keyword))
        if (isForbidden) {
            console.error(`[SAFETY] Blocked merit attribute from bias display: ${attr}`)
        }
        return !isForbidden
    })

    // Convert to bias details format for display
    const biasDetails = affectedAttributes.map((attr: string) => ({
        type: attr,
        confidence: biasResult?.confidence || 0.8,
        evidence: explanation?.summary || `Outcome disparities detected for ${attr} attribute`
    }))

    // Risk level configuration
    const riskConfig = {
        low: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800',
            text: 'text-green-800 dark:text-green-200',
            icon: '✓',
            label: 'LOW RISK'
        },
        medium: {
            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
            border: 'border-yellow-200 dark:border-yellow-800',
            text: 'text-yellow-800 dark:text-yellow-200',
            icon: '⚠',
            label: 'MEDIUM RISK'
        },
        high: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
            text: 'text-red-800 dark:text-red-200',
            icon: '⚠',
            label: 'HIGH RISK'
        },
        inconclusive: {
            bg: 'bg-slate-50 dark:bg-slate-900/20',
            border: 'border-slate-200 dark:border-slate-800',
            text: 'text-slate-800 dark:text-slate-200',
            icon: '?',
            label: 'INCONCLUSIVE'
        },
        unknown: {
            bg: 'bg-slate-50 dark:bg-slate-900/20',
            border: 'border-slate-200 dark:border-slate-800',
            text: 'text-slate-800 dark:text-slate-200',
            icon: '?',
            label: 'UNKNOWN RISK'
        }
    }

    const config = riskConfig[biasSignals.overallRisk] || riskConfig.unknown

    return (
        <div className="space-y-6">
            {/* Risk Summary Card */}
            <div className={`${config.bg} ${config.border} border-2 rounded-lg p-6`}>
                <div className="flex items-center gap-4">
                    <div className={`text-5xl ${config.text}`}>
                        {config.icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Overall Risk Level
                        </h3>
                        <p className={`text-2xl font-bold ${config.text}`}>
                            {config.label}
                        </p>
                        {biasSignals.overallRisk === 'inconclusive' && (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                The system chose caution over assumptions. Comparable groups could not be formed with sufficient confidence.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Detected Bias Signals */}
            <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Detected Bias Signals
                </h3>

                {biasDetails.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center">
                        <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-slate-600 dark:text-slate-400">
                            No explicit social bias detected in this content.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {biasDetails.map((bias, index) => (
                            <BiasCard key={index} bias={bias} />
                        ))}
                    </div>
                )}
            </div>

            {/* Explainability Panel */}
            <ExplainabilityPanel biasDetails={biasDetails} />

            {/* Limitations Disclosure */}
            <LimitationsDisclosure limitations={limitations} biasResult={biasResult} />
        </div>
    )
}

/**
 * Individual Bias Card Component
 */
function BiasCard({ bias }: { bias: BiasDetail }) {
    const [expanded, setExpanded] = useState(false)
    const shouldTruncate = bias.evidence.length > 200
    const displayEvidence = expanded || !shouldTruncate
        ? bias.evidence
        : bias.evidence.substring(0, 200) + '...'

    // Confidence color
    const confidenceColor = bias.confidence >= 0.7
        ? 'bg-red-500'
        : bias.confidence >= 0.5
            ? 'bg-yellow-500'
            : 'bg-blue-500'

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white capitalize mb-1">
                        {bias.type} Bias
                    </h4>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Confidence
                        </span>
                        <div className="flex-1 max-w-xs">
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${confidenceColor} transition-all`}
                                    style={{ width: `${bias.confidence * 100}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {Math.round(bias.confidence * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded p-3">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Evidence:
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                    {displayEvidence}
                </p>
                {shouldTruncate && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {expanded ? 'Show less' : 'Show more'}
                    </button>
                )}
            </div>
        </div>
    )
}

/**
 * Explainability Panel Component
 */
function ExplainabilityPanel({ biasDetails }: { biasDetails: BiasDetail[] }) {
    if (biasDetails.length === 0) return null

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
                📊 Analysis Explanation
            </h3>
            <div className="space-y-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                    This analysis identified {biasDetails.length} potential bias signal{biasDetails.length !== 1 ? 's' : ''} based on statistical comparisons of outcomes across groups with similar qualifications.
                </p>

                {/* Show detailed findings for each bias */}
                <div className="space-y-3">
                    {biasDetails.map((bias: BiasDetail, index: number) => (
                        <div key={index} className="bg-white dark:bg-slate-800 rounded p-3 space-y-2">
                            <div className="font-medium text-blue-900 dark:text-blue-200 capitalize">
                                {bias.type} Attribute
                            </div>
                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                {bias.evidence}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/**
 * Limitations Disclosure Component
 */
function LimitationsDisclosure({ limitations, biasResult }: { limitations: string[], biasResult?: any }) {
    const [isOpen, setIsOpen] = useState(true)

    return (
        <div className="border border-slate-300 dark:border-slate-600 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">ℹ️</span>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                        Limitations & Transparency
                    </h4>
                </div>
                <svg
                    className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3">
                        <p className="text-sm text-amber-900 dark:text-amber-200">
                            <strong>Important:</strong> This analysis is based only on statistical comparisons of outcomes across groups with similar qualifications. Results do not imply intent or causation.
                        </p>
                    </div>

                    {/* Grouping Method Disclosure */}
                    {biasResult?.metrics?.groupingMetadata && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 mt-3">
                            <p className="text-sm text-blue-900 dark:text-blue-200">
                                <strong>Grouping Method:</strong> {biasResult.metrics.groupingMetadata.grouping_method}
                                <br />
                                <strong>Merit Dimensions Used:</strong> {biasResult.metrics.groupingMetadata.merit_dimensions_used}
                                {biasResult.metrics.groupingMetadata.epsilon_used > 0.2 && (
                                    <>
                                        <br />
                                        <span className="text-xs">
                                            Note: Similarity-based grouping was used (threshold: {biasResult.metrics.groupingMetadata.epsilon_used.toFixed(2)}). Groups contain similar but not identical records.
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    )}

                    {limitations.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                Specific Limitations:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                                {limitations.map((limitation, index) => (
                                    <li key={index} className="text-sm text-slate-700 dark:text-slate-300">
                                        {limitation}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
