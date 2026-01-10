/**
 * Text Extraction Utility
 * 
 * Extracts text from uploaded files for bias analysis
 * Supports: PDF, Text, CSV
 * Max length: 4000-6000 characters
 */

import pdf from 'pdf-parse'

const MAX_TEXT_LENGTH = 5000
const CSV_PREVIEW_ROWS = 50

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        const data = await pdf(buffer)
        return data.text || ''
    } catch (error) {
        console.error('PDF extraction error:', error)
        return ''
    }
}

/**
 * Extract text from plain text buffer
 */
function extractTextFromPlainText(buffer: Buffer): string {
    try {
        return buffer.toString('utf-8')
    } catch (error) {
        console.error('Text extraction error:', error)
        return ''
    }
}

/**
 * Summarize CSV/dataset by reading first N rows
 */
function summarizeDataset(buffer: Buffer): string {
    try {
        const text = buffer.toString('utf-8')
        const lines = text.split('\n').slice(0, CSV_PREVIEW_ROWS)

        // Format as readable text
        const summary = lines.map((line, idx) => {
            if (idx === 0) {
                return `Headers: ${line}`
            }
            return `Row ${idx}: ${line}`
        }).join('\n')

        return summary
    } catch (error) {
        console.error('CSV extraction error:', error)
        return ''
    }
}

/**
 * Truncate text to max length
 */
function truncateText(text: string, maxLength: number = MAX_TEXT_LENGTH): string {
    if (text.length <= maxLength) {
        return text
    }

    // Truncate at word boundary
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSpace > maxLength * 0.8) {
        return truncated.substring(0, lastSpace) + '...'
    }

    return truncated + '...'
}

/**
 * Main extraction function
 * Routes to appropriate extractor based on file type
 */
export async function extractTextFromFile(
    buffer: Buffer,
    fileType: string
): Promise<string> {
    let extractedText = ''

    // Route based on file type
    if (fileType === 'pdf') {
        extractedText = await extractTextFromPDF(buffer)
    } else if (fileType === 'csv') {
        extractedText = summarizeDataset(buffer)
    } else {
        // Default to plain text
        extractedText = extractTextFromPlainText(buffer)
    }

    // Clean and truncate
    const cleanedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    return truncateText(cleanedText)
}

/**
 * Check if extracted text is sufficient for analysis
 */
export function hasSufficientText(text: string): boolean {
    return text.trim().length >= 50
}
