require("dotenv").config();
const axios = require("axios");

async function testGenAI() {
  const API_KEY = process.env.GOOGLE_API_KEY;
  if (!API_KEY) {
    console.error("GOOGLE_API_KEY missing");
    return;
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/text-bison-001:generateText?key=${API_KEY}`,
      {
        prompt: { text: "Summarize this: Artificial Intelligence is transforming the world." },
        temperature: 0.7,
        maxOutputTokens: 100,
      }
    );
    console.log("GenAI response:", response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error Status:", error.response.status);
      console.error("Error Data:", error.response.data);
    } else {
      console.error("Error message:", error.message);
    }
  }
}

testGenAI();
