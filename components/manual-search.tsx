"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, BookOpen, Tag, TrendingUp } from "lucide-react"
import type { ManualSearchResult } from "@/lib/operations-manual"

interface ManualSearchProps {
  manualId: string
  ticketContext?: {
    subject: string
    description: string
    sentiment: string
    urgency: string
  }
}

export function ManualSearch({ manualId, ticketContext }: ManualSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ManualSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch("/api/search-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manualId,
          query: query.trim(),
          ticketContext,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
      } else {
        console.error("Search failed")
        setResults([])
      }
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsSearching(false)
      setHasSearched(true)
    }
  }, [query, manualId, ticketContext])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground"
      case "medium":
        return "bg-yellow-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="h-5 w-5" />
          <span>Search Operations Manual</span>
        </CardTitle>
        <CardDescription>Find relevant procedures and guidelines from your operations manual</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Search for procedures, policies, or guidelines..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={!query.trim() || isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>

        {ticketContext && (
          <div className="bg-muted rounded-md p-3 text-sm">
            <p className="font-medium mb-1">Ticket Context:</p>
            <p>
              <strong>Subject:</strong> {ticketContext.subject}
            </p>
            <p>
              <strong>Sentiment:</strong> {ticketContext.sentiment} | <strong>Urgency:</strong> {ticketContext.urgency}
            </p>
          </div>
        )}

        {hasSearched && (
          <div className="space-y-4">
            {results.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Search Results</h3>
                  <span className="text-sm text-muted-foreground">
                    {results.length} result{results.length !== 1 ? "s" : ""} found
                  </span>
                </div>

                <div className="space-y-4">
                  {results.map((result, index) => (
                    <Card key={result.section.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center space-x-2">
                              <BookOpen className="h-4 w-4" />
                              <span>{result.section.title}</span>
                            </CardTitle>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{result.section.category}</Badge>
                              <Badge className={getPriorityColor(result.section.priority)}>
                                {result.section.priority} priority
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>{Math.round(result.relevanceScore * 100)}% match</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm leading-relaxed">
                          {result.section.content.length > 300
                            ? `${result.section.content.substring(0, 300)}...`
                            : result.section.content}
                        </p>

                        {result.matchedKeywords.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            <div className="flex flex-wrap gap-1">
                              {result.matchedKeywords.map((keyword, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <Separator />

                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Last updated: {new Date(result.section.lastUpdated).toLocaleDateString()}</span>
                          <Button variant="outline" size="sm">
                            View Full Section
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No relevant procedures found for your search.</p>
                <p className="text-sm">Try different keywords or check if the manual is properly uploaded.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
