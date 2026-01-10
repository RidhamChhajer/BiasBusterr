/**
 * Vision Extractor with Confidence Gates
 * 
 * Uses OpenAI Vision API to extract tables from images and PDFs
 * MANDATORY: Implements confidence assessment and safety gates
 * 
 * CRITICAL SAFETY RULES:
 * - Vision-extracted data is LOWER-TRUST than native CSV
 * - Confidence gates MUST be enforced before fairness analysis
 * - Low confidence → INCONCLUSIVE or text fallback
 */

import { openai } from './openai-client'
import type { ParsedDataset, VisionExtractionResult, QualityAssessment } from './types'
import { BIAS_CONFIG } from './config'

/**
 * Extract table from image using Vision API
 * 
 * ENFORCES: Confidence gates and quality assessment
 */
export async function extractTableFromImage(buffer: Buffer): Promise<VisionExtractionResult> {
    try {
        console.log('[VISION] Extracting table from image...')

        // Convert buffer to base64
        const base64Image = buffer.toString('base64')
        const dataUrl = `data:image/png;base64,${base64Image}`

        // Call Vision API with table extraction prompt
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: VISION_TABLE_EXTRACTION_PROMPT
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: dataUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: 2000,
            temperature: 0.1,
            response_format: { type: 'json_object' }
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            return createFailedExtraction('Empty response from Vision API')
        }

        // Parse response
        const parsed = JSON.parse(content)

        // Check for error
        if (parsed.error) {
            return createFailedExtraction(parsed.error)
        }

        // Validate extracted data
        if (!parsed.headers || !Array.isArray(parsed.headers) || parsed.headers.length === 0) {
            return createFailedExtraction('No valid headers extracted')
        }

        if (!parsed.rows || !Array.isArray(parsed.rows) || parsed.rows.length === 0) {
            return createFailedExtraction('No valid rows extracted')
        }

        // Create dataset
        const dataset: ParsedDataset = {
            headers: parsed.headers,
            rows: parsed.rows,
            rowCount: parsed.rows.length,
            columnCount: parsed.headers.length,
            metadata: {
                source: 'vision-ocr',
                extractedAt: new Date().toISOString(),
                quality: 'medium'  // Will be updated by quality assessment
            }
        }

        // CRITICAL: Assess extraction quality and confidence
        const quality = assessExtractionQuality(dataset, parsed)

        // Update quality in metadata
        dataset.metadata.quality = quality.overallConfidence >= BIAS_CONFIG.confidenceThresholds.high
            ? 'high'
            : quality.overallConfidence >= BIAS_CONFIG.confidenceThresholds.medium
                ? 'medium'
                : 'low'

        // ENFORCE CONFIDENCE GATE
        const shouldProceedWithFairness = quality.overallConfidence >= BIAS_CONFIG.confidenceThresholds.high

        console.log('[VISION] Extraction complete:', {
            rows: dataset.rowCount,
            columns: dataset.columnCount,
            confidence: quality.overallConfidence.toFixed(2),
            shouldProceedWithFairness
        })

        return {
            success: true,
            dataset,
            confidence: quality.overallConfidence,
            quality,
            warnings: quality.issues,
            shouldProceedWithFairness
        }

    } catch (error: any) {
        console.error('[VISION] Extraction failed:', error.message)
        return createFailedExtraction(error.message)
    }
}

/**
 * Extract table from PDF using Vision API
 * 
 * Note: For PDFs, we convert first page to image then use Vision API
 */
export async function extractTableFromPDF(buffer: Buffer): Promise<VisionExtractionResult> {
    // For now, treat PDF same as image
    // In production, you might want to use pdf-to-image conversion first
    console.log('[VISION] Extracting table from PDF (treating as image)...')
    return extractTableFromImage(buffer)
}

/**
 * Unified Vision extraction wrapper (Phase 4)
 * 
 * Routes to appropriate extraction method based on file type
 */
export async function extractTableWithVision(
    buffer: Buffer,
    fileType: 'pdf' | 'image'
): Promise<VisionExtractionResult> {
    if (fileType === 'pdf') {
        return extractTableFromPDF(buffer)
    } else {
        return extractTableFromImage(buffer)
    }
}

/**
 * Assess extraction quality (MANDATORY SAFETY CHECK)
 * 
 * Evaluates:
 * 1. Structural integrity
 * 2. Data completeness
 * 3. Header clarity
 * 4. Type consistency
 * 5. Vision-reported confidence
 */
