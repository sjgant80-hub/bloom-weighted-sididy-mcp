#!/usr/bin/env node
// @ai-native-solutions/bloom-weighted-sididy-mcp
// MCP server exposing the bloom-weighted si-didy scoring engine to any MCP-aware host.
// PRIVATE cosmology · AI-Native Solutions · MIT

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import {
  scoreResponse, analyzeMismatch, foldRatio, summariseMismatch,
  overlay,
  renderRadial, mismatchAxes,
  toJSON, toMarkdown, exportComparison,
  getPreset, listPresets, PRESETS,
  SPINE, SPINE_GLYPHS, SPINE_NAMES
} from '@ai-native-solutions/bloom-weighted-sididy-sdk';

// ============================================================================
// SERVER
// ============================================================================

const server = new Server(
  {
    name: 'bloom-weighted-sididy-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const TOOLS = [
  {
    name: 'bloomsididy_score_response',
    description: 'Score a text response against the 7-prime spine (ground, perception, gate, heart, naming, observation, resolution). Returns per-axis lexical scores, derived bloom (1-15 per axis), state vector, F(S⃗) fingerprint, signature, density, and κ band.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The agent response text to score.' }
      },
      required: ['text']
    }
  },
  {
    name: 'bloomsididy_overlay',
    description: 'Overlay a user bloom (7-axis 1-15 vector) against a response — either scored fresh from raw text or supplied directly. Returns mismatch axes with deltas, F(S⃗) fold ratio, plain-text summary, and a self-contained dual-radial SVG (sage=user, amber=response, coral=mismatch).',
    inputSchema: {
      type: 'object',
      properties: {
        user_bloom: {
          type: 'array',
          items: { type: 'number' },
          description: '7-element bloom vector (values 1-15) OR omit and pass preset.'
        },
        preset: {
          type: 'string',
          enum: ['simon', 'thomas', 'neutral'],
          description: 'Shortcut instead of user_bloom.'
        },
        text: {
          type: 'string',
          description: 'Raw response text to score into a response bloom.'
        },
        response_scores: {
          type: 'object',
          description: 'Pre-computed response bloom (7-element array wrapped in { bloom: [...] }) to skip scoring.'
        }
      }
    }
  },
  {
    name: 'bloomsididy_export',
    description: 'Serialise a comparison (from bloomsididy_overlay) to JSON or Markdown for downstream use.',
    inputSchema: {
      type: 'object',
      properties: {
        comparison: { type: 'object', description: 'Comparison object as returned by bloomsididy_overlay.' },
        format: { type: 'string', enum: ['json', 'markdown', 'md'], description: 'Output format · defaults to json.' }
      },
      required: ['comparison']
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// ============================================================================
// TOOL DISPATCH
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  try {
    if (name === 'bloomsididy_score_response') {
      const score = scoreResponse(String(args.text || ''));
      return jsonResult({
        axis_scores: score.axis_scores,
        bloom: score.bloomForm,
        state_vector: score.S,
        F: score.F,
        signature: score.signature,
        density: score.density,
        word_count: score.wordCount,
        kappa_band: score.band ? score.band.name : null
      });
    }

    if (name === 'bloomsididy_overlay') {
      // resolve user bloom
      let userBloom;
      if (Array.isArray(args.user_bloom) && args.user_bloom.length === 7) {
        userBloom = args.user_bloom.map(Number);
      } else if (typeof args.preset === 'string') {
        userBloom = getPreset(args.preset);
      } else {
        userBloom = getPreset('neutral');
      }

      // resolve response bloom
      let respBloom, score;
      if (args.response_scores && Array.isArray(args.response_scores.bloom)) {
        respBloom = args.response_scores.bloom.map(Number);
        score = null;
      } else if (typeof args.text === 'string') {
        score = scoreResponse(args.text);
        respBloom = score.bloomForm;
      } else {
        throw new Error('overlay requires either text or response_scores.bloom');
      }

      const mismatches = analyzeMismatch(userBloom, respBloom);
      const fold = foldRatio(userBloom, respBloom);
      const summary = summariseMismatch(mismatches);
      const svg = renderRadial(userBloom, respBloom, mismatches);
      const axes = mismatchAxes(mismatches, 3);

      return jsonResult({
        user_bloom: userBloom,
        response_bloom: respBloom,
        mismatch_axes: axes,
        deltas: mismatches.map(m => ({ axis: m.name, glyph: m.glyph, delta: m.delta })),
        user_F: fold.userF,
        response_F: fold.respF,
        fold_ratio: fold.ratio,
        summary,
        svg,
        signature: score ? score.signature : null,
        kappa_band: score && score.band ? score.band.name : null
      });
    }

    if (name === 'bloomsididy_export') {
      const format = String(args.format || 'json').toLowerCase();
      const out = exportComparison(args.comparison || {}, format);
      return { content: [{ type: 'text', text: out }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `error: ${err.message}` }]
    };
  }
});

function jsonResult(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
}

// ============================================================================
// RESOURCES
// ============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'bloomsididy://presets',
      name: 'Bloom presets',
      description: 'The named bloom vectors (Simon, Thomas, Neutral) plus their axis labels.',
      mimeType: 'application/json'
    }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  if (uri === 'bloomsididy://presets') {
    const payload = {
      spine: SPINE,
      glyphs: SPINE_GLYPHS,
      names: SPINE_NAMES,
      presets: PRESETS,
      catalogue: listPresets()
    };
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(payload, null, 2)
      }]
    };
  }
  throw new Error(`Unknown resource: ${uri}`);
});

// ============================================================================
// BOOT
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('bloom-weighted-sididy-mcp · ready · stdio');
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
