/**
 * Configuration for Bias Detection System
 * 
 * Centralized configuration with environment variable support
 */

import type { BiasDetectionConfig } from './types'

// Load configuration from environment variables with defaults
export const BIAS_CONFIG: BiasDetectionConfig = {
    // Severity thresholds (user-approved defaults)
    lowThreshold: parseFloat(process.env.BIAS_LOW_THRESHOLD || '0.10'),
    mediumThreshold: parseFloat(process.env.BIAS_MEDIUM_THRESHOLD || '0.30'),

    // Minimum sample size for reliable analysis (lowered from 10 to 3 for small datasets)
    minSampleSize: parseInt(process.env.BIAS_MIN_SAMPLE_SIZE || '3', 10),

    // Numeric column tolerance for grouping (±5%)
    numericTolerance: parseFloat(process.env.NUMERIC_TOLERANCE || '0.05'),

    // Vision extraction confidence thresholds (MANDATORY SAFETY GATES)
    confidenceThresholds: {
        high: 0.85,    // Safe for fairness analysis
        medium: 0.60,  // Requires user review
        low: 0.40      // Below this → text-based fallback
    }
}

// Session/cache configuration
export const SESSION_CONFIG = {
    pendingAnalysisTimeoutMinutes: parseInt(
        process.env.PENDING_ANALYSIS_TIMEOUT_MINUTES || '15',
        10
    ),
    maxCacheSize: 100  // Maximum number of pending analyses to cache
}

// File processing limits
export const FILE_LIMITS = {
    maxCsvRows: 10000,      // Performance limit for CSV
    maxFileSize: 50 * 1024 * 1024,  // 50MB for authenticated users
    anonymousMaxFileSize: 5 * 1024 * 1024  // 5MB for anonymous users
}

// OpenAI configuration (already exists in openai-client.ts, but adding Vision-specific)
export const VISION_CONFIG = {
    model: 'gpt-4o',  // Vision-capable model
    maxTokens: 2000,
    temperature: 0.1  // Low temperature for deterministic extraction
}

// Validation
if (BIAS_CONFIG.lowThreshold >= BIAS_CONFIG.mediumThreshold) {
    throw new Error('BIAS_LOW_THRESHOLD must be less than BIAS_MEDIUM_THRESHOLD')
}

if (BIAS_CONFIG.confidenceThresholds.high <= BIAS_CONFIG.confidenceThresholds.medium) {
    throw new Error('High confidence threshold must be greater than medium')
}

console.log('[BIAS CONFIG] Loaded configuration:', {
    lowThreshold: BIAS_CONFIG.lowThreshold,
    mediumThreshold: BIAS_CONFIG.mediumThreshold,
    minSampleSize: BIAS_CONFIG.minSampleSize,
    confidenceGates: BIAS_CONFIG.confidenceThresholds
})
