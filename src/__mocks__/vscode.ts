import { vi } from "vitest";

const mockVscode = {
  workspace: {
    openTextDocument: vi.fn(),
  },
  window: {
    visibleTextEditors: [],
  },
  commands: {
    executeCommand: vi.fn(),
  },
  Uri: {
    parse: vi.fn(),
    file: vi.fn(),
  },
  Position: vi.fn(),
  CancellationTokenSource: class CancellationTokenSource {
    private isCancelled = false;
    private listeners: Array<() => void> = [];
    public token: {
      readonly isCancellationRequested: boolean;
      onCancellationRequested: (listener: () => void) => { dispose: () => void };
    };
    
    constructor() {
      const self = this;
      this.token = {
        get isCancellationRequested() {
          return self.isCancelled;
        },
        onCancellationRequested: (listener: () => void) => {
          self.listeners.push(listener);
          return {
            dispose: () => {
              const index = self.listeners.indexOf(listener);
              if (index > -1) {
                self.listeners.splice(index, 1);
              }
            },
          };
        },
      };
    }

    cancel() {
      this.isCancelled = true;
      // Call all listeners when cancellation is triggered
      this.listeners.forEach(listener => listener());
    }

    dispose() {
      this.listeners.length = 0;
    }
  },
};

export default mockVscode;
