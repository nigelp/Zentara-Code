# NotebookRead Tool

## Original Function Definition

```json
{
  "description": "Reads a Jupyter notebook (.ipynb file) and returns all of the cells with their outputs. Jupyter notebooks are interactive documents that combine code, text, and visualizations, commonly used for data analysis and scientific computing. The notebook_path parameter must be an absolute path, not a relative path.",
  "name": "NotebookRead",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "cell_id": {
        "description": "The ID of a specific cell to read. If not provided, all cells will be read.",
        "type": "string"
      },
      "notebook_path": {
        "description": "The absolute path to the Jupyter notebook file to read (must be absolute, not relative)",
        "type": "string"
      }
    },
    "required": ["notebook_path"],
    "type": "object"
  }
}
```

## Detailed Description

The NotebookRead tool reads Jupyter notebook files (.ipynb), providing access to all cells including their source code, outputs, and metadata. It can read entire notebooks or specific cells by ID. This tool is essential for working with data science and scientific computing projects.

## Key Features

1. **Complete notebook access**: Reads all cell types (code, markdown, raw)
2. **Cell outputs included**: Shows execution results, plots, and errors
3. **Specific cell reading**: Can target individual cells by ID
4. **Metadata preserved**: Includes cell metadata and execution counts
5. **Output visualization**: Displays plots and rich outputs

## Jupyter Notebook Structure

Notebooks contain:
- **Code cells**: Python/R/Julia code with outputs
- **Markdown cells**: Formatted text, equations, links
- **Raw cells**: Unformatted text
- **Outputs**: Results, plots, tables, errors
- **Metadata**: Kernel info, cell metadata

## Examples

### Reading Entire Notebook
```typescript
// Read complete notebook
await NotebookRead({
  notebook_path: "/home/user/analysis/data_exploration.ipynb"
})

// Returns all cells with:
// - Cell type (code/markdown/raw)
// - Source content
// - Outputs (if any)
// - Execution count
// - Metadata
```

### Reading Specific Cell
```typescript
// Read single cell by ID
await NotebookRead({
  notebook_path: "/home/user/ml_project/model_training.ipynb",
  cell_id: "cell-id-12345"
})

// Returns just that cell's content and outputs
```

### Common Notebook Locations
```typescript
// Data science project
await NotebookRead({
  notebook_path: "/project/notebooks/exploratory_data_analysis.ipynb"
})

// Machine learning experiment
await NotebookRead({
  notebook_path: "/ml/experiments/model_comparison.ipynb"
})

// Tutorial or documentation
await NotebookRead({
  notebook_path: "/docs/tutorials/getting_started.ipynb"
})
```

## Output Format

### Code Cell Example
```
Cell[1] (code):
```python
import pandas as pd
import matplotlib.pyplot as plt

data = pd.read_csv('sales.csv')
data.head()
```

Output:
   Date  Sales  Region
0  2023-01  1000    North
1  2023-02  1200    South
2  2023-03  1100    East
3  2023-04  1300    West
4  2023-05  1250    North

### Markdown Cell Example
```
Cell[2] (markdown):
# Data Analysis Report

This notebook analyzes quarterly sales data across regions.

## Key Findings
- Northern region shows highest growth
- Q4 typically strongest quarter
```

### Code Cell with Plot
```
Cell[3] (code):
```python
plt.figure(figsize=(10, 6))
data.groupby('Region')['Sales'].sum().plot(kind='bar')
plt.title('Total Sales by Region')
plt.show()
```

Output:
[Plot displayed]
```

## Common Use Cases

### Data Analysis Review
```typescript
// Review data analysis notebook
const notebook = await NotebookRead({
  notebook_path: "/project/analysis/customer_segmentation.ipynb"
})

// Check for:
// - Data loading and preprocessing steps
// - Analysis methodology
// - Visualization outputs
// - Conclusions in markdown cells
```

### Model Training Inspection
```typescript
// Examine ML model training
await NotebookRead({
  notebook_path: "/ml/notebooks/neural_network_training.ipynb"
})

