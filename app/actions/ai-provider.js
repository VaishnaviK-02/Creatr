"use server";

/**
 * Multi-provider AI service with automatic fallback
 * Supports: OpenAI, Anthropic, Hugging Face, Groq, and Gemini
 */

// Provider implementations
async function generateWithOpenAI(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

async function generateWithAnthropic(prompt) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || "";
}

async function generateWithGroq(prompt) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Groq API key not configured");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

async function generateWithHuggingFace(prompt) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new Error("Hugging Face API key not configured");
  }

  const model = process.env.HUGGINGFACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
  
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Hugging Face API error: ${error.error || response.statusText}`);
  }

  const data = await response.json();
  // Hugging Face returns different formats depending on model
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text;
  }
  if (data[0]?.generated_text) {
    return data[0].generated_text;
  }
  return JSON.stringify(data);
}

async function generateWithGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const MODEL_NAMES = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-pro",
  ];

  let lastError = null;
  for (const modelName of MODEL_NAMES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || "";
      // Skip 404 errors, try next model
      if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        continue;
      }
      // For quota errors, throw to try next provider
      if (errorMessage.includes("quota") || errorMessage.includes("429")) {
        throw error;
      }
      // For other errors, try next model
      continue;
    }
  }
  throw lastError || new Error("All Gemini models failed");
}

/**
 * Main function to generate content with automatic fallback across providers
 */
export async function generateWithAI(prompt, preferredProvider = null) {
  // Define provider order (can be customized via env var)
  const providerOrder = process.env.AI_PROVIDER_ORDER 
    ? process.env.AI_PROVIDER_ORDER.split(",").map(p => p.trim())
    : preferredProvider 
      ? [preferredProvider, "openai", "anthropic", "groq", "huggingface", "gemini"]
      : ["openai", "anthropic", "groq", "huggingface", "gemini"];

  const providers = {
    openai: { name: "OpenAI", fn: generateWithOpenAI },
    anthropic: { name: "Anthropic Claude", fn: generateWithAnthropic },
    groq: { name: "Groq", fn: generateWithGroq },
    huggingface: { name: "Hugging Face", fn: generateWithHuggingFace },
    gemini: { name: "Google Gemini", fn: generateWithGemini },
  };

  let lastError = null;
  const attemptedProviders = [];

  for (const providerKey of providerOrder) {
    const provider = providers[providerKey];
    if (!provider) {
      console.warn(`Unknown provider: ${providerKey}`);
      continue;
    }

    // Check if API key is configured
    const apiKeyEnv = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      groq: "GROQ_API_KEY",
      huggingface: "HUGGINGFACE_API_KEY",
      gemini: "GEMINI_API_KEY",
    }[providerKey];

    if (!process.env[apiKeyEnv]) {
      console.log(`Skipping ${provider.name} - API key not configured`);
      continue;
    }

    try {
      attemptedProviders.push(provider.name);
      console.log(`Trying ${provider.name}...`);
      const result = await provider.fn(prompt);
      
      if (result && result.trim().length > 0) {
        console.log(`✓ Success with ${provider.name}`);
        return result;
      }
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || "";
      
      // Don't retry on certain errors (API key issues, etc.)
      if (
        errorMessage.includes("not configured") ||
        errorMessage.includes("API key") ||
        (!errorMessage.includes("quota") && !errorMessage.includes("429") && !errorMessage.includes("rate limit"))
      ) {
        console.log(`✗ ${provider.name} failed: ${errorMessage}`);
        continue; // Try next provider
      }
      
      // For quota/rate limit errors, try next provider
      console.log(`✗ ${provider.name} quota/rate limit - trying next provider...`);
      continue;
    }
  }

  // All providers failed
  const errorMsg = `All AI providers failed. Attempted: ${attemptedProviders.join(", ")}. ` +
    `Last error: ${lastError?.message || "Unknown error"}. ` +
    `Please configure at least one AI provider API key in your .env file.`;
  
  throw new Error(errorMsg);
}

