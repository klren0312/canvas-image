# 手动插入功能设计文档

## 概述

为画布工具新增手动插入文本和上传图片的功能，支持两种使用场景：
1. **补充 AI 生成** — AI 生成后，用户可以手动添加额外的文本或图片来完善画布
2. **完全独立模式** — 不依赖 AI，用户可以完全手动创建画布内容

## 设计目标

- 提供简洁直观的手动插入界面
- 支持文本和图片两种内容类型
- 提供基本的编辑功能（缩放、移动、旋转、删除、层级调整）
- 与现有 AI 生成功能无缝集成

## UI 设计

### 工具栏

左侧垂直工具栏，使用 Element Plus 图标：

```
┌─────┐
│  T  │  ← 插入文本（Document 图标）
├─────┤
│  🖼  │  ← 上传图片（Picture 图标）
├─────┤
│  ⋯  │  ← 其他工具（可选）
└─────┘
```

**交互方式：**
- 点击图标打开对应的功能弹框
- 弹框中填写内容/选择文件
- 点击"确定插入"按钮
- 内容出现在画布中央

### 弹框设计

#### 插入文本弹框

```
┌─────────────────────────────────┐
│ 插入文本                    ✕ │
├─────────────────────────────────┤
│                                 │
│ 输入文本内容                    │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ 字体大小    文字颜色            │
│ ┌─────────┐ ┌─────────────────┐ │
│ │ 32px ▼  │ │    #ffffff     │ │
│ └─────────┘ └─────────────────┘ │
│                                 │
│           [取消]  [确定插入]    │
└─────────────────────────────────┘
```

**属性：**
- 文本内容：文本输入框
- 字体大小：下拉选择（24px、32px、48px、64px）
- 文字颜色：颜色选择器（默认白色 #ffffff）

#### 上传图片弹框

```
┌─────────────────────────────────┐
│ 上传图片                    ✕ │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │    拖拽图片到此处           │ │
│ │    或点击选择文件           │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ 支持格式：JPG、PNG、GIF         │
│                                 │
│           [取消]  [确定插入]    │
└─────────────────────────────────┘
```

**功能：**
- 支持拖拽上传图片
- 支持点击选择文件
- 显示图片预览
- 支持格式：JPG、PNG、GIF

### 画布编辑功能

选中元素后自动显示编辑手柄：

| 功能 | 交互方式 |
|------|----------|
| 缩放 | 拖拽四角手柄 |
| 移动 | 拖拽元素主体 |
| 旋转 | 拖拽顶部旋转手柄 |
| 删除 | 选中后按 Delete 键或右键菜单 |
| 层级调整 | 右键菜单 → 上移/下移 |

## 技术实现

### 前端组件

新增组件：`ManualInsertPanel.vue`

```vue
<template>
  <div class="manual-insert-panel">
    <!-- 工具栏图标 -->
    <div class="tool-icons">
      <el-button :icon="Document" @click="showTextDialog = true" />
      <el-button :icon="Picture" @click="showImageDialog = true" />
    </div>

    <!-- 插入文本弹框 -->
    <el-dialog v-model="showTextDialog" title="插入文本" width="400px">
      <!-- 文本输入、字体大小、颜色选择 -->
    </el-dialog>

    <!-- 上传图片弹框 -->
    <el-dialog v-model="showImageDialog" title="上传图片" width="400px">
      <!-- 拖拽上传区域 -->
    </el-dialog>
  </div>
</template>
```

### 状态管理

使用 Vue 3 Composition API 管理状态：

```typescript
// 文本插入状态
const textContent = ref('')
const fontSize = ref(32)
const textColor = ref('#ffffff')

// 图片上传状态
const imageFile = ref<File | null>(null)
const imagePreview = ref<string>('')
```

### LeaferJS 集成

使用 LeaferJS API 插入元素：

```typescript
// 插入文本
const textEl = new Text({
  x: canvasWidth / 2,
  y: canvasHeight / 2,
  text: textContent.value,
  fontSize: fontSize.value,
  fill: textColor.value,
  editable: true,
})
leaferApp.tree.add(textEl)

// 插入图片
const imageRect = new Rect({
  x: canvasWidth / 2,
  y: canvasHeight / 2,
  width: 200,
  height: 200,
  fill: {
    type: 'image',
    url: imageUrl,
    mode: 'fit',
  },
  editable: true,
})
leaferApp.tree.add(imageRect)
```

## 依赖

- Element Plus：提供图标（Document、Picture）和弹框组件（ElDialog）
- LeaferJS：画布渲染和元素编辑

## 测试用例

### 文本插入测试

1. 点击工具栏的文本图标
2. 在弹框中输入文本内容
3. 选择字体大小和颜色
4. 点击"确定插入"
5. 验证文本出现在画布中央
6. 验证文本可以编辑和移动

### 图片上传测试

1. 点击工具栏的图片图标
2. 拖拽图片到上传区域
3. 验证图片预览显示
4. 点击"确定插入"
5. 验证图片出现在画布中央
6. 验证图片可以缩放、移动、旋转

### 编辑功能测试

1. 插入一个文本元素
2. 点击选中该元素
3. 验证显示编辑手柄
4. 拖拽四角手柄验证缩放
5. 拖拽元素主体验证移动
6. 拖拽顶部手柄验证旋转
7. 按 Delete 键验证删除
8. 右键点击验证层级调整菜单

## 后续优化

- 支持更多文本属性（字体、对齐方式等）
- 支持图片滤镜和裁剪
- 支持元素组合和分组
- 支持复制粘贴功能