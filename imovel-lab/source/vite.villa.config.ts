import {defineConfig} from 'vite';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('./villa',import.meta.url)),base:'./',publicDir:false,build:{outDir:'../../villa-alpina',emptyOutDir:true}});
