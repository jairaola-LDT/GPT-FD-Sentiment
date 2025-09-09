import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { SentimentAnalysis } from "@/lib/sentiment-analyzer"

interface SentimentBadgeProps {
  analysis: SentimentAnalysis
  showDetails?: boolean
}

export function SentimentBadge({ analysis, showDetails = false }: SentimentBadgeProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-accent text-accent-foreground"
      case "negative":
        return "bg-destructive text-destructive-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-destructive text-destructive-foreground"
      case "high":
        return "bg-orange-500 text-white"
      case "medium":
        return "bg-yellow-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={getSentimentColor(analysis.sentiment)}>
              {analysis.sentiment} ({Math.round(analysis.score * 100)}%)
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <p>
                <strong>Confidence:</strong> {Math.round(analysis.confidence * 100)}%
              </p>
              <p>
                <strong>Urgency:</strong> {analysis.urgency}
              </p>
              <p>
                <strong>Emotions:</strong> {analysis.emotions.join(", ")}
              </p>
              {analysis.keyPhrases.length > 0 && (
                <p>
                  <strong>Key phrases:</strong> {analysis.keyPhrases.slice(0, 3).join(", ")}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Badge className={getSentimentColor(analysis.sentiment)}>
          {analysis.sentiment} ({Math.round(analysis.score * 100)}%)
        </Badge>
        <Badge className={getUrgencyColor(analysis.urgency)}>{analysis.urgency} urgency</Badge>
      </div>

      <div className="text-sm space-y-1">
        <p>
          <strong>Confidence:</strong> {Math.round(analysis.confidence * 100)}%
        </p>
        <p>
          <strong>Emotions:</strong> {analysis.emotions.join(", ")}
        </p>
        {analysis.keyPhrases.length > 0 && (
          <p>
            <strong>Key phrases:</strong> {analysis.keyPhrases.join(", ")}
          </p>
        )}
      </div>
    </div>
  )
}
