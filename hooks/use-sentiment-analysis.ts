"use client"

import { useState, useCallback } from "react"
import type { SentimentAnalysis } from "@/lib/sentiment-analyzer"

interface TicketForAnalysis {
  id: string
  subject: string
  description: string
}

export function useSentimentAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeBatch = useCallback(
    async (tickets: TicketForAnalysis[]): Promise<Record<string, SentimentAnalysis> | null> => {
      setIsAnalyzing(true)
      setError(null)

      try {
        const response = await fetch("/api/analyze-sentiment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tickets }),
        })

        if (!response.ok) {
          throw new Error("Failed to analyze sentiment")
        }

        const data = await response.json()
        return data.results
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
        setError(errorMessage)
        return null
      } finally {
        setIsAnalyzing(false)
      }
    },
    [],
  )

  const analyzeSingle = useCallback(
    async (subject: string, description: string, customerHistory?: string): Promise<SentimentAnalysis | null> => {
      setIsAnalyzing(true)
      setError(null)

      try {
        const response = await fetch("/api/analyze-single-ticket", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subject, description, customerHistory }),
        })

        if (!response.ok) {
          throw new Error("Failed to analyze sentiment")
        }

        const data = await response.json()
        return data.analysis
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
        setError(errorMessage)
        return null
      } finally {
        setIsAnalyzing(false)
      }
    },
    [],
  )

  return {
    analyzeBatch,
    analyzeSingle,
    isAnalyzing,
    error,
  }
}
