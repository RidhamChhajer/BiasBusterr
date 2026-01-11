'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BiasResultsDashboard from '@/components/BiasResultsDashboard'
import RoleConfirmationView from '@/components/RoleConfirmationView'
import { getCurrentUserClient, signOut } from '@/lib/auth/client'
import { CleanCard, CleanCardContent, CleanCardHeader, CleanCardTitle } from '@/components/ui/CleanCard'

export default function AppPage() {
    const [file, setFile] = useState<File | null>(null)
    const [systemDescription, setSystemDescription] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    // Chat state
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])
    const [chatInput, setChatInput] = useState('')

    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const router = useRouter()

    // History state
    const [showHistory, setShowHistory] = useState(false)
    const [historyItems, setHistoryItems] = useState<any[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [historyError, setHistoryError] = useState<string | null>(null)
    const [isHistoryView, setIsHistoryView] = useState(false) // Track if viewing historical analysis
    const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(null) // Track analysis creation time

    // Search state
    const [showSearch, setShowSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Check authentication on mount
    useEffect(() => {
        checkAuth()
    }, [])

    async function checkAuth() {
        try {
            const user = await getCurrentUserClient()
            setIsAuthenticated(!!user)
        } catch (error) {
            setIsAuthenticated(false)
        } finally {
            setIsCheckingAuth(false)
        }
    }

    async function handleLogout() {
        await signOut()
        setIsAuthenticated(false)
        router.push('/login')
    }

    function handleLogin() {
        router.push('/login')
    }

    // History functions
    async function fetchHistory() {
        if (!isAuthenticated) return

        setIsLoadingHistory(true)
        setHistoryError(null)

        try {
            const response = await fetch('/api/history')

            if (!response.ok) {
                if (response.status === 401) {
                    setHistoryError('Please sign in to view history')
                } else {
                    setHistoryError('Failed to load history')
                }
                return
            }

            const data = await response.json()
            setHistoryItems(data)
            setShowHistory(true)
        } catch (err) {
            setHistoryError('Network error')
        } finally {
            setIsLoadingHistory(false)
        }
    }

    async function loadHistoryItem(analysisId: string) {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/history/${analysisId}`)

            if (!response.ok) {
                setError('Failed to load analysis')
                return
            }

            const data = await response.json()

            // Load analysis details into result viewer
            if (data.analysisDetails) {
                // Transform to match expected format
                setResult({
                    id: data.analysis.id,
                    status: data.analysis.status,
                    isAnonymous: false,
                    dataset: {
                        fileName: data.analysis.datasets?.filename || 'Unknown',
                        fileType: data.analysis.datasets?.file_type || 'unknown',
                        fileSizeBytes: 0,
                        rowCount: 0,
                        systemDescription: data.analysis.datasets?.system_description || ''
                    },
                    analysis: {
                        inferredDomain: data.analysis.inferred_domain || '',
                        suggestedAttributes: data.analysis.suggested_sensitive_attributes || [],
                        biasSignals: data.analysisDetails.bias_signals || {},
                        statisticalResults: data.analysisDetails.statistical_results || {},
                        limitations: data.analysisDetails.limitations || []
                    },
                    message: 'Loaded from history'
                })

                // Set timestamp from history
                setAnalysisTimestamp(data.analysis.started_at || data.analysis.created_at)
            }

            // Load chat messages
            if (data.chatMessages && data.chatMessages.length > 0) {
                const formattedMessages = data.chatMessages.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content
                }))
                console.log('[HISTORY] Loading chat messages:', formattedMessages)
                setMessages(formattedMessages)
            } else {
                console.log('[HISTORY] No chat messages found')
                setMessages([])
            }

            // Mark as history view (read-only chat)
            setIsHistoryView(true)

            // Close history and search views
            setShowHistory(false)
            setShowSearch(false)
        } catch (err) {
            setError('Network error')
        } finally {
            setIsLoading(false)
        }
    }

    function handleHistoryClick() {
        if (!isAuthenticated) {
            return
        }
        setShowSearch(false) // Close search when opening history
        fetchHistory()
    }

    function handleSearchClick() {
        if (!isAuthenticated) {
            return
        }
        setShowHistory(false) // Close history when opening search
        setShowSearch(true)
        // Fetch history if not already loaded
        if (historyItems.length === 0) {
            fetchHistory()
        }
    }

    // Filter history items based on search query
    const filteredHistoryItems = searchQuery.trim() === ''
        ? historyItems
        : historyItems.filter(item => {
            const query = searchQuery.toLowerCase()
            const filename = item.datasetName?.toLowerCase() || ''
            const status = item.status?.toLowerCase() || ''
            const date = new Date(item.createdAt).toLocaleDateString().toLowerCase()

            return filename.includes(query) ||
                status.includes(query) ||
                date.includes(query)
        })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Reset previous results
        setResult(null)
        setError(null)

        // Validation
        if (!file) {
            setError('Please select a file')
            return
        }

        if (!systemDescription.trim()) {
            setError('Please provide a system description')
            return
        }

        // Prepare form data
        const formData = new FormData()
        formData.append('file', file)
        formData.append('systemDescription', systemDescription)

        // Call API
        setIsLoading(true)

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Analysis failed')
            } else {
                setResult(data)
                // Reset chat when new analysis is run
                setMessages([])
                // Set timestamp to now for new analysis
                setAnalysisTimestamp(new Date().toISOString())
                // Mark as new analysis (not history view)
                setIsHistoryView(false)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error')
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setError(null)
        }
    }

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!chatInput.trim()) return

        // Add user message to UI immediately
        const userMessage = { role: 'user' as const, content: chatInput }
        setMessages(prev => [...prev, userMessage])

        // Clear input immediately for better UX
        const currentInput = chatInput
        setChatInput('')

        // Generate mock assistant response
        const mockResponse = generateMockResponse(currentInput, result)
        const assistantMessage = { role: 'assistant' as const, content: mockResponse }

        // Add assistant message after a short delay
        setTimeout(() => {
            setMessages(prev => [...prev, assistantMessage])
        }, 500)

        // Save to database if user is authenticated and we have an analysis ID
        if (isAuthenticated && result?.id && !isHistoryView) {
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        analysisId: result.id,
                        userMessage: currentInput,
                        assistantMessage: mockResponse
                    })
                })

                if (!response.ok) {
                    console.error('Failed to save chat messages to database')
                }
            } catch (error) {
                console.error('Error saving chat messages:', error)
            }
        }
    }

    const generateMockResponse = (question: string, analysisResult: any): string => {
        const lowerQuestion = question.toLowerCase()

        // CONTROLLED EXPLAIN MODE - Strict Guardrails
        // Only explain what's in the analysis results, never invent or infer

        // Refusal patterns - Questions we CANNOT answer
        const refusalPatterns = [
            {
                keywords: ['sexist', 'racist', 'discriminat', 'intent', 'purpose', 'why did', 'malicious'],
                response: "I cannot determine intent, purpose, or characterize behavior as discriminatory. I can only explain the statistical outcome disparities detected in the analysis results."
            },
            {
                keywords: ['predict', 'will', 'future', 'happen', 'cause'],
                response: "I cannot make predictions or determine causation. I can only explain the statistical patterns found in the provided data."
            },
            {
                keywords: ['fix', 'solve', 'change the model', 'retrain', 'adjust'],
                response: "I cannot provide specific remediation steps. I can only explain the detected patterns and their statistical significance. Remediation requires domain expertise and ethical review."
            },
            {
                keywords: ['who', 'person', 'individual', 'name'],
                response: "I cannot identify or discuss individuals. I can only explain aggregate statistical patterns in the analysis results."
            },
            {
                keywords: ['legal', 'lawsuit', 'compliance', 'regulation', 'law'],
                response: "I cannot provide legal advice or compliance guidance. I can only explain the statistical findings. Consult legal experts for compliance questions."
            },
        ]

        // Check for refusal patterns first
        for (const pattern of refusalPatterns) {
            if (pattern.keywords.some(keyword => lowerQuestion.includes(keyword))) {
                return pattern.response
            }
        }

        // Supported questions - Reference ONLY analysis results

        // Question about detected biases
        if (lowerQuestion.includes('bias') || lowerQuestion.includes('biased') || lowerQuestion.includes('what did you find')) {
            const biases = analysisResult?.analysis?.biasSignals?.detectedBiases
            const risk = analysisResult?.analysis?.biasSignals?.overallRisk

            if (!biases || biases.length === 0) {
                return "The analysis did not detect any bias signals in the provided data. However, this does not guarantee the absence of bias - see the limitations section for important caveats."
            }

            return `The analysis detected ${biases.length} bias signal(s): ${biases.join(', ')}. The overall risk level is ${risk}. These are statistical outcome disparities, not determinations of intent or discrimination.`
        }

        // Question about statistical results
        if (lowerQuestion.includes('statistical') || lowerQuestion.includes('disparity') || lowerQuestion.includes('parity') || lowerQuestion.includes('number')) {
            const statParity = analysisResult?.analysis?.statisticalResults?.statisticalParity

            if (!statParity) {
                return "No statistical parity results are available in this analysis."
            }

            return `Statistical parity difference: ${statParity.value} (threshold: ${statParity.threshold}). This value ${statParity.violated ? 'exceeds' : 'is within'} the threshold, indicating ${statParity.violated ? 'a potential disparity' : 'no significant disparity'} in outcome rates across groups.`
        }

        // Question about limitations
        if (lowerQuestion.includes('limitation') || lowerQuestion.includes('uncertain') || lowerQuestion.includes('confidence') || lowerQuestion.includes('sure')) {
            const limitations = analysisResult?.analysis?.limitations
            const uncertainty = analysisResult?.analysis?.biasSignals?.uncertaintyLevel

            if (!limitations || limitations.length === 0) {
                return `Uncertainty level: ${uncertainty}. No specific limitations were documented for this analysis.`
            }

            return `Uncertainty level: ${uncertainty}. Key limitations: ${limitations.slice(0, 3).join('; ')}. These limitations are critical for interpreting the results.`
        }

        // Question about attributes
        if (lowerQuestion.includes('attribute') || lowerQuestion.includes('column') || lowerQuestion.includes('feature') || lowerQuestion.includes('variable')) {
            const attributes = analysisResult?.analysis?.suggestedAttributes

            if (!attributes || attributes.length === 0) {
                return "No sensitive attributes were identified in this analysis."
            }

            return `Suggested sensitive attributes for review: ${attributes.join(', ')}. These are suggestions based on column names and should be validated by domain experts.`
        }

        // Question about what to do / recommendations
        if (lowerQuestion.includes('recommend') || lowerQuestion.includes('what should') || lowerQuestion.includes('next step') || lowerQuestion.includes('action')) {
            const risk = analysisResult?.analysis?.biasSignals?.overallRisk
            const attributes = analysisResult?.analysis?.suggestedAttributes

            return `Based on the ${risk} risk level, consider: 1) Review the ${attributes?.[0] || 'identified'} attribute distribution with domain experts, 2) Examine the statistical results in context of your use case, 3) Review all limitations before making decisions. This is general guidance, not specific remediation.`
        }

        // Default response - explain what we CAN do
        return `I can only explain the existing analysis results. I can answer questions about: detected bias signals, statistical results, limitations, and suggested attributes. I cannot determine intent, make predictions, provide legal advice, or recommend specific fixes.`
    }


    // Helper component for risk badge
    const RiskBadge = ({ risk }: { risk: string }) => {
        const riskLower = risk?.toLowerCase() || 'medium'

        const colors = {
            low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }

        const colorClass = colors[riskLower as keyof typeof colors] || colors.medium

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${colorClass}`}>
                {risk?.toUpperCase() || 'MEDIUM'} RISK
            </span>
        )
    }

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar - Clean Professional Scale */}
            <aside className="w-[22rem] bg-white border-r border-zinc-200 flex flex-col z-20 shadow-sm shrink-0">
                {/* Logo/Brand */}
                <div className="p-10 border-b border-slate-100">
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
                            Bias Buster
                        </h1>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-8 space-y-4">
                    {/* New Chat Button */}
                    <button
                        onClick={() => {
                            setResult(null)
                            setMessages([])
                            setIsHistoryView(false)
                            setFile(null)
                            setSystemDescription('')
                            setError(null)
                            setShowHistory(false)
                            setShowSearch(false)
                        }}
                        className="w-full flex items-center gap-4 px-6 py-4 mb-8 text-left text-lg font-bold text-white bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        New Analysis
                    </button>

                    <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider px-6 mb-4 mt-8">Menu</div>

                    {/* Search */}
                    <button
                        disabled={!isAuthenticated}
                        onClick={handleSearchClick}
                        className="w-full flex items-center gap-6 px-8 py-5 text-left text-xl font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors disabled:opacity-50"
                    >
                        <svg className="w-8 h-8 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search History
                    </button>

                    {/* History */}
                    <button
                        disabled={!isAuthenticated}
                        onClick={handleHistoryClick}
                        className="w-full flex items-center gap-6 px-8 py-5 text-left text-xl font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors disabled:opacity-50"
                    >
                        <svg className="w-8 h-8 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Past Audits
                    </button>

                    {/* Settings */}
                    <button
                        disabled
                        className="w-full flex items-center gap-6 px-8 py-5 text-left text-xl font-medium text-slate-400 cursor-not-allowed"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </button>

                    <div className="flex-1"></div>

                    {/* Login / Logout Button */}
                    {isAuthenticated ? (
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-6 px-8 py-5 text-left text-xl font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors mt-auto"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                        </button>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="w-full flex items-center gap-6 px-8 py-5 text-left text-xl font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-colors mt-auto"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Sign In
                        </button>
                    )}
                </nav>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-white flex-shrink-0"></div>
                        <div className="min-w-0">
                            <p className="text-base font-bold text-slate-900 truncate">User Account</p>
                            <p className="text-sm text-slate-500 truncate">Free Plan</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area - Scaled Content */}
            <main className="flex-1 overflow-y-auto p-16">
                <div className="max-w-[100rem] mx-auto">
                    {/* Search View - Omitted for brevity, kept structure */}
                    {/* Search View */}
                    {showSearch ? (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">Search Analysis</h2>
                                    <p className="text-xl text-zinc-500">Find past reports by filename or date</p>
                                </div>
                                <button
                                    onClick={() => setShowSearch(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="relative mb-8">
                                <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by filename, status or date..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-16 pr-6 py-6 text-xl rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    autoFocus
                                />
                            </div>

                            {isLoadingHistory ? (
                                <div className="text-center py-20">
                                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-slate-500 text-lg">Loading history...</p>
                                </div>
                            ) : filteredHistoryItems.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <p className="text-slate-500 text-xl font-medium">No analyses found matching "{searchQuery}"</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredHistoryItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => loadHistoryItem(item.id)}
                                            className="group relative flex flex-col p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-left h-full"
                                        >
                                            <div className="flex items-start justify-between mb-6 w-full">
                                                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase ${item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    item.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>

                                            <h3 className="text-2xl font-bold text-slate-900 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                                {item.datasetName}
                                            </h3>

                                            <div className="mt-auto pt-6 flex items-center text-slate-400 group-hover:text-slate-600 transition-colors">
                                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-base font-medium">
                                                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : showHistory ? (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">Past Audits</h2>
                                    <p className="text-xl text-zinc-500">View and manage your previous bias analysis reports</p>
                                </div>
                                <button
                                    onClick={fetchHistory}
                                    disabled={isLoadingHistory}
                                    className="px-6 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 flex items-center gap-2 transition-colors"
                                >
                                    <svg className={`w-5 h-5 ${isLoadingHistory ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Refresh
                                </button>
                            </div>

                            {isLoadingHistory ? (
                                <div className="text-center py-24">
                                    <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
                                    <p className="text-slate-500 text-xl font-medium">Synced with secure database...</p>
                                </div>
                            ) : historyError ? (
                                <div className="p-8 rounded-3xl bg-red-50 border border-red-100 text-center">
                                    <p className="text-red-600 text-lg font-bold mb-4">{historyError}</p>
                                    <button
                                        onClick={fetchHistory}
                                        className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : historyItems.length === 0 ? (
                                <div className="text-center py-32 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">No audits found</h3>
                                    <p className="text-slate-500 text-lg mb-8 max-w-md mx-auto">You haven't run any analysis yet. Start a new analysis to see it here.</p>
                                    <button
                                        onClick={() => {
                                            setShowHistory(false)
                                            setResult(null)
                                        }}
                                        className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                                    >
                                        Start New Analysis
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                                    {historyItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => loadHistoryItem(item.id)}
                                            className="group relative flex flex-col p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-900/10 hover:border-blue-200 transition-all duration-300 text-left h-full transform hover:-translate-y-1"
                                        >
                                            <div className="flex items-start justify-between mb-8 w-full">
                                                <div className="p-4 bg-zinc-50 rounded-2xl text-zinc-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner">
                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                    item.status === 'failed' ? 'bg-red-100 text-red-800 border border-red-200' :
                                                        'bg-amber-100 text-amber-800 border border-amber-200'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>

                                            <h3 className="text-2xl font-bold text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                                {item.datasetName.replace('.csv', '')}
                                            </h3>

                                            <div className="mt-auto pt-6 flex items-center text-slate-400 group-hover:text-slate-600 transition-colors border-t border-slate-50 w-full">
                                                <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-base font-semibold">
                                                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            {!result && (
                                <div className="flex flex-col items-center justify-center min-h-[75vh] py-24">
                                    <div className="text-center mb-16 space-y-6">
                                        <div className="inline-flex items-center justify-center px-5 py-2.5 rounded-2xl bg-blue-50 text-blue-700 mb-4 scale-110 origin-center">
                                            <span className="text-sm font-bold tracking-wider uppercase">Bias Buster AI</span>
                                        </div>
                                        <h2 className="text-7xl font-black text-zinc-900 tracking-tighter leading-none">
                                            New Analysis
                                        </h2>
                                        <p className="text-zinc-500 text-2xl max-w-4xl mx-auto leading-relaxed font-medium">
                                            Upload your dataset to automatically detect bias patterns and generate an RBI-compliant fairness audit.
                                        </p>
                                    </div>

                                    <CleanCard className="w-full max-w-3xl bg-white border-slate-200 shadow-2xl shadow-slate-200/50">
                                        <CleanCardHeader className="border-b border-slate-50 pb-8 bg-slate-50/30">
                                            <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mx-auto mb-4 text-blue-600 shadow-sm ring-4 ring-white">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                            </div>
                                            <CleanCardTitle className="text-center text-2xl font-bold text-slate-900">Upload Dataset</CleanCardTitle>
                                        </CleanCardHeader>
                                        <CleanCardContent className="pt-8 space-y-8 px-8 pb-10">
                                            {/* Show file info when viewing history */}
                                            {isHistoryView && result && (
                                                <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
                                                        📄 Original Analysis Information
                                                    </h3>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">File:</span>
                                                            <p className="text-sm text-blue-900 dark:text-blue-100">{result.dataset.fileName}</p>
                                                        </div>
                                                        {result.dataset.systemDescription && (
                                                            <div>
                                                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">System Description:</span>
                                                                <p className="text-sm text-blue-900 dark:text-blue-100">{result.dataset.systemDescription}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <form onSubmit={handleSubmit} className="space-y-8">
                                                {/* File Input Zone */}
                                                <div className="group relative">
                                                    <label
                                                        htmlFor="file"
                                                        className={`relative flex flex-col items-center justify-center w-full h-56 rounded-2xl border-2 border-dashed transition-all cursor-pointer
                                                            ${file
                                                                ? 'border-blue-500 bg-blue-50/30'
                                                                : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50'
                                                            }
                                                        `}
                                                    >
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            {file ? (
                                                                <>
                                                                    <div className="mb-3 p-2 bg-blue-100 text-blue-600 rounded-full">
                                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    </div>
                                                                    <p className="mb-1 text-sm font-semibold text-blue-600">{file.name}</p>
                                                                    <p className="text-xs text-blue-400">{(file.size / 1024).toFixed(2)} KB</p>
                                                                    <p className="mt-4 text-xs text-blue-500 font-medium hover:underline">Click to change file</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-10 h-10 mb-4 text-slate-400 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                                    <p className="mb-2 text-sm text-slate-500"><span className="font-semibold text-slate-700">Click to upload</span> or drag and drop</p>
                                                                    <p className="text-xs text-slate-400">CSV, PDF, Excel (max 10MB)</p>
                                                                </>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            id="file"
                                                            accept=".csv,.pdf,.png,.jpg,.jpeg"
                                                            onChange={handleFileChange}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        />
                                                    </label>
                                                </div>

                                                {/* System Description */}
                                                <div>
                                                    <label
                                                        htmlFor="description"
                                                        className="block text-sm font-semibold text-slate-700 mb-2"
                                                    >
                                                        System Context <span className="text-slate-400 font-normal ml-1">(Optional but recommended)</span>
                                                    </label>
                                                    <textarea
                                                        id="description"
                                                        value={systemDescription}
                                                        onChange={(e) => setSystemDescription(e.target.value)}
                                                        rows={3}
                                                        placeholder="e.g. 'Loan approval model for retail banking in India'"
                                                        className="block w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-sm"
                                                    />
                                                </div>

                                                {/* Error Display */}
                                                {error && (
                                                    <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3">
                                                        <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <p className="text-sm text-red-600">{error}</p>
                                                    </div>
                                                )}

                                                {/* Submit Button */}
                                                <button
                                                    type="submit"
                                                    disabled={isLoading || !file}
                                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform active:scale-[0.99]"
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <svg className="animate-spin h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                            <span className="text-slate-200">Processing Dataset...</span>
                                                        </>
                                                    ) : (
                                                        'Run Fairness Audit'
                                                    )}
                                                </button>
                                            </form>
                                        </CleanCardContent>
                                    </CleanCard>
                                </div>
                            )}

                            {/* Analysis Banner - Shows active analysis metadata */}
                            {result && (
                                <div className="sticky top-0 z-10 mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            {/* Left side - File info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                                                        {result.dataset.fileName}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    {/* Status Badge */}
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${result.status === 'completed'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : result.status === 'failed'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                        }`}>
                                                        {result.status}
                                                    </span>

                                                    {/* Analysis Type */}
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                                                        {result.isAnonymous ? '🔓 Anonymous Analysis' : '💾 Saved Analysis'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right side - Risk & Timestamp */}
                                            <div className="flex flex-col items-end gap-2">
                                                {/* Risk Badge */}
                                                {result.analysis?.biasSignals?.overallRisk && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-600 dark:text-slate-400">Risk:</span>
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${result.analysis.biasSignals.overallRisk === 'low'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : result.analysis.biasSignals.overallRisk === 'medium'
                                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                            }`}>
                                                            {result.analysis.biasSignals.overallRisk}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Timestamp */}
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {result.isAnonymous
                                                        ? 'Just now'
                                                        : analysisTimestamp
                                                            ? new Date(analysisTimestamp).toLocaleString()
                                                            : new Date().toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Results Display */}
                            {result && (
                                <>
                                    {/* Role Confirmation View - Shows when CSV needs role confirmation */}
                                    {result.status === 'pending_confirmation' ? (
                                        <div className="mt-8">
                                            <RoleConfirmationView
                                                analysisId={result.analysis_id}
                                                suggestedRoles={result.suggested_roles || []}
                                                dataPreview={result.data_preview || []}
                                                onConfirm={(confirmedResult) => {
                                                    // ADAPTER: Convert Phase 2 API response to Dashboard-compatible format
                                                    const attributes = confirmedResult.bias_result?.affected_sensitive_attributes || []

                                                    // Prioritize specific attributes if multiple are detected (prevent 'Age' overshadowing 'Caste')
                                                    const priorityAttributes = ['caste', 'race', 'religion', 'gender', 'sex', 'disability']
                                                    const priorityMatch = attributes.find((a: string) =>
                                                        priorityAttributes.some(p => a.toLowerCase().includes(p))
                                                    )

                                                    const sensitiveAttr = priorityMatch || attributes[0] || 'Unknown'

                                                    const dashboardResult = {
                                                        ...confirmedResult, // Keep debugging logs etc.
                                                        fairness_score: Math.round((1 - (confirmedResult.bias_result?.metrics?.average_magnitude || 0)) * 100),
                                                        accuracy: 0.88, // Placeholder for demo
                                                        top_features: [], // SHAP values to be loaded separately
                                                        details: {
                                                            disparate_impact: 1.0 - (confirmedResult.bias_result?.metrics?.average_magnitude || 0), // Approx
                                                            demographic_parity_difference: confirmedResult.bias_result?.metrics?.average_magnitude || 0,
                                                            protected_attribute: sensitiveAttr,
                                                            target_column: 'Decision'
                                                        },
                                                        representative_profile: {
                                                            name: "Applicant Profile",
                                                            credit_score: "700",
                                                            income: "50000",
                                                            caste: sensitiveAttr === 'Caste' ? 'Reserved Category' : sensitiveAttr,
                                                            status: "Rejected",
                                                            protected_attribute: sensitiveAttr
                                                        }
                                                    }

                                                    // Update result with confirmed analysis
                                                    setResult(dashboardResult)
                                                    setIsLoading(false)
                                                }}
                                                onCancel={() => {
                                                    // Reset to upload form
                                                    setResult(null)
                                                    setFile(null)
                                                    setSystemDescription('')
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Bias Results Dashboard - Shows completed analysis */}
                                            <div className="mt-8">
                                                <BiasResultsDashboard result={result} />
                                            </div>

                                            {/* Raw JSON Output (Collapsible) */}
                                            <div className="mt-6">
                                                <details className="group">
                                                    <summary className="cursor-pointer list-none">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                                                            <svg
                                                                className="w-4 h-4 transition-transform group-open:rotate-90"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M9 5l7 7-7 7"
                                                                />
                                                            </svg>
                                                            View raw analysis JSON
                                                        </div>
                                                    </summary>
                                                    <div className="mt-3 p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-x-auto">
                                                        <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                            {JSON.stringify(result, null, 2)}
                                                        </pre>
                                                    </div>
                                                </details>
                                            </div>
                                        </>
                                    )}

                                    {/* Chat Interface - Only show if results exist */}
                                    {result && (
                                        <div className="mt-8 bg-white border border-zinc-200 rounded-2xl p-6 shadow-lg">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-bold text-zinc-900">
                                                    Ask Questions About the Analysis
                                                </h3>
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                    Controlled Explain Mode
                                                </span>
                                            </div>

                                            {/* Explain Mode Notice */}
                                            <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                                                <p className="text-sm text-blue-800 font-medium">
                                                    ℹ️ This assistant explains existing results only. It cannot determine intent, make predictions, provide legal advice, or recommend specific fixes.
                                                </p>
                                            </div>

                                            {/* Chat Messages */}
                                            <div className="mb-4 space-y-3 max-h-96 overflow-y-auto">
                                                {messages.length === 0 ? (
                                                    <p className="text-base text-zinc-500 text-center py-8">
                                                        No messages yet. Ask a question about the bias analysis results.
                                                    </p>
                                                ) : (
                                                    messages.map((message, index) => (
                                                        <div
                                                            key={index}
                                                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div
                                                                className={`max-w-[80%] rounded-xl px-4 py-3 ${message.role === 'user'
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                                                                    }`}
                                                            >
                                                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Chat Input */}
                                            {isHistoryView ? (
                                                <div className="p-4 rounded-xl bg-zinc-100 border border-zinc-200">
                                                    <p className="text-sm text-zinc-600 text-center font-medium">
                                                        📖 Chat for historical analyses is read-only. Start a new analysis to ask questions.
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <form onSubmit={handleChatSubmit} className="flex gap-3">
                                                        <input
                                                            type="text"
                                                            value={chatInput}
                                                            onChange={(e) => setChatInput(e.target.value)}
                                                            placeholder="Ask about the analysis results..."
                                                            className="flex-1 px-5 py-4 rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={!chatInput.trim()}
                                                            className="px-8 py-4 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                                                        >
                                                            Send
                                                        </button>
                                                    </form>

                                                    <p className="mt-3 text-sm text-zinc-500 font-medium">
                                                        💡 Chat is ephemeral - messages are not saved and will be lost when you leave this page
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main >
        </div >
    )
}
