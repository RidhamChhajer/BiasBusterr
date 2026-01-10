/**
 * Google Drive Fetcher (Phase 4)
 * 
 * Fetches public Google Drive files for analysis
 * 
 * CRITICAL RULES:
 * - Public files only (no authentication)
 * - No permission modification
 * - No credential persistence
 */

/**
 * Fetch file from Google Drive public link
 */
export async function fetchDriveFile(
    driveUrl: string
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    console.log('[DRIVE] Fetching file from:', driveUrl)

    // Extract file ID
    const fileId = extractFileIdFromUrl(driveUrl)

    if (!fileId) {
        throw new Error('Invalid Google Drive URL - could not extract file ID')
    }

    console.log('[DRIVE] File ID:', fileId)

    // Construct download URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`

    try {
        // Fetch file
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'BiasBuster/1.0'
            }
        })

        if (!response.ok) {
            throw new Error(`Drive fetch failed: ${response.status} ${response.statusText}`)
        }

        // Get file buffer
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Extract metadata from headers
        const contentType = response.headers.get('content-type') || 'application/octet-stream'
        const contentDisposition = response.headers.get('content-disposition')

        let fileName = 'drive-file'
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?(.+?)"?$/i)
            if (match) {
                fileName = match[1]
            }
        }

        console.log('[DRIVE] ✅ File fetched:', {
            size: buffer.length,
            fileName,
            mimeType: contentType
        })

        return {
            buffer,
            fileName,
            mimeType: contentType
        }

    } catch (error: any) {
        console.error('[DRIVE] ❌ Fetch failed:', error.message)
        throw new Error(`Failed to fetch Google Drive file: ${error.message}`)
    }
}

/**
 * Extract file ID from Google Drive URL
 * 
 * Supports multiple URL formats:
 * - https://drive.google.com/file/d/{fileId}/view
 * - https://drive.google.com/open?id={fileId}
 * - https://docs.google.com/spreadsheets/d/{fileId}
 */
export function extractFileIdFromUrl(url: string): string | null {
    // Pattern 1: /file/d/{fileId}/
    let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (match) return match[1]

    // Pattern 2: ?id={fileId}
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (match) return match[1]

    // Pattern 3: /spreadsheets/d/{fileId}
    match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    if (match) return match[1]

    // Pattern 4: /document/d/{fileId}
    match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
    if (match) return match[1]

    return null
}

/**
 * Check if URL is a Google Drive link
 */
export function isGoogleDriveUrl(url: string): boolean {
    return url.includes('drive.google.com') || url.includes('docs.google.com')
}

/**
 * Validate that Drive link is public
 * 
 * Note: This is a best-effort check, actual access is verified during fetch
 */
export function isPublicDriveLink(url: string): boolean {
    // Public links typically contain 'sharing' or don't require auth
    // This is a heuristic check - actual verification happens during fetch
    return isGoogleDriveUrl(url)
}
