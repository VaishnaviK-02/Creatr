### Make sure to create a `.env` file with following variables -

```
# Deployment used by `npx convex dev`
CONVEX_DEPLOYMENT=

NEXT_PUBLIC_CONVEX_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

CLERK_JWT_ISSUER_DOMAIN=

# Imagekit
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=
IMAGEKIT_PRIVATE_KEY=

# Unsplash
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=

# AI Providers (use at least one, multiple recommended for fallback)
# See AI_PROVIDERS_SETUP.md for detailed setup instructions

# Gemini (optional - has quota limits)
GEMINI_API_KEY=

# OpenAI (recommended - most reliable)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-3.5-turbo

# Anthropic Claude (optional - great quality)
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-haiku-20240307

# Groq (optional - free tier available, very fast)
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant

# Hugging Face (optional - free tier available)
HUGGINGFACE_API_KEY=
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2

# Custom provider order (optional)
# AI_PROVIDER_ORDER=groq,openai,anthropic,gemini
```
