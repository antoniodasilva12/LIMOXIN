import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

interface QuickFix {
  title: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  tools_needed: string[];
}

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error && error.message.includes('429') && retries < maxRetries) {
        const waitTime = Math.pow(2, retries) * 1000; // Exponential backoff
        await wait(waitTime);
        retries++;
        continue;
      }
      throw error;
    }
  }
}

export async function analyzeMaintenanceIssue(title: string, description: string): Promise<QuickFix[]> {
  try {
    if (!openai.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const prompt = `Analyze this maintenance issue and suggest quick fixes:
Title: ${title}
Description: ${description}

Provide 2-3 potential solutions in the following JSON format:
{
  "quick_fixes": [{
    "title": "solution title",
    "steps": ["step 1", "step 2", ...],
    "difficulty": "easy|medium|hard",
    "tools_needed": ["tool1", "tool2", ...]
  }]
}`;

    const makeRequest = async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
        n: 1
      });

      if (!response.choices[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI');
      }

      return response;
    };

    const response = await retryWithBackoff(makeRequest);

    try {
      const suggestions = JSON.parse(response.choices[0].message.content || '');
      return Array.isArray(suggestions.quick_fixes) ? suggestions.quick_fixes : [];
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Error analyzing maintenance issue:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key is invalid or not configured properly');
      } else if (error.message.includes('429')) {
        throw new Error('Service is temporarily unavailable due to high demand. Please try again in a few minutes.');
      }
    }
    return [];
  }
}