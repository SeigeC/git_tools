import esbuild from "esbuild";
// Automatically exclude all node_modules from the bundled version
import {nodeExternalsPlugin} from 'esbuild-node-externals'
import ImportGlobPlugin from 'esbuild-plugin-import-glob'

esbuild.build({
    entryPoints: ['./index.ts'],
    outfile: './index.js',
    bundle: true,
    // minify: true,
    platform: 'node',
    sourcemap: true,
    format: "esm",
    plugins: [ImportGlobPlugin.default(), nodeExternalsPlugin()]
}).catch(err => {
    console.log(err)
    process.exit(1)
})
