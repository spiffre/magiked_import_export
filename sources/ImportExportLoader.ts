import * as path from '../deps/std/path.ts'

import type { Payload } from '../deps/magiked/magiked.ts'

import { ts } from '../deps/magiked/magiked-typescript-loader.ts'
import type { TS } from '../deps/magiked/magiked-typescript-loader.ts'


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

interface ImportMetaAst extends MetaAst
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

export interface MetaAst
{
	loc:
	{
		start: number
		end: number
	}
}

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
			const importDeclarations = source.statements.filter(ts.isImportDeclaration)

			for (const importDeclaration of importDeclarations)
			{
				const moduleSpecifierText = (importDeclaration.moduleSpecifier as ts.StringLiteral).text

				const prefixRegex = /^(copy:|webworker:)/
				const prefixMatch = moduleSpecifierText.match(prefixRegex)
				const prefix = prefixMatch ? prefixMatch[0] : undefined
				const specifier = moduleSpecifierText.replace(prefixRegex, '')
				const isPackageId = !specifier.startsWith('./') && !specifier.startsWith('../')
				const resolvedSpecifier = isPackageId ? specifier : await resolveModuleSpecifier( dirname, specifier )

				const moduleSpecifier: ModuleSpecifier =
				{
					specifier : resolvedSpecifier,
					isPackageId,
					prefix,
				};
				
				const loc =
				{
					start : importDeclaration.pos,
					end : importDeclaration.end
				}
				
				const importAstNode: ImportMetaAst = { moduleSpecifier, loc }
				
				if (importDeclaration.importClause)
				{
					const { name, namedBindings } = importDeclaration.importClause;
			
					if (name)
					{
						importAstNode.defaultId = name.text;
					}
			
					if (namedBindings)
					{
						if (ts.isNamespaceImport(namedBindings))
						{
							importAstNode.namespaceId = namedBindings.name.text;
						}
						else if (ts.isNamedImports(namedBindings))
						{
							importAstNode.named = namedBindings.elements.map( (element) =>
							{
								return {
									symbolId: element.propertyName?.text || element.name.text,
									localId: element.propertyName ? element.name.text : undefined,
								}
							})
						}
					}
				}
			
				iegn.imports.push(importAstNode)
			}
		}
	}
	
	return iegn
}


// HELPERS

const VALID_EXTENSIONS = [ '.js', '.ts', '.jsx', '.tsx' ]

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
