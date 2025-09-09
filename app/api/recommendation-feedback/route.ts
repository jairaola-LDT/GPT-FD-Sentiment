import { type NextRequest, NextResponse } from "next/server"
import { actionRecommendationEngine } from "@/lib/action-recommender"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticketId, recommendationId, feedback } = body

    if (!ticketId || !recommendationId || !feedback) {
      return NextResponse.json({ error: "ticketId, recommendationId, and feedback are required" }, { status: 400 })
    }

    const success = await actionRecommendationEngine.updateRecommendationFeedback(ticketId, recommendationId, feedback)

    return NextResponse.json({ success })
  } catch (error) {
    console.error("Recommendation feedback error:", error)
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 })
  }
}
