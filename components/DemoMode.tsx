/**
 * Demo Mode Component (Phase 6)
 * 
 * Clean presentation mode for judges and demos
 */

import React, { useState } from 'react'

interface DemoModeProps {
    children: React.ReactNode
}

export function DemoMode({ children }: DemoModeProps) {
    const [isDemoMode, setIsDemoMode] = useState(false)

    return (
        <div className={`demo-mode ${isDemoMode ? 'demo-mode--active' : ''}`}>
            <div className="demo-mode__toggle-container">
                <button
                    className="demo-mode__toggle"
                    onClick={() => setIsDemoMode(!isDemoMode)}
                >
                    {isDemoMode ? '📊 Demo Mode: ON' : '📊 Demo Mode: OFF'}
                </button>
            </div>

            {isDemoMode && (
                <div className="demo-mode__principles">
                    <h3 className="demo-mode__principles-title">Core Principles</h3>
                    <div className="demo-mode__principles-grid">
                        <div className="demo-mode__principle">
                            <div className="demo-mode__principle-icon">✓</div>
                            <div className="demo-mode__principle-content">
                                <div className="demo-mode__principle-title">No Guessing</div>
                                <div className="demo-mode__principle-text">Confidence gates enforced</div>
                            </div>
                        </div>

                        <div className="demo-mode__principle">
                            <div className="demo-mode__principle-icon">✓</div>
                            <div className="demo-mode__principle-content">
                                <div className="demo-mode__principle-title">Human Confirmation</div>
                                <div className="demo-mode__principle-text">Roles must be verified</div>
                            </div>
                        </div>

                        <div className="demo-mode__principle">
                            <div className="demo-mode__principle-icon">✓</div>
                            <div className="demo-mode__principle-content">
                                <div className="demo-mode__principle-title">Explainable Results</div>
                                <div className="demo-mode__principle-text">Clear reasoning provided</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`demo-mode__content ${isDemoMode ? 'demo-mode__content--demo' : ''}`}>
                {children}
            </div>

            <style jsx>{`
        .demo-mode {
          min-height: 100vh;
        }

        .demo-mode__toggle-container {
          position: sticky;
          top: 0;
          z-index: 100;
          background: white;
          border-bottom: 1px solid #E5E7EB;
          padding: 1rem;
          display: flex;
          justify-content: flex-end;
        }

        .demo-mode__toggle {
          background: #3B82F6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .demo-mode__toggle:hover {
          background: #2563EB;
        }

        .demo-mode--active .demo-mode__toggle {
          background: #10B981;
        }

        .demo-mode--active .demo-mode__toggle:hover {
          background: #059669;
        }

        .demo-mode__principles {
          background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
          color: white;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .demo-mode__principles-title {
          font-size: 1.5rem;
          font-weight: 700;
          text-align: center;
          margin: 0 0 1.5rem 0;
        }

        .demo-mode__principles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .demo-mode__principle {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 1.5rem;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .demo-mode__principle-icon {
          font-size: 1.5rem;
          font-weight: bold;
        }

        .demo-mode__principle-content {
          flex: 1;
        }

        .demo-mode__principle-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .demo-mode__principle-text {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .demo-mode__content {
          padding: 1rem;
        }

        .demo-mode__content--demo {
          font-size: 1.1em;
          max-width: 1200px;
          margin: 0 auto;
        }

        .demo-mode__content--demo h1,
        .demo-mode__content--demo h2,
        .demo-mode__content--demo h3 {
          font-size: 1.2em;
        }

        @media (max-width: 768px) {
          .demo-mode__principles-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    )
}
