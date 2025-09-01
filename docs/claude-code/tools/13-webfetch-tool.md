# WebFetch Tool

## Original Function Definition

```json
{
  "description": "\n- Fetches content from a specified URL and processes it using an AI model\n- Takes a URL and a prompt as input\n- Fetches the URL content, converts HTML to markdown\n- Processes the content with the prompt using a small, fast model\n- Returns the model's response about the content\n- Use this tool when you need to retrieve and analyze web content\n\nUsage notes:\n  - IMPORTANT: If an MCP-provided web fetch tool is available, prefer using that tool instead of this one, as it may have fewer restrictions. All MCP-provided tools start with \"mcp__\".\n  - The URL must be a fully-formed valid URL\n  - HTTP URLs will be automatically upgraded to HTTPS\n  - The prompt should describe what information you want to extract from the page\n  - This tool is read-only and does not modify any files\n  - Results may be summarized if the content is very large\n  - Includes a self-cleaning 15-minute cache for faster responses when repeatedly accessing the same URL\n  - When a URL redirects to a different host, the tool will inform you and provide the redirect URL in a special format. You should then make a new WebFetch request with the redirect URL to fetch the content.\n",
  "name": "WebFetch",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "prompt": {
        "description": "The prompt to run on the fetched content",
        "type": "string"
      },
      "url": {
        "description": "The URL to fetch content from",
        "format": "uri",
        "type": "string"
      }
    },
    "required": ["url", "prompt"],
    "type": "object"
  }
}
```

## Detailed Description

The WebFetch tool retrieves web content and analyzes it using AI. It fetches the URL, converts HTML to markdown for better readability, then processes the content with your prompt using a fast AI model. The tool includes caching and handles redirects intelligently.

## Key Features

1. **AI-powered analysis**: Processes content with custom prompts
2. **HTML to Markdown**: Converts web pages for readability
3. **Smart caching**: 15-minute cache for repeated access
4. **Redirect handling**: Detects and reports cross-host redirects
5. **HTTPS upgrade**: Automatically upgrades HTTP to HTTPS
6. **Content summarization**: Handles large pages gracefully

## Usage Guidelines

### When to Use WebFetch
- Retrieving documentation from websites
- Analyzing web page content
- Extracting specific information from URLs
- Checking current information from web sources
- Understanding API documentation

### MCP Tool Priority
Always check for MCP web fetch tools first:
```typescript
// If available, prefer:
await mcp__browser__fetch({ ... })

// Over:
await WebFetch({ ... })
```

## Examples

### Fetching Documentation
```typescript
// Get specific information from docs
await WebFetch({
  url: "https://docs.python.org/3/library/asyncio.html",
  prompt: "What are the main components of Python's asyncio library and how do they work together?"
})

// Extract API details
await WebFetch({
  url: "https://api.example.com/docs",
  prompt: "List all available endpoints with their HTTP methods and required parameters"
})
```

### Analyzing Web Content
```typescript
// Understand a blog post
await WebFetch({
  url: "https://blog.example.com/react-hooks-guide",
  prompt: "Summarize the key concepts about React hooks explained in this article"
})

// Extract technical specifications
await WebFetch({
  url: "https://example.com/product/specs",
  prompt: "What are the technical specifications and system requirements?"
})
```

### Extracting Structured Data
```typescript
// Get pricing information
await WebFetch({
  url: "https://service.com/pricing",
  prompt: "Extract all pricing tiers with their features and costs in a structured format"
})

// Find contact information
await WebFetch({
  url: "https://company.com/about",
  prompt: "Find and list all contact information including emails, phone numbers, and addresses"
})
```

### Following Redirects
```typescript
// Initial request
const result = await WebFetch({
  url: "http://example.com/page",
  prompt: "Get the main content"
})

// If redirected to different host:
// "URL redirects to different host: https://newdomain.com/page"

// Make new request with redirect URL
await WebFetch({
  url: "https://newdomain.com/page",
  prompt: "Get the main content"
})
```

## Common Use Cases

### API Documentation
```typescript
// Understanding API authentication
await WebFetch({
  url: "https://api.service.com/docs/auth",
  prompt: "How does authentication work? What are the required headers and token format?"
})

// Finding rate limits
await WebFetch({
  url: "https://api.github.com/docs",
  prompt: "What are the API rate limits and how are they calculated?"
})
```

### Library Documentation
```typescript
// Get installation instructions
await WebFetch({
  url: "https://library.com/docs/install",
  prompt: "What are all the ways to install this library? Include package managers and manual installation."
})

// Find configuration options
await WebFetch({
  url: "https://framework.com/config",
  prompt: "List all configuration options with their types, defaults, and descriptions"
})
```

