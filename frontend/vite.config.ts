import {defineConfig} from 'vite';

// A same-origin rewrite lets the broker cookie work on a separate Netlify frontend.
export default defineConfig({
  server:{proxy:{'/api/freight':'http://localhost:8080'}},
  plugins:[{
    name:'freight-api-proxy',
    generateBundle(){
      const origin=process.env.FREIGHT_API_ORIGIN;
      if(!origin)return;
      const url=new URL(origin);
      if(url.protocol!=='https:'||url.origin!==origin)throw Error('FREIGHT_API_ORIGIN must be an HTTPS origin without a trailing slash.');
      this.emitFile({type:'asset',fileName:'_redirects',source:`/api/freight/* ${url.origin}/api/freight/:splat 200!\n`});
    }
  }]
});
