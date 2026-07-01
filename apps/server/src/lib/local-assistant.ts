import { pipeline } from "@xenova/transformers";
import { env } from "../env.js";

let generatorPromise: Promise<any> | null = null;

async function getGenerator() {
  if (!generatorPromise) {
    generatorPromise = pipeline(env.localModelTask as "text-generation" | "text2text-generation", env.localModelName, {
      quantized: true
    }).catch((error) => {
      generatorPromise = null;
      throw error;
    });
  }

  return generatorPromise;
}

export async function generateLocalAssistantText(prompt: string): Promise<string> {
  const generator = await getGenerator();
  const output = await generator(prompt, {
    max_new_tokens: 160,
    do_sample: false,
    repetition_penalty: 1.05,
    return_full_text: false
  });

  if (Array.isArray(output) && output[0]) {
    const candidate = output[0] as { generated_text?: string; text?: string };
    return (candidate.generated_text ?? candidate.text ?? "").trim();
  }

  if (output && typeof output === "object") {
    const candidate = output as { generated_text?: string; text?: string };
    return (candidate.generated_text ?? candidate.text ?? "").trim();
  }

  return "";
}
