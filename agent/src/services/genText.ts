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
    prompt: `将以下描述拆解成元素列表，只返回JSON数组，不要其他内容。每个元素需要包含：
- name: 元素名称
- description: 元素描述（主体元素描述需包含"透明背景"字样）
- z: 层级(0-100)，背景元素z=0，其他元素按前后景设置
- x: x坐标(0-1归一化)，0为最左，1为最右，根据元素在画面中的位置设置
- y: y坐标(0-1归一化)，0为最上，1为最下，根据元素在画面中的位置设置

规则：
- 所有主体元素（人物、物体等）的description中必须包含"透明背景"，表示该元素独立抠图
- 额外生成一个名为"背景"的元素，description为整个画面的背景场景描述，z=0

描述：${prompt}
示例：
人在树下 -> [{"name":"背景","description":"树下的草地和天空","z":0,"x":0.5,"y":0.5},{"name":"人","description":"一个人，透明背景","z":50,"x":0.5,"y":0.6},{"name":"树","description":"一棵树，透明背景","z":20,"x":0.5,"y":0.4}]
一只猫在红色的房子里 -> [{"name":"背景","description":"红色房子的内部","z":0,"x":0.5,"y":0.5},{"name":"猫","description":"一只猫，透明背景","z":60,"x":0.4,"y":0.5},{"name":"房子","description":"一座红色的房子，透明背景","z":10,"x":0.5,"y":0.5}]
两个孩子在公园里玩耍 -> [{"name":"背景","description":"公园的景色","z":0,"x":0.5,"y":0.5},{"name":"孩子","description":"两个孩子，透明背景","z":50,"x":0.4,"y":0.6},{"name":"公园","description":"公园，透明背景","z":5,"x":0.5,"y":0.7}]
`,
  });
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return TextElementArraySchema.parse(JSON.parse(cleaned));
}
