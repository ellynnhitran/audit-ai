import { createAdminClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface Finding {
  check_id: string;
  category: string;
  severity: 'info' | 'minor' | 'major';
  title: string;
  explanation: string;
  location: Record<string, unknown>;
  suggested_fix?: string;
  original_text?: string;
}

// ─── Deterministic Checks ──────────────────────────────────────────

function checkSpelling(text: string): Finding[] {
  const findings: Finding[] = [];
  const confusedWords: Record<string, { correct: string; explanation: string }> = {
    'teh': { correct: 'the', explanation: 'Common typo' },
    'recieve': { correct: 'receive', explanation: 'Misspelling: i before e except after c' },
    'occured': { correct: 'occurred', explanation: 'Double r required' },
    'definately': { correct: 'definitely', explanation: 'Common misspelling' },
    'seperate': { correct: 'separate', explanation: 'Common misspelling' },
    'accomodate': { correct: 'accommodate', explanation: 'Double c and double m' },
    'occurence': { correct: 'occurrence', explanation: 'Double r required' },
    'neccessary': { correct: 'necessary', explanation: 'One c, double s' },
    'wierd': { correct: 'weird', explanation: 'ei not ie' },
    'untill': { correct: 'until', explanation: 'Single l' },
    'alot': { correct: 'a lot', explanation: '"A lot" is two words' },
    'arguement': { correct: 'argument', explanation: 'No e after the u' },
    'begining': { correct: 'beginning', explanation: 'Double n' },
    'beleive': { correct: 'believe', explanation: 'ie not ei' },
    'calender': { correct: 'calendar', explanation: 'a not e in the last syllable' },
    'collegue': { correct: 'colleague', explanation: 'Double l, -eague ending' },
    'commitee': { correct: 'committee', explanation: 'Double m, double t, double e' },
    'concensus': { correct: 'consensus', explanation: 'No c in the middle' },
    'dessicate': { correct: 'desiccate', explanation: 'One s, double c' },
    'embarass': { correct: 'embarrass', explanation: 'Double r, double s' },
    'enviroment': { correct: 'environment', explanation: 'n before m' },
    'flourescent': { correct: 'fluorescent', explanation: 'uo not ou' },
    'goverment': { correct: 'government', explanation: 'n before m' },
    'happend': { correct: 'happened', explanation: 'Double p, -ed ending' },
    'immediatly': { correct: 'immediately', explanation: '-ely ending' },
    'independant': { correct: 'independent', explanation: '-ent not -ant' },
    'knowlege': { correct: 'knowledge', explanation: 'Missing d' },
    'liason': { correct: 'liaison', explanation: 'i before a' },
    'mispell': { correct: 'misspell', explanation: 'Double s' },
    'noticable': { correct: 'noticeable', explanation: 'Keep the e' },
    'persistant': { correct: 'persistent', explanation: '-ent not -ant' },
    'reccomend': { correct: 'recommend', explanation: 'One c, double m' },
    'refered': { correct: 'referred', explanation: 'Double r' },
    'relevent': { correct: 'relevant', explanation: '-ant not -ent' },
    'succesful': { correct: 'successful', explanation: 'Double c, double s' },
    'suprise': { correct: 'surprise', explanation: 'r before the first s' },
    'tommorow': { correct: 'tomorrow', explanation: 'One m, double r' },
    'truely': { correct: 'truly', explanation: 'No e' },
    'wich': { correct: 'which', explanation: 'Missing h' },
    'writting': { correct: 'writing', explanation: 'Single t' },
  };

  const confusables: Array<{ pattern: RegExp; message: string; fix: string }> = [
    { pattern: /\btheir\b(?=\s+(?:is|are|was|were)\b)/gi, message: "Possible confusion: 'their' (possessive) vs 'there' (location)", fix: 'there' },
    { pattern: /\bthere\b(?=\s+\w+(?:s|ed|ing)\b)/gi, message: "Possible confusion: 'there' vs 'their' (possessive)", fix: 'their' },
    { pattern: /\bits\s*'/gi, message: "'its' (possessive) does not use an apostrophe; 'it's' = 'it is'", fix: "it's" },
    { pattern: /\byour\b(?=\s+(?:right|welcome|going|doing|being)\b)/gi, message: "Possible confusion: 'your' vs 'you're'", fix: "you're" },
    { pattern: /\bthen\b(?=\s+(?:me|him|her|us|them|the|a|an)\b)/gi, message: "Possible confusion: 'then' (time) vs 'than' (comparison)", fix: 'than' },
    { pattern: /\beffect\b(?=\s+(?:the|a|an|my|your|our|their|his|her)\b)/gi, message: "Possible confusion: 'effect' (noun) vs 'affect' (verb)", fix: 'affect' },
  ];

  const words = text.split(/\s+/);
  let offset = 0;
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z']/g, '').toLowerCase();
    if (confusedWords[clean]) {
      findings.push({
        check_id: 'spelling',
        category: 'language',
        severity: 'minor',
        title: `Likely misspelling: "${word}"`,
        explanation: confusedWords[clean].explanation,
        location: { type: 'text', start_offset: offset, end_offset: offset + word.length },
        suggested_fix: confusedWords[clean].correct,
        original_text: word,
      });
    }
    offset += word.length + 1;
  }

  for (const c of confusables) {
    let match;
    while ((match = c.pattern.exec(text)) !== null) {
      findings.push({
        check_id: 'spelling',
        category: 'language',
        severity: 'info',
        title: c.message,
        explanation: c.message,
        location: { type: 'text', start_offset: match.index, end_offset: match.index + match[0].length },
        suggested_fix: c.fix,
        original_text: match[0],
      });
    }
  }

  return findings;
}

function checkGrammar(text: string): Finding[] {
  const findings: Finding[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let offset = 0;

  for (const sentence of sentences) {
    if (sentence.length > 2 && /^[a-z]/.test(sentence) && offset > 0) {
      findings.push({
        check_id: 'grammar',
        category: 'language',
        severity: 'minor',
        title: 'Sentence starts with lowercase letter',
        explanation: 'Sentences should begin with a capital letter.',
        location: { type: 'text', start_offset: offset, end_offset: offset + 1 },
        suggested_fix: sentence[0].toUpperCase(),
        original_text: sentence[0],
      });
    }

    if (/  +/.test(sentence)) {
      const match = /  +/.exec(sentence)!;
      findings.push({
        check_id: 'grammar',
        category: 'language',
        severity: 'info',
        title: 'Multiple consecutive spaces',
        explanation: 'Use a single space between words.',
        location: { type: 'text', start_offset: offset + match.index, end_offset: offset + match.index + match[0].length },
        suggested_fix: ' ',
        original_text: match[0],
      });
    }

    // Repeated words
    const repeated = /\b(\w+)\s+\1\b/gi;
    let repMatch;
    while ((repMatch = repeated.exec(sentence)) !== null) {
      findings.push({
        check_id: 'grammar',
        category: 'language',
        severity: 'minor',
        title: `Repeated word: "${repMatch[1]}"`,
        explanation: 'The same word appears twice in a row.',
        location: { type: 'text', start_offset: offset + repMatch.index, end_offset: offset + repMatch.index + repMatch[0].length },
        suggested_fix: repMatch[1],
        original_text: repMatch[0],
      });
    }

    offset += sentence.length + 1;
  }

  return findings;
}

function checkReadability(text: string): Finding[] {
  const findings: Finding[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);

  if (sentences.length === 0) return findings;

  const wordCounts = sentences.map(s => s.split(/\s+/).length);
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;

  let offset = 0;
  for (let i = 0; i < sentences.length; i++) {
    const wc = wordCounts[i];
    if (wc > 50) {
      findings.push({
        check_id: 'readability',
        category: 'language',
        severity: 'major',
        title: `Very long sentence (${wc} words)`,
        explanation: 'This sentence is extremely long and may be hard to follow. Consider breaking it into shorter sentences.',
        location: { type: 'text', start_offset: offset, end_offset: offset + sentences[i].length },
        original_text: sentences[i].slice(0, 80) + '...',
      });
    } else if (wc > 35) {
      findings.push({
        check_id: 'readability',
        category: 'language',
        severity: 'minor',
        title: `Long sentence (${wc} words)`,
        explanation: 'Consider breaking this into shorter sentences for clarity.',
        location: { type: 'text', start_offset: offset, end_offset: offset + sentences[i].length },
        original_text: sentences[i].slice(0, 80) + '...',
      });
    }
    offset += sentences[i].length + 1;
  }

  if (avgWords > 25) {
    findings.push({
      check_id: 'readability',
      category: 'language',
      severity: 'info',
      title: `High average sentence length (${avgWords.toFixed(1)} words)`,
      explanation: 'The overall writing uses long sentences. Shorter sentences improve readability.',
      location: { type: 'text', start_offset: 0, end_offset: Math.min(text.length, 100) },
    });
  }

  return findings;
}

function checkFormatting(text: string): Finding[] {
  const findings: Finding[] = [];
  const lines = text.split('\n');
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].endsWith('  ') || lines[i].endsWith('\t')) {
      findings.push({
        check_id: 'formatting',
        category: 'structure',
        severity: 'info',
        title: 'Trailing whitespace',
        explanation: 'Line has trailing spaces or tabs.',
        location: { type: 'text', start_offset: offset, end_offset: offset + lines[i].length, line: i + 1 },
      });
    }

    if (i > 0 && lines[i] === '' && lines[i - 1] === '') {
      if (i > 1 && lines[i - 2] === '') {
        findings.push({
          check_id: 'formatting',
          category: 'structure',
          severity: 'info',
          title: 'Multiple consecutive blank lines',
          explanation: 'Three or more blank lines in a row; consider reducing to one or two.',
          location: { type: 'text', start_offset: offset, end_offset: offset + 1, line: i + 1 },
        });
      }
    }

    offset += lines[i].length + 1;
  }

  return findings;
}

