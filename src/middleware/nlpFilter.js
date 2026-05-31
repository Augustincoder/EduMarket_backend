// src/middleware/nlpFilter.js
// Academic integrity content filter.
// Blocks posts that request cheating on exams, plagiarism, or fraud.
//
// Applied to: task creation, bid messages, review comments.
// NOT applied to: chat messages (real-time UX) — monitor separately.

// ─── Blocked patterns ─────────────────────────────────────────────────────────
// Uzbek + Russian academic fraud keywords
const BLOCKED_PATTERNS = [
  // Uzbek patterns
  /o['']rnimga\s+(imtihon|test|topshiriq)/i,
  /menga\s+aldab\s+o['']tish/i,
  /diplom\s+(sotib|yoz|qil)/i,
  /dissertatsiya\s+(yoz|qil|tayyorla)/i,
  /hiyla\s*(bilan|qil)/i,
  /aldash/i,
  /plagiat/i,
  /kurs\s*ishi\s*(sotib|tayyorlab\s*ber)/i,
  /tayyor\s*referat\s*sotib/i,
  /imtihon\s+javob(lar)?ini?\s*ber/i,
  /test\s+javob(lar)?ini?\s*ber/i,

  // Russian patterns
  /плагиат/i,
  /списать/i,
  /сдать\s+(за\s+меня|вместо\s+меня)/i,
  /написать\s+(дипломную|диссертацию)/i,
  /купить\s+(диплом|курсовую|реферат)/i,
  /решить\s+за\s+меня/i,
];

/**
 * Checks request body fields for academic fraud keywords.
 * Applied to task creation, bids, and reviews.
 *
 * Fields checked: title, description, message, comment
 */
function nlpFilter(req, res, next) {
  const textToCheck = [
    req.body?.title ?? '',
    req.body?.description ?? '',
    req.body?.message ?? '',
    req.body?.comment ?? '',
    req.body?.note ?? '',
  ]
    .join(' ')
    .toLowerCase();

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(textToCheck)) {
      return res.status(400).json({
        success: false,
        message:
          'Ushbu e\'lon platforma qoidalariga zid. ' +
          'Akademik halollik siyosatimizga amal qiling.',
        code: 'ACADEMIC_FRAUD_DETECTED',
      });
    }
  }

  next();
}

module.exports = { nlpFilter };
