# Gemini API Key Fallback System

## Overview
The Gemini service now supports automatic fallback between multiple API keys when rate limits are reached. This ensures continuous service availability even when individual API keys hit their usage limits.

## Setup Instructions

### 1. Environment Variables
Add the following to your `.env` file:

```bash
# Primary API key (required)
GEMINI_API_KEY_1=your-primary-gemini-api-key-here

# Secondary API key (optional)
GEMINI_API_KEY_2=your-secondary-gemini-api-key-here

# Tertiary API key (optional)
GEMINI_API_KEY_3=your-tertiary-gemini-api-key-here
```

### 2. Legacy Support
If you're using the old `GEMINI_API_KEY` variable, it will still work as a fallback if no numbered keys are set.

### 3. Minimum Requirements
- **At least one API key** must be set (`GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, or `GEMINI_API_KEY`)
- **More keys = better reliability** - Set up to 3 keys for maximum fallback coverage

## How It Works

### Automatic Fallback Process
1. **Primary Key**: Starts with `GEMINI_API_KEY_1`
2. **Rate Limit Detection**: Automatically detects when a key hits limits
3. **Seamless Switch**: Switches to the next available key
4. **Error Handling**: Provides clear error messages when all keys are exhausted

### Rate Limit Detection
The system detects rate limits by checking for:
- HTTP 429 status codes
- Error messages containing: "quota exceeded", "rate limit", "too many requests"
- Daily/monthly/billing limit exceeded messages

### Logging
The service provides detailed logging:
```
🔑 [GEMINI SERVICE] Initialized with 3 API key(s)
🔑 [GEMINI SERVICE] Using API key #1
🌐 [GEMINI SERVICE] Making request with API key #1 (attempt 1)
⚠️ [GEMINI SERVICE] Rate limit hit with API key #1
🔄 [GEMINI SERVICE] Switched to API key #2
✅ [GEMINI SERVICE] Request successful with API key #2
```

## Benefits

### ✅ Reliability
- **Zero downtime** when individual keys hit limits
- **Automatic recovery** without manual intervention
- **Seamless user experience** - no service interruptions

### ✅ Scalability
- **Higher throughput** with multiple keys
- **Distributed load** across different API keys
- **Cost optimization** by using different billing accounts

### ✅ Monitoring
- **API key usage tracking** in response data
- **Detailed logging** for debugging and monitoring
- **Clear error messages** when all keys are exhausted

## Response Format
The API response now includes which key was used:
```json
{
  "success": true,
  "response": "Generated content...",
  "usage": {...},
  "api_key_used": "#2"
}
```

## Error Handling
When all API keys are exhausted:
```json
{
  "success": false,
  "response": "All API keys have reached their limits. Last error: ...",
  "error": "All API keys exhausted"
}
```

## Best Practices

### 1. Key Distribution
- **Use different Google Cloud projects** for each key
- **Set different billing accounts** to distribute costs
- **Monitor usage** across all keys

### 2. Security
- **Never commit API keys** to version control
- **Use environment variables** for all keys
- **Rotate keys regularly** for security

### 3. Monitoring
- **Check logs regularly** for fallback events
- **Monitor API key usage** in Google Cloud Console
- **Set up alerts** for when keys approach limits

## Troubleshooting

### Common Issues
1. **No API keys found**: Ensure at least one key is set in environment variables
2. **All keys exhausted**: Add more API keys or wait for limits to reset
3. **Network errors**: Check internet connectivity and API endpoint availability

### Debug Commands
```bash
# Check environment variables
echo $GEMINI_API_KEY_1
echo $GEMINI_API_KEY_2
echo $GEMINI_API_KEY_3

# Test API key validity
python -c "from services.gemini_service import GeminiService; print('Service initialized successfully')"
```

## Migration Guide

### From Single Key to Multiple Keys
1. **Keep existing key**: Your current `GEMINI_API_KEY` will continue to work
2. **Add new keys**: Set `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, etc.
3. **Test fallback**: Verify the system switches keys when limits are hit
4. **Remove old key**: Once confirmed working, you can remove the legacy key

### Backward Compatibility
- **Existing code** continues to work without changes
- **Legacy `GEMINI_API_KEY`** is automatically supported
- **No breaking changes** to the API interface
