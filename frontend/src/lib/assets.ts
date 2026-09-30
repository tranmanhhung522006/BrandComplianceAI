import type {
  BackendAsset,
  BackendAssetVersion,
} from "@/types/dashboard"

export function getLatestVersion(
  asset: BackendAsset,
): BackendAssetVersion | null {
  if (!asset.versions?.length) {
    return null
  }

  return asset.versions.reduce(
    (latest, current) =>
      current.versionNumber > latest.versionNumber
        ? current
        : latest,
  )
}