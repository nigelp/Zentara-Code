# NotebookEdit Tool

## Original Function Definition

```json
{
  "description": "Completely replaces the contents of a specific cell in a Jupyter notebook (.ipynb file) with new source. Jupyter notebooks are interactive documents that combine code, text, and visualizations, commonly used for data analysis and scientific computing. The notebook_path parameter must be an absolute path, not a relative path. The cell_number is 0-indexed. Use edit_mode=insert to add a new cell at the index specified by cell_number. Use edit_mode=delete to delete the cell at the index specified by cell_number.",
  "name": "NotebookEdit",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "cell_id": {
        "description": "The ID of the cell to edit. When inserting a new cell, the new cell will be inserted after the cell with this ID, or at the beginning if not specified.",
        "type": "string"
      },
      "cell_type": {
        "description": "The type of the cell (code or markdown). If not specified, it defaults to the current cell type. If using edit_mode=insert, this is required.",
        "enum": ["code", "markdown"],
        "type": "string"
      },
      "edit_mode": {
        "description": "The type of edit to make (replace, insert, delete). Defaults to replace.",
        "enum": ["replace", "insert", "delete"],
        "type": "string"
      },
      "new_source": {
        "description": "The new source for the cell",
        "type": "string"
      },
      "notebook_path": {
        "description": "The absolute path to the Jupyter notebook file to edit (must be absolute, not relative)",
        "type": "string"
      }
    },
    "required": ["notebook_path", "new_source"],
    "type": "object"
  }
}
```

## Detailed Description

The NotebookEdit tool modifies Jupyter notebook cells by replacing content, inserting new cells, or deleting existing cells. It works with cell IDs for precise targeting and supports both code and markdown cell types.

## Key Features

1. **Three edit modes**: Replace, insert, or delete cells
2. **Cell type support**: Code and markdown cells
3. **ID-based targeting**: Use cell IDs for precision
4. **Position control**: Insert after specific cells
5. **Complete replacement**: Replaces entire cell content

## Edit Modes

### Replace Mode (Default)
Replaces the entire content of an existing cell:
```typescript
await NotebookEdit({
  notebook_path: "/project/analysis.ipynb",
  cell_id: "cell-12345",
  new_source: "import pandas as pd\ndf = pd.read_csv('data.csv')"
})
```

### Insert Mode
Adds a new cell after the specified cell:
```typescript
await NotebookEdit({
  notebook_path: "/project/notebook.ipynb",
  edit_mode: "insert",
  cell_id: "cell-12345",  // Insert after this cell
  cell_type: "code",      // Required for insert
  new_source: "# New analysis section\nresults = analyze_data(df)"
})
```

### Delete Mode
Removes a cell from the notebook:
```typescript
await NotebookEdit({
  notebook_path: "/project/notebook.ipynb",
  edit_mode: "delete",
  cell_id: "cell-12345",
  new_source: ""  // Required but ignored for delete
})
```

## Examples

### Updating Code Cells
```typescript
// Replace data loading code
await NotebookEdit({
  notebook_path: "/analysis/sales_report.ipynb",
  cell_id: "data-loading-cell",
  new_source: `import pandas as pd
import numpy as np

# Load updated dataset
df = pd.read_csv('sales_2024.csv')
df['date'] = pd.to_datetime(df['date'])
print(f"Loaded {len(df)} records")`
})

// Update model parameters
await NotebookEdit({
  notebook_path: "/ml/experiment.ipynb",
  cell_id: "model-config-cell",
  new_source: `# Model configuration
learning_rate = 0.001
batch_size = 64
epochs = 50
dropout_rate = 0.3`
})
```

### Updating Markdown Cells
```typescript
// Update notebook title
await NotebookEdit({
  notebook_path: "/docs/tutorial.ipynb",
  cell_id: "title-cell",
  new_source: `# Data Science Tutorial - Updated

## Overview
This tutorial covers advanced pandas operations.

Last updated: ${new Date().toISOString().split('T')[0]}`
})

// Add analysis conclusions
await NotebookEdit({
  notebook_path: "/analysis/results.ipynb",
  cell_id: "conclusions-cell",
  new_source: `## Conclusions

Based on our analysis:
1. Sales increased 15% year-over-year
2. Northern region shows highest growth
3. Product A remains the top seller

### Recommendations
- Increase inventory for Q4
- Focus marketing on Northern region`
})
```

### Inserting New Cells
```typescript
// Add new import cell at beginning
await NotebookEdit({
  notebook_path: "/project/analysis.ipynb",
  edit_mode: "insert",
  cell_type: "code",
  new_source: `# Standard imports
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_style('whitegrid')`
})

// Insert markdown explanation
await NotebookEdit({
  notebook_path: "/ml/model.ipynb",
  edit_mode: "insert",
  cell_id: "preprocessing-cell",
  cell_type: "markdown",
  new_source: `## Data Preprocessing

The following cell applies these transformations:
- Remove missing values
- Normalize numerical features
- Encode categorical variables`
})

// Add visualization cell
await NotebookEdit({
  notebook_path: "/analysis/eda.ipynb",
  edit_mode: "insert",
  cell_id: "data-load-cell",
  cell_type: "code",
  new_source: `# Visualize data distribution
