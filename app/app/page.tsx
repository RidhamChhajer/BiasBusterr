'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BiasResultsDashboard from '@/components/BiasResultsDashboard'
import RoleConfirmationView from '@/components/RoleConfirmationView'
import { getCurrentUserClient, signOut } from '@/lib/auth/client'

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
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                {/* Logo/Brand */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        Bias Buster
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
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
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        New Chat
                    </button>

                    {/* Search - Enabled for authenticated users */}
                    <button
                        disabled={!isAuthenticated}
                        onClick={handleSearchClick}
                        title={!isAuthenticated ? "Sign in to search" : "Search analyses"}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        Search
                    </button>

                    {/* History - Enabled for authenticated users */}
                    <button
                        disabled={!isAuthenticated}
                        onClick={handleHistoryClick}
                        title={!isAuthenticated ? "Sign in to view history" : "View history"}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        History
                    </button>

                    {/* Settings - Disabled */}
                    <button
                        disabled
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        Settings
                    </button>

                    {/* Divider */}
                    <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>

                    {/* Login / Logout Button */}
                    {isAuthenticated ? (
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            Logout
                        </button>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                                />
                            </svg>
                            Login
                        </button>
                    )}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        Bias Buster v1
                    </p>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto">
                    {/* Search View */}
                    {showSearch ? (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                        Search Analyses
                                    </h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Search your analysis history by filename, status, or date
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowSearch(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>

                            {/* Search Input */}
                            <div className="mb-6">
                                <div className="relative">
                                    <svg
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by filename, description, or date…"
                                        className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Search Results */}
                            {isLoadingHistory ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading analyses...</p>
                                </div>
                            ) : historyError ? (
                                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <p className="text-sm text-red-600 dark:text-red-400">{historyError}</p>
                                </div>
                            ) : filteredHistoryItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                                        {searchQuery ? 'No analyses match your search' : 'No analysis history yet'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        Found {filteredHistoryItems.length} {filteredHistoryItems.length === 1 ? 'analysis' : 'analyses'}
                                    </p>
                                    {filteredHistoryItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => loadHistoryItem(item.id)}
                                            className="w-full text-left p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-slate-900 dark:text-white truncate mb-2">
                                                        {item.datasetName}
                                                    </h3>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                                            {new Date(item.createdAt).toLocaleDateString()}
                                                        </span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.status === 'completed'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                            }`}>
                                                            {item.status}
                                                        </span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                            💾 Saved
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : showHistory ? (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Analysis History
                                </h2>
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Back to Upload
                                </button>
                            </div>

                            {/* Loading State */}
                            {isLoadingHistory && (
                                <div className="text-center py-12">
                                    <p className="text-slate-600 dark:text-slate-400">Loading history...</p>
                                </div>
                            )}

                            {/* Error State */}
                            {historyError && (
                                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <p className="text-sm text-red-600 dark:text-red-400">{historyError}</p>
                                </div>
                            )}

                            {/* Empty State */}
                            {!isLoadingHistory && !historyError && historyItems.length === 0 && (
                                <div className="text-center py-12">
                                    <svg
                                        className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <p className="text-slate-600 dark:text-slate-400 mb-2">No analysis history yet</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-500">
                                        Upload and analyze a dataset to see it here
                                    </p>
                                </div>
                            )}

                            {/* History List */}
                            {!isLoadingHistory && !historyError && historyItems.length > 0 && (
                                <div className="space-y-3">
                                    {historyItems.map((item: any) => (
                                        <button
                                            key={item.id}
                                            onClick={() => loadHistoryItem(item.id)}
                                            className="w-full p-4 text-left bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                                                        {item.datasetName}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        {new Date(item.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="ml-4">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${item.status === 'completed'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : item.status === 'failed'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                Upload Dataset for Analysis
                            </h2>

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

                            {/* Upload Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* File Input */}
                                <div>
                                    <label
                                        htmlFor="file"
                                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                                    >
                                        Dataset File
                                    </label>
                                    <input
                                        type="file"
                                        id="file"
                                        accept=".csv,.pdf,.png,.jpg,.jpeg"
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                                    />
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        Supported formats: CSV, PDF, PNG, JPG, JPEG (max 5MB for anonymous users)
                                    </p>
                                    {file && (
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                        </p>
                                    )}
                                </div>

                                {/* System Description */}
                                <div>
                                    <label
                                        htmlFor="description"
                                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                                    >
                                        System Description
                                    </label>
                                    <textarea
                                        id="description"
                                        value={systemDescription}
                                        onChange={(e) => setSystemDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Describe what this dataset represents (e.g., 'Hiring decisions from 2023', 'Loan approval data')"
                                        className="block w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Error Display */}
                                {error && (
                                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Analyzing...
                                        </>
                                    ) : (
                                        'Analyze Dataset'
                                    )}
                                </button>
                            </form>

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
                                                    // Update result with confirmed analysis
                                                    setResult(confirmedResult)
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
                                        <div className="mt-8">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                    Ask Questions About the Analysis
                                                </h3>
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    Controlled Explain Mode
                                                </span>
                                            </div>

                                            {/* Explain Mode Notice */}
                                            <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                                    ℹ️ This assistant explains existing results only. It cannot determine intent, make predictions, provide legal advice, or recommend specific fixes.
                                                </p>
                                            </div>

                                            {/* Chat Messages */}
                                            <div className="mb-4 space-y-3 max-h-96 overflow-y-auto">
                                                {messages.length === 0 ? (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                                                        No messages yet. Ask a question about the bias analysis results.
                                                    </p>
                                                ) : (
                                                    messages.map((message, index) => (
                                                        <div
                                                            key={index}
                                                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div
                                                                className={`max-w-[80%] rounded-lg px-4 py-3 ${message.role === 'user'
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
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
                                                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600">
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                                                        📖 Chat for historical analyses is read-only. Start a new analysis to ask questions.
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={chatInput}
                                                            onChange={(e) => setChatInput(e.target.value)}
                                                            placeholder="Ask about the analysis results..."
                                                            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={!chatInput.trim()}
                                                            className="px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            Send
                                                        </button>
                                                    </form>

                                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
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
