import { assert, assertEquals } from '../deps/std/assert.ts'
import * as path from '../deps/std/path.ts'

import { Walker } from '../deps/magiked/magiked.ts'
import { processorForTypescript } from '../deps/magiked/magiked-typescript-loader.ts'
import type { TsPayload } from '../deps/magiked/magiked-typescript-loader.ts'

import { processorForImportExport } from './ImportExportLoader.ts'
import type { ImportExportPayload } from './ImportExportLoader.ts'

const DATA_BASE_PATH = 'tests/'

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
	
	assertEquals(importAst.named, [{ symbolId : 'add', localId : undefined }])
	assertEquals(importAst.loc, { start : 0, end : 29 })
	
	assertEquals(importAst.moduleSpecifier,
	{
		specifier : 'module',
		prefix : undefined,
		isPackageId : true,
	})
})
