import { assert } from "../deps/std/assert.ts";
import * as path from "../deps/std/path.ts"

import { Walker } from "../deps/magiked/magiked.ts"
import type { JsPayload, TsPayload } from "../deps/magiked/magiked-typescript-loader.ts"

import { importExportLoader } from "./ImportExportLoader.ts"
import type { ImportExportPayload } from "./ImportExportLoader.ts"

const DATA_BASE_PATH = "tests/"

Deno.test("import/export loader", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH)

	const walker = new Walker<JsPayload|TsPayload|ImportExportPayload>()
	await walker.init(dir,
	{
		handlers :
		{
			".js" : { loader : importExportLoader },
			".ts" : { loader : importExportLoader }
		}
	})
	
	const node = walker.pathAsStringToNode('one.ts')
	assert(node && node.kind == 'FILE')
	
	const payload = node.payload
	assert(payload)
	assert(payload.type == 'importexport')
	
	const { imports } = payload.rootAst
	const importAst = imports[0]
	
	const localBinding = importAst?.bindings?.[0].localId
	assert(localBinding && localBinding == 'add')
	
	assert(importAst.kind == 'Package')
	assert(importAst.path == 'module')
});
