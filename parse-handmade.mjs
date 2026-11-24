// 手写复刻：不用任何第三方库，纯 Node 内置 crypto 把 NCM 拆开
// 目的是把“方法三”内部真正发生的事一步步展开，可逐行对照
import { readFile } from 'node:fs/promises'
import crypto from 'node:crypto'

// 两个硬编码常量，所有 NCM 文件共用
const CORE_KEY = Buffer.from('687A4852416D736F356B496E62617857', 'hex') // ASCII "hzHRAmso5kInbaxW"
const META_KEY = Buffer.from('2331346C6A6B5F215C5D2630553C2728', 'hex') // ASCII "#14ljk_!\\]&0U<'("

// AES-128-ECB，关闭 padding（NCM 里数据本身是对齐的，不补位）
function aes128ecbDecrypt(key, data) {
  const d = crypto.createDecipheriv('aes-128-ecb', key, null)
  d.setAutoPadding(false)
  return Buffer.concat([d.update(data), d.final()])
}

// 手动去 PKCS7 填充：末字节即填充长度，必须校验合法性后再截断
function pkcs7Unpad(buf) {
  const pad = buf[buf.length - 1]
  if (pad < 1 || pad > 16) return buf
  for (let i = buf.length - pad; i < buf.length; i++) {
    if (buf[i] !== pad) return buf
  }
  return buf.slice(0, buf.length - pad)
}

// 标准 RC4 KSA：按 key 逐字节累加并交换，生成 256 字节置换表
function buildKeyBox(key) {
  const box = Buffer.alloc(256)
  for (let i = 0; i < 256; i++) box[i] = i
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + box[i] + key[i % key.length]) & 0xff
    const swap = box[i]
    box[i] = box[j]
    box[j] = swap
  }
  return box
}
export { buildKeyBox, decryptAudio }

// 用置换表逐字节异或还原音频流
function decryptAudio(box, data) {
  for (let i = 0; i < data.length; i++) {
    const j = (i + 1) & 0xff
    data[i] ^= box[(box[j] + box[(box[j] + j) & 0xff]) & 0xff]
  }
}

export function parseNcm(buf) {
  let o = 0
  const magic = buf.slice(0, 8).toString()   // "neteasecloudmusic"
  o = 10                                     // 8 字节魔数 + 2 字节间隔

  // ---- 1. 密钥段 ----
  const keyLen = buf.readUInt32LE(o); o += 4
  const keyRaw = Buffer.from(buf.slice(o, o + keyLen)); o += keyLen
  for (let i = 0; i < keyRaw.length; i++) keyRaw[i] ^= 0x64   // 第一层 XOR
  const rc4Key = pkcs7Unpad(aes128ecbDecrypt(CORE_KEY, keyRaw)).slice(17) // 去填充，再扔掉前缀 "neteasecloudmusic"

  // ---- 2. 元数据段 ----
  const metaLen = buf.readUInt32LE(o); o += 4
  const metaRaw = Buffer.from(buf.slice(o, o + metaLen)); o += metaLen
  for (let i = 0; i < metaRaw.length; i++) metaRaw[i] ^= 0x63
  const metaPlain = pkcs7Unpad(aes128ecbDecrypt(META_KEY, Buffer.from(metaRaw.slice(22).toString(), 'base64'))).slice(6)
  const metadata = JSON.parse(metaPlain.toString())

  // ---- 3. 跳过 CRC / gap / 封面 ----
  o += 4                                        // CRC32
  o += 5                                        // gap
  const imageSize = buf.readUInt32LE(o); o += 4
  const image = buf.slice(o, o + imageSize); o += imageSize

  // ---- 4. 音频段 -----
  const audio = Buffer.from(buf.slice(o))
  decryptAudio(buildKeyBox(rc4Key), audio)

  return { magic, rc4Key: rc4Key.toString(), metadata, image, audio, format: metadata.format }
}

const src = process.argv[2]
if (src) {
  const buf = await readFile(src)
  const r = parseNcm(buf)
  const md5 = crypto.createHash('md5').update(r.audio).digest('hex')
  console.log(JSON.stringify({
    magic: r.magic,
    rc4Key: r.rc4Key,
    format: r.format,
    audioBytes: r.audio.length,
    audioMd5: md5,
    imageBytes: r.image.length,
    musicName: r.metadata.musicName,
    artistName: r.metadata.artistName,
    album: r.metadata.album,
    bitrate: r.metadata.bitrate,
    duration: r.metadata.duration,
  }, null, 2))
}
