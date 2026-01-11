/**
 * What-If Simulator Component - Clean Professional Edition
 * 
 * Counterfactual analysis with clean, readable color grading
 * Light theme with high contrast for visibility
 */

'use client'

import React, { useState } from 'react'
import { Beaker, ArrowRight, AlertTriangle, CheckCircle, Loader2, User } from 'lucide-react'

interface CounterfactualResult {
    original_outcome: number
    original_outcome_label: string
    original_probability: number
    flipped_outcome: number
    flipped_outcome_label: string
    flipped_probability: number
    bias_confirmed: boolean
    original_group: string
    flipped_group: string
    protected_attribute: string
    message: string
}

interface Profile {
    name: string
    credit_score: string
    income: string
    caste: string
    status: string
    protected_attribute: string
}

interface WhatIfSimulatorProps {
    profile?: Profile
}

export default function WhatIfSimulator({ profile }: WhatIfSimulatorProps) {
    const [result, setResult] = useState<CounterfactualResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Fallback if no profile
    const displayProfile = profile || {
        name: "No Rejected Applicant Found",
        credit_score: "N/A",
        income: "N/A",
        caste: "N/A",
        status: "APPROVED",
        protected_attribute: "Caste"
    }

    const handleRunTest = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/counterfactual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicant_id: displayProfile.name })
            })

            const data = await response.json()

            if (response.ok) {
                setResult(data)
            } else {
                const errorMsg = data.details || data.error || 'Unknown error'
                console.error('Counterfactual error:', errorMsg)
                alert(`Counterfactual analysis failed: ${errorMsg}`)
            }
        } catch (error) {
            console.error('Network Error:', error)
            alert('Network error. Please check if the backend is running.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-lg overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Beaker className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-zinc-900 text-xl font-bold">What-If Simulator</h3>
                </div>
                <p className="text-zinc-500 text-sm">
                    Counterfactual analysis: see how outcomes change
                </p>
            </div>

            {/* Sample Profile */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <User className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-base font-bold text-zinc-900 mb-2">{displayProfile.name}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-zinc-500">Credit:</span> <span className="text-zinc-800 font-medium">{displayProfile.credit_score}</span></div>
                            <div><span className="text-zinc-500">Income:</span> <span className="text-zinc-800 font-medium">{displayProfile.income}</span></div>
                            <div><span className="text-zinc-500">{displayProfile.protected_attribute || "Group"}:</span> <span className="text-red-700 font-bold">{displayProfile.caste}</span></div>
                            <div>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 border rounded-lg text-xs font-bold ${displayProfile.status === 'REJECTED' ? 'bg-red-100 border-red-300 text-red-700' : 'bg-emerald-100 border-emerald-300 text-emerald-700'}`}>
                                    {displayProfile.status === 'REJECTED' ? '❌' : '✅'} {displayProfile.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <button
                onClick={handleRunTest}
                disabled={isLoading}
                className="w-full mb-4 inline-flex items-center justify-center gap-2 px-5 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg text-base font-bold"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Running...
                    </>
                ) : (
                    <>
                        <Beaker className="w-5 h-5" />
                        Run Test
                    </>
                )}
            </button>

            {/* Results */}
            {result && (
                <div className="space-y-4 flex-1">
                    {/* Bias Alert */}
                    {result.bias_confirmed && (
                        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                                <p className="text-sm text-red-800 font-medium leading-tight">{result.message}</p>
                            </div>
                        </div>
                    )}

                    {/* Split Comparison */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {/* Reality */}
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-xs text-red-700 mb-2 uppercase font-bold tracking-wide">Reality</p>
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <span className="text-2xl">❌</span>
                            </div>
                            <p className="text-sm font-bold text-zinc-900 mb-1">{result.original_group}</p>
                            <p className="text-base font-bold text-red-700">{result.original_outcome_label}</p>
                            <p className="text-sm text-zinc-500 mt-1 font-medium">{(result.original_probability * 100).toFixed(0)}%</p>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center justify-center">
                            <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                                <ArrowRight className="w-6 h-6 text-zinc-600" />
                            </div>
                        </div>

                        {/* Counterfactual */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-xs text-emerald-700 mb-2 uppercase font-bold tracking-wide">If Flipped</p>
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <CheckCircle className="w-7 h-7 text-emerald-600" />
                            </div>
                            <p className="text-sm font-bold text-zinc-900 mb-1">{result.flipped_group}</p>
                            <p className="text-base font-bold text-emerald-700">{result.flipped_outcome_label}</p>
                            <p className="text-sm text-zinc-500 mt-1 font-medium">{(result.flipped_probability * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
