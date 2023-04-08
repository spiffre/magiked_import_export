import { assert } from "../deps/std/assert.ts"
import * as path from "../deps/std/path.ts"

import type { Payload } from "../deps/magiked/magiked.ts"

import { ts } from "../deps/magiked/magiked-typescript-loader.ts"
import type { TS } from "../deps/magiked/magiked-typescript-loader.ts"


export interface ImportExportPayload extends Payload
{
	type: 'importexport'
	ast: ImportExportGraphNode
}

export interface ImportExportLoaderOptions
{
	filepath: string
}

export async function processorForImportExport (source: TS.SourceFile, options: ImportExportLoaderOptions): Promise<ImportExportPayload>
{
	try
	{
		const ast = await filterImportExport(options.filepath, source)
		
		return {
			type: 'importexport',
			ast
		}
	}
	catch (error)
	{
		throw new Error(`Failed to parse file: ${options.filepath}`, { cause : error })
	}
}


// HELPERS

interface ModuleSpecifier
{
	prefix?: string;
	specifier: string;
	isPackageId?: boolean;
}

interface ImportMetaAst
{
	defaultId?: string;
	namespaceId?: string;
	named?:
	{
		symbolId: string;
		localId?: string;
	}[];
	
	moduleSpecifier: ModuleSpecifier;
}

async function filterImportExport (filepath: string, source: TS.SourceFile): Promise<ImportExportGraphNode>
{
	const dirname = path.dirname(filepath)
	
	const iegn: ImportExportGraphNode =
	{
		imports : [],
		exports : [],
		reexports : []
	}
	
	// Run through all top-level statements (all import/exports statements are top-level)
	for (const statement of source.statements)
	{
		// For imports
		if (statement.kind == ts.SyntaxKind.ImportDeclaration)
		{
			const importNodes = source.statements.filter(ts.isImportDeclaration)
			
			const importCases: ImportMetaAst[] = importNodes.map( (importNode) =>
			{
				const importCase: ImportMetaAst =
				{
					moduleSpecifier:
					{
						specifier: (importNode.moduleSpecifier as ts.StringLiteral).text,
						isPackageId: !(/^[.\/]/.test((importNode.moduleSpecifier as ts.StringLiteral).text)),
					}
				}
			
				if (importNode.importClause)
				{
					const { name, namedBindings } = importNode.importClause;
			
					if (name)
					{
						importCase.defaultId = name.text;
					}
			
					if (namedBindings)
					{
						if (ts.isNamespaceImport(namedBindings))
						{
							importCase.namespaceId = namedBindings.name.text;
						}
						else if (ts.isNamedImports(namedBindings))
						{
							importCase.named = namedBindings.elements.map( (element) =>
							{
								return {
									symbolId: element.propertyName?.text || element.name.text,
									localId: element.propertyName ? element.name.text : undefined,
								}
							})
						}
					}
				}
			
				return importCase;
			})
			
			iegn.imports.push(...importCases)
		}
	}
	
	return iegn
}

export interface MetaAst
{
	loc:
	{
		start: number
		end: number
	}
}

interface ImportBinding
{
	localId: string				// The local id of the named import
	symbolId?: string			// The id of the exported named import, if there was renaming
}

interface BaseImportMetaAst extends MetaAst
{
	path: string				// The module specifier
	
	defaultLocalId?: string		// Id of the local symbol importing the default export, if present
	bindings?: ImportBinding[]	// Named imports, if present
}

export interface PackageImportMetaAst extends BaseImportMetaAst
{
	type: 'ImportMetaAst'
	kind: 'Package'
}

export interface FileImportMetaAst extends BaseImportMetaAst
{
	type: 'ImportMetaAst'
	kind: 'File'
}

//export type ImportMetaAst = PackageImportMetaAst | FileImportMetaAst

export interface ExportMetaAst extends MetaAst
{
	type: 'ExportMetaAst'
	
	symbolId: string
}

export interface ReexportMetaAst extends MetaAst
{
	type: 'ReexportMetaAst'
	
	path: string
	symbolId: string
}

export interface ImportExportGraphNode
{
	imports: ImportMetaAst[]
	exports: ExportMetaAst[]
	reexports: ReexportMetaAst[]
}

// HELPERS

const VALID_EXTENSIONS = [ '.js', '.ts', '.jsx', '.tsx' ]

/*
async function resolveModuleSpecifier (dirname: string, moduleSpecifier: string): Promise<string>
{
	// Check if the specifier directly points do a file
	try
	{
		const stat = await Deno.stat( path.resolve(dirname, moduleSpecifier) )
		if (stat.isFile)
		{
			return moduleSpecifier
		}
	}
	catch (_error)
	{
		// Silence the error
	}
	
	// Check if the specifier is an extensionless path to a file
	for (const ext of VALID_EXTENSIONS)
	{
		const filepath = path.resolve(dirname, `${moduleSpecifier}${ext}`)
		try
		{
			await Deno.stat(filepath)
			return filepath
		}
		catch (_error)
		{
			// Silence the error
		}
	}
	
	// Check if the specifier is a directory with an index file
	for (const ext of VALID_EXTENSIONS)
	{
		const filepath = path.resolve(dirname, moduleSpecifier, `index${ext}`)
		try
		{
			await Deno.stat(filepath)
			return filepath
		}
		catch (_error)
		{
			// Silence the error
		}
	}
	
	throw new Error(`Failed to resolve module specifier to a file with a supported extension:\n${moduleSpecifier}`)
}
*/

/*
const PREFIX =
{
	COPY : 'copy:',
	WEBWORKER : 'webworker:',
} as const

type ValueOf<T> = T[keyof T]
*/

//interface ModuleSpecifier
//{
//	isPackage: boolean
//	actualPath: string
//	prefix?: ValueOf<typeof PREFIX>
//}

/*
function qualifyModuleSpecifier (moduleSpecifier: string): ModuleSpecifier
{
	// If the module specifier starts with one of the supported prefixes
	for (const prefix of Object.values(PREFIX))
	{
		if (moduleSpecifier.startsWith(prefix))
		{
			return {
				isPackage : false,
				actualPath : moduleSpecifier.substring(prefix.length),
				prefix
			}
		}
	}
	
	// If the module specifier is not a relative path
	if (moduleSpecifier[0] != '.')
	{
		return {
			isPackage : true,
			actualPath : moduleSpecifier
		}
	}
	
	return {
		isPackage : false,
		actualPath : moduleSpecifier
	}
}
*/