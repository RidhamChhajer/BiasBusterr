/**
 * Multi-Format Data Extractor
 * 
 * Routes file extraction to appropriate handler based on file type
 * Enforces confidence gates for Vision-extracted data
 * 
 * CRITICAL RULES:
 * - CSV: Direct parsing (HIGH confidence by default)
 * - PDF/Image: Vision API extraction with confidence assessment
 * - Low confidence → Fall back to text-based analysis
 */

import { parse } from 'csv-parse/sync'
import type { ExtractionResult, ParsedDataset } from './types'
import { extractTableFromImage, extractTableFromPDF } from './vision-extractor'
import { fetchDriveFile, isGoogleDriveUrl } from './drive-fetcher'
import { BIAS_CONFIG } from './config'

/**
 * Main extraction router
 * 
 * Accepts all file formats, returns structured data when reliable
 */
export async function extractStructuredData(
    buffer: Buffer,
    fileType: string,
    fileName: string
): Promise<ExtractionResult> {
    console.log('[EXTRACTION] Starting extraction:', { fileType, fileName })

    try {
        switch (fileType) {
            case 'csv':
                return await extractFromCSV(buffer, fileName)

            case 'pdf':
                return await extractFromPDF(buffer, fileName)

            case 'image':
            case 'png':
            case 'jpg':
            case 'jpeg':
                return await extractFromImage(buffer, fileName)

            default:
                // Unknown type → try text extraction
                return {
                    success: false,
                    dataType: 'text',
                    textData: buffer.toString('utf-8'),
                    extractionMethod: 'text-fallback',
                    confidence: 0,
                    warnings: [`Unsupported file type: ${fileType}`]
                }
        }
    } catch (error: any) {
        console.error('[EXTRACTION] Failed:', error.message)

        return {
            success: false,
            dataType: 'text',
            textData: '',
            extractionMethod: 'text-fallback',
            confidence: 0,
            warnings: [`Extraction error: ${error.message}`]
        }
    }
}

/**
 * Extract from Google Drive URL (Phase 4)
 * 
 * Fetches file and routes to appropriate extractor
 */
export async function extractFromDriveUrl(driveUrl: string): Promise<ExtractionResult> {
    try {
        console.log('[DRIVE] Fetching file from Drive URL...')

        const { buffer, fileName, mimeType } = await fetchDriveFile(driveUrl)

        // Determine file type from MIME type
        let fileType = 'unknown'
        if (mimeType.includes('csv') || fileName.endsWith('.csv')) {
            fileType = 'csv'
        } else if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
            fileType = 'pdf'
        } else if (mimeType.includes('image') || /\.(png|jpg|jpeg)$/i.test(fileName)) {
            fileType = 'image'
        }

        console.log('[DRIVE] File fetched, routing to extractor:', fileType)

        // Route to appropriate extractor
        return await extractStructuredData(buffer, fileType, fileName)

    } catch (error: any) {
        console.error('[DRIVE] Failed:', error.message)

        return {
            success: false,
            dataType: 'text',
            textData: '',
            extractionMethod: 'text-fallback',
            confidence: 0,
            warnings: [`Google Drive fetch failed: ${error.message}`]
        }
    }
}

/**
 * Extract from CSV (HIGH confidence by default)
 */
async function extractFromCSV(buffer: Buffer, fileName: string): Promise<ExtractionResult> {
    try {
        console.log('[CSV] Parsing CSV file...')

        const csvText = buffer.toString('utf-8')

        // Parse CSV
        const records = parse(csvText, {
            columns: true,  // First row as headers
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true  // Allow inconsistent column counts
        })

        if (records.length === 0) {
            return {
                success: false,
                dataType: 'text',
                textData: csvText,
                extractionMethod: 'text-fallback',
                confidence: 0,
                warnings: ['CSV file is empty']
            }
        }

        // Extract headers
        const headers = Object.keys(records[0])

        // Convert to row format
        const rows = records.map((record: any) =>
            headers.map(header => record[header])
        )

        const dataset: ParsedDataset = {
            headers,
            rows,
            rowCount: rows.length,
            columnCount: headers.length,
            metadata: {
                source: fileName,
                extractedAt: new Date().toISOString(),
                quality: 'high'  // CSV is always high quality (native format)
            }
        }

        console.log('[CSV] ✅ Parsed successfully:', {
            rows: dataset.rowCount,
            columns: dataset.columnCount
        })

        return {
            success: true,
            dataType: 'structured',
            structuredData: dataset,
            extractionMethod: 'csv',
            confidence: 1.0,  // CSV is always high confidence
            warnings: []
        }

    } catch (error: any) {
        console.error('[CSV] Parsing failed:', error.message)

        // Fall back to text
        return {
            success: false,
            dataType: 'text',
            textData: buffer.toString('utf-8'),
            extractionMethod: 'text-fallback',
            confidence: 0,
            warnings: [`CSV parsing error: ${error.message}`]
        }
    }
}

