import * as path from '../deps/std/path.ts'

import type { Payload } from '../deps/magiked/magiked.ts'

import { ts } from '../deps/magiked/magiked-typescript-loader.ts'
import type { TS } from '../deps/magiked/magiked-typescript-loader.ts'
import { assert } from '../deps/std/assert.ts'


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
		const ast = await parseImportExportStatements(source, options.filepath)
		
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

export interface ModuleSpecifier
{
	prefix?: string
	specifier: string
	isPackageId?: boolean
}

export interface MetaAst
{
	loc:
	{
		start: number
		end: number
	}
}

export interface ImportMetaAst extends MetaAst
{
	type: 'ImportMetaAst'
	
	default?: string
	namespace?: string
	named?:
	{
		name: string
		alias?: string
	}[]
	
	moduleSpecifier: ModuleSpecifier
}

interface ExportDeclarationAst extends MetaAst
{
	type: 'ExportDeclarationAst';
	kind: 'variable' | 'function' | 'function*' | 'class',
	isDefault?: boolean;
	declarations:
	{
		name?: string;
		alias?: string;
		kind?: 'const' | 'let' | 'var',
		//initializer?: any;
		//isObjectPattern? boolean (in which case, there's no "name")
		//isArrayPattern? boolean (in which case, there's no "name")
	}[]
}

export interface ReexportMetaAst extends MetaAst
{
	type: 'ReexportMetaAst'
	
	named?:
	{
		name: string;
		alias?: string;
	}[];
	
	namespace?: boolean;
	namespaceAlias?: string;
	moduleSpecifier: ModuleSpecifier
}

export interface ImportExportGraphNode
{
	imports: ImportMetaAst[]
	exports: ExportDeclarationAst[]
	reexports: ReexportMetaAst[]
}

