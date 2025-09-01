# mcp__ide__executeCode Tool

## Original Function Definition

```json
{
  "description": "Execute python code in the Jupyter kernel for the current notebook file.\n    \n    All code will be executed in the current Jupyter kernel.\n    \n    Avoid declaring variables or modifying the state of the kernel unless the user\n    explicitly asks for it.\n    \n    Any code executed will persist across calls to this tool, unless the kernel\n    has been restarted.",
  "name": "mcp__ide__executeCode",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "code": {
        "description": "The code to be executed on the kernel.",
        "type": "string"
      }
    },
    "required": ["code"],
    "type": "object"
  }
}
```

## Detailed Description

The mcp__ide__executeCode tool executes Python code in the current Jupyter kernel associated with the active notebook. The kernel maintains state between executions, allowing for interactive data analysis and iterative development.

## Key Features

1. **Persistent kernel state**: Variables and imports persist between calls
2. **Interactive execution**: Build upon previous results
3. **Current notebook context**: Executes in active notebook's kernel
4. **Python-specific**: Designed for Python code execution
5. **Stateful environment**: Maintains memory across executions

## Important Considerations

### Kernel State Management
- **Persistent state**: All variables, imports, and definitions persist
- **Avoid side effects**: Don't modify state unless requested
- **Kernel restarts**: Clear all state
- **Memory accumulation**: Be mindful of memory usage

### Best Practices
1. **Read-only by default**: Avoid declaring variables unless needed
2. **Explicit modifications**: Only change state when user requests
3. **Clean execution**: Use temporary variables when possible
4. **Check state**: Be aware of existing variables

## Examples

### Basic Code Execution
```typescript
// Execute simple calculation
await mcp__ide__executeCode({
  code: "2 + 2"
})
// Output: 4

// Import libraries
await mcp__ide__executeCode({
  code: "import pandas as pd\nimport numpy as np"
})
// Libraries now available for subsequent calls
```

### Data Analysis
```typescript
// Load and inspect data
await mcp__ide__executeCode({
  code: `
df = pd.read_csv('sales_data.csv')
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
df.head()
`
})

// Analyze data (using existing df)
await mcp__ide__executeCode({
  code: `
# Summary statistics
df.describe()
`
})
```

### Plotting and Visualization
```typescript
// Create visualization
await mcp__ide__executeCode({
  code: `
import matplotlib.pyplot as plt

plt.figure(figsize=(10, 6))
df['sales'].plot(kind='hist', bins=30)
plt.title('Sales Distribution')
plt.xlabel('Sales Amount')
plt.ylabel('Frequency')
plt.show()
`
})
```

### Machine Learning Workflows
```typescript
// Train a model
await mcp__ide__executeCode({
  code: `
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression

# Prepare data
X = df[['feature1', 'feature2', 'feature3']]
y = df['target']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = LinearRegression()
model.fit(X_train, y_train)

# Evaluate
score = model.score(X_test, y_test)
print(f"R² Score: {score:.4f}")
`
})
```

## Common Use Cases

### Exploratory Data Analysis
```typescript
// Check data types and missing values
await mcp__ide__executeCode({
  code: `
# Data types
print("Data Types:")
print(df.dtypes)
print("\nMissing Values:")
print(df.isnull().sum())
`
})

// Correlation analysis
await mcp__ide__executeCode({
  code: `
# Correlation matrix
correlation = df.select_dtypes(include=[np.number]).corr()
correlation
`
})
```

### Data Preprocessing
```typescript
// Clean data without modifying original
await mcp__ide__executeCode({
  code: `
# Create cleaned copy (avoid modifying original unless asked)
df_clean = df.copy()
df_clean = df_clean.dropna()
df_clean = df_clean[df_clean['price'] > 0]
print(f"Cleaned shape: {df_clean.shape}")
`
})
```

### Quick Calculations
```typescript
// Perform calculations without storing results
await mcp__ide__executeCode({
  code: `
