/**
 * Inserts multiple groups of elements at specified indices in an array
 * @param original Array to insert into, split by lines
 * @param insertGroups Array of groups to insert, each with an index and elements to insert.
 *                     If index is -1, the elements will be appended to the end of the array.
 * @returns New array with all insertions applied
 */
export interface InsertGroup {
	index: number
	elements: string[]
}

export function insertGroups(original: string[], insertGroups: InsertGroup[]): string[] {
	// Add validation for input parameters
	if (!original || !Array.isArray(original)) {
		throw new Error("insertGroups: original array is invalid or undefined")
	}
	
	if (!insertGroups || !Array.isArray(insertGroups)) {
		throw new Error("insertGroups: insertGroups array is invalid or undefined")
	}

	// Handle groups with index -1 separately and sort remaining groups by index
	const appendGroups = insertGroups.filter((group) => group.index === -1)
	const normalGroups = insertGroups.filter((group) => group.index !== -1).sort((a, b) => a.index - b.index)

	// Validate indices for normal groups
	for (const group of normalGroups) {
		if (group.index < 0) {
			throw new Error(`insertGroups: Invalid negative index: ${group.index}`)
		}
		if (group.index > original.length) {
			throw new Error(`insertGroups: Index ${group.index} exceeds array length ${original.length}`)
		}
		if (!group.elements || !Array.isArray(group.elements)) {
			throw new Error(`insertGroups: Invalid elements array for index ${group.index}`)
		}
	}

	let result: string[] = []
	let lastIndex = 0

	normalGroups.forEach(({ index, elements }) => {
		// Add elements from original array up to insertion point
		const sliceEnd = Math.min(index, original.length)
		result.push(...original.slice(lastIndex, sliceEnd))
		// Add the group of elements
		result.push(...elements)
		lastIndex = index
	})

	// Add remaining elements from original array
	if (lastIndex < original.length) {
		result.push(...original.slice(lastIndex))
	}

	// Append elements from groups with index -1 at the end
	appendGroups.forEach(({ elements }) => {
		if (elements && Array.isArray(elements)) {
			result.push(...elements)
		}
	})

	return result
}
