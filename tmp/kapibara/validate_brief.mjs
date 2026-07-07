// validate_brief.mjs — validate brief.json against the schema and Factory Law constraints.
import { readFileSync } from 'node:fs';

export function validateBrief(brief) {
  const errors = [];

  // Required top-level fields
  const required = [
    'brief_id', 'created_by', 'format', 'duration_target_sec',
    'duration_tolerance_sec', 'voice', 'style', 'language',
    'topic', 'source_material', 'cta', 'n_items', 'state', 'approvals'
  ];
  for (const field of required) {
    if (brief[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  // Type checks
  if (typeof brief.brief_id !== 'string') errors.push('brief_id must be a string');
  if (typeof brief.created_by !== 'string') errors.push('created_by must be a string');
  if (brief.format !== 'ladder' && brief.format !== 'news') errors.push('format must be "ladder" or "news"');
  if (!Number.isInteger(brief.duration_target_sec) || brief.duration_target_sec <= 0) errors.push('duration_target_sec must be a positive integer');
  if (!Number.isInteger(brief.duration_tolerance_sec) || brief.duration_tolerance_sec <= 0) errors.push('duration_tolerance_sec must be a positive integer');
  if (typeof brief.style !== 'string') errors.push('style must be a string');
  if (!['en', 'ru', 'az'].includes(brief.language)) errors.push('language must be "en", "ru", or "az"');
  if (typeof brief.topic !== 'string') errors.push('topic must be a string');
  if (typeof brief.source_material !== 'string') errors.push('source_material must be a string');
  if (typeof brief.cta !== 'string' || brief.cta.trim() === '') errors.push('cta must be a non-empty string');
  if (!Number.isInteger(brief.n_items) || brief.n_items < 1 || brief.n_items > 5) errors.push('n_items must be an integer between 1 and 5');
  if (typeof brief.state !== 'string') errors.push('state must be a string');

  // Factory Law 6 check — voice must be locked to Algieba
  if (brief.voice !== 'Algieba') {
    errors.push(`Factory Law 6 violation: voice must be locked to "Algieba". Overriding is prohibited.`);
  }

  // Approvals object validation
  if (typeof brief.approvals !== 'object' || brief.approvals === null) {
    errors.push('approvals must be an object');
  } else {
    const approvalFields = ['brief', 'script', 'voice_sample', 'final'];
    for (const f of approvalFields) {
      const v = brief.approvals[f];
      if (v !== null && v !== 'approved' && v !== 'rejected') {
        errors.push(`approvals.${f} must be null, "approved", or "rejected"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateEpisodes(episodes, brief) {
  const errors = [];
  const n = brief.n_items;

  if (!Array.isArray(episodes) || episodes.length !== n) {
    errors.push(`Expected ${n} episodes, but got ${Array.isArray(episodes) ? episodes.length : 'non-array'}`);
    return { valid: false, errors };
  }

  const correctIds = [];

  for (let idx = 0; idx < n; idx++) {
    const ep = episodes[idx];
    const rung = idx + 1;

    // Check startLit
    if (ep.startLit !== idx) {
      errors.push(`Episode ${rung}: startLit must be ${idx}, got ${ep.startLit}`);
    }

    // Check options non-empty
    if (!Array.isArray(ep.options) || ep.options.length === 0) {
      errors.push(`Episode ${rung}: options must be a non-empty array`);
    } else {
      ep.options.forEach((opt, optIdx) => {
        if (typeof opt.text !== 'string' || opt.text.trim() === '') {
          errors.push(`Episode ${rung} option ${optIdx}: text must be a non-empty string`);
        }
      });
    }

    // Bridge check
    const hasBridge = rung < n;
    if (hasBridge && (typeof ep.vo.bridge !== 'string' || ep.vo.bridge.trim() === '')) {
      errors.push(`Episode ${rung}: bridge must be a non-empty string`);
    }
    if (!hasBridge && ep.vo.bridge && ep.vo.bridge.trim() !== '') {
      errors.push(`Episode ${rung}: bridge must be empty for the last rung`);
    }

    // CTA check
    const isLast = rung === n;
    if (isLast && (typeof ep.vo.cta !== 'string' || ep.vo.cta.trim() === '')) {
      errors.push(`Episode ${rung}: cta must be a non-empty string for the last rung`);
    }
    if (!isLast && ep.vo.cta && ep.vo.cta.trim() !== '') {
      errors.push(`Episode ${rung}: cta must be empty for non-last rungs`);
    }

    if (ep.correctId) {
      correctIds.push(ep.correctId);
    }
  }

  // Distribution gate check (shuffled correctIds should vary)
  const distinctCorrect = new Set(correctIds).size;
  const minDistinct = Math.min(3, n);
  if (distinctCorrect < minDistinct) {
    errors.push(`Distribution violation: correctIds are too uniform. Found ${distinctCorrect} distinct correctIds across ${n} episodes (expected at least ${minDistinct}).`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}


// CLI runner
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node validate_brief.mjs <brief.json>');
    process.exit(1);
  }
  try {
    const brief = JSON.parse(readFileSync(path, 'utf8'));
    const result = validateBrief(brief);
    if (!result.valid) {
      console.error(`Validation failed for ${path}:`);
      for (const err of result.errors) console.error(`  - ${err}`);
      process.exit(1);
    }
    console.log(`Brief validation OK: ${path}`);
  } catch (e) {
    console.error(`Error validating brief: ${e.message}`);
    process.exit(1);
  }
}
