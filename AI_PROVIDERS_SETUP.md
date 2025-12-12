# AI Providers Setup Guide

This platform now supports multiple AI providers with automatic fallback. If one provider hits quota limits, it automatically tries the next one.

## Supported Providers

### 1. **OpenAI** (Recommended - Most Reliable)
- **Free Tier**: $5 free credit when you sign up
- **Models**: GPT-3.5-turbo (cheap), GPT-4 (better quality)
- **Get API Key**: https://platform.openai.com/api-keys
- **Pricing**: ~$0.002 per 1K tokens (GPT-3.5-turbo)

**Setup:**
```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4, gpt-4-turbo
```

### 2. **Anthropic Claude** (Great Quality)
- **Free Tier**: No free tier, but generous paid tier
- **Models**: claude-3-haiku (fast/cheap), claude-3-sonnet (better)
- **Get API Key**: https://console.anthropic.com/
- **Pricing**: ~$0.25 per 1M tokens (haiku)

**Setup:**
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

### 3. **Groq** (Very Fast, Free Tier Available)
- **Free Tier**: Generous free tier available
- **Models**: llama-3.1-8b-instant, mixtral-8x7b-32768
- **Get API Key**: https://console.groq.com/
- **Pricing**: Free tier available, then pay-as-you-go

**Setup:**
```env
GROQ_API_KEY=gsk_your-key-here
GROQ_MODEL=llama-3.1-8b-instant
```

### 4. **Hugging Face** (Free Tier Available)
- **Free Tier**: Free tier with rate limits
- **Models**: Many open-source models available
- **Get API Key**: https://huggingface.co/settings/tokens
- **Pricing**: Free tier available

**Setup:**
```env
HUGGINGFACE_API_KEY=hf_your-key-here
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

### 5. **Google Gemini** (Current - Has Quota Issues)
- **Free Tier**: Limited free tier
- **Models**: gemini-2.0-flash-exp, gemini-1.5-pro
- **Get API Key**: https://ai.google.dev/
- **Pricing**: Free tier with daily limits

**Setup:**
```env
GEMINI_API_KEY=your-key-here
```

## Quick Start

### Option 1: Use OpenAI (Easiest)
1. Sign up at https://platform.openai.com/
2. Get $5 free credit
3. Create API key
4. Add to `.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```

### Option 2: Use Groq (Free Tier)
1. Sign up at https://console.groq.com/
2. Get free API key
3. Add to `.env`:
   ```env
   GROQ_API_KEY=gsk_your-key-here
   ```

### Option 3: Use Multiple Providers (Best)
Add multiple API keys to `.env`:
```env
OPENAI_API_KEY=sk-your-key-here
GROQ_API_KEY=gsk_your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GEMINI_API_KEY=your-key-here
```

The system will automatically try providers in this order:
1. OpenAI
2. Anthropic
3. Groq
4. Hugging Face
5. Gemini

## Customize Provider Order

You can set a custom order in `.env`:
```env
AI_PROVIDER_ORDER=groq,openai,anthropic,gemini
```

## How It Works

1. When you generate content, it tries the first provider
2. If that provider hits quota/rate limits, it automatically tries the next
3. Continues until one succeeds or all fail
4. Logs which provider was used for debugging

## Recommendations

**For Development/Testing:**
- Use **Groq** (free tier, very fast)

**For Production:**
- Use **OpenAI GPT-3.5-turbo** (reliable, affordable)
- Add **Groq** as backup (free tier)

**For Best Quality:**
- Use **OpenAI GPT-4** or **Anthropic Claude**
- Add cheaper providers as fallbacks

## Troubleshooting

**"All AI providers failed"**
- Make sure at least one API key is configured
- Check API keys are valid
- Check your account has credits/quota

**"API key not configured"**
- Add the API key to your `.env` file
- Restart your development server

**Still hitting quota limits?**
- Add more providers (each has separate quota)
- Upgrade your plan on the provider you use most
- Use the free tier providers (Groq, Hugging Face)

