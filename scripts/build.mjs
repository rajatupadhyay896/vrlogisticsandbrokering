// Keep the CPython assets together so the function can load them from disk.
import {copyFile, cp, mkdir, writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const dest=new URL('runtime/',root);
await mkdir(dest,{recursive:true});
await writeFile(new URL('package.json',dest),JSON.stringify({type:'commonjs'}));
for(const file of ['pyodide.mjs','pyodide.asm.js','pyodide.asm.wasm','pyodide-lock.json','python_stdlib.zip']){
  await copyFile(new URL('node_modules/pyodide/'+file,root),new URL(file,dest));
}
await cp(new URL('freight/',root),new URL('freight/',dest),{recursive:true,filter:path=>!path.includes('__pycache__')});
