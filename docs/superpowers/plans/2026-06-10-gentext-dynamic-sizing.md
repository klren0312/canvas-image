# genText 动态尺寸 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 genText 输出的每个图片元素携带归一化的 width/height，画布按实际比例渲染，同时根据宽高比选择合适的图片生成分辨率。

**Architecture:** 修改 TextElement schema 新增 width/height 字段，更新 LLM system prompt 指导输出尺寸，genImage 根据宽高比选择生成分辨率，前端按归一化比例计算像素尺寸插入画布。

**Tech Stack:** TypeScript, Zod, Vercel AI SDK, LeaferJS, Express 5, SiliconFlow API

---

## File Structure

| File | Responsibility |
|------|---------------|
| `agent/src/services/genText.ts` | TextElement schema + LLM prompt（输出 width/height） |
| `agent/src/services/genImage.ts` | 根据宽高比选择生成尺寸 |
| `agent/src/index.ts` | POST /genImage 路由传递 size |
| `src/components/ImageCanvas.vue` | 前端：按归一化尺寸插入画布 + 传递 size 给后端 |

---

### Task 1: 更新 TextElement Schema（genText.ts）

**Files:**
- Modify: `agent/src/services/genText.ts:12-20`

- [ ] **Step 1: 在 TextElementSchema 中添加 width 和 height 字段**

```ts
const TextElementSchema = z.object({
  type: z.enum(["image", "text"]),
  name: z.string(),
  description: z.string().optional(),
  text: z.string().optional(),
  z: z.number().min(0).max(100).describe("层级，0在最底层，100在最顶层"),
  x: z.number().min(0).max(1).describe("x坐标，0-1归一化，0为最左，1为最右"),
  y: z.number().min(0).max(1).describe("y坐标，0-1归一化，0为最上，1为最下"),
  width: z.number().min(0.05).max(0.95).optional().describe("元素宽度占比，0-1归一化，占画布宽度的比例"),
  height: z.number().min(0.05).max(0.95).optional().describe("元素高度占比，0-1归一化，占画布高度的比例"),
});
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd agent && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add agent/src/services/genText.ts
git commit -m "feat: add width/height to TextElement schema"
```

---

### Task 2: 更新 System Prompt（genText.ts）

**Files:**
- Modify: `agent/src/services/genText.ts:32-49`

- [ ] **Step 1: 在 prompt 中添加 width/height 说明，更新示例**

将 genText 函数中的 prompt 字符串替换为以下内容（完整替换 `prompt: \`...\`` 部分）：

```ts
    prompt: `将以下描述拆解成元素列表，只返回JSON数组，不要其他内容。每个元素需要包含：
- type: 元素类型，"image"表示需要生成图片，"text"表示直接显示文字
- name: 元素名称
- description: 当type为"image"时必填，图片描述（主体元素需包含"透明背景"字样）
- text: 当type为"text"时必填，文字内容
- z: 层级(0-100)，背景元素z=0，其他元素按前后景设置
- x: x坐标(0-1归一化)，0为最左，1为最右，根据元素在画面中的位置设置
- y: y坐标(0-1归一化)，0为最上，1为最下，根据元素在画面中的位置设置
- width: 元素宽度(0-1归一化)，占画布宽度的比例，根据元素在画面中的大小设置
- height: 元素高度(0-1归一化)，占画布高度的比例，根据元素在画面中的大小设置

规则：
- type为"image"的元素：所有主体（人物、物体等）的description中必须包含"透明背景"；额外生成一个type为"image"、name为"背景"的元素，description为整个画面的背景场景，z=0
- type为"text"的元素：直接显示文字，不需要description，不需要生成图片
- 背景元素的width/height通常为0.8-0.95（接近铺满画布）
- 主体元素（人、动物等）的width/height通常为0.3-0.6
- 小物件/装饰的width/height通常为0.1-0.25
- 文字元素不需要width/height

