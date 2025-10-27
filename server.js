// server.js

import express from 'express';
import cors from 'cors';
import { getSubtitles } from 'youtube-caption-extractor'; // <-- NEW IMPORT

const app = express();
const port = 3000; 

// Configure CORS to allow the browser extension to connect
app.use(cors({
    origin: '*', 
    methods: ['GET']
}));

/**
 * Helper function to clean and format transcript data.
 * The new library provides 'start' and 'dur' in seconds (as strings), 
 * so the conversion logic is simpler.
 */
function formatTranscript(transcript) {
    return transcript.map(item => ({
        text: item.text,
        // The new library provides start and dur in seconds
        start: parseFloat(item.start), 
        duration: parseFloat(item.dur) 
    }));
}

// Languages to try (prioritizing English)
const languagesToTry = [
    'en', // Explicit English (Human or Auto)
    'fr', // French
    'es', // Spanish
    'de', // German
];

/**
 * API Endpoint to fetch the YouTube transcript with automatic fallback.
 */
app.get('/api/get_transcript', async (req, res) => {
    const videoId = req.query.videoId;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId parameter' });
    }

    let transcript = null;
    let foundLang = null;
    let lastError = null;

    // --- 1. Loop through priority languages ---
    for (const lang of languagesToTry) {
        try {
            console.log(`[Server] Attempting language: ${lang} for ${videoId}`);
            // getSubtitles call using the new library
            const fetchedTranscript = await getSubtitles({ videoID: videoId, lang: lang });
            
            if (fetchedTranscript && fetchedTranscript.length > 0) {
                transcript = fetchedTranscript;
                foundLang = lang;
                break; // Success! Stop trying
            }
        } catch (error) {
            lastError = error;
            console.log(`[Server] Failed for ${lang}. Will try next language.`);
        }
    }

    // --- 2. Final Check and Response ---
    if (transcript === null || transcript.length === 0) {
        // All attempts failed
        console.error(`[Server] All transcript attempts failed for ${videoId}.`);
        return res.status(404).json({ 
            error: 'No subtitles available for this video. Subtitles may be disabled or unavailable.'
        });
    }
    
    // Success: Format and send the response
    const cleanedTranscript = formatTranscript(transcript);
    console.log(`[Server] Successfully fetched ${cleanedTranscript.length} segments in language: ${foundLang}`);
    res.json(cleanedTranscript);

});

app.listen(port, () => {
    console.log(`JumprAI Transcript Server listening at http://localhost:${port}`);
});