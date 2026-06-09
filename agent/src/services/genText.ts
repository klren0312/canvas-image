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
  type: z.enum(["image", "text"]),
  name: z.string(),
  description: z.string().optional(),
  text: z.string().optional(),
  z: z.number().min(0).max(100).describe("层级，0在最底层，100在最顶层"),
  x: z.number().min(0).max(1).describe("x坐标，0-1归一化，0为最左，1为最右"),
  y: z.number().min(0).max(1).describe("y坐标，0-1归一化，0为最上，1为最下"),
});

const TextElementArraySchema = z.array(TextElementSchema);

export type TextElement = z.infer<typeof TextElementSchema>;

export async function genText(prompt: string): Promise<{
  elements: TextElement[];
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const result = await generateText({
    model: textProvider.chatModel("openrouter/owl-alpha"),
    prompt: `将以下描述拆解成元素列表，只返回JSON数组，不要其他内容。每个元素需要包含：
- type: 元素类型，"image"表示需要生成图片，"text"表示直接显示文字
- name: 元素名称
- description: 当type为"image"时必填，图片描述（主体元素需包含"透明背景"字样）
- text: 当type为"text"时必填，文字内容
- z: 层级(0-100)，背景元素z=0，其他元素按前后景设置
- x: x坐标(0-1归一化)，0为最左，1为最右，根据元素在画面中的位置设置
- y: y坐标(0-1归一化)，0为最上，1为最下，根据元素在画面中的位置设置

规则：
- type为"image"的元素：所有主体（人物、物体等）的description中必须包含"透明背景"；额外生成一个type为"image"、name为"背景"的元素，description为整个画面的背景场景，z=0
- type为"text"的元素：直接显示文字，不需要description，不需要生成图片

描述：${prompt}
示例：
人在树下 -> [{"type":"image","name":"背景","description":"树下的草地和天空","z":0,"x":0.5,"y":0.5},{"type":"image","name":"人","description":"一个人，透明背景","z":50,"x":0.5,"y":0.6},{"type":"image","name":"树","description":"一棵树，透明背景","z":20,"x":0.5,"y":0.4}]
一只猫在红色的房子里 -> [{"type":"image","name":"背景","description":"红色房子的内部","z":0,"x":0.5,"y":0.5},{"type":"image","name":"猫","description":"一只猫，透明背景","z":60,"x":0.4,"y":0.5},{"type":"image","name":"房子","description":"一座红色的房子，透明背景","z":10,"x":0.5,"y":0.5}]
"森林"作为标题，下面是树和猫 -> [{"type":"text","name":"标题","text":"森林","z":90,"x":0.5,"y":0.1},{"type":"image","name":"背景","description":"森林景色","z":0,"x":0.5,"y":0.5},{"type":"image","name":"树","description":"一棵树，透明背景","z":20,"x":0.5,"y":0.4},{"type":"image","name":"猫","description":"一只猫，透明背景","z":60,"x":0.5,"y":0.6}]
`,
  });
  const cleaned = result.text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const elements = TextElementArraySchema.parse(JSON.parse(cleaned));
  return {
    elements,
    usage: {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
    },
  };
}
