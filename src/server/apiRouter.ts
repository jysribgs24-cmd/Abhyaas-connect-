import type { IncomingMessage, ServerResponse } from 'http';
import {
  generateMCQTestServer,
  solveDoubtChatServer,
  scanQuestionPhotoServer,
  checkAndIncrementTestLimit,
  checkAndIncrementChatLimit,
} from './geminiService.ts';

async function parseJsonBody(req: any): Promise<any> {
  // If Express or another middleware already parsed the body into an object
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
      // 15MB limit for image uploads
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) return resolve(req.body || {});
        resolve(JSON.parse(body));
      } catch (err) {
        resolve(req.body || {});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(
  req: IncomingMessage | any,
  res: ServerResponse | any
): Promise<boolean> {
  const originalUrl = (req.originalUrl || req.url || '').split('?')[0];
  const currentUrl = (req.url || '').split('?')[0];

  // Strictly check that this is an API route
  let normalizedPath = '';
  if (originalUrl.startsWith('/api')) {
    normalizedPath = originalUrl;
  } else if (currentUrl.startsWith('/api')) {
    normalizedPath = currentUrl;
  } else if (currentUrl.startsWith('/ai/')) {
    normalizedPath = `/api${currentUrl}`;
  } else {
    // NOT an API request! Must return false so Vite or static files can serve!
    return false;
  }

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
    return true;
  }

  // Health check
  if (normalizedPath === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'Abhyaas Connect AI Gateway' });
    return true;
  }

  // Only allow POST for AI operations
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return true;
  }

  try {
    const body = await parseJsonBody(req);

    // Route: /api/ai/test
    if (normalizedPath === '/api/ai/test') {
      const studentId = body.studentId || 'anonymous';
      const limitCheck = checkAndIncrementTestLimit(studentId);
      if (!limitCheck.allowed) {
        sendJson(res, 429, {
          error: 'DAILY_LIMIT_REACHED',
          message: 'Daily AI test limit reached (max 20 tests per day). Please try again tomorrow.',
        });
        return true;
      }

      const questions = await generateMCQTestServer({
        studentId,
        subject: body.subject || 'Mathematics',
        lesson: body.lesson || 'General Concepts',
        difficulty: body.difficulty || 'MEDIUM',
        numberOfQs: body.numberOfQs || 10,
        gradeClass: body.gradeClass || '10th',
      });

      sendJson(res, 200, { questions, remainingTestsToday: limitCheck.remaining });
      return true;
    }

    // Route: /api/ai/chat
    if (normalizedPath === '/api/ai/chat') {
      const studentId = body.studentId || 'anonymous';
      const limitCheck = checkAndIncrementChatLimit(studentId);
      if (!limitCheck.allowed) {
        sendJson(res, 429, {
          error: 'DAILY_LIMIT_REACHED',
          message: 'Daily AI limit reached (max 100 questions per day). Try again tomorrow.',
        });
        return true;
      }

      const answer = await solveDoubtChatServer({
        studentId,
        message: body.message || '',
        history: body.history || [],
        classAnnouncements: body.classAnnouncements || [],
      });

      sendJson(res, 200, { answer, remainingQueriesToday: limitCheck.remaining });
      return true;
    }

    // Route: /api/ai/scan
    if (normalizedPath === '/api/ai/scan') {
      const studentId = body.studentId || 'anonymous';
      const limitCheck = checkAndIncrementChatLimit(studentId);
      if (!limitCheck.allowed) {
        sendJson(res, 429, {
          error: 'DAILY_LIMIT_REACHED',
          message: 'Daily AI limit reached (max 100 questions per day). Try again tomorrow.',
        });
        return true;
      }

      if (!body.imageBase64) {
        sendJson(res, 400, { error: 'Missing imageBase64' });
        return true;
      }

      const result = await scanQuestionPhotoServer({
        studentId,
        imageBase64: body.imageBase64,
        mimeType: body.mimeType || 'image/jpeg',
        focusNote: body.focusNote,
      });

      sendJson(res, 200, {
        ...result,
        remainingQueriesToday: limitCheck.remaining,
      });
      return true;
    }

    sendJson(res, 404, { error: 'Endpoint Not Found', path: normalizedPath });
    return true;
  } catch (error: any) {
    console.error('API Error:', error);
    let msg = error?.message || 'AI service is temporarily busy. Please try again.';
    try {
      if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('"message"')) {
        const parsed = JSON.parse(msg);
        msg = parsed.error?.message || parsed.message || msg;
      }
    } catch {}

    if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
      msg = 'The AI tutor is currently experiencing a temporary high demand spike. Please try re-sending your doubt in a moment.';
    }

    sendJson(res, 500, {
      error: 'SERVER_ERROR',
      message: msg,
    });
    return true;
  }
}
