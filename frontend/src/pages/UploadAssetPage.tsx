import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type {
  ChangeEvent,
  DragEvent,
} from "react"

import {
  ArrowLeft,
  CheckCircle2,
  FileImage,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react"

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom"

import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  getAssets,
  uploadAssetVersion,
} from "@/services/api"

import type {
  BackendAsset,
} from "@/types/dashboard"

const MAX_FILE_SIZE =
  10 * 1024 * 1024

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]

export function UploadAssetPage() {
  const navigate =
    useNavigate()

  const [searchParams] =
    useSearchParams()

  const requestedAssetId =
    searchParams.get("assetId")

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    )

  const [assets, setAssets] =
    useState<BackendAsset[]>([])

  const [
    selectedAssetId,
    setSelectedAssetId,
  ] =
    useState("")

  const [file, setFile] =
    useState<File | null>(
      null,
    )

  const [
    loadingAssets,
    setLoadingAssets,
  ] =
    useState(true)

  const [uploading, setUploading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(
      null,
    )

  const [
    uploadResult,
    setUploadResult,
  ] =
    useState<{
      versionId: number
      versionNumber: number
      jobId: number
    } | null>(
      null,
    )

  useEffect(() => {
    async function loadAssets() {
      try {
        setLoadingAssets(true)

        const data =
          await getAssets()

        setAssets(data)

        if (requestedAssetId) {
          const requestedAsset =
            data.find(
              (asset) =>
                asset.id ===
                Number(
                  requestedAssetId,
                ),
            )

          if (requestedAsset) {
            setSelectedAssetId(
              String(
                requestedAsset.id,
              ),
            )
          }
        } else if (
          data.length === 1
        ) {
          setSelectedAssetId(
            String(
              data[0].id,
            ),
          )
        }

        setError(null)
      } catch (err) {
        console.error(
          "Failed to load assets:",
          err,
        )

        setError(
          "Unable to load assets from the backend.",
        )
      } finally {
        setLoadingAssets(false)
      }
    }

    void loadAssets()
  }, [requestedAssetId])

  const selectedAsset =
    useMemo(() => {
      return assets.find(
        (asset) =>
          asset.id ===
          Number(
            selectedAssetId,
          ),
      )
    }, [
      assets,
      selectedAssetId,
    ])

  function validateFile(
    selectedFile: File,
  ) {
    if (
      !ALLOWED_TYPES.includes(
        selectedFile.type,
      )
    ) {
      return "Please upload a PNG, JPEG, WEBP, GIF or PDF file."
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      return "File size must be 10 MB or smaller."
    }

    return null
  }

  function selectFile(
    selectedFile: File,
  ) {
    const validationError =
      validateFile(
        selectedFile,
      )

    if (validationError) {
      setFile(null)

      setError(
        validationError,
      )

      return
    }

    setFile(
      selectedFile,
    )

    setError(null)

    setUploadResult(null)
  }

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    selectFile(
      selectedFile,
    )
  }

  function handleDrop(
    event:
      DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault()

    const selectedFile =
      event.dataTransfer
        .files?.[0]

    if (!selectedFile) {
      return
    }

    selectFile(
      selectedFile,
    )
  }

  function clearFile() {
    setFile(null)

    setError(null)

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        ""
    }
  }

  async function handleUpload() {
    if (!selectedAssetId) {
      setError(
        "Please select an asset.",
      )

      return
    }

    if (!file) {
      setError(
        "Please choose an artwork file.",
      )

      return
    }

    try {
      setUploading(true)

      setError(null)

      const result =
        await uploadAssetVersion(
          Number(
            selectedAssetId,
          ),
          file,
        )

      setUploadResult({
        versionId:
          result.version.id,

        versionNumber:
          result.version
            .versionNumber,

        jobId:
          result.scoringJob.id,
      })
    } catch (err) {
      console.error(
        "Upload failed:",
        err,
      )

      if (
        err instanceof Error
      ) {
        setError(
          err.message,
        )
      } else {
        setError(
          "Unable to upload the artwork.",
        )
      }
    } finally {
      setUploading(false)
    }
  }

  if (uploadResult) {
    return (
      <div className="mx-auto max-w-[900px] p-4 sm:p-6 lg:p-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() =>
            navigate(
              "/assets",
            )
          }
        >
          <ArrowLeft className="size-4" />

          Back to assets
        </Button>

        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="p-5 text-center sm:p-8 lg:p-12">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 sm:size-16">
              <CheckCircle2 className="size-7 text-emerald-600 sm:size-8" />
            </div>

            <h2 className="mt-6 break-words text-xl font-semibold tracking-tight sm:text-2xl">
              Artwork uploaded
              successfully
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Version{" "}
              {
                uploadResult
                  .versionNumber
              }{" "}
              has been created and
              queued for automatic AI
              compliance scoring.
            </p>

            <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
              <ResultItem
                label="Version"
                value={`v${uploadResult.versionNumber}`}
              />

              <ResultItem
                label="Version ID"
                value={String(
                  uploadResult
                    .versionId,
                )}
              />

              <ResultItem
                label="Scoring Job"
                value={String(
                  uploadResult.jobId,
                )}
              />
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="w-full rounded-xl sm:w-auto"
                onClick={() => {
                  setUploadResult(
                    null,
                  )

                  clearFile()
                }}
              >
                Upload another
              </Button>

              <Button
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 sm:w-auto"
                onClick={() =>
                  navigate(
                    `/assets/${selectedAssetId}`,
                  )
                }
              >
                View asset
              </Button>
            </div>

            <p className="mx-auto mt-6 max-w-xl text-xs leading-5 text-slate-400">
              AI scoring runs in the
              background. Human review
              remains required before
              approval and release.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() =>
          navigate(-1)
        }
      >
        <ArrowLeft className="size-4" />

        Back
      </Button>

      <section className="mb-8">
        <p className="mb-1 text-sm font-medium text-blue-600">
          Maker workspace
        </p>

        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Upload artwork
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Upload a new version of an
          existing marketing asset.
          The system will automatically
          create a new version and
          queue it for AI compliance
          analysis.
        </p>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 border-slate-200 shadow-sm">
          <CardContent className="min-w-0 p-4 sm:p-6">
            <div className="min-w-0">
              <label
                htmlFor="asset"
                className="text-sm font-semibold"
              >
                Asset
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Choose which asset this
                artwork belongs to.
              </p>

              <select
                id="asset"
                value={
                  selectedAssetId
                }
                disabled={
                  loadingAssets ||
                  uploading
                }
                onChange={(event) => {
                  setSelectedAssetId(
                    event.target.value,
                  )

                  setError(null)

                  setUploadResult(null)
                }}
                className="mt-3 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">
                  {loadingAssets
                    ? "Loading assets..."
                    : "Select asset"}
                </option>

                {assets.map(
                  (asset) => (
                    <option
                      key={
                        asset.id
                      }
                      value={
                        asset.id
                      }
                    >
                      {
                        asset.name
                      }{" "}
                      —{" "}
                      {
                        asset
                          .campaign
                          ?.name
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div
              className="mt-6 min-w-0 rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center transition hover:border-blue-300 hover:bg-blue-50/30 sm:p-8"
              onDragOver={(
                event,
              ) =>
                event.preventDefault()
              }
              onDrop={
                handleDrop
              }
            >
              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                disabled={
                  uploading
                }
                className="hidden"
                onChange={
                  handleFileChange
                }
              />

              {!file ? (
                <>
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50">
                    <UploadCloud className="size-7 text-blue-600" />
                  </div>

                  <h3 className="mt-5 font-semibold">
                    Drop artwork here
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    PNG, JPEG, WEBP, GIF or
                    PDF, up to 10 MB.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 w-full rounded-xl sm:w-auto"
                    disabled={
                      uploading
                    }
                    onClick={() =>
                      fileInputRef
                        .current
                        ?.click()
                    }
                  >
                    Browse file
                  </Button>
                </>
              ) : (
                <div className="flex min-w-0 flex-col gap-4 rounded-xl bg-slate-50 p-4 text-left sm:flex-row sm:items-center">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  {file.type ===
                  "application/pdf" ? (
                  <FileText className="size-6 text-red-600" />
                   ) : (
                  <FileImage className="size-6 text-blue-600" />
                  )}
                </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-semibold sm:truncate">
                      {file.name}
                    </p>

                    <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                      {(
                        file.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                      {" · "}
                      {
                        file.type
                      }
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={
                      uploading
                    }
                    aria-label="Remove selected file"
                    className="self-end shrink-0 sm:self-auto"
                    onClick={
                      clearFile
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loadingAssets &&
              assets.length ===
                0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">
                    No assets available
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Create an asset
                    before uploading an
                    artwork version.
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full border-amber-200 bg-white sm:w-auto"
                    onClick={() =>
                      navigate(
                        "/assets/new",
                      )
                    }
                  >
                    Create asset
                  </Button>
                </div>
              )}

            <div className="mt-6 flex justify-stretch sm:justify-end">
              <Button
                size="lg"
                disabled={
                  uploading ||
                  loadingAssets ||
                  !selectedAssetId ||
                  !file
                }
                onClick={
                  handleUpload
                }
                className="w-full rounded-xl bg-blue-600 px-6 hover:bg-blue-700 sm:w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />

                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" />

                    Upload & analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <h3 className="font-semibold">
                What happens next?
              </h3>

              <div className="mt-5 space-y-5">
                <Step
                  number="1"
                  title="New version"
                  description="The existing asset is never overwritten."
                />

                <Step
                  number="2"
                  title="AI scoring"
                  description="The background worker automatically runs three compliance checks."
                />

                <Step
                  number="3"
                  title="Human review"
                  description="A Checker reviews the AI guidance before approval."
                />

                <Step
                  number="4"
                  title="Admin release"
                  description="Only an approved version can be released."
                />
              </div>
            </CardContent>
          </Card>

          {selectedAsset && (
            <Card className="min-w-0 border-slate-200 bg-slate-950 text-white shadow-sm">
              <CardContent className="min-w-0 p-4 sm:p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Selected asset
                </p>

                <p className="mt-3 break-words font-semibold">
                  {
                    selectedAsset
                      .name
                  }
                </p>

                <p className="mt-1 break-words text-sm text-slate-400">
                  {
                    selectedAsset
                      .campaign
                      ?.name
                  }
                </p>

                <p className="mt-4 text-xs text-slate-400">
                  Existing versions
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {
                    selectedAsset
                      .versions
                      .length
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {requestedAssetId &&
            selectedAsset && (
              <Card className="min-w-0 border-blue-200 bg-blue-50 shadow-none">
                <CardContent className="p-4 sm:p-5">
                  <p className="text-sm font-semibold text-blue-900">
                    New asset selected
                  </p>

                  <p className="mt-2 break-words text-xs leading-5 text-blue-700">
                    You came here from
                    the Create Asset
                    workflow. Uploading
                    now will create
                    Version 1 for{" "}
                    {
                      selectedAsset
                        .name
                    }.
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  )
}

function Step({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
        {number}
      </div>

      <div className="min-w-0">
        <p className="break-words text-sm font-semibold">
          {title}
        </p>

        <p className="mt-1 break-words text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function ResultItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-semibold">
        {value}
      </p>
    </div>
  )
}