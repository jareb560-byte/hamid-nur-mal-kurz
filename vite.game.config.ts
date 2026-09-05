import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  base:'./',
  plugins:[react()],
  resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},
  css:{postcss:{plugins:[tailwindcss()]}},
  server:{host:'127.0.0.1',port:5193,strictPort:true},
  build:{outDir:'dist/pages',emptyOutDir:true,rolldownOptions:{output:{codeSplitting:{groups:[{name:'world',test:/node_modules\/three/},{name:'react',test:/node_modules\/(react|react-dom|scheduler)\//}]}}}},
});
