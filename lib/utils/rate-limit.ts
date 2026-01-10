/**
 * Simple in-memory rate limiter for anonymous users
 * 
 * This is a basic implementation that tracks ongoing analysis requests.
 * For production, consider using Redis or a more robust solution.
 */

interface RateLimitEntry {
    ip: string
    timestamp: number
    isProcessing: boolean
}

// In-memory store for anonymous user requests
const anonymousRequests = new Map<string, RateLimitEntry>()

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000

// Max processing time before considering request stale (10 minutes)
const MAX_PROCESSING_TIME = 10 * 60 * 1000

/**
 * Check if an anonymous user (by IP) can make a request
 * Anonymous users can only have one analysis processing at a time
 */
export function canMakeAnonymousRequest(ip: string): {
    allowed: boolean
    reason?: string
} {
    const existing = anonymousRequests.get(ip)

    if (!existing) {
        return { allowed: true }
    }

    // Check if existing request is stale
    const timeSinceRequest = Date.now() - existing.timestamp
    if (timeSinceRequest > MAX_PROCESSING_TIME) {
        // Request is stale, allow new request
        anonymousRequests.delete(ip)
        return { allowed: true }
    }

    // Check if still processing
    if (existing.isProcessing) {
        return {
            allowed: false,
            reason: 'You already have an analysis in progress. Please wait for it to complete.',
        }
    }

    return { allowed: true }
}

/**
 * Mark an anonymous request as started
 */
export function startAnonymousRequest(ip: string): void {
    anonymousRequests.set(ip, {
        ip,
        timestamp: Date.now(),
        isProcessing: true,
    })
}

/**
 * Mark an anonymous request as completed
 */
export function completeAnonymousRequest(ip: string): void {
    const existing = anonymousRequests.get(ip)
    if (existing) {
        existing.isProcessing = false
    }
}

/**
 * Remove an anonymous request from tracking
 */
export function removeAnonymousRequest(ip: string): void {
    anonymousRequests.delete(ip)
}

/**
 * Cleanup stale requests periodically
 */
function cleanupStaleRequests() {
    const now = Date.now()

    for (const [ip, entry] of anonymousRequests.entries()) {
        if (now - entry.timestamp > MAX_PROCESSING_TIME) {
            anonymousRequests.delete(ip)
        }
    }
}

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
    // Only run on server
    setInterval(cleanupStaleRequests, CLEANUP_INTERVAL)
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
    // Try various headers that might contain the real IP
    const headers = request.headers

    const forwardedFor = headers.get('x-forwarded-for')
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim()
    }

    const realIp = headers.get('x-real-ip')
    if (realIp) {
        return realIp
    }

    // Fallback to a placeholder (in development)
    return 'unknown'
}

/**
 * Validate file size for anonymous users
 */
export function validateAnonymousFileSize(sizeBytes: number): {
    valid: boolean
    reason?: string
} {
    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

    if (sizeBytes > MAX_SIZE) {
        return {
            valid: false,
            reason: `File size exceeds 5 MB limit for anonymous users. Please sign in for larger files.`,
        }
    }

    return { valid: true }
}