// Look for:
// - Model architecture definition
// - Training loops and metrics
// - Loss/accuracy plots
// - Evaluation results
```

### Error Debugging
```typescript
// Find error in notebook execution
await NotebookRead({
  notebook_path: "/notebooks/failed_analysis.ipynb"
})

// Check for:
// - Error tracebacks in outputs
// - Last successfully executed cell
// - Variable states before error
```

## Working with Notebook Outputs

### Text Outputs
- Print statements
- DataFrame displays
- Model summaries
- Execution results

### Visual Outputs
- Matplotlib/Seaborn plots
- Plotly interactive charts
- Images and diagrams
- LaTeX equations

### Error Outputs
- Exception tracebacks
- Warning messages
- Stderr output
- Kernel errors

## Integration with Other Tools

### Read Notebook Then Edit
```typescript
// First read to understand structure
await NotebookRead({
  notebook_path: "/project/notebook.ipynb"
})

// Then edit specific cell
await NotebookEdit({
  notebook_path: "/project/notebook.ipynb",
  cell_id: "cell-123",
  new_source: "# Updated code\nimport numpy as np"
})
```

### Search Notebooks
```typescript
// Find all notebooks
const notebooks = await Glob({
  pattern: "**/*.ipynb"
})

// Read each to find specific content
for (const nb of notebooks) {
  const content = await NotebookRead({
    notebook_path: nb
  })
  // Analyze content...
}
```

## Cell Identification

### Finding Cell IDs
Cells have unique IDs that appear in the notebook structure:
- Look for `"id": "unique-cell-id"` in cell metadata
- IDs are typically UUID-like strings
- Use when you need to edit specific cells

### Cell Types
```typescript
// Code cell structure
{
  "cell_type": "code",
  "execution_count": 5,
  "source": ["print('Hello')"],
  "outputs": [...]
}

// Markdown cell structure
{
  "cell_type": "markdown",
  "source": ["# Title\nContent..."]
}
```

## Best Practices

1. **Read before editing**: Always read notebook first
2. **Check execution order**: Note execution counts
3. **Review outputs**: Understand current state
4. **Identify key cells**: Find important analysis sections
5. **Check for errors**: Look for failed executions

## Common Patterns

### Notebook Analysis Workflow
```typescript
// 1. Read entire notebook
const notebook = await NotebookRead({
  notebook_path: "/analysis/report.ipynb"
})

// 2. Identify cells to modify
// Look for cells with specific imports, functions, etc.

// 3. Edit specific cells if needed
await NotebookEdit({
  notebook_path: "/analysis/report.ipynb",
  cell_id: "data-loading-cell",
  new_source: "# Updated data loading\ndf = pd.read_csv('new_data.csv')"
})
```

### Finding Specific Content
```typescript
// Read notebook to find model definition
await NotebookRead({
  notebook_path: "/ml/model.ipynb"
})
// Look for cells containing 'class Model' or 'def train'

// Read to find results
await NotebookRead({
  notebook_path: "/experiments/results.ipynb"
})
// Look for cells with accuracy scores, confusion matrices
```

## Error Handling

### Common Issues
```typescript
// File not found
await NotebookRead({
  notebook_path: "/nonexistent.ipynb"
})
// Error: File not found

// Not a notebook file
await NotebookRead({
  notebook_path: "/project/script.py"
})
// Error: Not a valid notebook file

// Corrupted notebook
await NotebookRead({
  notebook_path: "/broken_notebook.ipynb"
})
// Error: Invalid notebook format
```

## Important Notes

- Always use absolute paths
- Cell IDs are required for NotebookEdit
- Outputs include all execution results
- Large outputs (plots, data) are included
- Notebook format is preserved
- Use for .ipynb files only (not .py files)

## Comparison with Read Tool

| Feature | NotebookRead | Read |
|---------|-------------|------|
| File types | .ipynb only | All text files |
| Shows outputs | Yes | No |
| Cell structure | Preserved | N/A |
| Can target parts | By cell ID | By line range |
| Best for | Notebooks | Source code |