import "dotenv/config";

const API_URL = "https://api.siliconflow.cn/v1/images/generations";
const API_KEY = process.env.IMAGE_KEY || "";

const SUPPORTED_SIZES = [
  { size: "1024x1024", ratio: 1 },
  { size: "1024x768", ratio: 1024 / 768 },
  { size: "768x1024", ratio: 768 / 1024 },
  { size: "1024x640", ratio: 1024 / 640 },
  { size: "640x1024", ratio: 640 / 1024 },
];

export function selectImageSize(width: number, height: number): string {
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
}

export async function genImage(prompt: string, size?: string) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "Kwai-Kolors/Kolors",
      prompt,
      image_size: size || "1024x1024",
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
