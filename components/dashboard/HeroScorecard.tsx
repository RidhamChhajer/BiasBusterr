/**
 * Hero Scorecard Component - Dark Cyber-Professional Edition
 * 
 * Displays fairness gauge, RBI compliance badge, and financial risk
 * Designed for dark mode with glowing effects and gradient strokes
 */

'use client'

import React from 'react'
import { Shield, AlertTriangle, IndianRupee } from 'lucide-react'

interface HeroScorecardProps {
    fairnessScore: number
    rbiStatus: 'VIOLATION' | 'COMPLIANT'
    financialRisk: string
}

export default function HeroScorecard({ fairnessScore, rbiStatus, financialRisk }: HeroScorecardProps) {
    // Gradient stroke color based on score (Stricter Thresholds)
    const getStrokeGradient = () => {
        if (fairnessScore < 70) return 'stroke-rose-500' // High Risk threshold raised to 70
        if (fairnessScore >= 90) return 'stroke-emerald-500' // Low Risk threshold raised to 90
        return 'stroke-amber-500'
    }

    const scoreColor = fairnessScore < 70 ? '#ef4444' : fairnessScore >= 90 ? '#10b981' : '#f59e0b'
    const radius = 70
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (fairnessScore / 100) * circumference

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Fairness Score Gauge */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">
                    Fairness Score
                </h3>
                <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                        <svg className="w-full h-full transform -rotate-90">
                            {/* Background circle */}
                            <circle
                                cx="96"
                                cy="96"
                                r={radius}
                                stroke="#1e293b"
                                strokeWidth="12"
                                fill="none"
                            />
                            {/* Progress circle with gradient */}
                            <circle
                                cx="96"
                                cy="96"
                                r={radius}
                                stroke={scoreColor}
                                strokeWidth="12"
                                fill="none"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out drop-shadow-lg"
                                style={{ filter: `drop-shadow(0 0 8px ${scoreColor}40)` }}
                            />
                        </svg>
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-bold tracking-tight text-white">
                                {fairnessScore.toFixed(0)}
                            </span>
                            <span className="text-xs text-slate-400 mt-1">out of 100</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: RBI Compliance Badge */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">
                    Regulatory Status
                </h3>
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                    {rbiStatus === 'VIOLATION' ? (
                        <>
                            <div className="w-20 h-20 bg-rose-950/30 border-2 border-rose-500/50 rounded-full flex items-center justify-center animate-pulse">
                                <AlertTriangle className="w-10 h-10 text-rose-400" />
                            </div>
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-950/30 border border-rose-500/50 text-rose-400 rounded-full font-semibold text-sm shadow-lg shadow-rose-500/20">
                                    <Shield className="w-4 h-4" />
                                    CRITICAL VIOLATION
                                </div>
                                <p className="text-xs text-slate-400 mt-3">Article 15 Risk Detected</p>
                                <p className="text-xs text-rose-400/60 mt-1">RBI FREE-AI Non-Compliant</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-emerald-950/30 border-2 border-emerald-500/50 rounded-full flex items-center justify-center">
                                <Shield className="w-10 h-10 text-emerald-400" />
                            </div>
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-950/30 border border-emerald-500/50 text-emerald-400 rounded-full font-semibold text-sm shadow-lg shadow-emerald-500/20">
                                    <Shield className="w-4 h-4" />
                                    COMPLIANT
                                </div>
                                <p className="text-xs text-slate-400 mt-3">RBI FREE-AI Framework</p>
                                <p className="text-xs text-emerald-400/60 mt-1">✓ Article 15 Verified</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Card 3: Financial Impact */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">
                    Financial Risk
                </h3>
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="w-20 h-20 bg-rose-950/30 border-2 border-rose-500/50 rounded-full flex items-center justify-center">
                        <IndianRupee className="w-10 h-10 text-rose-400" strokeWidth={2.5} />
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-slate-400 mb-2">Potential Penalty</p>
                        <p className="text-3xl font-bold font-mono text-rose-400 tracking-tight">
                            {financialRisk}
                        </p>
                        <p className="text-xs text-slate-500 mt-3">+ Reputational Damage</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
