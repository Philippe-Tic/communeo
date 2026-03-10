import { useOfficialDocumentCounts } from '@/hooks/api/useOfficialDocuments'
import { useSite } from '@/hooks/api/useSites'
import { useUserSite } from '@/hooks/useUser'
import { computeComplianceItems, type ComplianceCategoryGroup, type ComplianceItem } from '@/lib/compliance'

export interface UseComplianceReturn {
  items: ComplianceItem[]
  score: number
  byCategory: ComplianceCategoryGroup[]
  nextAction: ComplianceItem | null
  criticalMissing: number
  populationUnknown: boolean
  isLoading: boolean
  error: boolean
  refetch: () => void
}

export function useCompliance(): UseComplianceReturn {
  const { site: userSite } = useUserSite()
  const documentId = userSite?.documentId || ''

  const { data: site, isLoading: siteLoading, error: siteError, refetch } = useSite(documentId)
  const { data: documentCounts, isLoading: docsLoading, error: docsError } = useOfficialDocumentCounts()

  const isLoading = siteLoading || docsLoading
  const error = !!(siteError || docsError)

  if (isLoading || error || !site) {
    return {
      items: [],
      score: 0,
      byCategory: [],
      nextAction: null,
      criticalMissing: 0,
      populationUnknown: false,
      isLoading,
      error,
      refetch,
    }
  }

  const result = computeComplianceItems(site, documentCounts ?? new Map())

  return {
    ...result,
    isLoading,
    error,
    refetch,
  }
}
