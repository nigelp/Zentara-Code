import * as vscode from "vscode"

export function fromVscodeLocation(location: vscode.Location): {
	uri: string
	range: { start: { line: number; character: number }; end: { line: number; character: number } }
	preview: string
} {
	return {
		uri: location.uri.toString(),
		range: {
			start: { line: location.range.start.line, character: location.range.start.character },
			end: { line: location.range.end.line, character: location.range.end.character },
		},
		preview: "", // preview is a required field
	}
}

export function getActiveEditor(): vscode.TextEditor | undefined {
	return vscode.window.activeTextEditor
}

export function getDocumentUri(document: vscode.TextDocument): string {
	return document.uri.toString()
}

/**
 * A safe stringifier that handles circular references.
 * @param obj The object to stringify.
 * @returns A JSON string representation of the object.
 */
export function stringifySafe(obj: any): string {
	const cache = new Set()
	return JSON.stringify(
		obj,
		(key, value) => {
			if (typeof value === "object" && value !== null) {
				if (cache.has(value)) {
					// Circular reference found, discard key
					return
				}
				// Store value in our collection
				cache.add(value)
			}
			return value
		},
		2,
	)
}
