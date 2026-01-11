/**
 * Bias Mitigator Component - Clean Professional Edition
 * 
 * Auto-fix functionality with clean, readable color grading
 * Light theme with high contrast for visibility
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'

interface BiasMitigatorProps {
    originalScore: number
    mitigatedScore: number
    onMitigate?: () => Promise<void>
}

export default function BiasMitigator({ originalScore, mitigatedScore, onMitigate }: BiasMitigatorProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)
    const { width, height } = useWindowSize()

    useEffect(() => {
        if (mitigatedScore > 80 && mitigatedScore > originalScore) {
            setShowConfetti(true)
            const timer = setTimeout(() => setShowConfetti(false), 5000)
            return () => clearTimeout(timer)
        }
    }, [mitigatedScore, originalScore])

    const handleMitigate = async () => {
        if (!onMitigate) return
        setIsLoading(true)
        try {
            await onMitigate()
        } finally {
            setIsLoading(false)
        }
    }

    const improvement = mitigatedScore - originalScore
    const hasMitigated = mitigatedScore > 0
    const hasGlowingBorder = mitigatedScore > originalScore && mitigatedScore > 70

    const chartData = [
        {
            name: 'Score',
            Before: originalScore,
            After: mitigatedScore || 0,
        }
    ]

    return (
        <div className={`bg-white border border-zinc-200 rounded-2xl p-6 shadow-lg overflow-hidden transition-all ${hasGlowingBorder ? 'ring-2 ring-emerald-400' : ''}`}>
            {/* Confetti */}
            {showConfetti && (
                <div className="fixed inset-0 z-50 pointer-events-none">
                    <Confetti width={width} height={height} recycle={false} numberOfPieces={500} gravity={0.3} />
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="text-zinc-900 text-xl font-bold">Bias Mitigation</h3>
                    </div>
                    <p className="text-zinc-500 text-sm">
                        Automatically balance dataset to reduce unfair outcomes
                    </p>
                </div>

                {!hasMitigated && onMitigate && (
                    <button
                        onClick={handleMitigate}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg text-base font-bold"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Auto-Fix Bias
                            </>
                        )}
                    </button>
                )}
            </div>

            {hasMitigated ? (
                <div className="space-y-4">
                    {/* Success Banner */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-bold text-emerald-800">Mitigation Complete!</p>
                                <p className="text-sm text-zinc-600">Dataset balanced using random oversampling</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-emerald-600">+{improvement.toFixed(0)}</p>
                                <p className="text-sm text-zinc-500 font-medium">Points</p>
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                <XAxis dataKey="name" stroke="#71717a" tick={{ fill: '#3f3f46', fontSize: 12, fontWeight: 500 }} />
                                <YAxis domain={[0, 100]} stroke="#71717a" tick={{ fill: '#3f3f46', fontSize: 12, fontWeight: 500 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e4e4e7',
                                        borderRadius: '12px',
                                        color: '#18181b',
                                        fontWeight: 500
                                    }}
                                />
                                <Legend wrapperStyle={{ color: '#3f3f46', fontSize: 13, fontWeight: 600 }} />
                                <Bar dataKey="Before" fill="#ef4444" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="After" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                            <p className="text-sm text-red-700 mb-1 font-bold">Before</p>
                            <p className="text-3xl font-black text-red-600">{originalScore.toFixed(0)}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                            <p className="text-sm text-emerald-700 mb-1 font-bold">After</p>
                            <p className="text-3xl font-black text-emerald-600">{mitigatedScore.toFixed(0)}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                            <p className="text-sm text-blue-700 mb-1 font-bold">Gain</p>
                            <p className="text-3xl font-black text-blue-600">+{improvement.toFixed(0)}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-zinc-50 rounded-xl p-12 text-center border border-zinc-200">
                    <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-zinc-400" />
                    </div>
                    <p className="text-zinc-700 font-bold text-base mb-2">Ready to Fix Bias?</p>
                    <p className="text-sm text-zinc-500">
                        Click the button above to apply automated mitigation
                    </p>
                </div>
            )}
        </div>
    )
}
