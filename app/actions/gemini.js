"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateWithAI } from "./ai-provider";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// List of models to try in order of preference
const MODEL_NAMES = [
  "gemini-2.0-flash-exp",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-pro",
  "models/gemini-pro",
];

// Helper function to extract retry delay from error message
function extractRetryDelay(errorMessage) {
  const retryMatch = errorMessage.match(/Please retry in ([\d.]+)s/);
  if (retryMatch) {
    return Math.ceil(parseFloat(retryMatch[1])) * 1000; // Convert to milliseconds and round up
  }
  return 5000; // Default 5 seconds
}

// Helper function to determine quota error type
function analyzeQuotaError(errorMessage) {
  const isDailyQuota = 
    errorMessage.includes("PerDay") || 
    errorMessage.includes("daily") ||
    errorMessage.includes("free_tier") && errorMessage.includes("limit: 0");
  
  const isRateLimit = 
    errorMessage.includes("PerMinute") ||
    errorMessage.includes("rate limit") ||
    (errorMessage.includes("429") && !isDailyQuota);
  
  return {
    isDailyQuota,
    isRateLimit,
    isQuotaExceeded: isDailyQuota || isRateLimit
  };
}

// Helper function to check if error is retryable (404 or 429)
function isRetryableError(error) {
  const message = error.message || "";
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.includes("quota")
  );
}

// Helper function to try generating content with multiple models
async function generateWithFallback(prompt) {
  let lastError = null;
  let rateLimitError = null;
  let rateLimitDelay = 0;
  
  for (const modelName of MODEL_NAMES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || "";
      
      // Handle rate limit errors (429) - try other models first
      if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests") || errorMessage.includes("quota")) {
        rateLimitError = error;
        rateLimitDelay = Math.max(rateLimitDelay, extractRetryDelay(errorMessage));
        // Continue to try other models - different models might have different quotas
        continue;
      }
      
      // If it's a 404, try next model
      if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        continue;
      }
      
      // For other errors (API key, etc.), throw immediately
      throw error;
    }
  }
  
  // If we hit rate limits on all models, analyze the error and provide helpful message
  if (rateLimitError) {
    const errorMessage = rateLimitError.message || "";
    const quotaInfo = analyzeQuotaError(errorMessage);
    
    let errorMsg;
    if (quotaInfo.isDailyQuota) {
      // Daily quota exhausted - need to wait until next day
      errorMsg = `Daily quota exceeded. You've reached your free tier daily limit. ` +
        `Quota resets daily. Check your usage at https://ai.dev/usage or consider upgrading your plan.`;
    } else if (quotaInfo.isRateLimit) {
      // Rate limit - can retry after delay
      errorMsg = `Rate limit exceeded. Please wait ${Math.ceil(rateLimitDelay / 1000)} seconds before trying again. ` +
        `Check your usage at https://ai.dev/usage`;
    } else {
      // Generic quota error
      errorMsg = `Quota exceeded. Please wait ${Math.ceil(rateLimitDelay / 1000)} seconds before trying again. ` +
        `You may have exceeded your free tier quota. Check your usage at https://ai.dev/usage`;
    }
    
    const quotaError = new Error(errorMsg);
    quotaError.retryAfter = quotaInfo.isDailyQuota ? null : rateLimitDelay; // No retry for daily quota
    quotaError.isDailyQuota = quotaInfo.isDailyQuota;
    throw quotaError;
  }
  
  // If all models failed with 404, throw the last error
  throw lastError || new Error("All model attempts failed");
}

