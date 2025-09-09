import { type NextRequest, NextResponse } from "next/server"
import { actionRecommendationEngine } from "@/lib/action-recommender"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticketId, recommendationId, stepId } = body

    if (!ticketId || !recommendationId || !stepId) {
      return NextResponse.json({ error: "ticketId, recommendationId, and stepId are required" }, { status: 400 })
    }

    const result = await actionRecommendationEngine.executeAction(ticketId, recommendationId, stepId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Execute action error:", error)
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 })
  }
}
