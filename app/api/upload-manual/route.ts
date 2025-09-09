import { type NextRequest, NextResponse } from "next/server"
import { operationsManualProcessor } from "@/lib/operations-manual"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "Manual name is required" }, { status: 400 })
    }

    // Read file content
    const text = await file.text()

    if (!text.trim()) {
      return NextResponse.json({ error: "File appears to be empty" }, { status: 400 })
    }

    // Generate unique ID
    const manualId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Process the manual
    const processedManual = await operationsManualProcessor.processManualText(manualId, name, text)

    return NextResponse.json({
      success: true,
      manual: processedManual,
    })
  } catch (error) {
    console.error("Manual upload error:", error)
    return NextResponse.json({ error: "Failed to process manual" }, { status: 500 })
  }
}