// ─── File Format Extractors ─────────────────────────────────────────

async function extractPdfText(blob: Blob): Promise<string> {
  try {
    const { default: pdf } = await import('npm:pdf-parse@1.1.1');
    const buffer = new Uint8Array(await blob.arrayBuffer());
    const result = await pdf(buffer);
    return result.text || '';
  } catch {
    const raw = await blob.text();
    const textBlocks: string[] = [];
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    while ((match = streamRegex.exec(raw)) !== null) {
      const content = match[1];
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(content)) !== null) {
        textBlocks.push(tjMatch[1]);
      }
      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let arrMatch;
      while ((arrMatch = tjArrayRegex.exec(content)) !== null) {
        const items = arrMatch[1];
        const strRegex = /\(([^)]*)\)/g;
        let strMatch;
        while ((strMatch = strRegex.exec(items)) !== null) {
          textBlocks.push(strMatch[1]);
        }
      }
    }
    if (textBlocks.length > 0) return textBlocks.join(' ');
    return raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim();
  }
}

async function extractDocxText(blob: Blob): Promise<string> {
  const { default: JSZip } = await import('npm:jszip@3.10.1');
  const buffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml')?.async('text');
  if (!docXml) throw new Error('No document.xml found');
  return docXml
    .replace(/<w:p[^>]*\/>/g, '\n')
    .replace(/<w:p[^>]*>/g, '\n')
    .replace(/<\/w:p>/g, '')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Document Parsing ───────────────────────────────────────────────

async function parseDocument(
  client: ReturnType<typeof createAdminClient>,
  asset: Record<string, unknown>
): Promise<string> {
  if (asset.extracted_text) return asset.extracted_text as string;

  const { data: fileBlob, error } = await client.storage
    .from('documents')
    .download(asset.storage_key as string);

  if (error || !fileBlob) throw new Error('Failed to download file');

  const mimeType = asset.mime_type as string;
  let text = '';

  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    text = await fileBlob.text();
  } else if (mimeType === 'application/pdf') {
    text = await extractPdfText(fileBlob);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    text = await extractDocxText(fileBlob);
  } else {
    text = await fileBlob.text();
  }

  await client.database
    .from('assets')
    .update({
      extracted_text: text,
      status: 'ready',
      metadata: {
        ...(asset.metadata as Record<string, unknown>),
        word_count: text.split(/\s+/).filter(Boolean).length,
        char_count: text.length,
      },
    })
    .eq('id', asset.id as string);

  return text;
}

