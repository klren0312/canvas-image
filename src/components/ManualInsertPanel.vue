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
import type { UploadFile } from 'element-plus'
import { ElMessage } from 'element-plus'

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

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif']

const handleImageChange = (file: UploadFile) => {
  const rawFile = file.raw
  if (!rawFile) return

  if (!ALLOWED_MIME_TYPES.includes(rawFile.type)) {
    ElMessage.error('只支持 JPG、PNG、GIF 格式的图片')
    return
  }

  if (rawFile.size > MAX_FILE_SIZE) {
    ElMessage.error('图片大小不能超过 10MB')
    return
  }

  imageFile.value = rawFile
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
  }
  reader.onerror = () => {
    ElMessage.error('图片读取失败，请重新选择')
    imageFile.value = null
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
