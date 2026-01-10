/**
 * PDF Table Extractor (Phase 4)
 * 
 * Extracts tables from PDF files using hierarchical strategy
 * 
 * CRITICAL RULES:
 * - Try native extraction first (non-AI)
 * - Fall back to Vision API if native fails
 * - Assess quality and confidence
 * - Low confidence → INCONCLUSIVE
 */

import type { ExtractionResult, ParsedDataset } from './types'
import { extractTableWithVision } from './vision-extractor'
import { assessExtractionQuality, shouldProceedWithFairness, generateQualityWarnings } from './quality-assessment'

/**
 * Extract tables from PDF
 * 
 * Hierarchical strategy:
 * 1. Try native PDF table extraction
 * 2. Fall back to Vision API
 * 3. Fall back to text-only
 */
export async function extractTablesFromPDF(
    buffer: Buffer,
    fileName: string
): Promise<ExtractionResult> {
    console.log('[PDF] Extracting tables from:', fileName)

    // Try native extraction first
    try {
        console.log('[PDF] Attempting native table extraction...')
        const nativeResult = await extractWithNativeParsing(buffer)

        if (nativeResult) {
            console.log('[PDF] ✅ Native extraction successful')

            // Assess quality
            const quality = assessExtractionQuality(nativeResult)
            const confidence = quality.overallConfidence
            const canProceed = shouldProceedWithFairness(confidence, quality)

            return {
                success: true,
                dataType: canProceed ? 'structured' : 'text',
                structuredData: canProceed ? nativeResult : undefined,
                extractionMethod: 'pdf-table',
                confidence,
                warnings: generateQualityWarnings(quality, confidence)
            }
        }
    } catch (error: any) {
        console.warn('[PDF] Native extraction failed:', error.message)
    }

    // Fall back to Vision API
    try {
        console.log('[PDF] Falling back to Vision API...')
        const visionResult = await extractTableWithVision(buffer, 'pdf')

        if (visionResult.success && visionResult.dataset) {
            console.log('[PDF] ✅ Vision extraction successful')

            return {
                success: true,
                dataType: visionResult.shouldProceedWithFairness ? 'structured' : 'text',
                structuredData: visionResult.shouldProceedWithFairness ? visionResult.dataset : undefined,
                extractionMethod: 'vision-ocr',
                confidence: visionResult.confidence,
                warnings: visionResult.warnings
            }
        }
    } catch (error: any) {
        console.error('[PDF] Vision extraction failed:', error.message)
    }

    // Fall back to text-only
    console.warn('[PDF] All extraction methods failed - falling back to text')

    return {
        success: false,
        dataType: 'text',
        extractionMethod: 'text-fallback',
        confidence: 0,
        warnings: ['Could not extract structured table from PDF', 'Falling back to text-based analysis']
    }
}

/**
 * Extract tables using native PDF parsing
 * 
 * Note: This is a placeholder for native PDF table extraction
 * In production, use libraries like pdf-parse, pdfjs-dist, or tabula-js
 */
async function extractWithNativeParsing(buffer: Buffer): Promise<ParsedDataset | null> {
    // TODO: Implement native PDF table extraction
    // For now, return null to trigger Vision fallback

    console.log('[PDF] Native parsing not yet implemented - will use Vision API')
    return null

    /* Example implementation with pdf-parse:
    
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    
    // Parse text to detect tables
    const tables = detectTablesInText(data.text)
    
    if (tables.length > 0) {
      return parseTableToDataset(tables[0])
    }
    
    return null
    */
}

/**
 * Detect tables in PDF text (helper for native extraction)
 */
function detectTablesInText(text: string): any[] {
    // Placeholder for table detection logic
    // Would analyze text structure to find tabular patterns
    return []
}
