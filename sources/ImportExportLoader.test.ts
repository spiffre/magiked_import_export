import { assert, assertEquals } from '../deps/std/assert.ts'
import * as path from '../deps/std/path.ts'

import { Walker } from '../deps/magiked/magiked.ts'
import { processorForTypescript } from '../deps/magiked/magiked-typescript-loader.ts'
import type { TsPayload } from '../deps/magiked/magiked-typescript-loader.ts'

import { processorForImportExport, parseImportExportStatementsFromString } from './ImportExportLoader.ts'
import type { ImportExportPayload } from './ImportExportLoader.ts'

const DATA_BASE_PATH = 'tests/'


// IMPORT STATEMENTS

Deno.test("parseImportStatements - example 1", async () =>
{
	const sourceCode = 'import defaultExport from "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, "whatever")
	
	const importAst = result.imports[0]
	
	assert(importAst)
	assertEquals(importAst.default, "defaultExport")
	assertEquals(importAst.moduleSpecifier,
	{
		specifier : "module",
		prefix : undefined,
		isPackageId : true,
	})
})

Deno.test('parseImportStatements - example 2', async () =>
{
	const sourceCode = 'import * as name from "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')

	const importAst = result.imports[0]

	assert(importAst)
	assertEquals(importAst.default, undefined)
	assertEquals(importAst.namespace, 'name')
	assertEquals(importAst.moduleSpecifier,
	{
		specifier: 'module',
		prefix: undefined,
		isPackageId: true,
	})
})

Deno.test('parseImportStatements - example 3', async () =>
{
	const sourceCode = 'import { export1 } from "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')

	const importAst = result.imports[0]

	assert(importAst)
	assertEquals(importAst.default, undefined)
	assertEquals(importAst.namespace, undefined)
	assertEquals(importAst.named, [{ name : 'export1', alias : undefined }])
	assertEquals(importAst.moduleSpecifier,
	{
		specifier: 'module',
		prefix: undefined,
		isPackageId: true,
	})
})

Deno.test('parseImportStatements - example 4', async () =>
{
	const sourceCode = 'import { export1 as alias1 } from "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')

	const importAst = result.imports[0]

	assert(importAst)
	assertEquals(importAst.default, undefined)
	assertEquals(importAst.namespace, undefined)
	assertEquals(importAst.named, [{ name : 'export1', alias : 'alias1' }])
	assertEquals(importAst.moduleSpecifier,
	{
		specifier: 'module',
		prefix: undefined,
		isPackageId: true,
	})
})

Deno.test('parseImportStatements - example 5', async () =>
{
	const sourceCode = 'import { default as alias } from "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')

	const importAst = result.imports[0]

	assert(importAst)
	assertEquals(importAst.default, undefined)
	assertEquals(importAst.namespace, undefined)
	assertEquals(importAst.named,
	[
		{ name : 'default', alias : 'alias' },
	])
	assertEquals(importAst.moduleSpecifier,
	{
		specifier: 'module',
		prefix: undefined,
		isPackageId: true,
	})
})

Deno.test('parseImportStatements - example 6', async () =>
{
	const sourceCode = 'import { export1, export2 } from "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')

	const importAst = result.imports[0]

	assert(importAst)
	assertEquals(importAst.default, undefined)
	assertEquals(importAst.namespace, undefined)
	assertEquals(importAst.named,
	[
		{ name : 'export1', alias : undefined },
		{ name : 'export2', alias : undefined },
	])
	assertEquals(importAst.moduleSpecifier,
	{
		specifier: 'module',
		prefix: undefined,
		isPackageId: true,
	})
})

Deno.test('parseImportStatements - example 7', async () =>
{
	const sourceCode = 'import { export1, export2 as alias2 } from "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')

	const importAst = result.imports[0]

	assert(importAst)
	assertEquals(importAst.default, undefined)
	assertEquals(importAst.namespace, undefined)
	assertEquals(importAst.named,
	[
		{ name : 'export1', alias : undefined },
		{ name : 'export2', alias : 'alias2' },
	])
	assertEquals(importAst.moduleSpecifier,
	{
		specifier: 'module',
		prefix: undefined,
		isPackageId: true,
	})
})

