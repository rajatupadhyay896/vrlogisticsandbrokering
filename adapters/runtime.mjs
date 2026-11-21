import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

async function initialize(){
  const directory=resolve('runtime');
  const {loadPyodide}=await import(pathToFileURL(join(directory,'pyodide.mjs')).href);
  const py=await loadPyodide({indexURL:directory+'/'});
  py.FS.mkdirTree('/home/pyodide/freight');
  for(const file of await readdir(join(directory,'freight'))){
    if(file.endsWith('.py'))py.FS.writeFile('/home/pyodide/freight/'+file,await readFile(join(directory,'freight',file)));
  }
  py.runPython(`import json
from freight.api import handle
from freight.common import new_db
def invoke(request_json, database_json):
    db = json.loads(database_json) if database_json else new_db()
    return json.dumps(handle(db, json.loads(request_json)), ensure_ascii=False)`);
  return py.globals.get('invoke');
}
let ready;
export async function run(request,db){
  ready??=initialize().catch(error=>{ready=undefined;throw error;});
  const invoke=await ready;
  return JSON.parse(invoke(JSON.stringify(request),db?JSON.stringify(db):''));
}
