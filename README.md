# ncm-tools

网易云音乐 `.ncm` 加密容器的解包工具集。项目内并行提供两套实现：

- **ncmdump**：C++ 静态编译的命令行二进制，进程级调用，整文件进、整文件出。
- **ncmdump-js**：纯 JavaScript 实现，以模块形式被脚本调用，数据全程驻留内存。

两套实现共用同一解析算法，输出音频流逐字节一致；差异仅在调用界面与标签处理策略。

---

## 1. 目录结构

```
D:\Project\ncm-tools\
├─ ncmdump.exe           ncmdump v1.5.1 Windows x64 二进制（850,432 B）
├─ ncm2mp3.mjs           ncmdump-js 的调用入口，CLI 风格参数
├─ parse-handmade.mjs    零依赖手写解析器，展开 NCM 全部解析步骤（算法参考）
├─ package.json          ESM 项目描述与依赖声明
├─ package-lock.json     依赖版本锁
├─ node_modules\         运行时依赖
│  ├─ ncmdump-js@0.0.3
│  ├─ aes-js@^3.1.2
│  └─ browser-id3-writer@^4.4.0
└─ out\                  默认输出目录
```

---

## 2. 运行时要求

| 实现 | 前置条件 | 说明 |
|---|---|---|
| ncmdump | 无 | 静态链接的独立二进制，不依赖 Node / .NET / VC++ 运行库 |
| ncmdump-js | Node.js ≥ 18 | 依赖内置 `Blob`、`fs/promises`；浏览器端可用 UMD 产物，无 Node 依赖 |

---

## 3. 上游来源与版本

### 3.1 ncmdump（命令行二进制）

| 项 | 值 |
|---|---|
| 上游项目 | `taurusxin/ncmdump`（GitHub） |
| 项目主页 | https://github.com/taurusxin/ncmdump |
| 语言 / 许可证 | C++ / MIT |
| 版本 | v1.5.1 |
| Release 页面 | https://github.com/taurusxin/ncmdump/releases/tag/1.5.1 |
| 下载资源名 | `ncmdump-1.5.1-windows-amd64.zip` |
| 官方下载地址 | https://github.com/taurusxin/ncmdump/releases/download/1.5.1/ncmdump-1.5.1-windows-amd64.zip |
| 镜像下载地址（国内加速） | https://ghfast.top/https://github.com/taurusxin/ncmdump/releases/download/1.5.1/ncmdump-1.5.1-windows-amd64.zip |
| 压缩包大小 | 406,438 B（仅含 `ncmdump.exe` 一个文件） |
| 解压后二进制 | `ncmdump.exe`，850,432 B |
| 同版本其他平台产物 | `ncmdump-1.5.1-linux-amd64.zip`、`ncmdump-1.5.1-macos-arm64.zip`、`libncmdump-1.5.1-windows-amd64.zip`（库形式） |

重新获取命令：

```powershell
curl.exe -L -o ncmdump.zip "https://ghfast.top/https://github.com/taurusxin/ncmdump/releases/download/1.5.1/ncmdump-1.5.1-windows-amd64.zip"
python -c "import zipfile; zipfile.ZipFile('ncmdump.zip').extractall('.')"
```

完整性校验：ZIP 文件头为 `50 4B 03 04`。下载中断会得到约 194,875 B 的残缺包，`zipfile` 抛出 `zipfile.BadZipFile`，需重新下载。

### 3.2 ncmdump-js（JavaScript 模块）

| 项 | 值 |
|---|---|
| npm 包名 | `ncmdump-js` |
| 版本 | 0.0.3 |
| 上游项目 | `ant-cave/ncmdump-js`（GitHub） |
| 项目主页 | https://github.com/ant-cave/ncmdump-js |
| 语言 / 许可证 | JavaScript / MIT |
| 安装命令 | `npm i ncmdump-js` |
| 运行时依赖 | `aes-js@^3.1.2`（AES-128-ECB）、`browser-id3-writer@^4.4.0`（写 ID3v2） |
| 产物 | `dist/ncmdump.js`（ESM）、`dist/ncmdump.cjs`（CJS）、`dist/ncmdump.umd.min.js`（UMD，全局 `NcmDump`） |
| engines | Node ≥ 18 |