Deno.test('parseImportStatements - example 9', async () =>
{
	const sourceCode = 'import defaultExport, { export1 } from "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')

	const importAst = result.imports[0]

	assert(importAst)
	assertEquals(importAst.default, 'defaultExport')
	assertEquals(importAst.namespace, undefined)
	assertEquals(importAst.named, [{ name : 'export1', alias : undefined }])
	assertEquals(importAst.moduleSpecifier,
	{
		specifier: 'module',
		prefix: undefined,
		isPackageId: true,
	})
})

Deno.test('parseImportStatements - example 10', async () =>
{
	const sourceCode = 'import defaultExport, * as name from "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')

	const importAst = result.imports[0]

	assert(importAst)
	assertEquals(importAst.default, 'defaultExport')
	assertEquals(importAst.namespace, 'name')
	assertEquals(importAst.named, undefined)
	assertEquals(importAst.moduleSpecifier,
	{
		specifier: 'module',
		prefix: undefined,
		isPackageId: true,
	})
})

Deno.test('parseImportStatements - example 11', async () =>
{
	const sourceCode = 'import "module"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')
	const importAst = result.imports[0]

	assert(importAst)
	assertEquals(importAst.default, undefined)
	assertEquals(importAst.namespace, undefined)
	assertEquals(importAst.named, undefined)
	assertEquals(importAst.moduleSpecifier,
	{
		specifier: 'module',
		prefix: undefined,
		isPackageId: true,
	})
})

// The way TypeScript parses this example is insane amnd it doesn't matter because no-one uses it
//Deno.test('parseImportStatements - example 8', { only : true }, async () =>
//{
//	const sourceCode = 'import { "string name" as alias } from "module"'
//	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')
//
//	const importAst = result.imports[0]
//
//	assert(importAst)
//	assertEquals(importAst.default, undefined)
//	assertEquals(importAst.namespace, undefined)
//	assertEquals(importAst.named, [{ name : 'string name', alias : 'alias' }])
//	assertEquals(importAst.moduleSpecifier,
//	{
//		specifier: 'module',
//		prefix: undefined,
//		isPackageId: true,
//	})
//})


// REEXPORT / AGGREGATION EXPORT STATEMENTS


Deno.test("parseReexportStatements - example 1", async () =>
{
	const sourceCode = 'export * from "package-id"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')
	const reexportAst = result.reexports[0]
  
	assertEquals(reexportAst.type, "ReexportMetaAst")
	assertEquals(reexportAst.moduleSpecifier,
	{
		specifier : "package-id",
		prefix : undefined,
		isPackageId : true
	})
	assertEquals(reexportAst.named, undefined)
	assertEquals(reexportAst.namespace, true)
	assertEquals(reexportAst.namespaceAlias, undefined)
})

Deno.test("parseReexportStatements - example 2", async () =>
{
	const sourceCode = 'export * as name1 from "package-id"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')
	const reexportAst = result.reexports[0]

	assertEquals(reexportAst.type, "ReexportMetaAst")
	assertEquals(reexportAst.moduleSpecifier,
	{
		specifier : "package-id",
		prefix : undefined,
		isPackageId : true
	})
	assertEquals(reexportAst.named, undefined)
	assertEquals(reexportAst.namespace, true)
	assertEquals(reexportAst.namespaceAlias, "name1")
})

Deno.test("parseReexportStatements - example 3", async () =>
{
	const sourceCode = 'export { name1 } from "package-id"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')
	const reexportAst = result.reexports[0]

	assertEquals(reexportAst.type, "ReexportMetaAst")
	assertEquals(reexportAst.moduleSpecifier,
	{
		specifier : "package-id",
		prefix : undefined,
		isPackageId : true
	})
	assertEquals(reexportAst.named,
	[
		{ name: "name1", alias: undefined }
	])
	assertEquals(reexportAst.namespace, undefined)
	assertEquals(reexportAst.namespaceAlias, undefined)
})

