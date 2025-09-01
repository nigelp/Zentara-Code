import * as vscode from "vscode"
import { FindUsagesParams, Reference } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function formatFindUsagesTable(references: Reference[]): string {
  const header = "URI | RANGE | PREVIEW | EOL"
  const rows = references.map(ref => {
    const uri = ref.uri || ""
    const range = ref.range ? `${ref.range.start.line}:${ref.range.start.character}-${ref.range.end.line}:${ref.range.end.character}` : ""
    const preview = ref.preview ? ref.preview.replace(/\n/g, "\\n").replace(/\|/g, "\\|").substring(0, 200) : ""
    return `${uri} | ${range} | ${preview} | <<<`
  })
  return [header, ...rows].join("\n")
}

async function getPreview(uri: vscode.Uri, line: number): Promise<string | undefined> {
	try {
		const document = await vscode.workspace.openTextDocument(uri)
		const lines: string[] = []

		// Add previous line if it exists
		if (line > 0) {
			lines.push(document.lineAt(line - 1).text)
		}

		// Add current line
		lines.push(document.lineAt(line).text)

		// Add next line if it exists
		if (line < document.lineCount - 1) {
			lines.push(document.lineAt(line + 1).text)
		}

		return lines.join("\n")
	} catch (error) {
		console.warn(`Failed to get preview for ${uri.toString()}: ${error}`)
		return undefined
	}
}

const PREVIEW_THRESHOLD = 50
const MAX_REFERENCES_THRESHOLD = 500

export async function findUsages(params: FindUsagesParams): Promise<string> {
	try {
		// Validate parameters using Zod schema
		const { FindUsagesParamsSchema } = await import("../types");
		const validationResult = FindUsagesParamsSchema.safeParse(params);
		
		if (!validationResult.success) {
			const errorMessage = validationResult.error.errors.map(e => e.message).join(", ");
			const error = new Error(`Parameter validation failed: ${errorMessage}`);
			// Ensure the error is thrown and not caught by the outer try-catch
			throw error;
		}
		
		// Use validated parameters
		const validatedParams = validationResult.data;
		
		// Handle both legacy format and new format
		let uri: string;
		let line: number | undefined;
		let character: number | undefined;
		let symbolName: string | undefined;
		let context: any;
		
		// Check if this is the legacy format (has textDocument and position)
		if ('textDocument' in validatedParams && 'position' in validatedParams) {
			const legacyParams = validatedParams as any;
			uri = legacyParams.textDocument.uri;
			line = legacyParams.position.line;
			character = legacyParams.position.character;
			context = legacyParams.context;
		} else {
			// New flattened format
			const newParams = validatedParams as any;
			uri = newParams.uri;
			line = newParams.line;
			character = newParams.character;
			symbolName = newParams.symbolName;
			context = newParams.context;
		}
		
		// Use getSymbol helper to resolve symbol location
		const symbolResult = await getSymbol({
			uri: uri,
			line: line,
			character: character,
			symbolName: symbolName
		});

		if (!symbolResult.symbol) {
			console.warn('Failed to find symbol:', symbolResult.error);
			// Check if the error is related to file not found
			if (symbolResult.error && (symbolResult.error.includes('cannot open') || symbolResult.error.includes('ENOENT') || symbolResult.error.includes('Unable to resolve'))) {
				return "URI | RANGE | PREVIEW | EOL\n |  | File not found | <<<";
			}
			return "URI | RANGE | PREVIEW | EOL\n |  | Symbol not found | <<<";
		}

		// Handle multiple matches case
		if (!symbolResult.isUnique && symbolResult.alternatives) {
			console.warn(`Multiple symbols found with name '${symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
		}

		// Get the position from the resolved symbol
		const vscodeUri = vscode.Uri.parse(uri);
		const position = new vscode.Position(
			symbolResult.symbol.selectionRange.start.line,
			symbolResult.symbol.selectionRange.start.character
		);

		// Check if file exists
		try {
			await vscode.workspace.fs.stat(vscodeUri);
		} catch (error) {
			console.error(`Error: File not found - ${vscodeUri.fsPath}`);
			return "URI | RANGE | PREVIEW | EOL\n |  | File not found | <<<";
		}

		const locations = await vscode.commands.executeCommand<vscode.Location[]>(
			"vscode.executeReferenceProvider",
			vscodeUri,
			position,
		);

		if (!locations) {
			return "URI | RANGE | PREVIEW | EOL\n |  | No references found | <<<";
		}

		if (locations.length >= MAX_REFERENCES_THRESHOLD) {
			const references: Reference[] = locations.slice(0, 5).map((location) => ({
				uri: location.uri.toString(),
				range: {
					start: {
						line: location.range.start.line,
						character: location.range.start.character,
					},
					end: {
						line: location.range.end.line,
						character: location.range.end.character,
					},
				},
			}));
			references.push({
				uri: "",
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 0 },
				},
				preview: `Too many references found (${locations.length}). Return samples of the first five references. Please try a more specific query.`,
			});
			return formatFindUsagesTable(references);
		}

		const references: Reference[] = [];
		const shouldIncludePreview = locations.length < PREVIEW_THRESHOLD;

		for (const location of locations) {
			const reference: Reference = {
				uri: location.uri.toString(),
				range: {
					start: {
						line: location.range.start.line,
						character: location.range.start.character,
					},
					end: {
						line: location.range.end.line,
						character: location.range.end.character,
					},
				},
			};

			if (shouldIncludePreview) {
				reference.preview = await getPreview(location.uri, location.range.start.line);
			}

			references.push(reference);
		}

		return formatFindUsagesTable(references);
	} catch (error) {
		console.error('findUsages failed:', error);
		
		// Re-throw parameter validation errors so tests can catch them
		if (error instanceof Error && error.message.includes('Parameter validation failed')) {
			throw error;
		}
		
		// Check if it's a file not found error
		if (error instanceof Error && (error.message.includes('ENOENT') || error.message.includes('File not found'))) {
			return "URI | RANGE | PREVIEW | EOL\n |  | File not found | <<<";
		}
		
		return "URI | RANGE | PREVIEW | EOL\n |  | Error occurred during symbol lookup | <<<";
	}
}
