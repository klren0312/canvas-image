# 手动插入功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为画布工具新增手动插入文本和上传图片的功能，支持图标列表 + 弹框确认的交互方式

**Architecture:** 创建新的 ManualInsertPanel 组件，包含左侧工具栏和两个功能弹框（文本插入、图片上传），通过 props/emits 与父组件 ImageCanvas 通信

**Tech Stack:** Vue 3 + TypeScript, Element Plus, LeaferJS

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/components/ManualInsertPanel.vue` | 新增组件：工具栏 + 弹框 UI |
| `src/components/ImageCanvas.vue` | 修改：集成 ManualInsertPanel，添加插入方法 |

---

### Task 1: 创建 ManualInsertPanel 组件基础结构

**Files:**
- Create: `src/components/ManualInsertPanel.vue`

- [ ] **Step 1: 创建组件文件并添加基础模板**

```vue
<template>
  <div class="manual-insert-panel">
    <!-- 工具栏图标 -->
    <div class="tool-icons">
      <el-button :icon="Document" @click="showTextDialog = true" circle />
      <el-button :icon="Picture" @click="showImageDialog = true" circle />
    </div>

    <!-- 插入文本弹框 -->
    <el-dialog v-model="showTextDialog" title="插入文本" width="400px" :append-to-body="true">
      <el-form label-position="top">
        <el-form-item label="文本内容">
          <el-input v-model="textContent" type="textarea" :rows="3" placeholder="输入文本内容" />
        </el-form-item>
        <el-form-item label="字体大小">
          <el-select v-model="fontSize" style="width: 100%">
            <el-option :value="24" label="24px" />
            <el-option :value="32" label="32px" />
            <el-option :value="48" label="48px" />
            <el-option :value="64" label="64px" />
          </el-select>
        </el-form-item>
        <el-form-item label="文字颜色">
          <el-color-picker v-model="textColor" show-alpha />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTextDialog = false">取消</el-button>
        <el-button type="primary" @click="handleInsertText" :disabled="!textContent.trim()">确定插入</el-button>
      </template>
    </el-dialog>

    <!-- 上传图片弹框 -->
    <el-dialog v-model="showImageDialog" title="上传图片" width="400px" :append-to-body="true">
      <el-upload
        class="image-uploader"
        drag
        :auto-upload="false"
        :show-file-list="false"
        accept="image/jpeg,image/png,image/gif"
        @change="handleImageChange"
      >
        <div v-if="!imagePreview" class="upload-placeholder">
          <el-icon class="el-icon--upload"><Picture /></el-icon>
          <div class="el-upload__text">拖拽图片到此处<br>或点击选择文件</div>
        </div>
        <img v-else :src="imagePreview" class="preview-image" />
      </el-upload>
      <div class="upload-hint">支持格式：JPG、PNG、GIF</div>
      <template #footer>
        <el-button @click="handleCancelImage">取消</el-button>
        <el-button type="primary" @click="handleInsertImage" :disabled="!imageFile">确定插入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Document, Picture } from '@element-plus/icons-vue'

const emit = defineEmits<{
  (e: 'insert-text', text: string, fontSize: number, color: string): void
  (e: 'insert-image', file: File): void
}>()

const showTextDialog = ref(false)
const showImageDialog = ref(false)

const textContent = ref('')
const fontSize = ref(32)
const textColor = ref('#ffffff')

const imageFile = ref<File | null>(null)
const imagePreview = ref('')

const handleInsertText = () => {
  if (!textContent.value.trim()) return
  emit('insert-text', textContent.value, fontSize.value, textColor.value)
  textContent.value = ''
  showTextDialog.value = false
}

const handleImageChange = (file: any) => {
  const rawFile = file.raw
  if (!rawFile) return
  
  imageFile.value = rawFile
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(rawFile)
}

const handleCancelImage = () => {
  imageFile.value = null
  imagePreview.value = ''
  showImageDialog.value = false
}

const handleInsertImage = () => {
  if (!imageFile.value) return
  emit('insert-image', imageFile.value)
  imageFile.value = null
  imagePreview.value = ''
  showImageDialog.value = false
}
</script>

<style scoped>
.manual-insert-panel {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
}

.tool-icons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.8);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tool-icons .el-button {
  background: #333;
  border-color: #444;
  color: white;
}

.tool-icons .el-button:hover {
  background: #42b883;
  border-color: #42b883;
}

.image-uploader {
  width: 100%;
}

.image-uploader :deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-placeholder {
  text-align: center;
  color: #999;
}

.upload-placeholder .el-icon--upload {
  font-size: 48px;
  margin-bottom: 10px;
}

.preview-image {
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
}

.upload-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #999;
  text-align: center;
}
</style>
```

- [ ] **Step 2: 验证组件可以正常导入**

Run: `cd /Volumes/Data/1project/canvas-image && pnpm run build 2>&1 | head -20`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
git add src/components/ManualInsertPanel.vue
git commit -m "feat: add ManualInsertPanel component with toolbar and dialogs"
```

---

### Task 2: 集成 ManualInsertPanel 到 ImageCanvas

**Files:**
- Modify: `src/components/ImageCanvas.vue:1-85` (template)
- Modify: `src/components/ImageCanvas.vue:86-361` (script)

- [ ] **Step 1: 在 template 中添加 ManualInsertPanel 组件**

在 `<template>` 的 `<div class="relative w-full h-full">` 内部，`<div id="leafer-view"></div>` 之后添加：

```vue
        <ManualInsertPanel
            @insert-text="handleInsertTextManual"
            @insert-image="handleInsertImageManual"
        />
```

- [ ] **Step 2: 导入 ManualInsertPanel 组件**

