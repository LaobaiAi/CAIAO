export interface LanguageModel {
  display_name: string;
  model_name: string;
  provider: "Anthropic" | "DeepSeek" | "Google" | "Groq" | "OpenAI";
}

// Static model list for CAIAO - no backend API dependency for now
const staticModels: LanguageModel[] = [
  { display_name: "GPT-4.1", model_name: "gpt-4.1", provider: "OpenAI" },
  { display_name: "GPT-4o", model_name: "gpt-4o", provider: "OpenAI" },
  { display_name: "Claude 3.5 Sonnet", model_name: "claude-3-5-sonnet", provider: "Anthropic" },
];

// Cache for models
let languageModels: LanguageModel[] | null = null;

/**
 * Get the list of available LLM models
 */
export const getModels = async (): Promise<LanguageModel[]> => {
  if (languageModels) {
    return languageModels;
  }

  // Use static list for now
  languageModels = staticModels;
  return languageModels;
};

/**
 * Get the default model (GPT-4.1)
 */
export const getDefaultModel = async (): Promise<LanguageModel | null> => {
  try {
    const models = await getModels();
    return models.find(model => model.model_name === "gpt-4.1") || models[0] || null;
  } catch (error) {
    console.error('Failed to get default model:', error);
    return null;
  }
};
