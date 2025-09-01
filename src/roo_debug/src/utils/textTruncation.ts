/**
 * Truncates text in the middle if it exceeds the maximum length, preserving the beginning and end.
 * Includes information about how many characters were truncated.
 *
 * @param text - The text to potentially truncate
 * @param maxLength - Maximum allowed length (default: 10000)
 * @returns The original text if under limit, or truncated text with marker indicating removed character count
 */
export function truncateMiddle(text: string | undefined, maxLength: number = 10000): string | undefined {
	if (!text || text.length <= maxLength) {
		return text
	}
	
	const truncatedCount = text.length - maxLength
	const truncationMarker = `--text_truncated_${truncatedCount}_chars--`
	
	// Handle edge case where truncation marker is longer than maxLength
	if (truncationMarker.length >= maxLength) {
		// Use a shorter marker format for very small limits
		const shortMarker = `--truncated_${truncatedCount}--`
		if (shortMarker.length >= maxLength) {
			// If even the short marker is too long, just return the original text truncated
			return text.substring(0, maxLength)
		}
		const availableLength = maxLength - shortMarker.length
		const halfLength = Math.floor(availableLength / 2)
		const remainingLength = availableLength - halfLength
		
		const start = text.substring(0, halfLength)
		const end = text.substring(text.length - remainingLength)
		
		return `${start}${shortMarker}${end}`
	}
	
	const availableLength = maxLength - truncationMarker.length
	const halfLength = Math.floor(availableLength / 2)
	const remainingLength = availableLength - halfLength // Handle odd numbers properly
	
	const start = text.substring(0, halfLength)
	const end = text.substring(text.length - remainingLength)
	
	return `${start}${truncationMarker}${end}`
}