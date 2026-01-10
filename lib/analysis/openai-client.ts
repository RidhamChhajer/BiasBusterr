/**
 * OpenAI Client Configuration
 * 
 * Configures and exports OpenAI client for bias analysis
 */

import OpenAI from 'openai'

// Initialize OpenAI client
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

// Model configuration
export const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// Analysis configuration
export const ANALYSIS_CONFIG = {
    temperature: 0.2, // Low temperature for deterministic results
    maxTokens: 1000,
    timeout: 8000 // 8 seconds
}