重新获取命令：

```powershell
cd D:\Project\ncm-tools
npm i ncmdump-js
```

---

## 4. ncmdump 命令行参考

### 4.1 用法

```
ncmdump [OPTION...] <files>
```

### 4.2 参数

| 参数 | 长格式 | 作用 |
|---|---|---|
| `-d <path>` | `--directory` | 处理指定目录下的 ncm 文件 |
| `-r` | `--recursive` | 配合 `-d` 递归子目录 |
| `-o <path>` | `--output` | 输出目录，缺省为源文件所在目录 |
| `-m` | `--remove` | 转换成功后删除原 ncm |
| `-v` | `--version` | 打印版本 |
| `-h` | `--help` | 打印帮助 |

### 4.3 执行示例

```powershell
cd D:\Project\ncm-tools
.\ncmdump.exe -o .\out "D:\CloudMusic\VipSongsDownload\MY FIRST STORY,HYDE - 夢幻.ncm"
```

标准输出：

```
[Done] 'D:\CloudMusic\VipSongsDownload\MY FIRST STORY,HYDE - 夢幻.ncm' -> '.\out\MY FIRST STORY,HYDE - 夢幻.mp3'
```

批量：

```powershell
.\ncmdump.exe -d "D:\CloudMusic\VipSongsDownload" -r -o .\out
```

输出至源目录（省略 `-o`）：

```powershell
.\ncmdump.exe "D:\CloudMusic\VipSongsDownload\xxx.ncm"
```

### 4.4 行为特征

- 单文件失败不影响同批次其他文件。
- 唯一反馈为退出码与逐行 `[Done]` / 错误文本，不输出结构化数据。
- 自动按 `metadata.format` 决定输出 `mp3` 或 `flac`。
- 自动将 ncm 内嵌封面写入 ID3v2（MP3）或 PICTURE 块（FLAC），因此产物较裸音频大约 100 KB。

---

## 5. ncmdump-js 参考

### 5.1 调用入口：`ncm2mp3.mjs`

```
node ncm2mp3.mjs <ncm文件路径> [输出目录]
```

第二个参数省略时写入 `./out`。

```powershell
cd D:\Project\ncm-tools
node ncm2mp3.mjs "D:\CloudMusic\VipSongsDownload\MY FIRST STORY,HYDE - 夢幻.ncm" .\out
```

标准输出：

```
完成: D:\Project\ncm-tools\out\MY FIRST STORY,HYDE - 夢幻.mp3
格式: mp3 | 时长: 241208 ms | 码率: 320000
```

批量（PowerShell 循环）：

```powershell
Get-ChildItem "D:\CloudMusic\VipSongsDownload" -Filter *.ncm | ForEach-Object {
  node ncm2mp3.mjs $_.FullName .\out
}
```

### 5.2 模块 API

| API | 签名 | 返回 / 作用 |
|---|---|---|
| `dump` | `dump(input, options?) → Promise<DumpResult>` | 解析 + 可选写标签 |
| `parseNcm` | `parseNcm(bytes) → ParseResult` | 仅解析，返回 `{ format, metadata, image, audio }` |
| `fetchCover` | `fetchCover(metadata) → Promise<Uint8Array \| null>` | 从网易云 CDN 拉取封面 |
| `buildKeyBox` | `buildKeyBox(key) → Uint8Array` | 生成 256 字节置换表 |
| `decryptData` | `decryptData(keyBox, buffer) → void` | 原地还原音频流 |
| `aesEcbDecrypt` | `aesEcbDecrypt(key, src) → Uint8Array` | AES-128-ECB 解密（含去 PKCS7） |
| `toUint8Array` | `toUint8Array(input) → Uint8Array` | 输入归一化 |
| `downloadBlob` | `downloadBlob(blob, filename) → void` | 浏览器触发下载 |
| `CORE_KEY` | `Uint8Array` | 密钥段固定密钥 |
| `MODIFY_KEY` | `Uint8Array` | 元数据段固定密钥 |

