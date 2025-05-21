import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [videos, setVideos] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/videos");
      setVideos(res.data);
    } catch (error) {
      console.error("Failed to fetch videos", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    
    try {
      const res = await axios.post("http://localhost:5000/api/videos", { url: videoUrl });
      setVideos([...videos, res.data]);
      setVideoUrl("");
    } catch (error) {
      console.error("Failed to add video", error);
      alert("Failed to add video. Please check the URL and try again.");
    }
  };

  const handleTranscribe = async (videoId) => {
    try {
      const res = await axios.post("http://localhost:5000/api/transcribe", { videoId });
      setTranscript(res.data.transcript);
      setSummary(""); // Clear previous summary
    } catch (error) {
      console.error("Failed to fetch transcript", error);
      alert("Failed to fetch transcript.");
    }
  };

  const handleSummarize = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/summarize", { transcript });
      setSummary(res.data.summary);
    } catch (error) {
      console.error("Failed to generate summary", error);
      alert("Failed to generate summary.");
    }
  };

  return (
    <div>
      <h1>Video Summarizer</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="url"
          placeholder="Enter YouTube Video URL"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          required
          style={{ width: "400px" }}
        />
        <button type="submit">Add Video</button>
      </form>

      <ul>
        {videos.map((video) => (
          <li key={video._id}>
            <strong>{video.title}</strong> - <a href={video.url} target="_blank" rel="noreferrer">{video.url}</a>
            <button onClick={() => handleTranscribe(video.videoId)} style={{ marginLeft: "10px" }}>
              Transcribe
            </button>
          </li>
        ))}
      </ul>

      {transcript && (
        <div>
          <h2>Transcript</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{transcript}</p>
          <button onClick={handleSummarize}>Summarize</button>
        </div>
      )}

      {summary && (
        <div>
          <h2>Summary</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{summary}</p>
        </div>
      )}
    </div>
  );
}

export default App;
