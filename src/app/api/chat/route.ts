import { NextResponse } from "next/server";
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

export async function POST(req: Request) {
  try {
    const { userInput } = await req.json();
    console.log("Received user input:", userInput);

    const llmPromises = [
      // GPT-4 response
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: userInput }],
      }).then(response => ({
        id: "gpt4-" + Date.now(),
        name: "GPT-4",
        response: response.choices[0]?.message?.content || "No response",
      }))
      .catch(error => {
        console.error("GPT-4 API error:", error);
        return { 
          id: "gpt4-error-" + Date.now(),
          name: "GPT-4", 
          response: "Error getting response from GPT-4" 
        };
      }),

      // Claude response
      anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 1024,
        messages: [{ role: "user", content: userInput }],
      }).then(response => ({
        id: "claude-" + Date.now(),
        name: "Claude",
        response: response.content[0]?.text || "No response",
      }))
      .catch(error => {
        console.error("Claude API error:", error);
        return { 
          id: "claude-error-" + Date.now(),
          name: "Claude", 
          response: "Error getting response from Claude" 
        };
      }),

      // Perplexity response
      fetch(PERPLEXITY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": process.env.PERPLEXITY_API_KEY?.trim() || '',
        },
        body: JSON.stringify({
          model: "pplx-7b-online",
          messages: [
            {
              role: "system",
              content: "You are a helpful research assistant."
            },
            {
              role: "user",
              content: userInput
            }
          ],
        }),
      })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Perplexity API error: ${res.status}`);
        }
        return res.json();
      })
      .then(data => ({
        id: "llama-" + Date.now(),
        name: "Llama",
        response: data.choices[0]?.message?.content || "No response",
      }))
      .catch(error => {
        console.error("Perplexity API error:", error);
        return { 
          id: "llama-error-" + Date.now(),
          name: "Llama", 
          response: "Error getting response from Llama" 
        };
      }),
    ];

    const responses = await Promise.all(llmPromises);
    return NextResponse.json({ responses });
    
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
} 