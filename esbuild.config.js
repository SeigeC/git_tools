import esbuild from "esbuild";
// Automatically exclude all node_modules from the bundled version
import ImportGlobPlugin from 'esbuild-plugin-import-glob'

esbuild.build({
    entryPoints: ['./index.ts'],
    outfile: './index.js',
    bundle: true,
    minify: true,
    platform: 'node',
    format: "esm",
    plugins: [ImportGlobPlugin.default()]
}).catch(err => {
    console.log(err)
    process.exit(1)
})
