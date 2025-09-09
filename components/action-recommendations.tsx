"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Clock, User, Play, CheckSquare, AlertTriangle, Lightbulb, Target, TrendingUp } from "lucide-react"
import type { ActionRecommendation, RecommendationContext } from "@/lib/action-recommender"

interface ActionRecommendationsProps {
  context: RecommendationContext
  onActionExecuted?: (recommendationId: string, stepId: string) => void
}

export function ActionRecommendations({ context, onActionExecuted }: ActionRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<ActionRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [executingSteps, setExecutingSteps] = useState<Set<string>>(new Set())
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null)

  useEffect(() => {
    generateRecommendations()
  }, [context])

  const generateRecommendations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/generate-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ context }),
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations || [])
        if (data.recommendations?.length > 0) {
          setSelectedRecommendation(data.recommendations[0].id)
        }
      }
    } catch (error) {
      console.error("Error generating recommendations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const executeStep = async (recommendationId: string, stepId: string) => {
    setExecutingSteps((prev) => new Set(prev).add(stepId))

    try {
      const response = await fetch("/api/execute-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId: context.ticket.id,
          recommendationId,
          stepId,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setCompletedSteps((prev) => new Set(prev).add(stepId))
          onActionExecuted?.(recommendationId, stepId)
        }
      }
    } catch (error) {
      console.error("Error executing step:", error)
    } finally {
      setExecutingSteps((prev) => {
        const newSet = new Set(prev)
        newSet.delete(stepId)
        return newSet
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "immediate":
        return <AlertTriangle className="h-4 w-4" />
      case "escalation":
        return <TrendingUp className="h-4 w-4" />
      case "resolution":
        return <Target className="h-4 w-4" />
      case "information":
        return <Lightbulb className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case "communication":
        return <User className="h-4 w-4" />
      case "investigation":
        return <Lightbulb className="h-4 w-4" />
      case "escalation":
        return <TrendingUp className="h-4 w-4" />
      case "documentation":
        return <CheckSquare className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generating AI Recommendations...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">
              Analyzing ticket and generating personalized action plans...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Recommendations Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to generate recommendations for this ticket.</p>
          <Button onClick={generateRecommendations} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const selectedRec = recommendations.find((r) => r.id === selectedRecommendation)

  return (
    <div className="space-y-6">
      {/* Recommendation Selector */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Action Plans</CardTitle>
          <CardDescription>Choose the best approach based on sentiment analysis and company procedures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <Card
                key={rec.id}
                className={`cursor-pointer transition-all ${
                  selectedRecommendation === rec.id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedRecommendation(rec.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(rec.category)}
                      <CardTitle className="text-sm">{rec.title}</CardTitle>
                    </div>
                    <Badge className={getPriorityColor(rec.priority)} variant="secondary">
                      {rec.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{rec.estimatedTime}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="h-3 w-3" />
                      <span>{Math.round(rec.confidence * 100)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Recommendation Details */}
      {selectedRec && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  {getCategoryIcon(selectedRec.category)}
                  <span>{selectedRec.title}</span>
                </CardTitle>
                <CardDescription className="mt-2">{selectedRec.description}</CardDescription>
              </div>
              <div className="text-right space-y-2">
                <Badge className={getPriorityColor(selectedRec.priority)}>{selectedRec.priority} priority</Badge>
                <div className="text-sm text-muted-foreground">
                  Confidence: {Math.round(selectedRec.confidence * 100)}%
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reasoning */}
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>AI Reasoning:</strong> {selectedRec.reasoning}
              </AlertDescription>
            </Alert>

            {/* Quick Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium">Estimated Time</div>
                <div className="text-muted-foreground">{selectedRec.estimatedTime}</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">Required Skills</div>
                <div className="text-muted-foreground">{selectedRec.requiredSkills.join(", ")}</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">Success Metrics</div>
                <div className="text-muted-foreground">{selectedRec.successMetrics.join(", ")}</div>
              </div>
            </div>

            <Separator />

            {/* Action Steps */}
            <div className="space-y-4">
              <h3 className="font-semibold">Action Steps</h3>
              <div className="space-y-3">
                {selectedRec.steps.map((step, index) => {
                  const isCompleted = completedSteps.has(step.id)
                  const isExecuting = executingSteps.has(step.id)
                  const canExecute = index === 0 || completedSteps.has(selectedRec.steps[index - 1].id)

                  return (
                    <Card key={step.id} className={`${isCompleted ? "bg-accent/20" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-accent" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center text-xs">
                                {step.order}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium flex items-center space-x-2">
                                  {getStepIcon(step.type)}
                                  <span>{step.title}</span>
                                  {step.isRequired && (
                                    <Badge variant="outline" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="text-xs text-muted-foreground">{step.estimatedDuration}</div>
                                {!isCompleted && canExecute && (
                                  <Button
                                    size="sm"
                                    onClick={() => executeStep(selectedRec.id, step.id)}
                                    disabled={isExecuting}
                                  >
                                    {isExecuting ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
                                        Executing...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3 mr-1" />
                                        Execute
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                            {step.resources && step.resources.length > 0 && (
                              <div className="text-xs">
                                <span className="font-medium">Resources: </span>
                                <span className="text-muted-foreground">{step.resources.join(", ")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>
                  {completedSteps.size} of {selectedRec.steps.length} steps completed
                </span>
              </div>
              <Progress value={(completedSteps.size / selectedRec.steps.length) * 100} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
