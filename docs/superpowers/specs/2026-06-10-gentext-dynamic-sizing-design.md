# genText 动态尺寸设计

## 目标

让 genText 输出的每个元素携带归一化的 `width`/`height`（0-1），画布插入时按实际比例渲染，而非所有图片统一 150x150。同时根据元素宽高比选择合适的图片生成分辨率。

## 涉及文件

| 文件 | 变更 |
|------|------|
| `agent/src/services/genText.ts` | TextElement schema 新增 width/height；更新 system prompt 和示例 |
| `agent/src/services/genImage.ts` | 新增 size 参数，根据宽高比选择生成分辨率 |
| `agent/src/index.ts` | POST /genImage 路由传递 size 参数 |
| `src/components/ImageCanvas.vue` | insertImageToCanvas 使用归一化尺寸；generateAndInsertImage 传递宽高比 |

## 详细设计

### 1. TextElement Schema（genText.ts）

新增两个字段：

```ts
width: z.number().min(0.05).max(0.95).describe("元素宽度占比，0-1归一化，占画布宽度的比例"),
height: z.number().min(0.05).max(0.95).describe("元素高度占比，0-1归一化，占画布高度的比例"),
```

### 2. System Prompt 更新（genText.ts）

在 prompt 中新增 width/height 的说明：

```
- width: 元素宽度(0-1归一化)，占画布宽度的比例，根据元素在画面中的大小设置
- height: 元素高度(0-1归一化)，占画布高度的比例，根据元素在画面中的大小设置
```

尺寸指导规则：
- 背景元素：width/height 通常 0.8-0.95（铺满或接近铺满画布）
- 主体元素（人、动物等）：width/height 通常 0.3-0.6
- 小物件/装饰：width/height 通常 0.1-0.25
- 文字元素：不需要 width/height

更新所有示例，加入 width/height 字段。

### 3. genImage 动态尺寸（genImage.ts）

函数签名变为：

```ts
export async function genImage(prompt: string, size?: string): Promise<string>
```

默认 size 为 `"1024x1024"`。支持的尺寸列表（Kolors 模型常见支持）：

- `"1024x1024"` — 1:1
- `"1024x768"` — 4:3 横版
- `"768x1024"` — 3:4 竖版
- `"1024x640"` — 16:10 横版
- `"640x1024"` — 10:16 竖版

根据传入的宽高比选择最接近的尺寸。

### 4. 路由层（index.ts）

POST /genImage 路由接受可选 `size` 字段，传递给 genImage。

### 5. 前端画布插入（ImageCanvas.vue）

`insertImageToCanvas` 中：

```ts
const w = (element.width || 0.2) * canvasWidth;
const h = (element.height || 0.2) * canvasHeight;
```

替换原来的硬编码 `width: 150, height: 150`。

`generateAndInsertImage` 中计算宽高比并选择生成尺寸：

```ts
const aspectWidth = element.width || 0.2;
const aspectHeight = element.height || 0.2;
const size = selectImageSize(aspectWidth, aspectHeight);
```

## 数据流

```
用户输入 prompt
  → POST /genText
  → genText (LLM 输出含 width/height 的元素数组)
  → 前端遍历元素
    → POST /genImage { prompt, size }
    → genImage (根据 size 参数调用 SiliconFlow API)
    → insertImageToCanvas(element, imageUrl)
      → 按 element.width/height 计算画布像素尺寸
      → 创建 Rect 插入 LeaferJS 画布
```

## 向后兼容

- 如果 LLM 返回的元素缺少 width/height（旧缓存或兼容），前端 fallback 到 0.2（约 216px @ 1080 宽画布）
- genImage 的 size 参数可选，不传时默认 1024x1024