export function assessExtractionQuality(
    dataset: ParsedDataset,
    rawResponse: any
): QualityAssessment {
    const issues: string[] = []

    // 1. Structural Integrity: Are rows/columns well-formed?
    let structuralIntegrity = 1.0
    const expectedColumns = dataset.headers.length
    const malformedRows = dataset.rows.filter(row => row.length !== expectedColumns)

    if (malformedRows.length > 0) {
        const ratio = malformedRows.length / dataset.rows.length
        structuralIntegrity = Math.max(0, 1 - ratio)
        issues.push(`${malformedRows.length} rows have inconsistent column count`)
    }

    // 2. Data Completeness: Missing values < 30%?
    let dataCompleteness = 1.0
    let totalCells = dataset.rowCount * dataset.columnCount
    let missingCells = 0

    for (const row of dataset.rows) {
        for (const cell of row) {
            if (cell === null || cell === undefined || cell === '') {
                missingCells++
            }
        }
    }

    const missingRatio = totalCells > 0 ? missingCells / totalCells : 0
    dataCompleteness = Math.max(0, 1 - missingRatio)

    if (missingRatio > 0.3) {
        issues.push(`High missing data ratio: ${(missingRatio * 100).toFixed(1)}%`)
    }

    // 3. Header Clarity: Clear column headers identified?
    let headerClarity = 1.0
    const emptyHeaders = dataset.headers.filter(h => !h || h.trim() === '')

    if (emptyHeaders.length > 0) {
        headerClarity = Math.max(0, 1 - (emptyHeaders.length / dataset.headers.length))
        issues.push(`${emptyHeaders.length} columns have empty headers`)
    }

    // Check for generic headers like "Column1", "Column2"
    const genericHeaders = dataset.headers.filter(h =>
        /^(column|col|field|data)\s*\d+$/i.test(h.trim())
    )

    if (genericHeaders.length > dataset.headers.length * 0.5) {
        headerClarity *= 0.7
        issues.push('Many headers appear to be auto-generated')
    }

    // 4. Type Consistency: Column values have consistent types?
    let typeConsistency = 1.0
    let inconsistentColumns = 0

    for (let colIndex = 0; colIndex < dataset.headers.length; colIndex++) {
        const values = dataset.rows.map(row => row[colIndex])
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '')

        if (nonNullValues.length === 0) continue

        // Check type consistency
        const types = new Set(nonNullValues.map(v => typeof v))
        if (types.size > 1) {
            inconsistentColumns++
        }
    }

    if (inconsistentColumns > 0) {
        typeConsistency = Math.max(0, 1 - (inconsistentColumns / dataset.headers.length))
        issues.push(`${inconsistentColumns} columns have mixed data types`)
    }

    // 5. Vision Confidence: Use reported confidence if available
    const visionConfidence = rawResponse.confidence || 0.8  // Default to 0.8 if not provided

    // Compute weighted average (CRITICAL FOR SAFETY GATE)
    const overallConfidence = (
        structuralIntegrity * 0.25 +
        dataCompleteness * 0.25 +
        headerClarity * 0.20 +
        typeConsistency * 0.15 +
        visionConfidence * 0.15
    )

    return {
        structuralIntegrity,
        dataCompleteness,
        headerClarity,
        typeConsistency,
        overallConfidence,
        issues
    }
}

/**
 * Create failed extraction result
 */
function createFailedExtraction(reason: string): VisionExtractionResult {
    return {
        success: false,
        confidence: 0,
        quality: {
            structuralIntegrity: 0,
            dataCompleteness: 0,
            headerClarity: 0,
            typeConsistency: 0,
            overallConfidence: 0,
            issues: [reason]
        },
        warnings: [reason],
        shouldProceedWithFairness: false
    }
}

/**
 * Vision API Prompt for Table Extraction
 * 
 * CRITICAL: Asks Vision to assess confidence and report issues
 */
const VISION_TABLE_EXTRACTION_PROMPT = `Analyze this image and extract any tabular data you find.

IMPORTANT INSTRUCTIONS:
1. Extract the data in JSON format with headers and rows
2. Assess the quality and clarity of the table structure
3. Report any ambiguities, uncertainties, or extraction issues
4. Provide a confidence score (0.0-1.0) for the extraction quality

Return JSON in this exact format:
{
  "headers": ["column1", "column2", ...],
  "rows": [[value1, value2, ...], [value1, value2, ...], ...],
  "confidence": 0.0-1.0,
  "issues": ["list any problems you encountered during extraction"]
}

If NO clear table structure is found, return:
{
  "error": "No table detected in image"
}

CRITICAL:
- Preserve exact values from the table
- Do NOT infer or fill in missing data
- Report low confidence if table structure is ambiguous
- Include ALL rows and columns visible in the table`
