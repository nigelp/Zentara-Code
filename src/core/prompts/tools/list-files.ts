import { ToolArgs } from "./types"

export function getListFilesDescription(args: ToolArgs): string {
	return `## list_files
Description: Request to list files and directories within the specified directory. If recursive is true, it will list all files and directories recursively. If recursive is false or not provided, it will only list the top-level contents. You can optionally provide an array of glob patterns to ignore with the ignore parameter. Do not use this tool to confirm the existence of files you may have created, as the user will let you know if the files were created successfully or not.
Parameters:
- path: (required) The path of the directory to list contents for (relative to the current workspace directory ${args.cwd})
- recursive: (optional) Whether to list files recursively. Use true for recursive listing, false or omit for top-level only.
- ignore: (optional) Array of glob patterns to ignore (e.g., ["*.test.js", "node_modules", "*.log"])
Usage:
<list_files>
<path>Directory path here</path>
<recursive>true or false (optional)</recursive>
<ignore>["pattern1", "pattern2"] (optional)</ignore>
</list_files>

Example: Requesting to list all files in the current directory
<list_files>
<path>.</path>
<recursive>false</recursive>
</list_files>

Example: Listing files while ignoring test files and logs
<list_files>
<path>src</path>
<recursive>true</recursive>
<ignore>["*.test.js", "*.spec.js", "*.log"]</ignore>
</list_files>`
}
