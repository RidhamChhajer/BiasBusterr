/**
 * Warnings & Metadata Component (Phase 6)
 * 
 * Shows warnings and metadata without alarm
 */

import React, { useState } from 'react'

interface WarningsMetadataProps {
    warnings: string[]
    metadata: {
        input_type: string
        extraction_method: string | null
        confidence: number | null
        timestamp: string
    }
}

export function WarningsMetadata({ warnings, metadata }: WarningsMetadataProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const hasWarnings = warnings.length > 0
    const hasMetadata = metadata.input_type !== 'unknown'

    if (!hasWarnings && !hasMetadata) {
        return null
    }

    return (
        <div className="warnings-metadata">
            <button
                className="warnings-metadata__toggle"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="warnings-metadata__icon">ℹ️</span>
                <span className="warnings-metadata__title">Additional Information</span>
                <span className="warnings-metadata__arrow">{isExpanded ? '▼' : '▶'}</span>
            </button>

            {isExpanded && (
                <div className="warnings-metadata__content">
                    {hasWarnings && (
                        <div className="warnings-metadata__section">
                            <h4 className="warnings-metadata__section-title">Warnings:</h4>
                            <ul className="warnings-metadata__list">
                                {warnings.map((warning, i) => (
                                    <li key={i}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {hasMetadata && (
                        <div className="warnings-metadata__section">
                            <h4 className="warnings-metadata__section-title">Metadata:</h4>
                            <dl className="warnings-metadata__metadata">
                                <div className="warnings-metadata__metadata-row">
                                    <dt>Input Type:</dt>
                                    <dd>{metadata.input_type.toUpperCase()}</dd>
                                </div>
                                {metadata.extraction_method && (
                                    <div className="warnings-metadata__metadata-row">
                                        <dt>Extraction Method:</dt>
                                        <dd>{metadata.extraction_method}</dd>
                                    </div>
                                )}
                                {metadata.confidence !== null && (
                                    <div className="warnings-metadata__metadata-row">
                                        <dt>Confidence:</dt>
                                        <dd>{(metadata.confidence * 100).toFixed(0)}%</dd>
                                    </div>
                                )}
                                <div className="warnings-metadata__metadata-row">
                                    <dt>Timestamp:</dt>
                                    <dd>{new Date(metadata.timestamp).toLocaleString()}</dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
        .warnings-metadata {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          margin: 1.5rem 0;
          overflow: hidden;
        }

        .warnings-metadata__toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .warnings-metadata__toggle:hover {
          background: #F3F4F6;
        }

        .warnings-metadata__icon {
          font-size: 1.25rem;
        }

        .warnings-metadata__title {
          flex: 1;
          text-align: left;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .warnings-metadata__arrow {
          color: #6B7280;
          font-size: 0.75rem;
        }

        .warnings-metadata__content {
          padding: 0 1rem 1rem 1rem;
        }

        .warnings-metadata__section {
          margin-bottom: 1rem;
        }

        .warnings-metadata__section:last-child {
          margin-bottom: 0;
        }

        .warnings-metadata__section-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.5rem 0;
        }

        .warnings-metadata__list {
          margin: 0;
          padding-left: 1.5rem;
          list-style-type: disc;
        }

        .warnings-metadata__list li {
          color: #F59E0B;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 0.25rem;
        }

        .warnings-metadata__metadata {
          margin: 0;
        }

        .warnings-metadata__metadata-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #E5E7EB;
        }

        .warnings-metadata__metadata-row:last-child {
          border-bottom: none;
        }

        .warnings-metadata__metadata-row dt {
          font-size: 0.875rem;
          color: #6B7280;
          font-weight: 500;
        }

        .warnings-metadata__metadata-row dd {
          font-size: 0.875rem;
          color: #1F2937;
          font-weight: 600;
          margin: 0;
        }
      `}</style>
        </div>
    )
}
