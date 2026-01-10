/**
 * Type Definitions for Logic-Driven Bias Detection System
 * 
 * Central type definitions used across all bias detection modules
 */

// ============================================================================
// Data Extraction Types
// ============================================================================

export interface ExtractionResult {
    success: boolean
    dataType: 'structured' | 'text'
    structuredData?: ParsedDataset
    textData?: string
    extractionMethod: 'csv' | 'pdf-table' | 'vision-ocr' | 'gdrive' | 'text-fallback'
    confidence: number  // 0.0 - 1.0
    warnings: string[]
}

export interface ParsedDataset {
    headers: string[]
    rows: any[][]
    rowCount: number
    columnCount: number
    metadata: {
        source: string
        extractedAt: string
        quality: 'high' | 'medium' | 'low'
    }
}

export interface VisionExtractionResult {
    success: boolean
    dataset?: ParsedDataset
    confidence: number  // 0.0 - 1.0
    quality: QualityAssessment
    warnings: string[]
    shouldProceedWithFairness: boolean  // Based on confidence gate
}

export interface QualityAssessment {
    structuralIntegrity: number  // 0.0 - 1.0
    dataCompleteness: number     // 0.0 - 1.0
    headerClarity: number        // 0.0 - 1.0
    typeConsistency: number      // 0.0 - 1.0
    overallConfidence: number    // Weighted average
    issues: string[]             // Specific problems detected
}

// ============================================================================
// Column Metadata & Role Types
// ============================================================================

export interface ColumnMetadata {
    name: string
    index: number
    type: 'numeric' | 'categorical'
    uniqueCount: number
    missingCount: number
    sampleValues: any[]
}

export type RoleType = 'sensitive' | 'merit' | 'outcome' | 'ignored'

// Phase1Roles: Record of column name to role type
export type Phase1Roles = Record<string, RoleType>

export interface ColumnRole {
    columnName: string
    role: RoleType
    confidence: number
    reason: string
}

export interface RoleSuggestion {
    columnName: string
    suggestedRole: RoleType
    alternatives: RoleType[]
    reasoning: string
    confidence: number
}

export interface UserRoleConfirmation {
    confirmedRoles: ColumnRole[]
    userModified: boolean
    timestamp: string
}

export interface ConfirmedRoles {
    roles: ColumnRole[]
    isValid: boolean
    validationErrors: string[]
    sensitiveColumns: string[]
    meritColumns: string[]
    outcomeColumns: string[]
}

// ============================================================================
// Fairness Grouping Types
// ============================================================================

export interface ComparableGroup {
    groupKey: string
    records: GroupRecord[]
    meritAttributes: Record<string, any>
    outcomeDistribution: OutcomeDistribution
}

export interface GroupRecord {
    rowIndex: number
    sensitiveAttributes: Record<string, any>
    outcome: any
}

export interface OutcomeDistribution {
    bySensitiveAttribute: Map<string, Map<any, number>>
    totalRecords: number
}

// ============================================================================
// Bias Detection Types
// ============================================================================

export interface DisparityReport {
    groupKey: string
    hasBias: boolean
    affectedSensitiveAttributes: string[]
    evidence: DisparityEvidence[]
}

export interface DisparityEvidence {
    sensitiveAttribute: string
    sensitiveValue: any
    outcomeRate: number
    comparisonOutcomeRate: number
    magnitude: number
    sampleSize: number
}

export interface BiasMetrics {
    totalGroups: number
    biasedGroups: number
    biasRatio: number
    averageMagnitude: number
    frequencyBySensitiveAttribute: Map<string, number>
    consistencyScore: number
    groupingMetadata?: {
        grouping_method: 'distance-based'
        epsilon_used: number
        epsilon_attempts: number
        merit_dimensions_used: number
        normalization: 'z-score'
        group_count: number
        max_epsilon_reached: boolean
    }
}

export interface AggregatedEvidence {
    strongestDisparities: DisparityEvidence[]
    affectedAttributes: string[]
    totalRecordsAffected: number
}

// ============================================================================
// Severity Classification Types
// ============================================================================

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'INCONCLUSIVE'

export interface SeverityConfig {
    lowThreshold: number
    mediumThreshold: number
    minSampleSize: number
    requireConsistency: boolean
}

export interface SeverityResult {
    level: SeverityLevel
    biasRatio: number
    reasoning: string[]
    confidence: number
}

// ============================================================================
// Session/Cache Types
// ============================================================================

export interface PendingAnalysis {
    dataset: ParsedDataset
    extractionResult: ExtractionResult
    roleSuggestions: RoleSuggestion[]
    userId?: string
    expiresAt: number
    createdAt: number
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface BiasDetectionConfig {
    lowThreshold: number
    mediumThreshold: number
    minSampleSize: number
    numericTolerance: number
    confidenceThresholds: {
        high: number
        medium: number
        low: number
    }
}

// ============================================================================
// Google Drive Types
// ============================================================================

export interface DriveFileInfo {
    fileId: string
    fileName?: string
    mimeType?: string
}

export interface FileMetadata {
    name: string
    mimeType: string
    size: number
}
