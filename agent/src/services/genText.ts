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
});

const TextElementArraySchema = z.array(TextElementSchema);

export type TextElement = z.infer<typeof TextElementSchema>;

export async function genText(prompt: string): Promise<TextElement[]> {
  const { text } = await generateText({
    model: textProvider.chatModel("openrouter/owl-alpha"),
    prompt: `将以下描述拆解成核心元素列表，只返回JSON数组，不要其他内容。
描述：${prompt}
示例：人在树下 -> [{"name":"人","description":"一个人"},{"name":"树","description":"一棵树"}]
一只猫在红色的房子里 -> [{"name":"猫","description":"一只猫"},{"name":"房子","description":"一座红色的房子"}]
两个孩子在公园里玩耍 -> [{"name":"孩子","description":"两个孩子"},{"name":"公园","description":"公园"}]
`,
  });
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return TextElementArraySchema.parse(JSON.parse(cleaned));
}
