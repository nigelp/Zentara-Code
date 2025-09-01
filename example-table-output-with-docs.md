# Example Table Format Output with JSDoc Documentation

This example shows how the compact table format captures rich documentation information from JSDoc comments and function signatures.

## Source Code with JSDoc:

```typescript
/**
 * Calculates the area of a rectangle
 * @param width The width of the rectangle
 * @param height The height of the rectangle
 * @returns The area as a number
 */
function calculateArea(width: number, height: number): number {
  return width * height;
}

/**
 * Represents a user in the system
 */
class User {
  /**
   * The user's unique identifier
   */
  private id: string;
  
  /**
   * Creates a new User instance
   * @param id The unique identifier for the user
   * @param name The display name for the user
   */
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}
```

## Resulting Table Format Output:

```
NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL
calculateArea | 12 | 0:0-8:1 | 0:9-0:22 |  | function calculateArea(width: number, height: number): number - Calculates the area of a rectangle @param width The width of the rectangle @param height The height of the rectangle @returns The area as a number | <<<
User | 5 | 10:0-25:1 | 10:6-10:10 |  | class User - Represents a user in the system | <<<
id | 8 | 14:2-14:23 | 14:10-14:12 | User | (property) User.id: string - The user's unique identifier | <<<
constructor | 9 | 20:2-23:3 | 20:2-20:13 | User | constructor User(id: string, name: string): User - Creates a new User instance @param id The unique identifier for the user @param name The display name for the user | <<<
```

## Key Features Demonstrated:

1. **Complete JSDoc Integration**: Full documentation strings are captured in the HOVER_INFO column
2. **Parameter Documentation**: @param tags are included with descriptions
3. **Return Type Documentation**: @returns information is preserved
4. **Class Documentation**: Class-level comments are captured
5. **Property Documentation**: Individual property documentation is included
6. **Type Information**: Full TypeScript type signatures are preserved
7. **Hierarchical Context**: Parent-child relationships are maintained via the PARENT column

## Token Efficiency:

- **Traditional JSON**: ~800-1200 tokens for the same information
- **Table Format**: ~200-300 tokens (60-75% reduction)
- **Rich Documentation**: All JSDoc information preserved in compact format