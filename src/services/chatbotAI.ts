import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export async function generateChatResponse(userMessage: string): Promise<string> {

  try {
    // Remove unused prompt variable since it's not being used in the code

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: 'You are a helpful hostel assistant that provides accurate and concise information about hostel services and facilities.' },
                { role: 'user', content: userMessage }],
      max_tokens: 150,
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.5,
      n: 1
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI');
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating chat response:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      return 'I apologize, but there seems to be an issue with the chat service authentication. Please contact support.';
    }
    return 'I apologize, but I am having trouble processing your request. Please try again later.';
  }
}