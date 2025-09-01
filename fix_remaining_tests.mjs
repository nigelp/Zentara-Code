import fs from 'fs';
import path from 'path';

const testDir = 'src/zentara_lsp/src/controller/__tests__';

// Configuration for each test file - what parameters they need
const testConfigs = {
    'getCompletions.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },`,
        type: 'GetCompletionsParams'
    },
    'getDeclaration.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },`,
        type: 'GetDeclarationParams'
    },
    'getDocumentHighlights.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },`,
        type: 'GetDocumentHighlightsParams'
    },
    'getDocumentSymbols.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },`,
        type: 'GetDocumentSymbolsParams',
        extraSetup: `\n    const symbols = [\n        {\n            name: 'MyClass',\n            kind: 5,\n            range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } },\n            children: []\n        }\n    ];`
    },
    'getHoverInfo.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },`,
        type: 'GetHoverInfoParams'
    },
    'getSelectionRange.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },`,
        type: 'GetSelectionRangeParams'
    },
    'getSemanticTokens.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },`,
        type: 'GetSemanticTokensParams'
    },
    'getSignatureHelp.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },`,
        type: 'GetSignatureHelpParams'
    },
    'getSymbolCodeSnippet.test.ts': {
        params: `location: {\n            uri: 'file:///test.ts',\n            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } }\n        },`,
        type: 'GetSymbolCodeSnippetParams'
    },
    'getSymbolsOverview.test.ts': {
        params: `relative_path: './src',`,
        type: 'GetSymbolsOverviewParams'
    },
    'getTypeDefinition.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },`,
        type: 'GetTypeDefinitionParams'
    },
    'getTypeHierarchy.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },`,
        type: 'GetTypeHierarchyParams'
    },
    'getWorkspaceSymbols.test.ts': {
        params: `query: 'test',`,
        type: 'GetWorkspaceSymbolsParams'
    },
    'goToDefinition.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },`,
        type: 'GoToDefinitionParams'
    },
    'insertAfterSymbol.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },\n        content: 'new content',`,
        type: 'InsertAfterSymbolParams'
    },
    'insertBeforeSymbol.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },\n        content: 'new content',`,
        type: 'InsertBeforeSymbolParams'
    },
    'rename.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },\n        newName: 'newName',`,
        type: 'RenameParams'
    },
    'replaceSymbolBody.test.ts': {
        params: `textDocument: { uri: 'file:///test.ts' },\n        position: { line: 1, character: 5 },\n        replacement: 'new body',`,
        type: 'ReplaceSymbolBodyParams'
    }
};

// Function to extract function name from file name
function getFunctionName(fileName) {
    return fileName.replace('.test.ts', '');
}

// Function to fix a test file
function fixTestFile(fileName) {
    const filePath = path.join(testDir, fileName);
    
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${fileName}`);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const config = testConfigs[fileName];
    
    if (!config) {
        console.log(`No config for ${fileName}`);
        return;
    }
    
    const functionName = getFunctionName(fileName);
    
    // Check if it already has a describe block
    if (content.includes('describe(')) {
        console.log(`${fileName} already has describe block, skipping`);
        return;
    }
    
    // Find where to insert the describe block and params
    const lines = content.split('\n');
    let insertIndex = -1;
    
    // Find the line after the imports and comments
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '// Use the global vscode mock instead of defining a local one') {
            insertIndex = i + 1;
            break;
        }
    }
    
    if (insertIndex === -1) {
        console.log(`Could not find insertion point for ${fileName}`);
        return;
    }
    
    // Insert the describe block and params
    const insertLines = [
        '',
        `describe('${functionName}', () => {`,
        `    const params: ${config.type} = {`,
        `        ${config.params}`,
        '    };'
    ];
    
    if (config.extraSetup) {
        insertLines.push(config.extraSetup);
    }
    
    insertLines.push('');
    
    // Find the closing line (should be the last line with just '})')
    let closingIndex = lines.length - 1;
    while (closingIndex >= 0 && lines[closingIndex].trim() !== '});') {
        closingIndex--;
    }
    
    if (closingIndex >= 0) {
        // Add the closing bracket
        lines.splice(closingIndex + 1, 0, '});');
    }
    
    // Add 4 spaces to indent all test content
    for (let i = insertIndex; i < lines.length - 1; i++) {
        if (lines[i].trim() !== '' && !lines[i].startsWith('describe(') && !lines[i].endsWith('});')) {
            lines[i] = '    ' + lines[i];
        }
    }
    
    // Insert the new lines
    lines.splice(insertIndex, 0, ...insertLines);
    
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed ${fileName}`);
}

// Get all test files that need fixing
const allFiles = fs.readdirSync(testDir);
const testFiles = allFiles.filter(f => f.endsWith('.test.ts'));

// Fix each file
for (const fileName of testFiles) {
    if (testConfigs[fileName]) {
        fixTestFile(fileName);
    }
}

console.log('Finished fixing test files');