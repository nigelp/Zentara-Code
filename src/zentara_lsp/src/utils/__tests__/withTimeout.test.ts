import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withTimeout, TimeoutError } from '../withTimeout';
import { CancellationTokenSource } from 'vscode';

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve with the promise value if it completes before timeout', async () => {
    const promise = new Promise<string>((resolve) => setTimeout(() => resolve('success'), 50));
    const resultPromise = withTimeout(promise, 100);
    vi.advanceTimersByTime(50);
    await expect(resultPromise).resolves.toBe('success');
  });

  it('should reject with TimeoutError if the promise does not complete before timeout', async () => {
    const promise = new Promise<string>((resolve) => setTimeout(() => resolve('success'), 200));
    const resultPromise = withTimeout(promise, 100);
    vi.advanceTimersByTime(100);
    await expect(resultPromise).rejects.toThrow(TimeoutError);
  });

  it('should reject with TimeoutError and correct message', async () => {
    const promise = new Promise<string>((resolve) => setTimeout(() => resolve('success'), 200));
    const resultPromise = withTimeout(promise, 100);
    vi.advanceTimersByTime(100);
    await expect(resultPromise).rejects.toThrow('Operation timed out after 100ms');
  });

  it('should clear the timeout if the promise resolves', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const promise = new Promise<string>((resolve) => setTimeout(() => resolve('success'), 50));
    const resultPromise = withTimeout(promise, 100);
    vi.advanceTimersByTime(50);
    await resultPromise;
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should clear the timeout if the promise rejects', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const promise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('failure')), 50));
    const resultPromise = withTimeout(promise, 100);
    vi.advanceTimersByTime(50);
    await expect(resultPromise).rejects.toThrow('failure');
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  describe('with cancellation token', () => {
    it('should reject with "Operation cancelled" if cancellation is requested', async () => {
      const promise = new Promise<string>((resolve) => setTimeout(() => resolve('success'), 200));
      const cts = new CancellationTokenSource();
      const resultPromise = withTimeout(promise, 300, cts.token);

      setTimeout(() => {
        cts.cancel();
      }, 100);

      vi.advanceTimersByTime(100);

      await expect(resultPromise).rejects.toThrow('Operation cancelled');
    });

    it('should not reject if cancellation is requested after promise is resolved', async () => {
        const promise = new Promise<string>((resolve) => setTimeout(() => resolve('success'), 50));
        const cts = new CancellationTokenSource();
        const resultPromise = withTimeout(promise, 300, cts.token);
  
        vi.advanceTimersByTime(50);
        await expect(resultPromise).resolves.toBe('success');
  
        cts.cancel(); 
    });
  });
});