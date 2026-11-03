import OpenAI from 'openai'
import { serverConfig } from '../config/index.js'
import { rewriteQuerySchema } from '../schema/query.schema.js';
import { FINAL_RESPONSE_SYSTEM_PROMPT, REWRITE_QUERY_SYSTEM_PROMPT } from '../prompt.js';

export const client = new OpenAI({
      apiKey: serverConfig.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
});

export async function rewriteQuery(query){
   const completion = await client.chat.completions.create({
    model: serverConfig.openai.chatmodel,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: rewriteQuerySchema
    },
    messages: [
      {
        role: "system",
        content: REWRITE_QUERY_SYSTEM_PROMPT
      },
      { role: "user", content: query },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

  return {
    stepBack: parsed.stepBack ?? "",
    rewritten: parsed.rewritten ?? query,
    // Guard against the model returning more/fewer than 3.
    subQueries: Array.isArray(parsed.subQueries) ? parsed.subQueries.slice(0, 3) : [],
  };
}

export async function hydeDocument(query) {
  const completion = await client.chat.completions.create({
    model: serverConfig.openai.chatmodel,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are an expert writer. Write a concise, factual passage (3-5 sentences) that directly answers " +
          "the user's question, as if it were an excerpt from a relevant reference document. " +
          "Write confidently in a neutral, encyclopedic tone. Do not add disclaimers or say you are unsure.",
      },
      { role: "user", content: query },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export async function getFinalResponse(context,query) {
  if (!client) {
    throw new Error("A Groq client instance is required.");
  }

  const response = await client.chat.completions.create({
    model: serverConfig.openai.chatmodel,
    messages: [
      {
        role: "system",
        content: FINAL_RESPONSE_SYSTEM_PROMPT
      },
      { 
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${query}`
      }
    ],
  });

  return response.choices[0]?.message?.content || "No response generated";
}