/**
 * Extract from PDF (Vision API with confidence gates)
 */
async function extractFromPDF(buffer: Buffer, fileName: string): Promise<ExtractionResult> {
    console.log('[PDF] Attempting table extraction with Vision API...')

    // Try Vision API extraction
    const visionResult = await extractTableFromPDF(buffer)

    if (!visionResult.success || !visionResult.dataset) {
        console.log('[PDF] Vision extraction failed, falling back to text')

        // Fall back to text extraction
        // Note: In production, you'd use pdf-parse here
        return {
            success: false,
            dataType: 'text',
            textData: 'PDF text extraction not implemented yet',
            extractionMethod: 'text-fallback',
            confidence: 0,
            warnings: visionResult.warnings
        }
    }

    // ENFORCE CONFIDENCE GATE
    if (visionResult.confidence < BIAS_CONFIG.confidenceThresholds.high) {
        console.log('[PDF] ⚠️ Low confidence extraction:', visionResult.confidence.toFixed(2))

        if (visionResult.confidence < BIAS_CONFIG.confidenceThresholds.medium) {
            // Very low confidence → text fallback
            console.log('[PDF] Confidence too low, falling back to text')

            return {
                success: false,
                dataType: 'text',
                textData: 'PDF text extraction not implemented yet',
                extractionMethod: 'text-fallback',
                confidence: visionResult.confidence,
                warnings: [
                    'Table extraction confidence is too low for reliable analysis',
                    ...visionResult.warnings
                ]
            }
        }
    }

    // Return structured data with confidence score
    console.log('[PDF] ✅ Table extracted:', {
        rows: visionResult.dataset.rowCount,
        columns: visionResult.dataset.columnCount,
        confidence: visionResult.confidence.toFixed(2)
    })

    return {
        success: true,
        dataType: 'structured',
        structuredData: visionResult.dataset,
        extractionMethod: 'pdf-table',
        confidence: visionResult.confidence,
        warnings: visionResult.warnings
    }
}

/**
 * Extract from Image (Vision API with confidence gates)
 */
async function extractFromImage(buffer: Buffer, fileName: string): Promise<ExtractionResult> {
    console.log('[IMAGE] Attempting table extraction with Vision API...')

    // Try Vision API extraction
    const visionResult = await extractTableFromImage(buffer)

    if (!visionResult.success || !visionResult.dataset) {
        console.log('[IMAGE] Vision extraction failed')

        // No text fallback for images (can't extract text from image without OCR)
        return {
            success: false,
            dataType: 'text',
            textData: '',
            extractionMethod: 'text-fallback',
            confidence: 0,
            warnings: [
                'No table detected in image',
                ...visionResult.warnings
            ]
        }
    }

    // ENFORCE CONFIDENCE GATE
    if (visionResult.confidence < BIAS_CONFIG.confidenceThresholds.high) {
        console.log('[IMAGE] ⚠️ Low confidence extraction:', visionResult.confidence.toFixed(2))

        if (visionResult.confidence < BIAS_CONFIG.confidenceThresholds.medium) {
            // Very low confidence → cannot proceed
            console.log('[IMAGE] Confidence too low for analysis')

            return {
                success: false,
                dataType: 'text',
                textData: '',
                extractionMethod: 'text-fallback',
                confidence: visionResult.confidence,
                warnings: [
                    'Table extraction confidence is too low for reliable analysis',
                    'Please upload a clearer image or CSV file',
                    ...visionResult.warnings
                ]
            }
        }
    }

    // Return structured data with confidence score
    console.log('[IMAGE] ✅ Table extracted:', {
        rows: visionResult.dataset.rowCount,
        columns: visionResult.dataset.columnCount,
        confidence: visionResult.confidence.toFixed(2)
    })

    return {
        success: true,
        dataType: 'structured',
        structuredData: visionResult.dataset,
        extractionMethod: 'vision-ocr',
        confidence: visionResult.confidence,
        warnings: visionResult.warnings
    }
}
