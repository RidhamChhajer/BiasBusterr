/**
 * Bias Detective Component - Clean Professional Edition
 * 
 * AI legal opinion and SHAP analysis with clean, readable color grading
 * Light theme with high contrast for visibility
 */

'use client'

import React, { useState } from 'react'
import { Scale, Bot, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ShapValue {
    feature: string
    importance: number
}

interface BiasDetectiveProps {
    shapValues: ShapValue[] | null
    legalOpinion: string | null
    onAnalyze?: () => Promise<void>
}

export default function BiasDetective({ shapValues, legalOpinion, onAnalyze }: BiasDetectiveProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleAnalyze = async () => {
        if (!onAnalyze) return
        setIsLoading(true)
        try {
            await onAnalyze()
        } finally {
            setIsLoading(false)
        }
    }

    // Parse legal opinion markdown bold markers
    const renderLegalOpinion = (text: string) => {
        if (!text) return null

        const parts = text.split(/(\*\*.*?\*\*)/)
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="text-blue-700 font-bold">{part.slice(2, -2)}</strong>
            }
            return <span key={index}>{part}</span>
        })
    }

    return (
        <div className="space-y-6 h-full">
            {/* AI Legal Opinion Card */}
            {legalOpinion && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Scale className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <p className="text-base font-bold text-zinc-900">AI Legal Insight</p>
                                <span className="px-3 py-1 bg-blue-100 border border-blue-300 text-blue-700 text-xs font-bold rounded-full">
                                    AUTO-GENERATED
                                </span>
                            </div>
                            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                                {renderLegalOpinion(legalOpinion)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SHAP Analysis Section */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-lg overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-zinc-900 text-xl font-bold mb-1">
                            Root Cause Analysis
                        </h3>
                        <p className="text-zinc-500 text-sm">
                            SHAP values reveal which features drive unfair predictions
                        </p>
                    </div>

                    {!shapValues && onAnalyze && (
                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg text-base font-bold"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    🕵️ Analyze
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Chart or Empty State */}
                {shapValues && shapValues.length > 0 ? (
                    <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart
                                data={shapValues}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                <XAxis type="number" domain={[0, 1]} stroke="#71717a" tick={{ fill: '#3f3f46', fontSize: 12, fontWeight: 500 }} />
                                <YAxis dataKey="feature" type="category" stroke="#71717a" tick={{ fill: '#18181b', fontSize: 13, fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e4e4e7',
                                        borderRadius: '12px',
                                        color: '#18181b',
                                        fontWeight: 500
                                    }}
                                    formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                                    labelStyle={{ color: '#18181b', fontWeight: 600 }}
                                />
                                <Bar dataKey="importance" radius={[0, 8, 8, 0]}>
                                    {shapValues.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.importance > 0.05 ? '#ef4444' : '#3b82f6'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>

                        {/* Legend */}
                        <div className="mt-4 flex items-center justify-center gap-8 text-sm border-t border-zinc-200 pt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-500 rounded"></div>
                                <span className="text-zinc-700 font-medium">High Impact (&gt;5%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                <span className="text-zinc-700 font-medium">Lower Impact (≤50%)</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-zinc-50 rounded-xl p-12 text-center border border-zinc-200">
                        <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bot className="w-8 h-8 text-zinc-400" />
                        </div>
                        <p className="text-zinc-700 mb-2 font-bold text-base">No Analysis Available</p>
                        <p className="text-sm text-zinc-500">
                            Click the button above to analyze feature importance
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