`DumpResult` 字段：

| 字段 | 类型 | 含义 |
|---|---|---|
| `audio` | `Uint8Array` | 解密后的裸音频（不含新增标签） |
| `blob` | `Blob` | 按 `fixMetadata` 处理后的可下载对象 |
| `filename` / `extension` | `string` | 默认取歌名 + 扩展名 |
| `metadata` | `object \| null` | `musicName` / `artistName` / `album` / `bitrate` / `duration` 等 |
| `image` | `Uint8Array \| null` | 封面原始字节 |
| `download()` | `() => void` | 浏览器触发下载 |

`DumpOptions`：

| 选项 | 默认 | 作用 |
|---|---|---|
| `fixMetadata` | `true` | 写入标题/歌手/专辑/封面 |
| `filename` | 歌名 | 自定义输出文件名（不含扩展名） |
| `fetchMissingCover` | `true` | ncm 未内嵌封面时从 CDN 拉取；关闭可免除网络请求 |

### 5.3 最小调用代码

```js
import { dump } from 'ncmdump-js'
import { readFile, writeFile } from 'node:fs/promises'

const result = await dump(await readFile('song.ncm'), {
  fixMetadata: false,        // 只取裸音频
  fetchMissingCover: false,  // 不发起网络请求
})
await writeFile(result.filename, Buffer.from(result.audio))
```

### 5.4 浏览器端调用（UMD）

```html
<script src="https://cdn.jsdelivr.net/npm/ncmdump-js@latest/dist/ncmdump.umd.min.js"></script>
<script>
document.getElementById('file').addEventListener('change', async (e) => {
  const result = await NcmDump.dump(e.target.files[0])
  result.download()
})
</script>
```

---

## 6. NCM 容器格式与算法

解析流程统一如下，`parse-handmade.mjs` 为该流程的零依赖实现，可单独执行查看中间结果。

| 步骤 | 字段 | 长度 | 处理 |
|---|---|---|---|
| 1 | Magic | 8 B | 固定值 `CTENFDAM` |
| 2 | 间隔 | 2 B | 跳过 |
| 3 | Key 长度 | 4 B | 小端无符号整数 |
| 4 | Key 数据 | 变长 | 逐字节 XOR `0x64` → AES-128-ECB 解密 → 去 PKCS7 填充 → 去前 17 B（`neteasecloudmusic`），结果为音频密钥字符串 |
| 5 | Meta 长度 | 4 B | 小端无符号整数 |
| 6 | Meta 数据 | 变长 | XOR `0x63` → 去前 22 B（`163 key(Don't modify):`）→ Base64 解码 → AES-128-ECB 解密 → 去 PKCS7 填充 → 去前 6 B（`music:`）→ `JSON.parse` |
| 7 | CRC | 4 B | 跳过 |
| 8 | Gap | 5 B | 跳过 |
| 9 | 封面大小 + 数据 | 4 B + 变长 | 4 B 小端长度，随后为图片字节 |
| 10 | 音频流 | 剩余全部 | 由音频密钥生成置换表后逐字节异或还原 |

固定密钥常量（hex）：

| 用途 | 值 |
|---|---|
| 密钥段（`CORE_KEY`） | `687A4852416D736F356B496E62617857`（ASCII `hzHRAmso5kInbaxW`） |
| 元数据段（`MODIFY_KEY`） | `2331346C6A6B5F215C5D2630553C2728`（ASCII `#14ljk_!\]&0U<'(`） |

音频还原算法（标准 RC4 KSA + 定制流式异或）：

