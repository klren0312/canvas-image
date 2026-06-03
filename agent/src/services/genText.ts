import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import "dotenv/config";

const textProvider = createOpenAICompatible({
  name: "openrouter",
  baseURL: process.env.TEXT_URL || "",
  apiKey: process.env.TEXT_KEY || "",
});

const TextElementSchema = z.object({
  name: z.string(),
  description: z.string(),
  z: z.number().min(0).max(100).describe("层级，0在最底层，100在最顶层"),
  x: z.number().min(0).max(1).describe("x坐标，0-1归一化，0为最左，1为最右"),
  y: z.number().min(0).max(1).describe("y坐标，0-1归一化，0为最上，1为最下"),
});

const TextElementArraySchema = z.array(TextElementSchema);

export type TextElement = z.infer<typeof TextElementSchema>;

export async function genText(prompt: string): Promise<TextElement[]> {
  const { text } = await generateText({
    model: textProvider.chatModel("openrouter/owl-alpha"),
    prompt: `将以下描述拆解成核心元素列表，只返回JSON数组，不要其他内容。每个元素需要包含：
- name: 元素名称
- description: 元素描述
- z: 层级(0-100)，背景元素z值小(如天空0，地面10)，前景元素z值大(如人物50，文字80)
- x: x坐标(0-1归一化)，0为最左，1为最右，根据元素在画面中的位置设置
- y: y坐标(0-1归一化)，0为最上，1为最下，根据元素在画面中的位置设置

描述：${prompt}
示例：
人在树下 -> [{"name":"人","description":"一个人","z":50,"x":0.5,"y":0.6},{"name":"树","description":"一棵树","z":20,"x":0.5,"y":0.4}]
一只猫在红色的房子里 -> [{"name":"猫","description":"一只猫","z":60,"x":0.4,"y":0.5},{"name":"房子","description":"一座红色的房子","z":10,"x":0.5,"y":0.5}]
两个孩子在公园里玩耍 -> [{"name":"孩子","description":"两个孩子","z":50,"x":0.4,"y":0.6},{"name":"公园","description":"公园","z":5,"x":0.5,"y":0.7}]
`,
  });
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return TextElementArraySchema.parse(JSON.parse(cleaned));
}
