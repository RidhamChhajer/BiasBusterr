/**
 * Extraction Status Component (Phase 6)
 * 
 * Shows extraction progress, confidence, and status messages
 */

import React from 'react'

interface ExtractionStatusProps {
    fileType: 'csv' | 'pdf' | 'image' | 'drive' | 'text' | 'unknown'
    extractionMethod: string | null
    confidence: number | null
    status: 'extracting' | 'success' | 'low_confidence' | 'failed'
    message?: string
}

export function ExtractionStatus({
    fileType,
    extractionMethod,
    confidence,
    status,
    message
}: ExtractionStatusProps) {
    const getFileTypeLabel = () => {
        const labels = {
            csv: 'CSV File',
            pdf: 'PDF Document',
            image: 'Image File',
            drive: 'Google Drive File',
            text: 'Text File',
            unknown: 'Unknown Format'
        }
        return labels[fileType] || 'Unknown Format'
    }

    const getStatusColor = () => {
        switch (status) {
            case 'success': return '#10B981'
            case 'low_confidence': return '#F59E0B'
            case 'failed': return '#DC2626'
            default: return '#3B82F6'
        }
    }

    const getStatusIcon = () => {
        switch (status) {
            case 'success': return '✓'
            case 'low_confidence': return '⚠️'
            case 'failed': return '✗'
            default: return '⟳'
        }
    }

    const getDefaultMessage = () => {
        switch (status) {
            case 'success':
                return 'Table extracted successfully with high confidence. Ready for role confirmation.'
            case 'low_confidence':
                return 'Table extracted with medium confidence. Analysis will proceed with warnings.'
            case 'failed':
                return 'We couldn\'t safely extract a reliable table from this file. To avoid incorrect conclusions, fairness analysis was not performed.'
            default:
                return 'Extracting data from file...'
        }
    }

    return (
        <div className="extraction-status">
            <div className="extraction-status__header">
                <div className="extraction-status__icon" style={{ color: getStatusColor() }}>
                    {getStatusIcon()}
                </div>
                <h3 className="extraction-status__title">Data Extraction</h3>
            </div>

            <div className="extraction-status__details">
                <div className="extraction-status__row">
                    <span className="extraction-status__label">File Type:</span>
                    <span className="extraction-status__value">{getFileTypeLabel()}</span>
                </div>

                {extractionMethod && (
                    <div className="extraction-status__row">
                        <span className="extraction-status__label">Extraction Method:</span>
                        <span className="extraction-status__value">{extractionMethod}</span>
                    </div>
                )}

                {confidence !== null && (
                    <div className="extraction-status__row">
                        <span className="extraction-status__label">Confidence:</span>
                        <div className="extraction-status__confidence">
                            <div className="confidence-bar">
                                <div
                                    className="confidence-bar__fill"
                                    style={{
                                        width: `${confidence * 100}%`,
                                        backgroundColor: getStatusColor()
                                    }}
                                />
                            </div>
                            <span className="confidence-value">{(confidence * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="extraction-status__message" style={{ borderLeftColor: getStatusColor() }}>
                {message || getDefaultMessage()}
            </div>

            <style jsx>{`
        .extraction-status {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1.5rem 0;
        }

        .extraction-status__header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .extraction-status__icon {
          font-size: 1.5rem;
          font-weight: bold;
        }

        .extraction-status__title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1F2937;
          margin: 0;
        }

        .extraction-status__details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .extraction-status__row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .extraction-status__label {
          font-size: 0.875rem;
          color: #6B7280;
          font-weight: 500;
        }

        .extraction-status__value {
          font-size: 0.875rem;
          color: #1F2937;
          font-weight: 600;
        }

        .extraction-status__confidence {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          max-width: 300px;
        }

        .confidence-bar {
          flex: 1;
          height: 8px;
          background: #E5E7EB;
          border-radius: 4px;
          overflow: hidden;
        }

        .confidence-bar__fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .confidence-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1F2937;
          min-width: 40px;
          text-align: right;
        }

        .extraction-status__message {
          background: #F9FAFB;
          border-left: 3px solid;
          padding: 1rem;
          border-radius: 4px;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #374151;
        }
      `}</style>
        </div>
    )
}
