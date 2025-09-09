import { type NextRequest, NextResponse } from "next/server"
import { operationsManualProcessor } from "@/lib/operations-manual"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { manualId, query, ticketContext } = body

    if (!manualId || !query) {
      return NextResponse.json({ error: "Manual ID and query are required" }, { status: 400 })
    }

    const results = await operationsManualProcessor.searchManual(manualId, {
      query,
      ticketContext,
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Manual search error:", error)
    return NextResponse.json({ error: "Failed to search manual" }, { status: 500 })
  }
}