描述：${prompt}
示例：
人在树下 -> [{"type":"image","name":"背景","description":"树下的草地和天空","z":0,"x":0.5,"y":0.5,"width":0.95,"height":0.95},{"type":"image","name":"人","description":"一个人，透明背景","z":50,"x":0.5,"y":0.6,"width":0.4,"height":0.6},{"type":"image","name":"树","description":"一棵树，透明背景","z":20,"x":0.5,"y":0.4,"width":0.35,"height":0.7}]
一只猫在红色的房子里 -> [{"type":"image","name":"背景","description":"红色房子的内部","z":0,"x":0.5,"y":0.5,"width":0.95,"height":0.95},{"type":"image","name":"猫","description":"一只猫，透明背景","z":60,"x":0.4,"y":0.5,"width":0.3,"height":0.3},{"type":"image","name":"房子","description":"一座红色的房子，透明背景","z":10,"x":0.5,"y":0.5,"width":0.6,"height":0.5}]
"森林"作为标题，下面是树和猫 -> [{"type":"text","name":"标题","text":"森林","z":90,"x":0.5,"y":0.1},{"type":"image","name":"背景","description":"森林景色","z":0,"x":0.5,"y":0.5,"width":0.95,"height":0.95},{"type":"image","name":"树","description":"一棵树，透明背景","z":20,"x":0.5,"y":0.4,"width":0.35,"height":0.65},{"type":"image","name":"猫","description":"一只猫，透明背景","z":60,"x":0.5,"y":0.6,"width":0.25,"height":0.25}]
`,
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd agent && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add agent/src/services/genText.ts
git commit -m "feat: update genText prompt with width/height instructions"
```

---

### Task 3: genImage 支持动态尺寸（genImage.ts）

**Files:**
- Modify: `agent/src/services/genImage.ts:6-29`

- [ ] **Step 1: 添加 selectImageSize 辅助函数，修改 genImage 签名**

```ts
import "dotenv/config";

const API_URL = "https://api.siliconflow.cn/v1/images/generations";
const API_KEY = process.env.IMAGE_KEY || "";

const SUPPORTED_SIZES = [
  { size: "1024x1024", ratio: 1 },
  { size: "1024x768", ratio: 1024 / 768 },
  { size: "768x1024", ratio: 768 / 1024 },
  { size: "1024x640", ratio: 1024 / 640 },
  { size: "640x1024", ratio: 640 / 1024 },
];

export function selectImageSize(width: number, height: number): string {
  const aspectRatio = width / height;
  let best = SUPPORTED_SIZES[0];
  let bestDiff = Math.abs(best.ratio - aspectRatio);
  for (const s of SUPPORTED_SIZES) {
    const diff = Math.abs(s.ratio - aspectRatio);
    if (diff < bestDiff) {
      best = s;
      bestDiff = diff;
    }
  }
  return best.size;
}

export async function genImage(prompt: string, size?: string) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "Kwai-Kolors/Kolors",
      prompt,
      image_size: size || "1024x1024",
      batch_size: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`图片生成失败: ${response.statusText}`);
  }

  const data = (await response.json()) as { images: { url: string }[] };
  return data.images[0].url;
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd agent && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add agent/src/services/genImage.ts
git commit -m "feat: add dynamic image size selection based on aspect ratio"
```

---

### Task 4: 更新 POST /genImage 路由（index.ts）

**Files:**
- Modify: `agent/src/index.ts:47-60`

- [ ] **Step 1: 路由接受 size 参数并传递给 genImage**

将 POST /genImage 路由改为：

```ts
app.post("/genImage", async (req: Request, res: Response) => {
  try {
    const { prompt, size } = req.body;
    if (!prompt) {
      fail(res, "prompt is required");
      return;
    }
    const image = await genImage(prompt, size);
    success(res, { image });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    fail(res, msg);
  }
});
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd agent && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add agent/src/index.ts
git commit -m "feat: pass size parameter to genImage in POST /genImage route"
```

---

### Task 5: 前端按归一化尺寸插入画布（ImageCanvas.vue）

**Files:**
- Modify: `src/components/ImageCanvas.vue:270-308`

- [ ] **Step 1: 修改 insertImageToCanvas 使用归一化尺寸**

将 `insertImageToCanvas` 函数替换为：

