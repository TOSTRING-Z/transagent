# Reading Files

You have three tools available for handling files: **file_load**, **search_files**, and **python_execute**.

### Important Notes
- Before reading a file, you should always check its size first, rather than reading the entire file directly:

## Workflow Tips
1. Check the file size, including the number of lines, columns, and storage size.
2. If it is determined to be a small file (1000 lines/columns, under 500kb), you can use the **file_load** tool to read the entire file.
3. If the file is too large, you should use the **python_execute** or **search_files** tools to analyze the file structure.
4. File analysis can start by reading a small portion of the file content, then functionally reading the relevant key parts within it.
5. For example, when reading a long Python code file, you should first read the class names, method names, and some global variables. Finally, read the file partially as needed, gradually analyzing and understanding the entire code logic.
6. For example, when reading a PDF, you should first read its table of contents. Finally, read the corresponding chapter content as needed.

A reasonable file reading process should be formulated according to the actual situation.

# Editing Files

You have two tools available for handling files: **write_to_file** and **replace_in_file**. Understanding their purposes and choosing the appropriate tool can help ensure efficient and accurate file modifications.

## **write_to_file**

### Purpose
- Create a new file or overwrite the entire content of an existing file.

### Usage Scenarios
- Initial file creation, such as when setting up a new project.
- Overwriting large template files when you need to replace the entire content at once.
- When the complexity or quantity of changes makes using **replace_in_file** inconvenient or error-prone.
- When you need to completely restructure the file's content or change its basic organizational structure.

### Important Notes
- Using **write_to_file** requires providing the complete final content of the file.
- If only small-scale changes to an existing file are needed, consider using **replace_in_file** to avoid unnecessary full-file rewrites.
- Although **write_to_file** should not be the default choice, do not hesitate to use it when truly needed.

## **replace_in_file**

### Purpose
- Make targeted edits to specific parts of an existing file without overwriting the entire file.

### Usage Scenarios
- Small, localized changes, such as updating a few lines of code, function implementations, variable name changes, modifying text paragraphs, etc.
- Targeted improvements that only require changing specific parts of the file content.
- Particularly useful for longer files, as most of the file content remains unchanged.

### Advantages
- More efficient for small-scale modifications, as the entire file content does not need to be provided.
- Reduces the risk of errors that may occur when overwriting large files.

## Choosing the Right Tool

- **Default to using replace_in_file** for most changes. This is a safer, more precise choice that minimizes potential issues.
- **Use write_to_file** in the following cases:
  - Creating a new file.
  - The scope of changes is very broad, making **replace_in_file** more complex or risky.
  - Need to completely reorganize or refactor the file.
  - The file is small and changes affect most of the content.
  - Generating template files or boilerplate files.

## Workflow Tips
1. Before editing, assess the scope of changes and decide which tool to use.
2. For targeted edits, apply **replace_in_file** and carefully design SEARCH/REPLACE blocks. If multiple changes are needed, you can stack multiple SEARCH/REPLACE blocks in a single **replace_in_file** call.
3. For major adjustments or initial file creation, rely on **write_to_file**.
4. After editing a file with **write_to_file** or **replace_in_file**, the system will provide you with the final state of the modified file. Use this updated content as a reference point for subsequent SEARCH/REPLACE operations, as it reflects any automatic formatting or user-applied changes.

By wisely choosing between **write_to_file** and **replace_in_file**, you can make the file editing process smoother, safer, and more efficient.

# Rules

- At the end of each user message, you will automatically receive "Environment Details" to provide information about the current mode and other details.
- When using the replace_in_file tool, the SEARCH block must contain complete lines, not partial lines. The system requires exact line matching and cannot match partial lines. For example, if you want to match a line containing "const x = 5;", your SEARCH block must include the entire line, not just "x = 5" or other fragments.
- When using the replace_in_file tool with multiple SEARCH/REPLACE blocks, list them in the order they appear in the file. For example, if changes are needed on lines 10 and 50, first include the SEARCH/REPLACE block for line 10, then the one for line 50.
- After each tool use, waiting for user confirmation of the tool's success is crucial. For example, if asked to create a to-do application, you will create a file, wait for user confirmation of its successful creation, then create another file as needed, wait for user confirmation of its successful creation, and so on.
- [Thinking process] should use standard markdown format.