# Calculate metrics without creating variables
print(f"Mean price: ${df['price'].mean():.2f}")
print(f"Total revenue: ${df['revenue'].sum():,.2f}")
print(f"Unique customers: {df['customer_id'].nunique()}")
`
})
```

### Function Definitions
```typescript
// Define reusable functions
await mcp__ide__executeCode({
  code: `
def analyze_segment(data, segment_name):
    """Analyze a data segment"""
    print(f"\n=== {segment_name} Analysis ===")
    print(f"Count: {len(data)}")
    print(f"Revenue: ${data['revenue'].sum():,.2f}")
    print(f"Avg Order: ${data['revenue'].mean():.2f}")
    return data['revenue'].sum()
`
})

// Use the function
await mcp__ide__executeCode({
  code: `
# Analyze different segments
vip_revenue = analyze_segment(df[df['customer_type'] == 'VIP'], 'VIP Customers')
regular_revenue = analyze_segment(df[df['customer_type'] == 'Regular'], 'Regular Customers')
`
})
```

## State Management Examples

### Checking Current State
```typescript
// List current variables
await mcp__ide__executeCode({
  code: `
# Show defined variables (excluding built-ins)
user_vars = [var for var in dir() if not var.startswith('_')]
print("Current variables:", user_vars)
`
})

// Check memory usage
await mcp__ide__executeCode({
  code: `
import sys
for var in ['df', 'model', 'X_train']:
    if var in locals():
        print(f"{var}: {sys.getsizeof(locals()[var]) / 1024 / 1024:.2f} MB")
`
})
```

### Cleaning Up State
```typescript
// Remove specific variables (only if requested)
await mcp__ide__executeCode({
  code: `
# Clean up large objects
if 'large_df' in locals():
    del large_df
    print("Removed large_df from memory")
`
})
```

## Error Handling

### Common Errors
```typescript
// NameError - undefined variable
await mcp__ide__executeCode({
  code: "print(undefined_var)"
})
// Error: NameError: name 'undefined_var' is not defined

// ImportError - missing package
await mcp__ide__executeCode({
  code: "import nonexistent_package"
})
// Error: ImportError: No module named 'nonexistent_package'

// AttributeError
await mcp__ide__executeCode({
  code: "df.nonexistent_method()"
})
// Error: AttributeError: 'DataFrame' object has no attribute 'nonexistent_method'
```

### Safe Execution Patterns
```typescript
// Check before using
await mcp__ide__executeCode({
  code: `
if 'df' in locals():
    print(f"DataFrame shape: {df.shape}")
else:
    print("No dataframe loaded yet")
`
})

// Try-except for safety
await mcp__ide__executeCode({
  code: `
try:
    result = risky_operation()
    print(f"Success: {result}")
except Exception as e:
    print(f"Error occurred: {type(e).__name__}: {e}")
`
})
```

## Integration with Notebook Tools

### After Reading Notebook
```typescript
// Read notebook first
await NotebookRead({
  notebook_path: "/project/analysis.ipynb"
})

// Execute additional analysis
await mcp__ide__executeCode({
  code: `
# Additional analysis on existing data
if 'results' in locals():
    print(f"Improving on existing results: {results}")
    improved_results = results * 1.1
    print(f"Improved: {improved_results}")
`
})
```

### Modifying Notebook Variables
```typescript
// Only modify when explicitly requested
await mcp__ide__executeCode({
  code: `
# User requested to update the model
model.set_params(n_estimators=200)
print("Updated model parameters")
`
})
```

## Best Practices Summary

1. **Default to read-only**: Don't create variables unless needed
2. **Use descriptive prints**: Show what's being calculated
3. **Avoid side effects**: Don't modify existing data unless asked
4. **Check state first**: Verify variables exist before using
5. **Clean temporary vars**: Use local scope or clean up
6. **Document actions**: Print what operations are performed
7. **Handle errors gracefully**: Use try-except when appropriate

## Important Notes

- Executes in current notebook's kernel only
- State persists until kernel restart
- Memory accumulates over time
- Python-specific tool
- Results appear in notebook output
- Side effects should be minimized
- Always consider existing kernel state