export async function generateBlogContent(title, category = "", tags = []) {
  try {
    if (!title || title.trim().length === 0) {
      throw new Error("Title is required to generate content");
    }

    // Create a detailed prompt for blog content generation
    const prompt = `
Write a comprehensive blog post with the title: "${title}"

${category ? `Category: ${category}` : ""}
${tags.length > 0 ? `Tags: ${tags.join(", ")}` : ""}

Requirements:
- Write engaging, informative content that matches the title
- Use proper HTML formatting with headers (h2, h3), paragraphs, lists, and emphasis
- Include 3-5 main sections with clear subheadings
- Write in a conversational yet professional tone
- Make it approximately 800-1200 words
- Include practical insights, examples, or actionable advice where relevant
- Use <h2> for main sections and <h3> for subsections
- Use <p> tags for paragraphs
- Use <ul> and <li> for bullet points when appropriate
- Use <strong> and <em> for emphasis
- Ensure the content is original and valuable to readers

Do not include the title in the content as it will be added separately.
Start directly with the introduction paragraph.
`;

    // Try multi-provider AI first, fallback to Gemini-only if enabled
    let content;
    try {
      content = await generateWithAI(prompt);
    } catch (error) {
      // If multi-provider fails and only Gemini is configured, try Gemini directly
      if (process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        console.log("Falling back to Gemini-only mode...");
        content = await generateWithFallback(prompt);
      } else {
        throw error;
      }
    }

    // Basic validation
    if (!content || content.trim().length < 100) {
      throw new Error("Generated content is too short or empty");
    }

    return {
      success: true,
      content: content.trim(),
    };
  } catch (error) {
    console.error("Gemini AI Error:", error);

    // Handle specific error types
    if (error.message?.includes("API key")) {
      return {
        success: false,
        error: "AI service configuration error. Please try again later.",
      };
    }

    if (
      error.message?.includes("quota") ||
      error.message?.includes("limit") ||
      error.message?.includes("429") ||
      error.message?.includes("Too Many Requests") ||
      error.message?.includes("Rate limit exceeded") ||
      error.message?.includes("quota exceeded")
    ) {
      // Use the error message directly if it's already formatted (from generateWithFallback)
      if (error.isDailyQuota) {
        return {
          success: false,
          error: error.message || "Daily quota exceeded. Please try again tomorrow or upgrade your plan.",
        };
      }
      
      const retryAfter = error.retryAfter 
        ? ` Please wait ${Math.ceil(error.retryAfter / 1000)} seconds before trying again.`
        : "";
      
      return {
        success: false,
        error: error.message || `AI service quota exceeded.${retryAfter} Please check your usage at https://ai.dev/usage or try again later.`,
      };
    }

    return {
      success: false,
      error: error.message || "Failed to generate content. Please try again.",
    };
  }
}

export async function improveContent(
  currentContent,
  improvementType = "enhance"
) {
  try {
    if (!currentContent || currentContent.trim().length === 0) {
      throw new Error("Content is required for improvement");
    }

    let prompt = "";

    switch (improvementType) {
      case "expand":
        prompt = `
Take this blog content and expand it with more details, examples, and insights:

${currentContent}

Requirements:
- Keep the existing structure and main points
- Add more depth and detail to each section
- Include practical examples and insights
- Maintain the original tone and style
- Return the improved content in the same HTML format
`;
        break;

      case "simplify":
        prompt = `
Take this blog content and make it more concise and easier to read:

${currentContent}

Requirements:
- Keep all main points but make them clearer
- Remove unnecessary complexity
- Use simpler language where possible
- Maintain the HTML formatting
- Keep the essential information
`;
        break;

      default: // enhance
        prompt = `
Improve this blog content by making it more engaging and well-structured:

${currentContent}

Requirements:
- Improve the flow and readability
- Add engaging transitions between sections
- Enhance with better examples or explanations
- Maintain the original HTML structure
- Keep the same length approximately
- Make it more compelling to read
`;
    }

    // Try multi-provider AI first, fallback to Gemini-only if enabled
    let improvedContent;
    try {
      improvedContent = await generateWithAI(prompt);
    } catch (error) {
      // If multi-provider fails and only Gemini is configured, try Gemini directly
      if (process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        console.log("Falling back to Gemini-only mode...");
        improvedContent = await generateWithFallback(prompt);
      } else {
        throw error;
      }
    }

    return {
      success: true,
      content: improvedContent.trim(),
    };
  } catch (error) {
    console.error("Content improvement error:", error);
    
    // Handle specific error types
    if (
      error.message?.includes("quota") ||
      error.message?.includes("limit") ||
      error.message?.includes("429") ||
      error.message?.includes("Too Many Requests") ||
      error.message?.includes("Rate limit exceeded") ||
      error.message?.includes("quota exceeded")
    ) {
      // Use the error message directly if it's already formatted (from generateWithFallback)
      if (error.isDailyQuota) {
        return {
          success: false,
          error: error.message || "Daily quota exceeded. Please try again tomorrow or upgrade your plan.",
        };
      }
      
      const retryAfter = error.retryAfter 
        ? ` Please wait ${Math.ceil(error.retryAfter / 1000)} seconds before trying again.`
        : "";
      
      return {
        success: false,
        error: error.message || `AI service quota exceeded.${retryAfter} Please check your usage at https://ai.dev/usage or try again later.`,
      };
    }
    
    return {
      success: false,
      error: error.message || "Failed to improve content. Please try again.",
    };
  }
}
