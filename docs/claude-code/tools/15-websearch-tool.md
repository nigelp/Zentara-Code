# WebSearch Tool

## Original Function Definition

```json
{
  "description": "\n- Allows Claude to search the web and use the results to inform responses\n- Provides up-to-date information for current events and recent data\n- Returns search result information formatted as search result blocks\n- Use this tool for accessing information beyond Claude's knowledge cutoff\n- Searches are performed automatically within a single API call\n\nUsage notes:\n  - Domain filtering is supported to include or block specific websites\n  - Web search is only available in the US\n  - Account for \"Today's date\" in <env>. For example, if <env> says \"Today's date: 2025-07-01\", and the user wants the latest docs, do not use 2024 in the search query. Use 2025.\n",
  "name": "WebSearch",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "allowed_domains": {
        "description": "Only include search results from these domains",
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "blocked_domains": {
        "description": "Never include search results from these domains",
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "query": {
        "description": "The search query to use",
        "minLength": 2,
        "type": "string"
      }
    },
    "required": ["query"],
    "type": "object"
  }
}
```

## Detailed Description

The WebSearch tool allows searching the web for current information beyond the knowledge cutoff. It returns formatted search results that can be used to provide up-to-date information. The tool supports domain filtering to focus or exclude specific websites.

## Key Features

1. **Current information**: Access recent events and data
2. **Domain filtering**: Include or exclude specific sites
3. **Automatic execution**: Single API call performs search
4. **US availability**: Currently limited to US region
5. **Date awareness**: Considers current date for relevance

## Usage Guidelines

### When to Use WebSearch
- Finding current information (news, updates)
- Checking latest documentation versions
- Researching recent developments
- Verifying current best practices
- Finding recent tutorials or guides

### Date Awareness
Always check the current date from environment:
```typescript
// If environment shows: Today's date: 2025-07-12
// Search for current year content:
await WebSearch({
  query: "React 19 features 2025"  // Use current year
})

// Not:
await WebSearch({
  query: "React 19 features 2024"  // Don't use past year
})
```

## Examples

### Basic Searches
```typescript
// Search for current information
await WebSearch({
  query: "latest TypeScript 5.5 features"
})

// Search for recent news
await WebSearch({
  query: "Node.js security vulnerability July 2025"
})

// Search for best practices
await WebSearch({
  query: "React Server Components best practices 2025"
})
```

### Domain-Specific Searches
```typescript
// Search only official docs
await WebSearch({
  query: "useEffect cleanup function",
  allowed_domains: ["react.dev", "reactjs.org"]
})

// Search Stack Overflow only
await WebSearch({
  query: "Cannot find module error typescript",
  allowed_domains: ["stackoverflow.com"]
})

// Search excluding certain sites
await WebSearch({
  query: "python async await tutorial",
  blocked_domains: ["w3schools.com"]
})
```

### Technical Documentation
```typescript
// Find latest API documentation
await WebSearch({
  query: "OpenAI GPT-4 API documentation 2025",
  allowed_domains: ["platform.openai.com", "openai.com"]
})

// Search for framework updates
await WebSearch({
  query: "Next.js 14 app router migration guide",
  allowed_domains: ["nextjs.org"]
})

// Find security advisories
await WebSearch({
  query: "npm security advisories July 2025",
  allowed_domains: ["npmjs.com", "github.com"]
})
```

### Problem Solving
```typescript
// Search for error solutions
await WebSearch({
  query: "TypeError: Cannot read property of undefined React 18",
  allowed_domains: ["stackoverflow.com", "github.com"]
})

// Find compatibility information
await WebSearch({
  query: "Node.js 20 compatibility with Express 5"
})

// Research implementation approaches
await WebSearch({
  query: "implementing OAuth2 with PKCE flow 2025 tutorial"
})
```

## Domain Filtering Strategies

