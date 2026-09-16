import {defineConfig} from 'vite';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('./worldmirror',import.meta.url)),base:'./',publicDir:false,build:{outDir:'../../worldmirror/viewer',emptyOutDir:true}});
