# @ai-native-solutions/bloom-weighted-sididy-mcp

MCP server for **bloom-weighted si-didy** — wraps the [SDK](https://github.com/sjgant80-hub/bloom-weighted-sididy-sdk) so any MCP-aware host (Claude Desktop, Claude Code, Cursor, etc.) can score responses against the 7-prime spine, overlay them on a user bloom, and export JSON/Markdown reports.

## Install

```bash
npm install -g @ai-native-solutions/bloom-weighted-sididy-mcp
```

## Wire into Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "bloom-weighted-sididy": {
      "command": "npx",
      "args": ["-y", "@ai-native-solutions/bloom-weighted-sididy-mcp"]
    }
  }
}
```

## Tools

### `bloomsididy_score_response`

Score raw text against the 7-prime spine.

**Input**
```json
{ "text": "the agent response here …" }
```

**Output** — axis scores (ground / perception / gate / heart / naming / observation / resolution), derived bloom, state vector, F(S⃗) fingerprint, signature (e.g. `●^2·♡^1`), density, word count, κ band.

### `bloomsididy_overlay`

Compare a user bloom against a response.

**Input** (any combination)
```json
{ "preset": "simon", "text": "…" }
{ "user_bloom": [4,7,7,6,5,4,3], "text": "…" }
{ "user_bloom": [4,7,7,6,5,4,3], "response_scores": { "bloom": [2,3,5,7,1,4,8] } }
```

**Output** — user bloom, response bloom, mismatch axes with `hot`/`warm`/`aligned` flags, per-axis deltas, F(S⃗) fold ratio, plain-text summary, self-contained SVG dual-radial (sage=user, amber=response, coral=mismatch).

### `bloomsididy_export`

Serialise a comparison to JSON or Markdown.

**Input**
```json
{ "comparison": { "…full overlay output plus text/presetName/at…" }, "format": "markdown" }
```

## Resources

### `bloomsididy://presets`

Returns the full preset catalogue — Simon `[4,7,7,6,5,4,3]`, Thomas `[2,8,3,7,15,6,12]`, Neutral `[1,1,1,1,1,1,1]` — plus the 7-prime spine, glyphs, and names.

## The 7-prime spine

| Prime | Glyph | Axis |
|---|---|---|
| 2 | ● | ground |
| 3 | 〜 | perception |
| 5 | ┃ | gate |
| 7 | ♡ | heart |
| 11 | △ | naming |
| 13 | ◐ | observation |
| 17 | ◯ | resolution |

F(S⃗) = Π p_i^e_i — fundamental theorem of arithmetic — unique fingerprint per state.

## Design principles

- **Sovereign.** No network calls. No telemetry.
- **Vanilla.** stdio transport. No hosted dependency.
- **Deterministic.** Same paste + same bloom → same axis scores, same F(S⃗).

## Related packages

- [`@ai-native-solutions/bloom-weighted-sididy-sdk`](https://github.com/sjgant80-hub/bloom-weighted-sididy-sdk) — the SDK this wraps
- [`@ai-native-solutions/bloom-weighted-sididy-api`](https://github.com/sjgant80-hub/bloom-weighted-sididy-api) — HTTP proxy

## License

MIT — © 2026 AI-Native Solutions