### Technical Articles
```typescript
// Extract code examples
await WebFetch({
  url: "https://tutorial.com/websockets",
  prompt: "Extract all code examples related to WebSocket implementation"
})

// Understand concepts
await WebFetch({
  url: "https://blog.com/microservices",
  prompt: "What are the main advantages and disadvantages of microservices discussed?"
})
```

### Product Information
```typescript
// Compare features
await WebFetch({
  url: "https://product.com/comparison",
  prompt: "Create a comparison table of all products with their features and prices"
})

// Get requirements
await WebFetch({
  url: "https://software.com/requirements",
  prompt: "What are the minimum and recommended system requirements?"
})
```

## Prompt Writing Tips

### Be Specific
```typescript
// Good - Specific request
await WebFetch({
  url: "https://docs.service.com/api",
  prompt: "List all REST endpoints that deal with user management, including their HTTP methods, required parameters, and authentication requirements"
})

// Less effective - Too vague
await WebFetch({
  url: "https://docs.service.com/api",
  prompt: "Tell me about the API"
})
```

### Request Structured Output
```typescript
// Request formatted data
await WebFetch({
  url: "https://framework.com/components",
  prompt: "List all UI components in a table format with columns: Component Name, Purpose, Main Props, Example Usage"
})

// Request step-by-step instructions
await WebFetch({
  url: "https://guide.com/setup",
  prompt: "Extract the setup process as a numbered list of steps, including any prerequisites"
})
```

### Focus on Extraction
```typescript
// Extract specific elements
await WebFetch({
  url: "https://changelog.com/v2.0",
  prompt: "Extract all breaking changes and migration steps for version 2.0"
})

// Find specific information
await WebFetch({
  url: "https://docs.com/errors",
  prompt: "Find error code E1234 and explain what causes it and how to fix it"
})
```

## Handling Large Content

The tool automatically handles large pages:
- Content may be summarized if very large
- Focus your prompt on specific sections
- Be prepared for condensed responses

```typescript
// For large pages, be specific
await WebFetch({
  url: "https://docs.com/complete-guide",
  prompt: "Focus on the 'Authentication' section and explain the OAuth2 flow"
})
```

## Cache Behavior

- Cache duration: 15 minutes
- Same URL + prompt = cached response
- Different prompt = new analysis
- Cache self-cleans (no manual clearing needed)

```typescript
// First call - fetches from web
await WebFetch({
  url: "https://api.com/docs",
  prompt: "List all endpoints"
})

// Within 15 minutes - returns cached
await WebFetch({
  url: "https://api.com/docs",
  prompt: "List all endpoints"
})

// Different prompt - new analysis (but may use cached content)
await WebFetch({
  url: "https://api.com/docs",
  prompt: "Explain authentication"
})
```

## Error Handling

### Common Errors
```typescript
// Invalid URL
await WebFetch({
  url: "not-a-url",
  prompt: "..."
})
// Error: Invalid URL format

// Unreachable site
await WebFetch({
  url: "https://nonexistent-domain-12345.com",
  prompt: "..."
})
// Error: Failed to fetch

// Access denied
await WebFetch({
  url: "https://private.com/protected",
  prompt: "..."
})
// Error: 403 Forbidden
```

## Best Practices

1. **Check for MCP tools first**: They may have fewer restrictions
2. **Write specific prompts**: Get better results with focused questions
3. **Handle redirects**: Make new request when redirected to different host
4. **Use caching wisely**: Reuse prompts for cached responses
5. **Expect summarization**: Large pages may be condensed

## Integration Examples

### With File Operations
```typescript
// Fetch docs and save locally
const content = await WebFetch({
  url: "https://api.com/reference",
  prompt: "Extract all endpoint documentation in markdown format"
})

await Write({
  file_path: "/project/docs/api-reference.md",
  content: content.result
})
```

### With Code Generation
```typescript
// Get examples and create implementation
const examples = await WebFetch({
  url: "https://library.com/examples",
  prompt: "Extract the authentication example code"
})

// Use examples to guide implementation
await Write({
  file_path: "/project/src/auth.js",
  content: `// Based on library examples
${examples.code}`
})
```

## Important Notes

- Read-only tool (cannot submit forms or modify)
- Requires fully-formed URLs with protocol
- HTTP automatically upgraded to HTTPS
- Results depend on AI model interpretation
- May not access JavaScript-rendered content
- Respects robots.txt and rate limits