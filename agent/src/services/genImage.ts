import { generateImage } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import 'dotenv/config';

const kolors = createOpenAICompatible({
  name: 'kolors',
  baseURL: process.env.INFERENCE_URL || '',
  apiKey: process.env.INFERENCE_KEY || '',
});
export async function genImage(prompt: string) {
    const { image } = await generateImage({
    model: kolors.imageModel('Kwai-Kolors/Kolors'),
        prompt: prompt,
    });
    return image.base64;
}