plt.figure(figsize=(12, 6))
plt.subplot(1, 2, 1)
df['sales'].hist(bins=50)
plt.title('Sales Distribution')

plt.subplot(1, 2, 2)
df.groupby('category')['sales'].sum().plot(kind='bar')
plt.title('Sales by Category')
plt.tight_layout()
plt.show()`
})
```

### Deleting Cells
```typescript
// Remove outdated analysis
await NotebookEdit({
  notebook_path: "/analysis/report.ipynb",
  edit_mode: "delete",
  cell_id: "old-analysis-cell",
  new_source: ""  // Required but not used
})

// Clean up debug cells
await NotebookEdit({
  notebook_path: "/project/final.ipynb",
  edit_mode: "delete",
  cell_id: "debug-cell-1",
  new_source: ""
})
```

## Common Patterns

### Updating Data Sources
```typescript
// First read to find data loading cell
await NotebookRead({
  notebook_path: "/analysis/monthly_report.ipynb"
})

// Update to new data file
await NotebookEdit({
  notebook_path: "/analysis/monthly_report.ipynb",
  cell_id: "load-data-cell",
  new_source: `# Load current month data
df = pd.read_csv('data/2024_03_sales.csv')
print(f"Processing {df.shape[0]} transactions for March 2024")`
})
```

### Refactoring Notebook Structure
```typescript
// Add section headers
await NotebookEdit({
  notebook_path: "/notebooks/analysis.ipynb",
  edit_mode: "insert",
  cell_id: "imports-cell",
  cell_type: "markdown",
  new_source: "## 1. Data Loading and Preprocessing"
})

// Move code to functions
await NotebookEdit({
  notebook_path: "/notebooks/analysis.ipynb",
  cell_id: "processing-cell",
  new_source: `def preprocess_data(df):
    """Clean and prepare data for analysis"""
    df = df.dropna()
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    return df

# Apply preprocessing
df_clean = preprocess_data(df)`
})
```

### Adding Documentation
```typescript
// Document model architecture
await NotebookEdit({
  notebook_path: "/ml/deep_learning.ipynb",
  edit_mode: "insert",
  cell_id: "model-definition-cell",
  cell_type: "markdown",
  new_source: `### Model Architecture

The neural network consists of:
- Input layer: 784 neurons (28x28 images)
- Hidden layer 1: 512 neurons with ReLU activation
- Dropout: 0.2
- Hidden layer 2: 256 neurons with ReLU activation
- Dropout: 0.2
- Output layer: 10 neurons with softmax activation`
})
```

## Workflow Examples

### Complete Analysis Update
```typescript
// 1. Read notebook structure
const notebook = await NotebookRead({
  notebook_path: "/analysis/quarterly_report.ipynb"
})

// 2. Update data source
await NotebookEdit({
  notebook_path: "/analysis/quarterly_report.ipynb",
  cell_id: "data-cell",
  new_source: "df = pd.read_csv('data/Q1_2024.csv')"
})

// 3. Update analysis period
await NotebookEdit({
  notebook_path: "/analysis/quarterly_report.ipynb",
  cell_id: "title-cell",
  new_source: "# Q1 2024 Sales Analysis"
})

// 4. Add new visualization
await NotebookEdit({
  notebook_path: "/analysis/quarterly_report.ipynb",
  edit_mode: "insert",
  cell_id: "summary-stats-cell",
  cell_type: "code",
  new_source: `# Trend analysis
df.groupby('month')['revenue'].sum().plot(kind='line', marker='o')
plt.title('Q1 2024 Revenue Trend')
plt.show()`
})
```

### Converting Script to Notebook
```typescript
// Create initial structure
await NotebookEdit({
  notebook_path: "/notebooks/new_analysis.ipynb",
  edit_mode: "insert",
  cell_type: "markdown",
  new_source: "# Data Analysis Notebook\n\nConverted from analysis.py"
})

// Add code cells from script
await NotebookEdit({
  notebook_path: "/notebooks/new_analysis.ipynb",
  edit_mode: "insert",
  cell_type: "code",
  new_source: `import pandas as pd
import numpy as np
from datetime import datetime`
})
```

## Best Practices

1. **Read first**: Always use NotebookRead to understand structure
2. **Use cell IDs**: More reliable than positions
3. **Preserve cell types**: Maintain code/markdown distinction
4. **Test incrementally**: Edit one cell, verify, continue
5. **Document changes**: Add markdown cells explaining updates

## Error Handling

### Common Errors
```typescript
// Cell ID not found
await NotebookEdit({
  notebook_path: "/notebook.ipynb",
  cell_id: "nonexistent-id",
  new_source: "..."
})
// Error: Cell not found

// Missing cell_type for insert
await NotebookEdit({
  notebook_path: "/notebook.ipynb",
  edit_mode: "insert",
  new_source: "...",
  // cell_type missing!
})
// Error: cell_type required for insert

// Invalid notebook
await NotebookEdit({
  notebook_path: "/file.py",  // Not a notebook
  new_source: "..."
})
// Error: Not a valid notebook file
```

## Important Notes

- Cell IDs are more reliable than numeric positions
- new_source is required even for delete operations
- Inserting at beginning: omit cell_id
- Cell outputs are preserved (not affected by source edits)
- Changes are immediate and permanent
- Always use absolute paths