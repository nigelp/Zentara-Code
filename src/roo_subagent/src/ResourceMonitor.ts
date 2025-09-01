import { ResourceLimits, ResourceUsage, ResourceSnapshot, ResourceSummary } from "./types"

export class ResourceMonitor {
	private taskId: string
	private limits: ResourceLimits
	private usage: ResourceUsage
	private snapshots: ResourceSnapshot[] = []
	private monitoringInterval?: NodeJS.Timer

	constructor(taskId: string, limits: ResourceLimits) {
		this.taskId = taskId
		this.limits = limits
		this.usage = {
			memory: 0,
			cpu: 0,
			fileOperations: 0,
			toolCalls: 0,
			startTime: Date.now(),
		}
	}

	startMonitoring(): void {
		this.monitoringInterval = setInterval(() => {
			this.takeSnapshot()
		}, 1000) // Every second
	}

	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval as any)
		}
	}

	async executeWithMonitoring<T>(fn: () => Promise<T>): Promise<T> {
		const startMemory = process.memoryUsage()
		const startCpu = process.cpuUsage()

		try {
			const result = await fn()

			const endMemory = process.memoryUsage()
			const endCpu = process.cpuUsage()

			this.updateUsage({
				memory: endMemory.heapUsed - startMemory.heapUsed,
				cpu: this.calculateCpuUsage(startCpu, endCpu),
			})

			return result
		} catch (error) {
			throw error
		}
	}

	private takeSnapshot(): void {
		const snapshot: ResourceSnapshot = {
			timestamp: Date.now(),
			memory: process.memoryUsage().heapUsed,
			cpu: this.getCurrentCpuUsage(),
			fileOperations: this.usage.fileOperations,
			toolCalls: this.usage.toolCalls,
		}

		this.snapshots.push(snapshot)

		// Keep only last 300 snapshots (5 minutes)
		if (this.snapshots.length > 300) {
			this.snapshots.shift()
		}
	}

	getCurrentUsage(): ResourceUsage {
		return { ...this.usage }
	}

	getSummary(): ResourceSummary {
		return {
			peakMemory: Math.max(...this.snapshots.map((s) => s.memory)),
			averageMemory: this.snapshots.reduce((sum, s) => sum + s.memory, 0) / this.snapshots.length,
			totalFileOperations: this.usage.fileOperations,
			totalToolCalls: this.usage.toolCalls,
			executionTime: Date.now() - this.usage.startTime,
		}
	}

	protected updateUsage(delta: { memory?: number; cpu?: number; fileOperations?: number; toolCalls?: number }): void {
		if (delta.memory !== undefined) this.usage.memory += delta.memory
		if (delta.cpu !== undefined) this.usage.cpu += delta.cpu
		if (delta.fileOperations !== undefined) this.usage.fileOperations += delta.fileOperations
		if (delta.toolCalls !== undefined) this.usage.toolCalls += delta.toolCalls
	}

	public recordToolCall(): void {
		this.updateUsage({ toolCalls: 1 })
	}

	public recordFileOperation(): void {
		this.updateUsage({ fileOperations: 1 })
	}

	public getLimits(): ResourceLimits {
		return this.limits
	}

	private calculateCpuUsage(start: NodeJS.CpuUsage, end: NodeJS.CpuUsage): number {
		const userDiff = end.user - start.user
		const systemDiff = end.system - start.system
		const totalCpuTime = userDiff + systemDiff
		// This is a simplified calculation. In a real scenario, you'd need total system CPU time.
		// For now, we'll just return a dummy value or a ratio of this process's CPU time.
		// A more accurate implementation would involve os.cpus() and tracking total CPU time over an interval.
		return totalCpuTime / (1000 * 1000 * 100) // Convert microseconds to a fraction of 100ms
	}

	private getCurrentCpuUsage(): number {
		// This is a placeholder. Real CPU usage tracking requires more complex logic
		// involving `os.cpus()` and tracking CPU ticks over time.
		return 0
	}
}
