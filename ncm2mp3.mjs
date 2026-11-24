import { dump } from 'ncmdump-js'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const [src, outDir = './out'] = process.argv.slice(2)
if (!src) { console.error('用法: node ncm2mp3.mjs <ncm文件> [输出目录]'); process.exit(1) }

await mkdir(outDir, { recursive: true })

const buf = await readFile(src)
// fetchMissingCover: false 避免额外的网络请求；要封面就设 true
const r = await dump(buf, { fixMetadata: true, fetchMissingCover: false })

const base = path.basename(src, path.extname(src))
const dst = path.join(outDir, `${base}.${r.extension}`)
// r.audio 是裸音频；要连封面一起写进去就用 r.blob
await writeFile(dst, Buffer.from(r.audio))

console.log('完成:', dst)
console.log('格式:', r.extension, '| 时长:', r.metadata?.duration, 'ms | 码率:', r.metadata?.bitrate)
