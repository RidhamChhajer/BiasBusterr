/**
 * Certificate Download Component
 * 
 * Downloads RBI audit certificate as PDF
 * Only enabled when fairness score meets compliance threshold (≥80)
 */

'use client'

import React, { useState } from 'react'
import { Download, Shield, Lock, FileText } from 'lucide-react'

interface CertificateDownloadProps {
    fairnessScore: number
    accuracy?: number
    datasetName?: string
    companyName?: string
}

export default function CertificateDownload({
    fairnessScore,
    accuracy = 0.85,
    datasetName = 'Dataset Analysis',
    companyName = 'BiasBusterr Demo'
}: CertificateDownloadProps) {
    const [isDownloading, setIsDownloading] = useState(false)

    const isEligible = fairnessScore >= 80

    const handleDownload = async () => {
        if (!isEligible) return

        setIsDownloading(true)
        try {
            const formData = new FormData()
            formData.append('fairness_score', String(fairnessScore))
            formData.append('accuracy', String(accuracy))
            formData.append('dataset_name', datasetName)
            formData.append('company_name', companyName)

            const response = await fetch('http://127.0.0.1:8000/generate_certificate', {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `rbi_audit_certificate_${new Date().getTime()}.pdf`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            } else {
                console.error('Failed to generate certificate:', await response.text())
                alert('Failed to generate certificate. Please try again.')
            }
        } catch (error) {
            console.error('Error downloading certificate:', error)
            alert('Network error. Please ensure the Python backend is running.')
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="flex items-center justify-center py-8">
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-8 shadow-lg max-w-2xl w-full">
                <div className="flex items-start gap-6">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isEligible ? 'bg-green-500' : 'bg-gray-300'
                            }`}>
                            {isEligible ? (
                                <Shield className="w-8 h-8 text-white" />
                            ) : (
                                <Lock className="w-8 h-8 text-gray-500" />
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-indigo-900 mb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            RBI Compliance Certificate
                        </h3>

                        {isEligible ? (
                            <p className="text-sm text-indigo-700 mb-4">
                                Your model meets the fairness threshold! Download your official audit report for regulatory submission.
                            </p>
                        ) : (
                            <div className="mb-4">
                                <p className="text-sm text-amber-800 mb-2">
                                    ⚠️ <strong>Certification Locked</strong>
                                </p>
                                <p className="text-xs text-amber-700">
                                    Fairness score must be ≥80 to generate a compliance certificate.
                                    Current score: {fairnessScore.toFixed(0)}. Please use the Auto-Fix feature above.
                                </p>
                            </div>
                        )}

                        {/* Download Button */}
                        <button
                            onClick={handleDownload}
                            disabled={!isEligible || isDownloading}
                            className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${isEligible
                                    ? 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                            title={!isEligible ? 'Fix bias to unlock certification' : 'Download certificate'}
                        >
                            {isDownloading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Generating PDF...
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5" />
                                    📄 Download RBI Audit Report (PDF)
                                </>
                            )}
                        </button>

                        {/* Certification Details */}
                        {isEligible && (
                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-white/50 rounded p-2">
                                    <p className="text-indigo-600 font-medium">Fairness Score</p>
                                    <p className="text-indigo-900 font-bold">{fairnessScore.toFixed(1)}/100</p>
                                </div>
                                <div className="bg-white/50 rounded p-2">
                                    <p className="text-indigo-600 font-medium">Accuracy</p>
                                    <p className="text-indigo-900 font-bold">{(accuracy * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
