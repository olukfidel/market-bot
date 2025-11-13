import { CoreMessage, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { searchVectorStore } from '@/lib/vector-store';

// IMPORTANT: Use this to ensure the model only runs on the server
export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages }: { messages: CoreMessage[] } = await req.json();

  // Get the last user message
  const lastUserMessage = messages[messages.length - 1]?.content;

  if (typeof lastUserMessage !== 'string') {
    return new Response('Invalid message format', { status: 400 });
  }

  // --- This is the RAG part ---
  // 1. Search your database for relevant context
  const context = await searchVectorStore(lastUserMessage);
  // -----------------------------

  // 2. Create a system prompt with the context
  const systemPrompt = `
    You are a helpful assistant for the Nairobi Securities Exchange (NSE).
    Your name is "Market Bot". You are friendly and professional.

    Answer the user's question based ONLY on the following information.
    If the information is not in the context, say "I'm sorry, I don't have that information on the NSE website."
    Do not make up answers. Do not provide financial advice.

    --- CONTEXT ---
    ${context}
    --- END CONTEXT ---
  `;

  // 3. Add the system prompt to the message list
  const messagesWithContext: CoreMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages, // Add all previous messages
  ];

  // 4. Send the new prompt to the AI and stream the response
  // We are using OpenAI directly, not Vercel's Gateway
  const result = await streamText({
    model: openai('gpt-4o'), // Or 'gpt-3.5-turbo' if gpt-4o gives quota errors
    messages: messagesWithContext,
  });

  return result.toAIStreamResponse();
}