```js
function buildKeyBox(key) {
  const box = Buffer.alloc(256)
  for (let i = 0; i < 256; i++) box[i] = i
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + box[i] + key[i % key.length]) & 0xff
    const swap = box[i]; box[i] = box[j]; box[j] = swap
  }
  return box
}

function decryptAudio(box, data) {
  for (let i = 0; i < data.length; i++) {
    const j = (i + 1) & 0xff
    data[i] ^= box[(box[j] + box[(box[j] + j) & 0xff]) & 0xff]
  }
}
```

实现要点：

1. AES 必须关闭自动 padding（数据本身已对齐），解密后手动去除 PKCS7 填充（末字节为填充长度，合法范围 1–16）。
2. KSA 采用标准 RC4 写法（键下标为 `i % keyLen`）；使用 `j % keyLen` 的变体会导致置换表全错，音频成为噪音。
3. 音频密钥是字符串字节而非其 hex 解码结果。

本机实测样本（`MY FIRST STORY,HYDE - 夢幻.ncm`，9.30 MB / MP3 320 kbps）：

| 项 | 值 |
|---|---|
| 音频密钥长度 | 98 B |
| 元数据格式 | `mp3`，`bitrate=320000`，`duration=241208` |
| 内嵌封面 | 99,997 B JPEG |
| 音频段长度 | 9,651,994 B（含 1,190 B ID3v2，裸音频 9,650,804 B） |
| 解析耗时（ncmdump-js） | 73 ms |

---

## 7. 输出、标签与命名

- 扩展名由 `metadata.format` 决定（`mp3` / `flac`）。
- 文件名默认为歌曲名，与源 ncm 同名时直接替换扩展名（`ncm2mp3.mjs` 沿用源文件名，`dump()` 默认取歌名）。
- 同名不同曲目会相互覆盖，批处理需自行拼接歌手或 ID。
- 标签策略：ncmdump 强制写入内嵌封面；ncmdump-js 由 `fixMetadata` 控制。
- 不执行重编码，输出与原始音频比特流一致。

---

## 8. 排障

| 现象 | 原因 | 处理 |
|---|---|---|
| `'ncmdump.exe' 不是内部或外部命令` | 未切换到 `D:\Project\ncm-tools` | 先 `cd D:\Project\ncm-tools` |
| 路径被拆分成多个参数 | 路径含空格/逗号/中文未加引号 | 整体用双引号包裹 |
| `Cannot find package 'ncmdump-js'` | 当前目录无 `node_modules` | 在 `ncm-tools` 下执行 `npm i ncmdump-js` |
| `zipfile.BadZipFile` | 压缩包下载不完整 | 重新下载，核对大小 406,438 B |
| `Expand-Archive` 报 .NET 异常 | 环境 PowerShell 的 .NET 组件异常 | 改用 `python -c "import zipfile; ..."` 解压 |
| 输出音频为噪音 | 未去 PKCS7 填充或 KSA 实现错误 | 见第 6 节实现要点 |
| 输出目录不存在报错 | `-o` 指定目录未创建 | 先 `mkdir out -Force` |

---

## 9. 验收校验

```powershell
# 时长、码率、声道
ffprobe -v error -show_entries format=duration,bit_rate:stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 ".\out\MY FIRST STORY,HYDE - 夢幻.mp3"
```

预期（本机样本）：`mp3` / `44100 Hz` / `2 ch` / `241.208889 s` / `320 kbps`，与 `metadata.duration = 241208` 吻合。

两套实现一致性校验：剥离 ID3v2 标签后比较音频流 MD5，应完全相同。

```python
# 剥离 ID3v2 后计算音频流 MD5
import hashlib, sys
for p in sys.argv[1:]:
    d = open(p, 'rb').read()
    n = 10 + sum((b & 0x7F) << (7 * (3 - i)) for i, b in enumerate(d[6:10])) if d[:3] == b'ID3' else 0
    print(p, len(d) - n, hashlib.md5(d[n:]).hexdigest())
```

---

## 10. 使用范围

仅用于处理个人合法获取的音频文件，用于本机播放或备份；解出的文件不得再分发或用于商业用途。两套上游实现均为 MIT 许可证，遵循其各自条款。
