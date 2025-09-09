"use client"

import { useState, useCallback } from "react"
import type { ActionRecommendation, RecommendationContext } from "@/lib/action-recommender"

export function useActionRecommendations() {
  const [recommendations, setRecommendations] = useState<ActionRecommendation[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateRecommendations = useCallback(
    async (context: RecommendationContext): Promise<ActionRecommendation[] | null> => {
      setIsGenerating(true)
      setError(null)

      try {
        const response = await fetch("/api/generate-recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ context }),
        })

        if (!response.ok) {
          throw new Error("Failed to generate recommendations")
        }

        const data = await response.json()
        setRecommendations(data.recommendations || [])
        return data.recommendations || []
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
        setError(errorMessage)
        return null
      } finally {
        setIsGenerating(false)
      }
    },
    [],
  )

  const executeAction = useCallback(async (ticketId: string, recommendationId: string, stepId: string) => {
    try {
      const response = await fetch("/api/execute-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticketId, recommendationId, stepId }),
      })

      if (!response.ok) {
        throw new Error("Failed to execute action")
      }

      return await response.json()
    } catch (err) {
      console.error("Error executing action:", err)
      return { success: false, message: "Failed to execute action" }
    }
  }, [])

  const submitFeedback = useCallback(
    async (
      ticketId: string,
      recommendationId: string,
      feedback: {
        effectiveness: number
        timeToComplete?: string
        customerSatisfaction?: number
        notes?: string
      },
    ) => {
      try {
        const response = await fetch("/api/recommendation-feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ticketId, recommendationId, feedback }),
        })

        return response.ok
      } catch (err) {
        console.error("Error submitting feedback:", err)
        return false
      }
    },
    [],
  )

  return {
    recommendations,
    generateRecommendations,
    executeAction,
    submitFeedback,
    isGenerating,
    error,
  }
}
