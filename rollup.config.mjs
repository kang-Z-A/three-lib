import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import image from '@rollup/plugin-image';
import terser from '@rollup/plugin-terser'

const config = [
  {
    input: "src/index.ts",
    output: [
      {
        file: './build/index.esm.js',
        inlineDynamicImports: true,
        format: 'es',
        sourcemap: true,
      }
    ],
    plugins: [
      typescript({
        outDir: './build',
        tsconfig: './tsconfig.json'
      }),
      resolve(),
      image(),
      terser({
        compress:{
          drop_console:true
        }
      })
    ],
    external: ['three']
  },
  {
    input: "src/index.ts",
    output: [
      {
        file: './build/index.dev.esm.js',
        inlineDynamicImports: true,
        format: 'es',
        sourcemap: true,
      }
    ],
    plugins: [
      typescript({
        outDir: './build',
        tsconfig: './tsconfig.json'
      }),
      resolve(),
      image(),
      terser({
        compress:{
          drop_console:false
        }
      })
    ],
    external: ['three']
  },
  {
    input: "src/index.ts",
    output: [{
      file: "./build/index.d.ts",
      format: "es",
      // inlineDynamicImports: true
    }],
    plugins: [dts()],
    external: ['three']
  }
]

export default config