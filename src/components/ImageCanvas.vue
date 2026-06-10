<template>
    <div class="relative w-full h-full">
        <div id="leafer-view"></div>
        <div class="floating-input">
            <input
                v-model="prompt"
                type="text"
                placeholder="描述你想生成的元素..."
                @keyup.enter="handleSubmit"
            />
            <button @click="handleSubmit" :disabled="loading">
                {{ loading ? "生成中..." : "生成" }}
            </button>
            <button class="history-btn" @click="showHistory = true">
                历史记录
            </button>
        </div>

        <ElDialog v-model="showHistory" title="历史记录" width="85%" top="5vh">
            <ElTable :data="logs" stripe style="width: 100%" max-height="65vh" @row-click="toggleExpand">
                <ElTableColumn type="expand">
                    <template #default="{ row }">
                        <div class="detail-wrap">
                            <div v-if="parseResult(row.text_result).length" class="detail-section">
                                <h4>文本元素</h4>
                                <div class="element-grid">
                                    <div v-for="el in parseResult(row.text_result)" :key="el.name" class="element-card">
                                        <span class="el-type">{{ el.type }}</span>
                                        <strong>{{ el.name }}</strong>
                                        <span v-if="el.text" class="el-text">{{ el.text }}</span>
                                        <span v-if="el.description" class="el-desc">{{ el.description }}</span>
                                        <span class="el-pos">位置: ({{ (el.x * 100).toFixed(0) }}%, {{ (el.y * 100).toFixed(0) }}%)</span>
                                    </div>
                                </div>
                            </div>
                            <div v-if="parseResult(row.image_results).length" class="detail-section">
                                <h4>图片结果</h4>
                                <div class="image-grid">
                                    <div v-for="img in parseResult(row.image_results)" :key="img.name" class="image-card">
                                        <strong>{{ img.name }}</strong>
                                        <img v-if="img.imageUrl" :src="img.imageUrl" alt="" />
                                        <span v-else class="img-fail">生成失败</span>
                                        <span class="img-prompt">{{ img.prompt }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </ElTableColumn>
                <ElTableColumn prop="id" label="ID" width="60" />
                <ElTableColumn prop="created_at" label="时间" width="170" />
                <ElTableColumn prop="prompt" label="提示词" min-width="200" show-overflow-tooltip />
                <ElTableColumn label="Token" width="80" align="center">
                    <template #default="{ row }">
                        {{ row.tokens_total }}
                    </template>
                </ElTableColumn>
                <ElTableColumn label="元素" width="60" align="center">
                    <template #default="{ row }">
                        {{ parseResult(row.text_result).length }}
                    </template>
                </ElTableColumn>
                <ElTableColumn label="图片" width="60" align="center">
                    <template #default="{ row }">
                        {{ parseResult(row.image_results).length }}
                    </template>
                </ElTableColumn>
            </ElTable>
            <div class="pagination-wrap">
                <ElPagination
                    v-model:current-page="historyPage"
                    v-model:page-size="historyPageSize"
                    :total="historyTotal"
                    :page-sizes="[10, 20, 50]"
                    layout="total, sizes, prev, pager, next"
                    @current-change="fetchLogs"
                    @size-change="fetchLogs"
                />
            </div>
            <template #footer>
                <ElButton @click="showHistory = false">关闭</ElButton>
            </template>
        </ElDialog>
    </div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { App, Rect, Text } from "leafer-ui";
import "leafer-editor";
import "@leafer-in/state";
import { Flow } from "@leafer-in/flow";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const prompt = ref("");
const loading = ref(false);

const showHistory = ref(false);
const logs = ref<any[]>([]);
const historyPage = ref(1);
const historyPageSize = ref(20);
const historyTotal = ref(0);

const fetchLogs = async () => {
    try {
        const params = new URLSearchParams({
            page: String(historyPage.value),
            pageSize: String(historyPageSize.value),
        });
        const res = await fetch(`${API_BASE}/getLogs?${params}`);
        const { data } = await res.json();
        logs.value = data.list;
        historyTotal.value = data.total;
    } catch (err) {
        console.error("获取日志失败:", err);
    }
};

watch(showHistory, (val) => {
    if (val) fetchLogs();
});

const expandedRows = ref<Set<number>>(new Set());
const toggleExpand = (row: any) => {
    const key = row.id;
    if (expandedRows.value.has(key)) {
        expandedRows.value.delete(key);
    } else {
        expandedRows.value.add(key);
    }
};

const parseResult = (str: string | undefined) => {
    if (!str) return [];
    try {
        return JSON.parse(str);
    } catch {
        return [];
    }
};

interface TextElement {
    type: "image" | "text";
    name: string;
    description?: string;
    text?: string;
    z: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
}

const handleSubmit = async () => {
    if (!prompt.value.trim() || loading.value) return;

    loading.value = true;
    const imageResults: { name: string; prompt: string; imageUrl: string | null }[] = [];
    let textUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    try {
        // 1. 请求 genText 生成文本元素
        const textRes = await fetch(`${API_BASE}/genText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt.value }),
        });
        const { data } = (await textRes.json()) as {
            data: { elements: TextElement[]; usage: { promptTokens: number; completionTokens: number; totalTokens: number } };
        };
        const elements = data.elements;
        textUsage = data.usage;

        // 2. 为每个元素生成图片或插入文字
        for (const element of elements) {
            if (element.type === "text") {
                insertTextToCanvas(element);
            } else {
                const result = await generateAndInsertImage(element);
                imageResults.push(result);
            }
        }

        // 3. 记录日志
        await fetch(`${API_BASE}/genLog`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: prompt.value,
                textResult: elements,
                imageResults,
                tokensPrompt: textUsage?.promptTokens ?? 0,
                tokensCompletion: textUsage?.completionTokens ?? 0,
                tokensTotal: textUsage?.totalTokens ?? 0,
            }),
        });

        prompt.value = "";
    } catch (err) {
        console.error("生成失败:", err);
        alert("生成失败，请重试");
    } finally {
        loading.value = false;
    }
};

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

const insertTextToCanvas = (element: TextElement) => {
    if (!leaferApp) {
        console.error("Leafer 实例未初始化");
        return;
    }

    const { width = 1080, height = 960 } = leaferApp;
    const x = element.x * width;
    const y = element.y * height;

    const textEl = new Text({
        x,
        y,
        text: element.text || element.name,
        fontSize: 32,
        fill: "#ffffff",
        fontWeight: "bold",
        textAlign: "center",
        zIndex: element.z,
        editable: true,
    });

    leaferApp.tree.add(textEl);
    console.log(`已插入文字元素 "${element.name}" 到画布`);
};

let leaferApp: App | null = null;

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

onMounted(() => {
    leaferApp = new App({
        view: "leafer-view",
        fill: "#242424",
        editor: {},
    });
    const moveHint = createText(
        "Move View : scroll wheel or hold mouse wheel while dragging",
    );
    const zoomHint = createText("Zoom View : alt + mouse wheel");

    let hintGroup = new Flow({
        flow: "y",
        flowAlign: "left",
        children: [moveHint, zoomHint],
    });

    leaferApp.sky.add(hintGroup);
});
const createText = (text: string): Text => {
    return new Text({
        fill: "#888",
        fontSize: 20,
        fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
        text,
    });
};
</script>
<style scoped>
#leafer-view {
    width: 100%;
    height: 100%;
}
.floating-input {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.floating-input input {
    width: 300px;
    padding: 8px 12px;
    border: 1px solid #444;
    border-radius: 4px;
    background: #333;
    color: white;
    outline: none;
}
.floating-input input:focus {
    border-color: #42b883;
}
.floating-input button {
    padding: 8px 16px;
    background: #42b883;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
.floating-input button:hover {
    background: #36a374;
}
.floating-input button:disabled {
    background: #666;
    cursor: not-allowed;
}
.floating-input .history-btn {
    background: #555;
}
.floating-input .history-btn:hover {
    background: #666;
}
.pagination-wrap {
    margin-top: 16px;
    display: flex;
    justify-content: center;
}
.detail-wrap {
    padding: 12px;
}
.detail-section {
    margin-bottom: 16px;
}
.detail-section h4 {
    margin: 0 0 8px;
    font-size: 14px;
    color: #999;
}
.element-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.element-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    background: #2a2a2a;
    border-radius: 6px;
    font-size: 13px;
    min-width: 160px;
}
.element-card .el-type {
    font-size: 11px;
    color: #42b883;
    text-transform: uppercase;
}
.element-card .el-text,
.element-card .el-desc {
    color: #aaa;
    font-size: 12px;
}
.element-card .el-pos {
    color: #666;
    font-size: 11px;
}
.image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}
.image-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: #2a2a2a;
    border-radius: 6px;
    width: 140px;
}
.image-card strong {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.image-card img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border-radius: 4px;
}
.image-card .img-fail {
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 12px;
    background: #1a1a1a;
    border-radius: 4px;
}
.image-card .img-prompt {
    font-size: 11px;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
