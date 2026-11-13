
const express = require('express');
const crypto = require('crypto');
const { crawlWebsite } = require('./crawler');

const app = express();

app.use(express.json({ limit: '2mb' }));

// API key authentication
function authenticateApiKey(req, res, next) {
    const apiKey = process.env.API_KEY;
    const providedKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(500).json({
            error: 'API key is not configured'
        });
    }

    if (
        !providedKey ||
        Buffer.byteLength(providedKey) !== Buffer.byteLength(apiKey) ||
        !crypto.timingSafeEqual(
            Buffer.from(providedKey),
            Buffer.from(apiKey)
        )
    ) {
        return res.status(401).json({
            error: 'Unauthorized: Invalid API key'
        });
    }

    next();
}

// Health check
app.get('/healthz', (req, res) => {
    res.json({
        status: 'running',
        service: 'AI QA Automation'
    });
});

// Website crawling API
app.post('/crawl', authenticateApiKey, async (req, res) => {
    try {
        const {
            projectName,
            testCase,
            browser,
            websiteURL,
            maxPages = 30,
            maxDepth = 4,
            includeExternalLinks = false
        } = req.body;

        if (!websiteURL) {
            return res.status(400).json({
                error: 'websiteURL is required'
            });
        }

        const parsedURL = new URL(websiteURL);

        if (!['http:', 'https:'].includes(parsedURL.protocol)) {
            return res.status(400).json({
                error: 'Only HTTP and HTTPS URLs are allowed'
            });
        }

        const result = await crawlWebsite({
            websiteURL,
            browser,
            maxPages,
            maxDepth,
            includeExternalLinks
        });

        res.json({
            projectName,
            testCase,
            result
        });

    } catch (error) {
        console.error('Crawler error:', error);

        res.status(500).json({
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`QA Automation API running on port ${PORT}`);
});
