/**
 * INCONCLUSIVE State Component (Phase 6)
 * 
 * Treats INCONCLUSIVE as a valid outcome, not a failure
 */

import React from 'react'

interface InconclusiveStateProps {
    reason: string
    additionalReasons?: string[]
    suggestions?: string[]
}

export function InconclusiveState({
    reason,
    additionalReasons = [],
    suggestions = []
}: InconclusiveStateProps) {
    const defaultSuggestions = [
        'Upload a clearer image or CSV file',
        'Try a different file format',
        'Ensure your file contains a complete table with headers'
    ]

    const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions

    return (
        <div className="inconclusive-state">
            <div className="inconclusive-state__header">
                <div className="inconclusive-state__icon">⚪</div>
                <h2 className="inconclusive-state__title">Analysis Inconclusive</h2>
            </div>

            <div className="inconclusive-state__section">
                <h3 className="inconclusive-state__section-title">Why analysis didn't proceed:</h3>
                <ul className="inconclusive-state__list">
                    <li>{reason}</li>
                    {additionalReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                    ))}
                </ul>
            </div>

            <div className="inconclusive-state__section inconclusive-state__section--highlight">
                <h3 className="inconclusive-state__section-title">What this means:</h3>
                <ul className="inconclusive-state__list inconclusive-state__list--checkmarks">
                    <li>No assumptions were made</li>
                    <li>No incorrect conclusions were drawn</li>
                    <li>The system chose caution over guessing</li>
                </ul>
            </div>

            <div className="inconclusive-state__section">
                <h3 className="inconclusive-state__section-title">What you can do:</h3>
                <ul className="inconclusive-state__list">
                    {displaySuggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                    ))}
                </ul>
            </div>

            <style jsx>{`
        .inconclusive-state {
          background: white;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          padding: 2rem;
          max-width: 600px;
          margin: 2rem auto;
        }

        .inconclusive-state__header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #E5E7EB;
        }

        .inconclusive-state__icon {
          font-size: 2.5rem;
        }

        .inconclusive-state__title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1F2937;
          margin: 0;
        }

        .inconclusive-state__section {
          margin-bottom: 1.5rem;
        }

        .inconclusive-state__section--highlight {
          background: #F0FDF4;
          border-left: 3px solid #10B981;
          padding: 1rem;
          border-radius: 4px;
        }

        .inconclusive-state__section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.75rem 0;
        }

        .inconclusive-state__list {
          margin: 0;
          padding-left: 1.5rem;
          list-style-type: disc;
        }

        .inconclusive-state__list--checkmarks {
          list-style-type: none;
          padding-left: 0;
        }

        .inconclusive-state__list--checkmarks li::before {
          content: '✓ ';
          color: #10B981;
          font-weight: bold;
          margin-right: 0.5rem;
        }

        .inconclusive-state__list li {
          color: #4B5563;
          line-height: 1.6;
          margin-bottom: 0.5rem;
        }
      `}</style>
        </div>
    )
}
