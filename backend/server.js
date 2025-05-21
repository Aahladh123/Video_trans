// File: backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const dotenv = require("dotenv");
const { getTranscript } = require("youtube-transcript");
const Video = require("./models/videoModel.js");
const { getSubtitles } = require('youtube-caption-scraper');
const { TextServiceClient } = require('@google-ai/generativelanguage');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/videoSummarizer", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const client = new TextServiceClient({
  // Optionally, you can specify apiKey here, but by default
  // the client will use GOOGLE_API_KEY environment variable
  apiKey: process.env.GOOGLE_API_KEY,
  apiEndpoint: "us-central1-generativelanguage.googleapis.com",
});

async function fetchTranscript(videoId) {
  try {
    const { getTranscript } = require("youtube-transcript");
    const transcriptArray = await getTranscript(videoId);
    return transcriptArray.map(item => item.text).join(' ');
  } catch {
    try {
      const { getSubtitles } = require("youtube-captions-scraper");
      const subtitles = await getSubtitles({ videoID: videoId, lang: 'en' });
      return subtitles.map(item => item.text).join(' ');
    } catch (err) {
      throw new Error("Transcript not available or failed to fetch.");
    }
  }
}


// Helper: Generate summary using Google GenAI
async function generateSummary(text) {
  const API_KEY = process.env.GOOGLE_API_KEY;
  console.log("Google API Key:", API_KEY ? "Loaded" : "Missing");

  if (!API_KEY) {
    throw new Error("GOOGLE_API_KEY not set in environment variables.");
  }

  if (!text || text.trim() === "") {
    throw new Error("Input text for summary is empty.");
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${API_KEY}`,
      {
        prompt: { text: `Summarize this: ${text}` },
        temperature: 0.7,
        maxOutputTokens: 256,
      }
    );

    const candidates = response.data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No summary candidates returned from GenAI API.");
    }

    return candidates[0].output;

  } catch (error) {
    console.error("Full Google GenAI API error response:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message || error);
    }
    throw new Error("Failed to generate summary from GenAI.");
  }
}

// NEW /api/summarize route using official client
app.post("/api/summarize", async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || transcript.trim() === "") {
      return res.status(400).json({ error: "Transcript missing or empty." });
    }

    // Trim transcript to max 1000 chars
    const trimmedTranscript = transcript.slice(0, 1000);

    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "Google API key missing" });
    }

    // Call Google Generative Language API directly
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${API_KEY}`,
      {
        prompt: { text: `Summarize this: ${trimmedTranscript}` },
        temperature: 0,
        maxOutputTokens: 200,
      }
    );

    const candidates = response.data.candidates;
    if (!candidates || candidates.length === 0) {
      return res.status(500).json({ error: "No summary candidates returned" });
    }

    const summary = candidates[0].output;
    res.json({ summary });

  } catch (error) {
    console.error("Error generating summary:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate summary.", details: error.message });
  }
});

app.post("/api/videos", async (req, res) => {
  const { url } = req.body;

  // Extract videoId from the YouTube URL
  const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL." });

  try {
    // Fetch video title using YouTube Data API
    const apiKey = process.env.YOUTUBE_API_KEY;
    console.log("Using YouTube API key:", apiKey);  // Debug API key loaded

    const ytResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`
    );

    const items = ytResponse.data.items;
    if (!items || items.length === 0) {
      return res.status(404).json({ error: "Video not found via YouTube API." });
    }

    const title = items[0].snippet.title;

    const video = await Video.findOneAndUpdate(
      { videoId },
      {
        videoId,
        title,
        url,
        createdAt: new Date(),
      },
      { new: true, upsert: true }
    );

    res.status(201).json(video);

  } catch (err) {
    console.error("Error in /api/videos:", err.response ? err.response.data : err.message);
    res.status(500).json({ error: "Failed to fetch video metadata.", details: err.message });
  }
});


// GET /api/videos - List all videos
app.get("/api/videos", async (req, res) => {
  const videos = await Video.find();
  res.json(videos);
});

// GET /api/videos/:id - Get single video data
app.get("/api/videos/:id", async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).send("Video not found");
  res.json(video);
});

// POST /api/transcribe - Real transcription
app.post("/api/transcribe", async (req, res) => {
  const { videoId } = req.body;
  console.log("Transcribing videoId:", videoId);  // <-- add this

  try {
    const transcript = await fetchTranscript(videoId);
    res.json({ transcript });
  } catch (error) {
    console.error("Transcript fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});
    



app.listen(5000, () => console.log("Server started on port 5000"));
