import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import * as readlineSync from "readline-sync";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//Tools
function getAqiIndex(city: string): Number {
  if (city.toLowerCase() === "Delhi") {
    return 200;
  } else if (city.toLowerCase() === "Mumbai") {
    return 100;
  } else if (city.toLowerCase() === "Bangalore") {
    return 50;
  } else if (city.toLowerCase() === "Chennai") {
    return 75;
  } else {
    return 0;
  }
}

const TOOL_MAPPING = {
    "getAqiIndex": getAqiIndex
}

const SYSTEM_PROMPT = `
You are an AI assistand with START, PLAN, ACTION, Observation and Output states.
Wait for user to prompt and first PLAN the available tools.
After Planning, take ACTION with the appropriate tools and wait for observation based on the action.
Once you get the observation, return the AI response based on the START prompt and observations.

Strictly follow the JSON output format for each state.

AVAILABLE_TOOLS:
- getAqiIndex(city: string) -> number
getAqiIndex function returns the AQI index of the city passed as an argument & if the city is not found, it returns 0.

Example:
START
{"type" : "user, "user" : "What is the AQI in Delhi?"}
{"type" : "plan", "plan" : "I will call the getAqiIndex function for Delhi"}
{"type" : "action", "function" : "getAqiIndex", "input" : "Delhi"}
{"type" : "observation", "observation" : "200"}
{"type" : "output", "output" : "The AQI in Delhi is 200"}
`;

const messages = [{ role: "system", content: SYSTEM_PROMPT }];

while (true) {
  const query = readlineSync.question("Enter your query: ");
  const sendQuery = { type: "user", user: query };
  messages.push({ role: "user", content: JSON.stringify(sendQuery) });

  while (true) {
    const chat = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as ChatCompletionMessageParam[],
      response_format: { type: "json_object" },
    });

    const result = chat.choices[0].message.content;
    if (result !== null) {
      messages.push({ role: "assistant", content: result });
      const call = JSON.parse(result);
      if (call.type === "output") {
        console.log(call.output);
        break;
      }
      else if(call.type === 'action') {
          const fn = TOOL_MAPPING[call.function];
          const input = call.input;
          const observation = fn(input);
          const obs = { type: "observation", observation: observation };
          messages.push({ role: "developer", content: JSON.stringify(obs) });
      }
    }
  }

}