```ts
const insertImageToCanvas = (element: TextElement, imageUrl: string) => {
    if (!leaferApp) {
        console.error("Leafer 实例未初始化");
        return;
    }

    const { width: canvasWidth = 1080, height: canvasHeight = 960 } = leaferApp;

    const x = element.x * canvasWidth;
    const y = element.y * canvasHeight;
    const w = (element.width || 0.2) * canvasWidth;
    const h = (element.height || 0.2) * canvasHeight;

    const imageRect = new Rect({
        x,
        y,
        width: w,
        height: h,
        fill: {
            type: "image",
            url: imageUrl,
            mode: "fit",
        },
        zIndex: element.z,
        editable: true,
        hoverStyle: {
            shadow: {
                x: 0,
                y: 0,
                blur: 10,
                color: "#ffffffaa",
            },
        },
    });

    leaferApp.tree.add(imageRect);
    console.log(`已插入元素 "${element.name}" 到画布`);
};
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd /Volumes/Data/1project/canvas-image && npx vue-tsc -b --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/ImageCanvas.vue
git commit -m "feat: use normalized width/height for canvas image insertion"
```

---

### Task 6: 前端传递 size 参数给后端（ImageCanvas.vue）

**Files:**
- Modify: `src/components/ImageCanvas.vue:204-240`

- [ ] **Step 1: 在 generateAndInsertImage 中计算 size 并传递**

将 `generateAndInsertImage` 函数中的 fetch 调用改为传递 size：

```ts
const generateAndInsertImage = async (element: TextElement): Promise<{ name: string; prompt: string; imageUrl: string | null }> => {
    const imagePrompt = `${element.description}，${element.name}`;
    const size = selectImageSize(element.width || 0.2, element.height || 0.2);

    let imageUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 30;

    while (!imageUrl && attempts < maxAttempts) {
        try {
            const imageRes = await fetch(`${API_BASE}/genImage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: imagePrompt, size }),
            });
            const { data } = (await imageRes.json()) as {
                data: { image: string };
            };
            if (data.image) {
                imageUrl = data.image;
                break;
            }
        } catch (err) {
            console.error("图片生成请求失败:", err);
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!imageUrl) {
        console.error(`元素 "${element.name}" 图片生成超时`);
        return { name: element.name, prompt: imagePrompt, imageUrl: null };
    }

    insertImageToCanvas(element, imageUrl);
    return { name: element.name, prompt: imagePrompt, imageUrl };
};
```

- [ ] **Step 2: 在组件中添加 selectImageSize 函数**

在 `generateAndInsertImage` 函数之前添加前端版本的 selectImageSize：

```ts
const SUPPORTED_SIZES = [
    { size: "1024x1024", ratio: 1 },
    { size: "1024x768", ratio: 1024 / 768 },
    { size: "768x1024", ratio: 768 / 1024 },
    { size: "1024x640", ratio: 1024 / 640 },
    { size: "640x1024", ratio: 640 / 1024 },
];

const selectImageSize = (width: number, height: number): string => {
    const aspectRatio = width / height;
    let best = SUPPORTED_SIZES[0];
    let bestDiff = Math.abs(best.ratio - aspectRatio);
    for (const s of SUPPORTED_SIZES) {
        const diff = Math.abs(s.ratio - aspectRatio);
        if (diff < bestDiff) {
            best = s;
            bestDiff = diff;
        }
    }
    return best.size;
};
```

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `cd /Volumes/Data/1project/canvas-image && npx vue-tsc -b --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/components/ImageCanvas.vue
git commit -m "feat: pass image size to backend based on element aspect ratio"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 启动开发服务器**

Run: `cd /Volumes/Data/1project/canvas-image && pnpm dev`
Expected: Vite + agent dev server 启动成功

- [ ] **Step 2: 手动测试**

在浏览器中输入 prompt（如"人在树下"），验证：
- genText 返回的元素包含 width/height
- 不同元素在画布上的大小不同（背景大、主体中等、小物件小）
- 图片生成使用了合适的分辨率

- [ ] **Step 3: 最终 Commit（如有修复）**

如有修复，单独 commit。