Deno.test("parseReexportStatements - example 4", async () =>
{
	const sourceCode = 'export { import1 as name1, import2 as name2 } from "package-id"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')
	const reexportAst = result.reexports[0]

	assertEquals(reexportAst.type, "ReexportMetaAst")
	assertEquals(reexportAst.moduleSpecifier,
	{
		specifier : "package-id",
		prefix : undefined,
		isPackageId : true
	})
	assertEquals(reexportAst.named,
	[
		{ name: "import1", alias: "name1" },
		{ name: "import2", alias: "name2" },
	])
	assertEquals(reexportAst.namespace, undefined)
	assertEquals(reexportAst.namespaceAlias, undefined)
})

Deno.test("parseReexportStatements - example 5", async () =>
{
	const sourceCode = 'export { default } from "module-name"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')
	const reexportAst = result.reexports[0]

	assertEquals(reexportAst.type, "ReexportMetaAst")
	assertEquals(reexportAst.moduleSpecifier,
	{
		specifier : "module-name",
		prefix : undefined,
		isPackageId : true 
	})
	assertEquals(reexportAst.named,
	[
		{ name: "default", alias: undefined }
	])
	assertEquals(reexportAst.namespace, undefined)
	assertEquals(reexportAst.namespaceAlias, undefined)
})

Deno.test("parseReexportStatements - example 6", async () =>
{
	const sourceCode = 'export { default as name1 } from "module-name"'
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')
	const reexportAst = result.reexports[0]

	assertEquals(reexportAst.type, "ReexportMetaAst")
	assertEquals(reexportAst.moduleSpecifier, { specifier: "module-name", prefix: undefined, isPackageId: true })
	assertEquals(reexportAst.named,
	[
		{ name: "default", alias: "name1" }
	])
	assertEquals(reexportAst.namespace, undefined)
	assertEquals(reexportAst.namespaceAlias, undefined)
})


// EXPORTING DECLARATION

Deno.test("parseExportDeclarationStatements - example 2", { only : true }, async () =>
{
	const sourceCode = 'export const name1 = 1, name2 = 2;';
	const result = await parseImportExportStatementsFromString(sourceCode, 'whatever')
	const exportAst = result.exports[0]
  
	assertEquals(exportAst.type, "ExportDeclarationAst");
	assertEquals(exportAst.kind, "variable");
	assertEquals(exportAst.isDefault, undefined);
	assertEquals(exportAst.declarations,
	[
		{ name: "name1", alias: undefined, kind : 'const' },
		{ name: "name2", alias: undefined, kind : 'const' },
	]);
});






Deno.test('import/export loader', async () =>
{
	const dir = path.resolve(DATA_BASE_PATH)

	const walker = new Walker<TsPayload|ImportExportPayload>()
	await walker.init(dir,
	{
		async onFileNodeEnter (node, _, filepath)
		{
			// filepath is provided only on first pass
			assert(filepath)
			
			const content = await Deno.readTextFile(filepath)

			if (Walker.matches.glob(filepath, '**/*.{ts,js}'))
			{
				node.payload = processorForTypescript(content, { filepath })
			}
		}
	})
	
	await walker.traverse(
	{
		async onFileNodeEnter (node)
		{
			if (node.payload?.type == 'typescript')
			{
				const filepath = walker.nodeToPathAsString(node)
				node.payload = await processorForImportExport(node.payload.ast, { filepath })
			}
		}
	})
	
	const node = walker.pathAsStringToNode('one.ts')
	assert(node && node.kind == 'FILE')
	
	const payload = node.payload
	assert(payload)
	assert(payload.type == 'importexport')
	
	const { imports } = payload.ast
	const importAst = imports[0]
	
	assertEquals(importAst.named, [{ name  : 'add', alias  : undefined }])
	assertEquals(importAst.loc, { start : 0, end : 29 })
	
	assertEquals(importAst.moduleSpecifier,
	{
		specifier : 'module',
		prefix : undefined,
		isPackageId : true,
	})
})
