/**
 * Error Display Component (Phase 6)
 * 
 * Shows errors clearly, distinct from INCONCLUSIVE
 */

import React from 'react'

interface ErrorDisplayProps {
    title?: string
    message: string
    details?: string[]
    suggestions?: string[]
}

export function ErrorDisplay({
    title = 'Error Processing File',
    message,
    details = [],
    suggestions = []
}: ErrorDisplayProps) {
    const defaultSuggestions = [
        'Check that your file is in a supported format (CSV, PDF, Image)',
        'Ensure your file is not corrupted',
        'Try uploading a different file'
    ]

    const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions

    return (
        <div className="error-display">
            <div className="error-display__header">
                <div className="error-display__icon">❌</div>
                <h2 className="error-display__title">{title}</h2>
            </div>

            <div className="error-display__message">
                {message}
            </div>

            {details.length > 0 && (
                <div className="error-display__section">
                    <h3 className="error-display__section-title">Details:</h3>
                    <ul className="error-display__list">
                        {details.map((detail, i) => (
                            <li key={i}>{detail}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="error-display__section">
                <h3 className="error-display__section-title">What you can do:</h3>
                <ul className="error-display__list">
                    {displaySuggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                    ))}
                </ul>
            </div>

            <style jsx>{`
        .error-display {
          background: white;
          border: 2px solid #FEE2E2;
          border-radius: 12px;
          padding: 2rem;
          max-width: 600px;
          margin: 2rem auto;
        }

        .error-display__header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .error-display__icon {
          font-size: 2rem;
        }

        .error-display__title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #DC2626;
          margin: 0;
        }

        .error-display__message {
          background: #FEF2F2;
          border-left: 3px solid #DC2626;
          padding: 1rem;
          border-radius: 4px;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #991B1B;
          margin-bottom: 1.5rem;
        }

        .error-display__section {
          margin-bottom: 1.5rem;
        }

        .error-display__section:last-child {
          margin-bottom: 0;
        }

        .error-display__section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .error-display__list {
          margin: 0;
          padding-left: 1.5rem;
          list-style-type: disc;
        }

        .error-display__list li {
          color: #4B5563;
          line-height: 1.6;
          margin-bottom: 0.5rem;
        }
      `}</style>
        </div>
    )
}
