/**
 * Idempotency Manager (Phase 5)
 * 
 * Handles replays and duplicate requests safely
 * 
 * CRITICAL RULES:
 * - Re-submitting same analysis_id → return cached result
 * - Expired analysis_id → inconclusive with explanation
 * - Duplicate confirmation → safely ignored or rejected
 */

import NodeCache from 'node-cache'
import type { StandardizedResponse } from './response-standardizer'

// Cache for completed analysis results (15 minute TTL)
const resultCache = new NodeCache({
    stdTTL: 900,  // 15 minutes
    checkperiod: 120,  // Check for expired keys every 2 minutes
    useClones: false
})

export interface AnalysisCache {
    analysisId: string
    result: StandardizedResponse
    createdAt: number
    expiresAt: number
}

/**
 * Check if analysis result is cached (idempotency check)
 */
export function checkIdempotency(analysisId: string): AnalysisCache | null {
    const cached = resultCache.get<AnalysisCache>(analysisId)

    if (cached) {
        console.log('[IDEMPOTENCY] Cache hit for analysis:', analysisId)
        return cached
    }

    return null
}

/**
 * Cache analysis result for idempotency
 */
export function cacheResult(
    analysisId: string,
    result: StandardizedResponse,
    ttlSeconds: number = 900
): void {
    const now = Date.now()
    const cache: AnalysisCache = {
        analysisId,
        result,
        createdAt: now,
        expiresAt: now + (ttlSeconds * 1000)
    }

    resultCache.set(analysisId, cache, ttlSeconds)
    console.log('[IDEMPOTENCY] Cached result for:', analysisId)
}

/**
 * Handle duplicate request
 */
export function handleDuplicateRequest(analysisId: string): StandardizedResponse | null {
    const cached = checkIdempotency(analysisId)

    if (cached) {
        console.log('[IDEMPOTENCY] Returning cached result for duplicate request')
        return cached.result
    }

    return null
}

/**
 * Clear cached result (for cleanup)
 */
export function clearCachedResult(analysisId: string): void {
    resultCache.del(analysisId)
    console.log('[IDEMPOTENCY] Cleared cache for:', analysisId)
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    return {
        keys: resultCache.keys().length,
        stats: resultCache.getStats()
    }
}
