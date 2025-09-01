import * as vscode from "vscode";

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  signal?: vscode.CancellationToken
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.log("Timeout fired after", timeout, "ms");
      reject(new TimeoutError(`Operation timed out after ${timeout}ms`));
    }, timeout);
  });

  const promisesToRace: Promise<T>[] = [promise, timeoutPromise];

  if (signal) {
    console.log("Signal provided, setting up cancellation promise");
    console.log("Signal.isCancellationRequested initial:", signal.isCancellationRequested);
    
    const cancellationPromise = new Promise<never>((_, reject) => {
      console.log("Setting up onCancellationRequested listener");
      signal.onCancellationRequested(() => {
        console.log("Cancellation requested! Rejecting with 'Operation cancelled'");
        reject(new Error("Operation cancelled"));
      });
    });
    promisesToRace.push(cancellationPromise);
  }

  console.log("Starting Promise.race with", promisesToRace.length, "promises");
  
  return Promise.race(promisesToRace).finally(() => {
    console.log("Promise.race completed, clearing timeout");
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}