// ─── Main Handler ───────────────────────────────────────────────────

export default async function(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const admin = createAdminClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL')!,
    apiKey: Deno.env.get('API_KEY')!,
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const audit_id = body.audit_id as string;
  if (!audit_id) return jsonResponse({ error: 'audit_id required' }, 400);

  const { data: audit, error: auditErr } = await admin.database
    .from('audits')
    .select('*, assets(*)')
    .eq('id', audit_id)
    .single();

  if (auditErr || !audit) return jsonResponse({ error: 'Audit not found' }, 404);

  await admin.database
    .from('audits')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', audit_id);

  try {
    const asset = audit.assets;
    const text = await parseDocument(admin, asset);

    if (!text) throw new Error('No text extracted from the asset');

    // Run all deterministic checks
    const allFindings: Finding[] = [
      ...checkSpelling(text),
      ...checkGrammar(text),
      ...checkReadability(text),
      ...checkFormatting(text),
    ];

    // Insert findings
    if (allFindings.length > 0) {
      await admin.database.from('findings').insert(
        allFindings.map(f => ({
          audit_id,
          check_id: f.check_id,
          category: f.category,
          severity: f.severity,
          title: f.title,
          explanation: f.explanation,
          location: f.location,
          suggested_fix: f.suggested_fix ?? null,
          original_text: f.original_text ?? null,
          disposition: 'pending',
        }))
      );
    }

    // Compute summary
    const bySeverity = { info: 0, minor: 0, major: 0 };
    const byCategory: Record<string, number> = {};
    for (const f of allFindings) {
      bySeverity[f.severity]++;
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    }

    await admin.database
      .from('audits')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary_metrics: {
          total_findings: allFindings.length,
          by_severity: bySeverity,
          by_category: byCategory,
        },
      })
      .eq('id', audit_id);

    return jsonResponse({ success: true, findings_count: allFindings.length });

  } catch (err) {
    await admin.database
      .from('audits')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', audit_id);

    return jsonResponse({ error: err instanceof Error ? err.message : 'Audit failed' }, 500);
  }
}
