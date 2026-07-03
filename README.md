# 🔬 OmniResearch

<p align="center">
  <img src="assets/logo.jpg" alt="OmniResearch Logo" width="200" />
</p>

> Universal AI research agent on CROO CAP — accepts any topic, delivers verifiable reports in multiple formats (Markdown, PDF, Email)

## Track

**Research & Intelligence Agents** — Paid research with verifiable sources

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in your API keys in .env
npm run dev
```

## Services

| Service | Price | SLA | Description |
|---|---|---|---|
| Quick Research Summary | 0.50 USDC | 10 min | Concise summary with key findings |
| Deep Research Report | 2.00 USDC | 30 min | Detailed analysis with citations |
| Full Research Dossier | 5.00 USDC | 60 min | PDF report + email delivery |

## Project Structure

```
src/
├── index.ts                  # Entry point
├── provider.ts               # CROO CAP provider logic
├── config.ts                 # Environment config
├── research/                 # Research pipeline
│   ├── orchestrator.ts       # Pipeline coordinator
│   ├── planner.ts            # Query decomposition
│   ├── gatherer.ts           # Multi-source gathering
│   ├── synthesizer.ts        # LLM synthesis
│   └── scorer.ts             # Confidence scoring
├── sources/                  # Data source integrations
│   ├── web-search.ts         # Tavily/Serper
│   ├── academic.ts           # arXiv, PubMed
│   ├── onchain.ts            # DeFiLlama, Dune
│   └── news.ts               # News APIs
├── delivery/                 # Output format generators
│   ├── markdown.ts           # Markdown reports
│   ├── pdf.ts                # PDF generation
│   ├── email.ts              # Email delivery
│   └── schema-builder.ts     # CAP schema builder
├── verification/             # Provenance & verification
│   ├── evidence-bundle.ts    # Evidence hashing
│   └── citation-checker.ts   # Citation validation
└── utils/
    ├── logger.ts
    ├── hash.ts               # keccak256 utilities
    └── rate-limiter.ts
```

## Full Plan

See [PLAN.md](./PLAN.md) for the complete implementation plan with architecture diagrams, code examples, and milestones.
