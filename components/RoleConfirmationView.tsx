'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RoleConfirmationViewProps {
    analysisId: string
    suggestedRoles: Array<{
        column: string
        suggestedRole: string
        reasoning: string
    }>
    dataPreview: any[][]
    onConfirm: (result: any) => void
    onCancel: () => void
}

const ROLE_OPTIONS = [
    { value: 'merit', label: 'Merit (Qualification)', description: 'Skills, experience, performance' },
    { value: 'sensitive', label: 'Sensitive Attribute', description: 'Gender, race, age, etc.' },
    { value: 'outcome', label: 'Outcome (Decision)', description: 'Hired, promoted, approved' },
    { value: 'ignored', label: 'Ignore', description: 'Not relevant for analysis' },
]

export default function RoleConfirmationView({
    analysisId,
    suggestedRoles,
    dataPreview,
    onConfirm,
    onCancel
}: RoleConfirmationViewProps) {
    // Initialize roles from suggestions
    const [roles, setRoles] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {}
        const validRoles = ['merit', 'sensitive', 'outcome', 'ignored']

        suggestedRoles.forEach(({ column, suggestedRole }) => {
            // Ensure the suggested role is valid, default to 'merit' if not
            const role = validRoles.includes(suggestedRole) ? suggestedRole : 'merit'
            initial[column] = role
        })
        return initial
    })

    const [validationErrors, setValidationErrors] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [debugLogs, setDebugLogs] = useState<string[]>([])

    // Validate role assignments
    const validateRoles = (): boolean => {
        const errors: string[] = []
        const roleValues = Object.values(roles)

        // Count each role type
        const meritCount = roleValues.filter(r => r === 'merit').length
        const outcomeCount = roleValues.filter(r => r === 'outcome').length

        // Validation rules
        if (meritCount < 1) {
            errors.push('At least 1 merit column is required')
        }

        if (outcomeCount !== 1) {
            errors.push('Exactly 1 outcome column is required')
        }

        setValidationErrors(errors)
        return errors.length === 0
    }

    const handleRoleChange = (column: string, newRole: string) => {
        setRoles(prev => ({
            ...prev,
            [column]: newRole
        }))
        // Clear validation errors when user makes changes
        setValidationErrors([])
    }

    const handleSubmit = async () => {
        if (!validateRoles()) {
            return
        }

        setIsSubmitting(true)
        setDebugLogs(['🚀 Starting submission process...'])

        try {
            // Get session token to ensure auth works even if cookies fail
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            setDebugLogs(prev => [...prev, `🔑 Auth Token acquired: ${token ? 'YES' : 'NO'}`])

            // Convert roles object to array format expected by backend
            const confirmedRolesArray = Object.entries(roles).map(([column, role]) => ({
                column,
                role
            }))

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }

            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            setDebugLogs(prev => [...prev, '📡 Sending request to /api/analyze/confirm-roles...'])

            const response = await fetch('/api/analyze/confirm-roles', {
                method: 'POST',
                headers,
                credentials: 'include', // Ensure session cookies are sent
                body: JSON.stringify({
                    analysis_id: analysisId,
                    confirmed_roles: confirmedRolesArray
                })
            })

            setDebugLogs(prev => [...prev, `📥 Response Status: ${response.status} ${response.statusText}`])

            const data = await response.json()

            // Merge server logs
            if (data.debugLogs) {
                setDebugLogs(prev => [...prev, '--- SERVER LOGS ---', ...data.debugLogs])
            }
            if (data.isAnonymous) {
                setDebugLogs(prev => [...prev, '⚠️ WARNING: Server reports Anonymous User'])
            }
            if (data.saveError) {
                setDebugLogs(prev => [...prev, `❌ SAVE ERROR: ${data.saveError}`])
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to confirm roles')
            }

            setDebugLogs(prev => [...prev, '✅ Success! Proceeding...'])

            // Short delay to let user see logs if needed (optional)
            setTimeout(() => {
                onConfirm(data)
            }, 500)

        } catch (error: any) {
            setValidationErrors([error.message])
            setDebugLogs(prev => [...prev, `💀 CRITICAL ERROR: ${error.message}`])
            setIsSubmitting(false)
        }
    }

    const isValid = validationErrors.length === 0

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Confirm Column Roles
                </h2>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-900 dark:text-amber-200">
                        ⚠️ <strong>The system will not analyze fairness until column meanings are confirmed.</strong>
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                        Please review and adjust the suggested roles for each column below.
                    </p>
                </div>
            </div>

            {/* Data Preview */}
            <div className="mb-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Data Preview (first 3 rows)
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-300 dark:border-slate-600">
                                {suggestedRoles.map(({ column }) => (
                                    <th key={column} className="px-2 py-1 text-left font-medium text-slate-600 dark:text-slate-400">
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dataPreview.slice(0, 3).map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700">
                                    {row.map((cell, cellIdx) => (
                                        <td key={cellIdx} className="px-2 py-1 text-slate-700 dark:text-slate-300">
                                            {String(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Role Assignment */}
            <div className="space-y-4 mb-6">
                {suggestedRoles.map(({ column, suggestedRole, reasoning }) => (
                    <div
                        key={column}
                        className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                                    {column}
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                    {reasoning}
                                </p>
                                <select
                                    value={roles[column]}
                                    onChange={(e) => handleRoleChange(column, e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {ROLE_OPTIONS.map(({ value, label, description }) => (
                                        <option key={value} value={value}>
                                            {label} - {description}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <h4 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                        Validation Errors:
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, idx) => (
                            <li key={idx} className="text-sm text-red-800 dark:text-red-300">
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                <button
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        'Continue to Analysis'
                    )}
                </button>
            </div>

            {/* DEBUG PANEL - Visible to help troubleshoot save issues */}
            <div className="mt-8 p-4 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                <p className="font-bold text-yellow-400 mb-2 sticky top-0 bg-slate-900">🔧 Debug Diagnostics</p>

                {debugLogs.length === 0 ? (
                    <p className="text-slate-500 italic">Waiting for action...</p>
                ) : (
                    <ul className="space-y-1">
                        {debugLogs.map((log, i) => (
                            <li key={i} className={`${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : log.includes('⚠️') ? 'text-yellow-300' : 'text-slate-300'} whitespace-pre-wrap`}>
                                {log}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
