import "dotenv/config";

const API_URL = "https://api.siliconflow.cn/v1/images/generations";
const API_KEY = process.env.IMAGE_KEY || "";

export async function genImage(prompt: string) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "Kwai-Kolors/Kolors",
      prompt,
      image_size: "1024x1024",
      batch_size: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`图片生成失败: ${response.statusText}`);
  }

  const data = (await response.json()) as { images: { url: string }[] };
  return data.images[0].url;
}
