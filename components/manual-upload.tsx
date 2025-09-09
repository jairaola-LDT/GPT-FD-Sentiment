"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import type { ProcessedManual } from "@/lib/operations-manual"

interface ManualUploadProps {
  onUploadComplete?: (manual: ProcessedManual) => void
}

export function ManualUpload({ onUploadComplete }: ManualUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [manualName, setManualName] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<ProcessedManual | null>(null)

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0]
      if (selectedFile) {
        setFile(selectedFile)
        setError(null)
        setSuccess(null)

        // Auto-generate name from filename
        if (!manualName) {
          const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "")
          setManualName(nameWithoutExt)
        }
      }
    },
    [manualName],
  )

  const handleUpload = useCallback(async () => {
    if (!file || !manualName.trim()) {
      setError("Please select a file and provide a name")
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", manualName.trim())

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch("/api/upload-manual", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const data = await response.json()
      setSuccess(data.manual)
      onUploadComplete?.(data.manual)

      // Reset form
      setFile(null)
      setManualName("")
      const fileInput = document.getElementById("manual-file") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed"
      setError(errorMessage)
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }, [file, manualName, onUploadComplete])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Upload Operations Manual</span>
        </CardTitle>
        <CardDescription>
          Upload your operations manual to enable AI-powered guidance and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Manual "{success.name}" uploaded successfully! Processed {success.sections.length} sections.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="manual-name">Manual Name</Label>
          <Input
            id="manual-name"
            placeholder="e.g., Customer Service Operations Manual"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            disabled={isUploading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-file">Select File</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="manual-file"
              type="file"
              accept=".txt,.md,.doc,.docx"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex-1"
            />
            {file && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Supported formats: .txt, .md, .doc, .docx (max 10MB)</p>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing manual...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <Button onClick={handleUpload} disabled={!file || !manualName.trim() || isUploading} className="w-full">
          {isUploading ? "Processing..." : "Upload Manual"}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>What happens next:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Your manual will be analyzed and split into searchable sections</li>
            <li>AI will extract key topics, categories, and keywords</li>
            <li>The system will be ready to provide context-aware recommendations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
