/**
 * Progress Indicator Component (Phase 6)
 * 
 * Shows user which step they're on in the analysis journey
 */

import React from 'react'

export type StepStatus = 'pending' | 'active' | 'completed' | 'skipped'

export interface AnalysisStep {
    id: string
    label: string
    status: StepStatus
}

interface ProgressIndicatorProps {
    currentStep: string
    steps?: AnalysisStep[]
}

const DEFAULT_STEPS: AnalysisStep[] = [
    { id: 'upload', label: 'Upload Data', status: 'pending' },
    { id: 'extraction', label: 'Data Extraction', status: 'pending' },
    { id: 'confirmation', label: 'Role Confirmation', status: 'pending' },
    { id: 'analysis', label: 'Bias Analysis', status: 'pending' },
    { id: 'results', label: 'Results & Explanation', status: 'pending' }
]

export function ProgressIndicator({ currentStep, steps = DEFAULT_STEPS }: ProgressIndicatorProps) {
    // Update step statuses based on current step
    const updatedSteps = steps.map((step, index) => {
        const currentIndex = steps.findIndex(s => s.id === currentStep)

        if (index < currentIndex) {
            return { ...step, status: 'completed' as StepStatus }
        } else if (index === currentIndex) {
            return { ...step, status: 'active' as StepStatus }
        } else {
            return { ...step, status: 'pending' as StepStatus }
        }
    })

    return (
        <div className="progress-indicator">
            <div className="progress-steps">
                {updatedSteps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <div className={`progress-step progress-step--${step.status}`}>
                            <div className="progress-step__circle">
                                {step.status === 'completed' && <span className="progress-step__check">✓</span>}
                                {step.status === 'active' && <span className="progress-step__number">{index + 1}</span>}
                                {step.status === 'pending' && <span className="progress-step__number">{index + 1}</span>}
                            </div>
                            <div className="progress-step__label">{step.label}</div>
                        </div>

                        {index < updatedSteps.length - 1 && (
                            <div className={`progress-connector progress-connector--${step.status === 'completed' ? 'completed' : 'pending'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <style jsx>{`
        .progress-indicator {
          padding: 2rem 0;
          margin-bottom: 2rem;
        }

        .progress-steps {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 800px;
          margin: 0 auto;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .progress-step__circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .progress-step--pending .progress-step__circle {
          background: #E5E7EB;
          color: #9CA3AF;
          border: 2px solid #E5E7EB;
        }

        .progress-step--active .progress-step__circle {
          background: #3B82F6;
          color: white;
          border: 2px solid #3B82F6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .progress-step--completed .progress-step__circle {
          background: #10B981;
          color: white;
          border: 2px solid #10B981;
        }

        .progress-step__label {
          font-size: 0.875rem;
          text-align: center;
          max-width: 100px;
        }

        .progress-step--pending .progress-step__label {
          color: #9CA3AF;
        }

        .progress-step--active .progress-step__label {
          color: #1F2937;
          font-weight: 600;
        }

        .progress-step--completed .progress-step__label {
          color: #6B7280;
        }

        .progress-connector {
          flex: 1;
          height: 2px;
          margin: 0 0.5rem;
          margin-bottom: 2rem;
        }

        .progress-connector--completed {
          background: #10B981;
        }

        .progress-connector--pending {
          background: #E5E7EB;
        }

        @media (max-width: 768px) {
          .progress-steps {
            flex-direction: column;
            gap: 1rem;
          }

          .progress-connector {
            width: 2px;
            height: 20px;
            margin: 0;
          }

          .progress-step__label {
            max-width: none;
          }
        }
      `}</style>
        </div>
    )
}
