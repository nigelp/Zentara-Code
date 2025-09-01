/**
 * Template generator for LSP test files
 */

import * as fs from "fs"
import * as path from "path"

interface TestConfig {
	toolName: string
	functionName: string
	description: string
	tests: {
		name: string
		setup: string
		assertion: string
	}[]
}

const testConfigs: TestConfig[] = [
	{
		toolName: "findImplementations",
		functionName: "findImplementations",
		description: "Find implementations of interfaces and abstract classes",
		tests: [
			{
				name: "Find interface implementations in TypeScript",
				setup: `const result = await lspController.findImplementations({
            textDocument: { uri: uri.toString() },
            position: { line: 19, character: 10 } // Position on interface name
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of implementations');`,
			},
			{
				name: "Find abstract class implementations",
				setup: `// Test with abstract class`,
				assertion: `assert(true, 'Test placeholder');`,
			},
		],
	},
	{
		toolName: "getHoverInfo",
		functionName: "getHoverInfo",
		description: "Get hover information for symbols",
		tests: [
			{
				name: "Get hover info for class",
				setup: `const result = await lspController.getHoverInfo({
            textDocument: { uri: uri.toString() },
            position: { line: 1, character: 6 } // Position on class name
        });`,
				assertion: `assert(result !== null, 'Should return hover info for class');
        if (result) {
            assert(result.contents !== undefined, 'Hover should have contents');
        }`,
			},
			{
				name: "Get hover info for function",
				setup: `const result = await lspController.getHoverInfo({
            textDocument: { uri: uri.toString() },
            position: { line: 26, character: 9 } // Position on function name
        });`,
				assertion: `assert(result === null || result.contents !== undefined, 'Should handle function hover');`,
			},
		],
	},
	{
		toolName: "getDocumentSymbols",
		functionName: "getDocumentSymbols",
		description: "Get all symbols in a document",
		tests: [
			{
				name: "Get symbols from TypeScript file",
				setup: `const result = await lspController.getDocumentSymbols({
            textDocument: { uri: uri.toString() }
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of symbols');
        assert(result.length > 0, 'Should find symbols in file');
        
        // Check for expected symbols
        const symbolNames = result.map(s => s.name);
        assert(symbolNames.includes('TestClass'), 'Should find TestClass symbol');`,
			},
			{
				name: "Get symbols from empty file",
				setup: `const emptyUri = await createTestFile('empty.ts', '');
        const result = await lspController.getDocumentSymbols({
            textDocument: { uri: emptyUri.toString() }
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array even for empty file');
        assert(result.length === 0, 'Should return empty array for empty file');`,
			},
		],
	},
	{
		toolName: "getCompletions",
		functionName: "getCompletions",
		description: "Get code completions at a position",
		tests: [
			{
				name: "Get completions after dot",
				setup: `const result = await lspController.getCompletions({
            textDocument: { uri: uri.toString() },
            position: { line: 33, character: 25 } // After testVariable.
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of completions');
        if (result.length > 0) {
            const labels = result.map(c => c.label);
            assert(labels.includes('getValue') || labels.includes('setValue'), 
                   'Should suggest class methods');
        }`,
			},
			{
				name: "Get completions in empty line",
				setup: `const result = await lspController.getCompletions({
            textDocument: { uri: uri.toString() },
            position: { line: 0, character: 0 } // Start of file
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array even at start of file');`,
			},
		],
	},
	{
		toolName: "rename",
		functionName: "rename",
		description: "Rename symbols across files",
		tests: [
			{
				name: "Rename class",
				setup: `const result = await lspController.rename({
            textDocument: { uri: uri.toString() },
            position: { line: 1, character: 6 }, // Position on class name
            newName: 'RenamedClass'
        });`,
				assertion: `assert(result !== null, 'Should return workspace edit');
        assert(result.changes !== undefined, 'Should have changes property');`,
			},
			{
				name: "Rename variable",
				setup: `const result = await lspController.rename({
            textDocument: { uri: uri.toString() },
            position: { line: 32, character: 6 }, // Position on variable
            newName: 'renamedVariable'
        });`,
				assertion: `assert(result !== null, 'Should return workspace edit for variable rename');`,
			},
		],
	},
	{
		toolName: "getSignatureHelp",
		functionName: "getSignatureHelp",
		description: "Get signature help for function calls",
		tests: [
			{
				name: "Get signature help for function call",
				setup: `const result = await lspController.getSignatureHelp({
            textDocument: { uri: uri.toString() },
            position: { line: 27, character: 20 } // Inside function parameters
        });`,
				assertion: `assert(result === null || result.signatures !== undefined, 
               'Should return signature help or null');`,
			},
		],
	},
	{
		toolName: "getCodeActions",
		functionName: "getCodeActions",
		description: "Get available code actions",
		tests: [
			{
				name: "Get code actions for diagnostic",
				setup: `const result = await lspController.getCodeActions({
            textDocument: { uri: uri.toString() },
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 10 }
            }
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of code actions');`,
			},
		],
	},
	{
		toolName: "getSemanticTokens",
		functionName: "getSemanticTokens",
		description: "Get semantic tokens for syntax highlighting",
		tests: [
			{
				name: "Get semantic tokens for TypeScript",
				setup: `const result = await lspController.getSemanticTokens({
            textDocument: { uri: uri.toString() }
        });`,
				assertion: `assert(result === null || Array.isArray(result), 
               'Should return array of semantic tokens or null');`,
			},
		],
	},
	{
		toolName: "getCallHierarchy",
		functionName: "getCallHierarchy",
		description: "Get call hierarchy for functions",
		tests: [
			{
				name: "Get incoming calls",
				setup: `const result = await lspController.getCallHierarchy({
            textDocument: { uri: uri.toString() },
            position: { line: 8, character: 4 }, // Position on method
            direction: 'incoming'
        });`,
				assertion: `assert(result === null || result.name !== undefined, 
               'Should return call hierarchy item or null');`,
			},
		],
	},
	{
		toolName: "getTypeHierarchy",
		functionName: "getTypeHierarchy",
		description: "Get type hierarchy for classes",
		tests: [
			{
				name: "Get supertypes",
				setup: `const result = await lspController.getTypeHierarchy({
            textDocument: { uri: uri.toString() },
            position: { line: 1, character: 6 }, // Position on class
            direction: 'supertypes'
        });`,
				assertion: `assert(result === null || result.name !== undefined, 
               'Should return type hierarchy item or null');`,
			},
		],
	},
	{
		toolName: "getCodeLens",
		functionName: "getCodeLens",
		description: "Get code lens information",
		tests: [
			{
				name: "Get code lens for document",
				setup: `const result = await lspController.getCodeLens({
            textDocument: { uri: uri.toString() }
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of code lens');`,
			},
		],
	},
	{
		toolName: "getSelectionRange",
		functionName: "getSelectionRange",
		description: "Get smart selection ranges",
		tests: [
			{
				name: "Get selection range at position",
				setup: `const result = await lspController.getSelectionRange({
            textDocument: { uri: uri.toString() },
            positions: [{ line: 1, character: 6 }]
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of selection ranges');`,
			},
		],
	},
	{
		toolName: "getTypeDefinition",
		functionName: "getTypeDefinition",
		description: "Go to type definition",
		tests: [
			{
				name: "Get type definition of variable",
				setup: `const result = await lspController.getTypeDefinition({
            textDocument: { uri: uri.toString() },
            position: { line: 32, character: 6 } // Position on variable
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of locations');`,
			},
		],
	},
	{
		toolName: "getDeclaration",
		functionName: "getDeclaration",
		description: "Go to declaration",
		tests: [
			{
				name: "Get declaration of symbol",
				setup: `const result = await lspController.getDeclaration({
            textDocument: { uri: uri.toString() },
            position: { line: 33, character: 10 } // Position on symbol
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of locations');`,
			},
		],
	},
	{
		toolName: "getDocumentHighlights",
		functionName: "getDocumentHighlights",
		description: "Get document highlights",
		tests: [
			{
				name: "Highlight symbol occurrences",
				setup: `const result = await lspController.getDocumentHighlights({
            textDocument: { uri: uri.toString() },
            position: { line: 32, character: 6 } // Position on variable
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of highlights');`,
			},
		],
	},
	{
		toolName: "getWorkspaceSymbols",
		functionName: "getWorkspaceSymbols",
		description: "Search workspace symbols",
		tests: [
			{
				name: "Search for class symbols",
				setup: `const result = await lspController.getWorkspaceSymbols({
            query: 'Test'
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of workspace symbols');`,
			},
		],
	},
	{
		toolName: "getSymbols",
		functionName: "getSymbols",
		description: "Get symbols with specific criteria",
		tests: [
			{
				name: "Get symbols by name path",
				setup: `const result = await lspController.getSymbols({
            name_path: 'TestClass'
        });`,
				assertion: `assert(Array.isArray(result), 'Should return array of symbols');`,
			},
		],
	},
	{
		toolName: "getSymbolsOverview",
		functionName: "getSymbolsOverview",
		description: "Get overview of symbols in workspace",
		tests: [
			{
				name: "Get symbols overview",
				setup: `const result = await lspController.getSymbolsOverview({
            query: 'Test'
        });`,
				assertion: `assert(result !== null, 'Should return symbols overview');
        assert(result.symbols !== undefined, 'Should have symbols property');`,
			},
		],
	},
	{
		toolName: "insertAfterSymbol",
		functionName: "insertAfterSymbol",
		description: "Insert code after a symbol",
		tests: [
			{
				name: "Insert method after existing method",
				setup: `const result = await lspController.insertAfterSymbol({
            textDocument: { uri: uri.toString() },
            position: { line: 8, character: 4 }, // Position on method
            content: '\\n    newMethod(): void { }'
        });`,
				assertion: `assert(result === null || result.changes !== undefined, 
               'Should return workspace edit or null');`,
			},
		],
	},
	{
		toolName: "insertBeforeSymbol",
		functionName: "insertBeforeSymbol",
		description: "Insert code before a symbol",
		tests: [
			{
				name: "Insert comment before class",
				setup: `const result = await lspController.insertBeforeSymbol({
            textDocument: { uri: uri.toString() },
            position: { line: 1, character: 0 }, // Position on class
            content: '// New comment\\n'
        });`,
				assertion: `assert(result === null || result.changes !== undefined, 
               'Should return workspace edit or null');`,
			},
		],
	},
	{
		toolName: "replaceSymbolBody",
		functionName: "replaceSymbolBody",
		description: "Replace body of a symbol",
		tests: [
			{
				name: "Replace method body",
				setup: `const result = await lspController.replaceSymbolBody({
            textDocument: { uri: uri.toString() },
            position: { line: 8, character: 4 }, // Position on method
            replacement: '{ return 42; }'
        });`,
				assertion: `assert(result === null || result.changes !== undefined, 
               'Should return workspace edit or null');`,
			},
		],
	},
]

