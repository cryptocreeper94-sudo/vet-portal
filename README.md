# VET Portal — Verified Enterprise Trust Verifier

[![Trust Layer](https://img.shields.io/badge/Trust_Layer-Ecosystem-06b6d4)](https://trustlayer.tlid.io) [![Root Chain](https://img.shields.io/badge/Root_Chain-chain.tlid.io-10b981)](https://chain.tlid.io) [![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red)](LICENSE) [![Patent](https://img.shields.io/badge/Patent-Pending-gold)](#intellectual-property)

> 🔒 **Patent Pending:** Core deterministic governance and verification capabilities within the DarkWave Studios ecosystem are protected under U.S. Provisional Patent Application **No. 64/032,339** and related filings.

Customer-facing verification portal for **Verified Enterprise Trust (VET)** and **Fractal Ledger Architecture (FLA)** cryptographic certificates.

- **Live Platform:** [fla.tlid.io](https://fla.tlid.io)
- **Trust Layer Portal:** [trustlayer.tlid.io](https://trustlayer.tlid.io)
- **3-Scale Fractal Proof Verifier:** [trustlayer.tlid.io/verify.html](https://trustlayer.tlid.io/verify.html)

---

## Architecture & Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Static Verification Portal |
| **Container** | Docker |
| **Hosting** | Coolify (3 Hetzner VPS servers) |
| **Proof Verifier** | `https://trustlayer.tlid.io/verify.html` |

### Fractal Trust Alignment (*"Verified, Not Exposed"*)

1. **Scale 1 — Local Leaf Digest:** Private records remain inside the domain boundary; only canonical SHA-256 digests are derived for verification.
2. **Scale 2 — Domain Node Governance:** Containerized Coolify service with native Docker `HEALTHCHECK` probes (zero PM2).
3. **Scale 3 — Root Chain Anchor:** Public Proof-of-Authority timestamping on [chain.tlid.io](https://chain.tlid.io), human-verifiable at [trustlayer.tlid.io/verify.html](https://trustlayer.tlid.io/verify.html).

---

## Intellectual Property

**Patent Pending:**
- U.S. Pat. App. No. 64/032,339 — Lume-V Deterministic Governance
- U.S. Pat. App. No. 64/047,512 — Lume Core Language & Compiler
- U.S. Pat. App. No. 64/047,467 — Axiom Deterministic Language Architecture
- U.S. Pat. App. No. 64/047,496 — Lume-X Execution Fabric
- U.S. Pat. App. No. 64/047,536 — Synthetic Organisms
- U.S. Pat. App. No. 64/056,378 — Meridian Wireless Energy Routing
- U.S. Pat. App. No. 64/084,465 — DVE / LumeProof Media Verification

© 2026 DarkWave Studios LLC (Ronald Jason Andrews). All rights reserved.