export async function parseImportExportStatements (source: TS.SourceFile, filepath: string): Promise<ImportExportGraphNode>
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
			const importDeclaration = statement as TS.ImportDeclaration
			
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
			}
			
			const loc =
			{
				start : importDeclaration.pos,
				end : importDeclaration.end
			}
			
			const importAstNode: ImportMetaAst =
			{
				type : 'ImportMetaAst',
				moduleSpecifier,
				loc
			}
			
			if (importDeclaration.importClause)
			{
				const { name, namedBindings } = importDeclaration.importClause
		
				if (name)
				{
					importAstNode.default = name.text
				}
			
				if (namedBindings)
				{
					if (ts.isNamespaceImport(namedBindings))
					{
						importAstNode.namespace = namedBindings.name.text
					}
					else if (ts.isNamedImports(namedBindings))
					{
						importAstNode.named = namedBindings.elements.map( (element) =>
						{
							return {
								name : element.propertyName?.text || element.name.text,
								alias : element.propertyName ? element.name.text : undefined,
							}
						})
					}
				}
			}
		
			iegn.imports.push(importAstNode)
			
		}
		// For re-exports aka Aggregation exports
		else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier)
		{
			const moduleSpecifierText = (statement.moduleSpecifier as ts.StringLiteral).text

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
			}
			
			const loc =
			{
				start: statement.pos,
				end: statement.end,
			}

			if (statement.exportClause)
			{
				// We're considering that the export either has named exports 
				// or is a namespace export. It can be both actually:
				//   export * as ns, { name1 as alias1 } from "module-name";
				// but the way TS parses it is insane:
				// It says:
				//   { name1 as alias1 }
				// Is the moduleSpecifier of the ExportDeclaration
				
				if (ts.isNamedExports(statement.exportClause))
				{
					iegn.reexports.push(
					{
						type: 'ReexportMetaAst',
						named: statement.exportClause.elements.map( (element) =>
						{
							// If propertyName is defined, it is the initial name of the import
							// and name is the local alias
							if (element.propertyName)
							{
								return {
									name : element.propertyName.text,
									alias : element.name.text,
								}
							}
							// If not, then *name* is the initial name of the import
							// (and there's no alias)
							else
							{
								return {
									name : element.name.text,
									alias : undefined,
								}
							}
							
						}),
						
						moduleSpecifier,
						loc
					});
				}
				else
				{
					iegn.reexports.push(
					{
						type: 'ReexportMetaAst',
						namespace : ts.isNamespaceExport(statement.exportClause),
						namespaceAlias: statement.exportClause.name?.text,
						moduleSpecifier,
						loc
					});
				}
			}
			else
			{
				iegn.reexports.push(
				{
					type: 'ReexportMetaAst',
					namespace: true,
					moduleSpecifier,
					loc
				});
			}
		}
		// For export declarations
		else if ('modifiers' in statement && Array.isArray(statement.modifiers) && statement.modifiers.some( (modifier) => modifier.kind == ts.SyntaxKind.ExportKeyword))
		{
			let exportAst: ExportDeclarationAst | undefined = undefined
			
			const loc =
			{
				start: statement.pos,
				end: statement.end,
			}
			
			// If it's a variable
			if (statement.kind == ts.SyntaxKind.VariableStatement)
			{
				const variableSt = statement as TS.VariableStatement
				const variableDeclList = variableSt.declarationList
				const kind = (variableDeclList.flags & ts.NodeFlags.Const)
									? 'const' as const
									: (variableDeclList.flags & ts.NodeFlags.Let)
									? 'let' as const
									: 'var' as const
				
				const declarations = variableDeclList.declarations.map( (decl) =>
				{
					assert(ts.isIdentifier(decl.name)) // fixme: if it's not, we have an object or array pattern
					
					return {
						name : decl.name.escapedText.toString(),
						alias : undefined,  // fixme: does it even exist in this context ?
						kind
					}
				})
				
				exportAst =
				{
					type : 'ExportDeclarationAst',
					kind : 'variable',
					loc,
					declarations,
					isDefault : undefined
				}
			}
			// If it's a function
			else if (statement.kind == ts.SyntaxKind.FunctionDeclaration && (statement as TS.FunctionDeclaration).asteriskToken == undefined)
			{
				exportAst =
				{
					type : 'ExportDeclarationAst',
					kind : 'function',
					loc,
					declarations : [],
					isDefault : false
				}
				
				// ...
				
			}
			// If it's a function generator
			else if (statement.kind == ts.SyntaxKind.FunctionDeclaration && (statement as TS.FunctionDeclaration).asteriskToken?.kind == ts.SyntaxKind.AsteriskToken)
			{
				exportAst =
				{
					type : 'ExportDeclarationAst',
					kind : 'function*',
					loc,
					declarations : [],
					isDefault : false
				}
				
				// ...
				
			}
			// If it's a class
			else if (statement.kind == ts.SyntaxKind.ClassDeclaration)
			{
				exportAst =
				{
					type : 'ExportDeclarationAst',
					kind : 'class',
					loc,
					declarations : [],
					isDefault : false
				}
				
				// ...

			}
			
			assert(exportAst)
			iegn.exports.push(exportAst)
		}
/*
		{
			const exportDeclarationAst: ExportDeclarationAst = 
			{
				type: 'ExportDeclarationAst',
				kind: 'object',
				isDefault: ts.isExportAssignment(statement),
				declarations: [],
			};
	  
			if (ts.isExportDeclaration(statement)) {
			  if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
				exportDeclarationAst.kind = 'object';
				statement.exportClause.elements.forEach(element => {
				  exportDeclarationAst.declarations.push({
					name: element.name.text,
					alias: element.propertyName?.text,
				  });
				});
			  }
			} else if (ts.isExportAssignment(statement)) {
			  exportDeclarationAst.kind = 'object';
			  exportDeclarationAst.declarations.push({
				name: 'default',
				alias: undefined,
				initializer: statement.expression,
			  });
			}
	  
			iegn.exports.push(exportDeclarationAst);
		}
*/
	}
	
	return iegn
}

export async function parseImportExportStatementsFromString (source: string, filepath: string): Promise<ImportExportGraphNode>
{
	const sourceAst = ts.createSourceFile(
		filepath,
		source,
		ts.ScriptTarget.Latest,
		true
	)
	
	return await parseImportExportStatements(sourceAst, filepath)
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