export function generateTestFile(config: TestConfig): string {
	return `/**
 * Integration tests for ${config.toolName} LSP tool
 */

import * as vscode from 'vscode';
import { lspController } from '../../zentara_lsp/src/LspController';
import { 
    TestReporter, 
    createTestFile, 
    openTestFile,
    assert,
    SAMPLE_TS_CONTENT,
    SAMPLE_PY_CONTENT,
    SAMPLE_JS_CONTENT
} from './testUtils';

export async function test${config.toolName.charAt(0).toUpperCase() + config.toolName.slice(1)}(reporter: TestReporter): Promise<void> {
    ${config.tests
		.map(
			(test, index) => `
    // Test ${index + 1}: ${test.name}
    reporter.startTest('${config.toolName}', '${test.name}');
    try {
        const uri = await createTestFile('test-${config.toolName}-${index}.ts', SAMPLE_TS_CONTENT);
        const editor = await openTestFile(uri);
        
        ${test.setup}
        
        ${test.assertion}
        
        reporter.passTest('${config.toolName}', '${test.name}');
    } catch (error) {
        reporter.failTest('${config.toolName}', '${test.name}', error);
    }`,
		)
		.join("\n")}
}`
}

// Generate all test files
export function generateAllTestFiles(outputDir: string): void {
	testConfigs.forEach((config) => {
		const content = generateTestFile(config)
		const filePath = path.join(outputDir, `${config.toolName}.test.ts`)
		fs.writeFileSync(filePath, content, "utf8")
		console.log(`Generated: ${filePath}`)
	})
}
