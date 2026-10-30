# Data sources

| Source | Used for | Status |
|---|---|---|
| USITC HTS search (hts.usitc.gov) | Candidate tariff lines, General duty rate | Adapter written against the public REST search; response shape not yet confirmed live. Failures are reported as "unavailable". |
| Meta Model API (api.meta.ai/v1) | Product normalization, classification reasoning, document field extraction | Requires `MODEL_API_KEY` and regional access. |
| Static corridor checklist | Starter checklist for India to US | Labeled "needs professional verification". Not a live source. |

Not integrated: CBP rulings, additional-duty programs, FDA/USDA/CPSC rules, exchange rates, OCR.
