<template>
  <el-config-provider :locale="lang">
    <div class="flex w-screen h-screen">
      <div class="w-3xs h-full"></div>
      <ImageCanvas class="flex-1 h-full" />
    </div>
  </el-config-provider>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import ImageCanvas from './components/ImageCanvas.vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const lang = ref(zhCn)
</script>
<style scoped>

</style>
