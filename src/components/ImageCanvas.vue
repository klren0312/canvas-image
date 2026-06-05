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
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { App, Rect, Text } from "leafer-ui";
import "leafer-editor";
import "@leafer-in/state";
import { Flow } from "@leafer-in/flow";

const API_BASE = "";
const prompt = ref("");
const loading = ref(false);

interface TextElement {
    type: "image" | "text";
    name: string;
    description?: string;
    text?: string;
    z: number;
    x: number;
    y: number;
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

const generateAndInsertImage = async (element: TextElement): Promise<{ name: string; prompt: string; imageUrl: string | null }> => {
    const imagePrompt = `${element.description}，${element.name}`;

    let imageUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 30;

    while (!imageUrl && attempts < maxAttempts) {
        try {
            const imageRes = await fetch(`${API_BASE}/genImage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: imagePrompt }),
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

    const { width = 1080, height = 960 } = leaferApp;

    // 根据归一化坐标计算实际位置
    const x = element.x * width;
    const y = element.y * height;

    // 创建图片元素
    const imageRect = new Rect({
        x,
        y,
        width: 150,
        height: 150,
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

    // 添加到画布
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
</style>