### Focusing on Official Sources
```typescript
// Python official documentation
await WebSearch({
  query: "python asyncio concurrent tasks",
  allowed_domains: ["docs.python.org", "python.org"]
})

// AWS official resources
await WebSearch({
  query: "AWS Lambda cold start optimization",
  allowed_domains: ["aws.amazon.com", "docs.aws.amazon.com"]
})
```

### Community Resources
```typescript
// Developer forums and Q&A
await WebSearch({
  query: "webpack Module Federation troubleshooting",
  allowed_domains: [
    "stackoverflow.com",
    "dev.to",
    "medium.com",
    "reddit.com"
  ]
})
```

### Excluding Outdated Sources
```typescript
// Avoid outdated tutorials
await WebSearch({
  query: "React hooks tutorial 2025",
  blocked_domains: [
    "w3schools.com",
    "tutorialspoint.com"
  ]
})
```

## Common Use Cases

### Latest Framework Features
```typescript
// React latest features
await WebSearch({
  query: "React 19 concurrent features 2025"
})

// Vue.js updates
await WebSearch({
  query: "Vue 3.4 script setup improvements"
})

// Angular news
await WebSearch({
  query: "Angular 17 signals API guide"
})
```

### Security and Vulnerabilities
```typescript
// Check for vulnerabilities
await WebSearch({
  query: "Log4j vulnerability patches 2025"
})

// Security best practices
await WebSearch({
  query: "JWT security best practices 2025"
})

// Recent breaches or issues
await WebSearch({
  query: "npm package security incident July 2025"
})
```

### Performance Optimization
```typescript
// Latest optimization techniques
await WebSearch({
  query: "web vitals optimization strategies 2025"
})

// Framework-specific performance
await WebSearch({
  query: "Next.js 14 performance optimization techniques"
})
```

### API and Integration Updates
```typescript
// API changes
await WebSearch({
  query: "Stripe API v2025 migration guide"
})

// Integration guides
await WebSearch({
  query: "integrating ChatGPT API with Node.js 2025"
})
```

## Search Query Best Practices

### Be Specific
```typescript
// Good - Specific query
await WebSearch({
  query: "React useCallback dependency array infinite loop fix"
})

// Less effective - Too broad
await WebSearch({
  query: "React problems"
})
```

### Include Context
```typescript
// Include version numbers
await WebSearch({
  query: "TypeScript 5.5 satisfies operator examples"
})

// Include technology stack
await WebSearch({
  query: "Next.js 14 with Prisma ORM setup guide"
})
```

### Use Current Year
```typescript
// Include current year for recent content
await WebSearch({
  query: "best VS Code extensions for React development 2025"
})

// For evolving topics
await WebSearch({
  query: "microservices vs monolith debate 2025"
})
```

## Output Format

Search results are returned as formatted blocks containing:
- Title of the result
- URL
- Snippet/description
- Relevance information

Results can be used to:
- Provide current information
- Verify latest best practices
- Find recent solutions
- Update outdated knowledge

## Limitations

1. **US only**: Currently available only in US region
2. **No direct access**: Returns search results, not page content
3. **Result count**: Limited number of results returned
4. **No personalization**: Generic search results
5. **Text only**: No image or video search

## Integration Examples

### With WebFetch
```typescript
// Search for documentation
const results = await WebSearch({
  query: "React Server Components documentation",
  allowed_domains: ["react.dev"]
})

// Then fetch specific page
await WebFetch({
  url: results[0].url,
  prompt: "Extract the key concepts and examples"
})
```

### Research Workflow
```typescript
// 1. Search for current best practices
const practices = await WebSearch({
  query: "Node.js production deployment best practices 2025"
})

// 2. Search for tools
const tools = await WebSearch({
  query: "Node.js monitoring tools comparison 2025"
})

// 3. Search for case studies
const cases = await WebSearch({
  query: "Node.js scaling case studies 2025"
})
```

## Important Notes

- Always consider current date from environment
- US availability restriction
- Use domain filtering for quality control
- Combine with WebFetch for detailed content
- Results reflect current web content
- No access to paywalled content