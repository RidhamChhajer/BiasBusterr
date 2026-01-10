/**
 * Timeout Manager (Phase 5)
 * 
 * Enforces timeouts with graceful degradation
 * 
 * CRITICAL RULES:
 * - Vision timeout → text fallback
 * - Explanation timeout → use template fallback
 * - Drive timeout → error with retry suggestion
 */

import { AnalysisError, ErrorCode } from './error-handler'

export const TIMEOUTS = {
    VISION_API: 30000,          // 30 seconds
    OPENAI_EXPLANATION: 15000,  // 15 seconds
    DRIVE_FETCH: 20000,         // 20 seconds
    TOTAL_ANALYSIS: 60000,      // 60 seconds
    CSV_PARSING: 10000          // 10 seconds
}

/**
 * Execute promise with timeout
 * 
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param fallback - Optional fallback function if timeout occurs
 * @returns Result or fallback value
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    fallback?: () => T | Promise<T>
): Promise<T> {
    let timeoutHandle: NodeJS.Timeout

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new AnalysisError(
                `Operation timed out after ${timeoutMs}ms`,
                ErrorCode.TIMEOUT,
                true
            ))
        }, timeoutMs)
    })

    try {
        const result = await Promise.race([promise, timeoutPromise])
        clearTimeout(timeoutHandle!)
        return result
    } catch (error: any) {
        clearTimeout(timeoutHandle!)

        // If timeout and fallback provided, use fallback
        if (error.code === ErrorCode.TIMEOUT && fallback) {
            console.warn('[TIMEOUT] Using fallback after timeout')
            return await fallback()
        }

        throw error
    }
}

/**
 * Execute with retry on timeout
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    timeoutMs: number = 30000
): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[RETRY] Attempt ${attempt}/${maxRetries}`)
            return await withTimeout(fn(), timeoutMs)
        } catch (error: any) {
            lastError = error

            if (attempt < maxRetries) {
                console.warn(`[RETRY] Attempt ${attempt} failed, retrying...`)
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            }
        }
    }

    throw lastError || new Error('All retry attempts failed')
}
