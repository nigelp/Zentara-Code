import { vi } from 'vitest';

const mockedVscode = {
  Uri: {
    parse: vi.fn((str) => ({
      toString: () => str,
      with: vi.fn(),
      path: str,
      scheme: str.split(':')[0],
      authority: '',
      fragment: '',
      query: '',
      fsPath: str.replace('file://', ''),
    })),
    file: vi.fn((path) => ({
        toString: () => `file://${path}`,
        with: vi.fn(),
        path: path,
        scheme: 'file',
        authority: '',
        fragment: '',
        query: '',
        fsPath: path,
    })),
  },
  workspace: {
    openTextDocument: vi.fn(async (uri) => {
        if (uri.toString().includes('nonexistent')) {
            throw new Error(`File not found - ${uri.toString()}`);
        }
        return {
            uri,
            getText: () => 'Sample text content',
            lineCount: 1,
        };
    }),
    textDocuments: [],
    getConfiguration: vi.fn(() => ({
        get: vi.fn(),
    })),
  },
   commands: {
        executeCommand: vi.fn(async (command, ...args) => {
            if (command === 'vscode.executeReferenceProvider') {
                const [uri, position] = args;
                if (uri.toString().includes('no-references')) {
                    return [];
                }
                return [
                    {
                        uri: uri,
                        range: {
                            start: { line: position.line, character: 0 },
                            end: { line: position.line, character: 10 },
                        },
                    },
                ];
            }
            return undefined;
        }),
    },
    window: {
        activeTextEditor: undefined,
        visibleTextEditors: [],
        showTextDocument: vi.fn(),
        showErrorMessage: vi.fn(),
    },
    languages: {
        setTextDocumentLanguage: vi.fn()
    },
    Position: vi.fn((line, character) => ({ line, character })),
    Range: vi.fn((start, end) => ({ start, end })),
    Location: vi.fn((uri, range) => ({ uri, range })),
};

vi.mock('vscode', () => {
  return {
    ...mockedVscode,
    default: mockedVscode,
  };
});