/**
 * Explanation Display Component (Phase 6)
 * 
 * Shows Phase 3 explanation with clear sections
 */

import React, { useState } from 'react'

interface ExplanationDisplayProps {
    summary: string
    details: string[]
    limitations: string[]
    examples?: string[]
    source: 'ai' | 'fallback'
}

export function ExplanationDisplay({
    summary,
    details,
    limitations,
    examples,
    source
}: ExplanationDisplayProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>('summary')

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section)
    }

    return (
        <div className="explanation-display">
            <div className="explanation-display__header">
                <h2 className="explanation-display__title">Explanation</h2>
                <span className="explanation-display__source">
                    {source === 'ai' ? '✓ AI-generated' : 'Template-based'}
                </span>
            </div>

            {/* Summary Section */}
            <div className="explanation-section">
                <button
                    className="explanation-section__header"
                    onClick={() => toggleSection('summary')}
                >
                    <span className="explanation-section__icon">📝</span>
                    <span className="explanation-section__title">Summary</span>
                    <span className="explanation-section__toggle">
                        {expandedSection === 'summary' ? '−' : '+'}
                    </span>
                </button>
                {expandedSection === 'summary' && (
                    <div className="explanation-section__content">
                        <p>{summary}</p>
                    </div>
                )}
            </div>

            {/* Evidence Section */}
            <div className="explanation-section">
                <button
                    className="explanation-section__header"
                    onClick={() => toggleSection('evidence')}
                >
                    <span className="explanation-section__icon">📊</span>
                    <span className="explanation-section__title">Evidence</span>
                    <span className="explanation-section__toggle">
                        {expandedSection === 'evidence' ? '−' : '+'}
                    </span>
                </button>
                {expandedSection === 'evidence' && (
                    <div className="explanation-section__content">
                        <ul>
                            {details.map((detail, i) => (
                                <li key={i}>{detail}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Examples Section (if available) */}
            {examples && examples.length > 0 && (
                <div className="explanation-section">
                    <button
                        className="explanation-section__header"
                        onClick={() => toggleSection('examples')}
                    >
                        <span className="explanation-section__icon">💡</span>
                        <span className="explanation-section__title">Examples</span>
                        <span className="explanation-section__toggle">
                            {expandedSection === 'examples' ? '−' : '+'}
                        </span>
                    </button>
                    {expandedSection === 'examples' && (
                        <div className="explanation-section__content">
                            <ul>
                                {examples.map((example, i) => (
                                    <li key={i}>{example}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Limitations Section */}
            <div className="explanation-section">
                <button
                    className="explanation-section__header"
                    onClick={() => toggleSection('limitations')}
                >
                    <span className="explanation-section__icon">⚠️</span>
                    <span className="explanation-section__title">Limitations</span>
                    <span className="explanation-section__toggle">
                        {expandedSection === 'limitations' ? '−' : '+'}
                    </span>
                </button>
                {expandedSection === 'limitations' && (
                    <div className="explanation-section__content">
                        <ul>
                            {limitations.map((limitation, i) => (
                                <li key={i}>{limitation}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <style jsx>{`
        .explanation-display {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1.5rem 0;
        }

        .explanation-display__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #E5E7EB;
        }

        .explanation-display__title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1F2937;
          margin: 0;
        }

        .explanation-display__source {
          font-size: 0.75rem;
          color: #6B7280;
          background: #F3F4F6;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
        }

        .explanation-section {
          margin-bottom: 0.5rem;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          overflow: hidden;
        }

        .explanation-section__header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #F9FAFB;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .explanation-section__header:hover {
          background: #F3F4F6;
        }

        .explanation-section__icon {
          font-size: 1.25rem;
        }

        .explanation-section__title {
          flex: 1;
          text-align: left;
          font-weight: 600;
          color: #374151;
        }

        .explanation-section__toggle {
          font-size: 1.25rem;
          color: #6B7280;
        }

        .explanation-section__content {
          padding: 1rem;
          background: white;
        }

        .explanation-section__content p {
          margin: 0;
          line-height: 1.6;
          color: #374151;
        }

        .explanation-section__content ul {
          margin: 0;
          padding-left: 1.5rem;
          list-style-type: disc;
        }

        .explanation-section__content li {
          color: #4B5563;
          line-height: 1.6;
          margin-bottom: 0.5rem;
        }
      `}</style>
        </div>
    )
}
