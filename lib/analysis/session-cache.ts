/**
 * Session Cache Manager
 * 
 * Manages temporary storage of pending analyses awaiting user confirmation
 * Uses in-memory cache with automatic expiration
 */

import NodeCache from 'node-cache'
import type { PendingAnalysis } from './types'
import { SESSION_CONFIG } from './config'

// Global cache instance to persist across hot reloads in development
// In production, this will be a single instance per server process
declare global {
    var __biasAnalysisCache: NodeCache | undefined
}

// Create or reuse cache instance
const cache = global.__biasAnalysisCache ?? new NodeCache({
    stdTTL: SESSION_CONFIG.pendingAnalysisTimeoutMinutes * 60,  // Convert to seconds
    checkperiod: 60,  // Check for expired keys every 60 seconds
    maxKeys: SESSION_CONFIG.maxCacheSize
})

// Store in global to persist across hot reloads
if (!global.__biasAnalysisCache) {
    global.__biasAnalysisCache = cache
}

/**
 * Generate temporary analysis ID
 */
export function generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

/**
 * Store pending analysis
 */
export async function storePendingAnalysis(
    analysisId: string,
    data: PendingAnalysis
): Promise<void> {
    console.log('[CACHE] Storing pending analysis:', analysisId)

    cache.set(analysisId, data)

    console.log('[CACHE] ✅ Stored. Expires in', SESSION_CONFIG.pendingAnalysisTimeoutMinutes, 'minutes')
}

/**
 * Retrieve pending analysis
 */
export async function getPendingAnalysis(
    analysisId: string
): Promise<PendingAnalysis | null> {
    console.log('[CACHE] Retrieving pending analysis:', analysisId)

    // Debug: Show all keys in cache
    const allKeys = cache.keys()
    console.log('[CACHE] All keys in cache:', allKeys)
    console.log('[CACHE] Total keys:', allKeys.length)

    const data = cache.get<PendingAnalysis>(analysisId)

    if (!data) {
        console.log('[CACHE] ❌ Not found or expired')
        return null
    }

    console.log('[CACHE] ✅ Retrieved')
    return data
}

/**
 * Delete pending analysis (after completion or cancellation)
 */
export async function deletePendingAnalysis(analysisId: string): Promise<void> {
    console.log('[CACHE] Deleting pending analysis:', analysisId)

    cache.del(analysisId)

    console.log('[CACHE] ✅ Deleted')
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
    keys: number
    hits: number
    misses: number
    ksize: number
    vsize: number
} {
    return cache.getStats()
}

/**
 * Clear all pending analyses (for testing/maintenance)
 */
export function clearAllPending(): void {
    console.log('[CACHE] Clearing all pending analyses')
    cache.flushAll()
}