在 `<script setup>` 的 import 部分添加：

```typescript
import ManualInsertPanel from "./ManualInsertPanel.vue";
```

- [ ] **Step 3: 添加手动插入文本方法**

在 `insertTextToCanvas` 函数之后添加：

```typescript
const handleInsertTextManual = (text: string, fontSize: number, color: string) => {
    if (!leaferApp) {
        console.error("Leafer 实例未初始化");
        return;
    }

    const { width = 1080, height = 960 } = leaferApp;
    const x = width / 2;
    const y = height / 2;

    const textEl = new Text({
        x,
        y,
        text,
        fontSize,
        fill: color,
        fontWeight: "bold",
        textAlign: "center",
        editable: true,
    });

    leaferApp.tree.add(textEl);
    console.log(`已手动插入文字到画布`);
};
```

- [ ] **Step 4: 添加手动插入图片方法**

在 `handleInsertTextManual` 函数之后添加：

```typescript
const handleInsertImageManual = async (file: File) => {
    if (!leaferApp) {
        console.error("Leafer 实例未初始化");
        return;
    }

    // 将 File 转换为 base64 URL
    const imageUrl = URL.createObjectURL(file);
    
    const { width: canvasWidth = 1080, height: canvasHeight = 960 } = leaferApp;
    const x = canvasWidth / 2 - 100;
    const y = canvasHeight / 2 - 100;

    const imageRect = new Rect({
        x,
        y,
        width: 200,
        height: 200,
        fill: {
            type: "image",
            url: imageUrl,
            mode: "fit",
        },
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
    console.log(`已手动插入图片到画布`);
};
```

- [ ] **Step 5: 验证构建成功**

Run: `cd /Volumes/Data/1project/canvas-image && pnpm run build 2>&1 | head -20`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 6: Commit**

```bash
git add src/components/ImageCanvas.vue
git commit -m "feat: integrate ManualInsertPanel into ImageCanvas"
```

---

### Task 3: 添加图片上传区域样式

**Files:**
- Modify: `src/components/ManualInsertPanel.vue` (style section)

- [ ] **Step 1: 添加图片上传区域的样式**

在 `<style scoped>` 部分添加或修改：

```css
.image-uploader :deep(.el-upload) {
  width: 100%;
}

.image-uploader :deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  border-color: #444;
}

.image-uploader :deep(.el-upload-dragger:hover) {
  border-color: #42b883;
}

.image-uploader :deep(.el-upload-dragger.is-dragover) {
  border-color: #42b883;
  background: rgba(66, 184, 131, 0.1);
}
```

- [ ] **Step 2: 验证样式生效**

Run: `cd /Volumes/Data/1project/canvas-image && pnpm run build 2>&1 | head -20`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add src/components/ManualInsertPanel.vue
git commit -m "style: improve image upload area styling"
```

---

### Task 4: 测试功能

**Files:**
- None (manual testing)

- [ ] **Step 1: 启动开发服务器**

Run: `cd /Volumes/Data/1project/canvas-image && pnpm dev`
Expected: 服务器启动成功，访问 http://localhost:5173

- [ ] **Step 2: 测试文本插入功能**

1. 点击左侧工具栏的文本图标（Document）
2. 在弹框中输入文本内容
3. 选择字体大小和颜色
4. 点击"确定插入"
5. 验证文本出现在画布中央
6. 验证文本可以编辑和移动

- [ ] **Step 3: 测试图片上传功能**

1. 点击左侧工具栏的图片图标（Picture）
2. 拖拽图片到上传区域或点击选择文件
3. 验证图片预览显示
4. 点击"确定插入"
5. 验证图片出现在画布中央
6. 验证图片可以缩放、移动、旋转

- [ ] **Step 4: 测试编辑功能**

1. 插入一个文本元素
2. 点击选中该元素
3. 验证显示编辑手柄
4. 拖拽四角手柄验证缩放
5. 拖拽元素主体验证移动
6. 拖拽顶部手柄验证旋转
7. 按 Delete 键验证删除

- [ ] **Step 5: Commit 测试结果**

```bash
git add -A
git commit -m "test: verify manual insert functionality works correctly"
```

---

### Task 5: 优化和完善

**Files:**
- Modify: `src/components/ManualInsertPanel.vue`
- Modify: `src/components/ImageCanvas.vue`

- [ ] **Step 1: 添加弹框关闭时的重置逻辑**

在 ManualInsertPanel.vue 的 `handleCancelImage` 函数中已经包含重置逻辑。确认文本弹框关闭时也会重置：

```typescript
// 在 watch 中添加
watch(showTextDialog, (val) => {
    if (!val) {
        textContent.value = ''
        fontSize.value = 32
        textColor.value = '#ffffff'
    }
})
```

- [ ] **Step 2: 添加图片插入后的 URL 释放**

在 ImageCanvas.vue 的 `handleInsertImageManual` 函数末尾添加：

```typescript
// 释放创建的 Object URL
// URL.revokeObjectURL(imageUrl);  // 注意：如果图片显示正常，可以取消注释
```

- [ ] **Step 3: 验证最终构建**

Run: `cd /Volumes/Data/1project/canvas-image && pnpm run build 2>&1 | head -20`
Expected: 构建成功，无错误

- [ ] **Step 4: Commit 最终版本**

```bash
git add -A
git commit -m "feat: complete manual insert feature with optimizations"
```

---

## 完成检查

- [ ] 所有 Task 都已完成
- [ ] 功能可以正常工作
- [ ] 代码符合项目风格
- [ ] 没有引入新的 TypeScript 错误
- [ ] 提交信息清晰明了