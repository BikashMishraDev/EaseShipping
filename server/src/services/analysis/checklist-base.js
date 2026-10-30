// Static, clearly labeled starter checklist for the India -> United States corridor.
// These are common export steps, NOT verified against a live source in this app; each is marked "verify".
const note = 'Common step for this corridor. Not verified against a live source by EaseShipping; confirm with an official source or licensed customs broker.';
export const CORRIDORS = {
  'IN-US': {
    label: 'India to United States',
    base: [
      { key: 'commercial-invoice', requirement: 'Prepare a commercial invoice', explanation: 'Describe the goods, quantity, unit price, total value, origin and buyer/seller. Values should match your other documents.', kind: 'verify' },
      { key: 'packing-list', requirement: 'Prepare a packing list', explanation: 'List packages, contents, weights and dimensions so carriers and customs can check the shipment.', kind: 'verify' },
      { key: 'exporter-registration', requirement: 'Confirm Indian exporter registration (e.g. IEC) and shipping bill process', explanation: 'Exporters in India generally need to be registered and file export declarations through customs. Check current rules with DGFT / Indian Customs or your forwarder.', kind: 'verify' },
      { key: 'us-importer', requirement: 'Identify the US importer of record and how customs entry will be filed', explanation: 'Someone must be responsible for US customs entry and duty payment. Many small exporters use a customs broker.', kind: 'verify' },
      { key: 'hts-confirmation', requirement: 'Have the HTS classification confirmed', explanation: 'Treat any AI-suggested code as a starting point. A licensed customs broker or a CBP ruling can confirm it.', kind: 'recommendation' },
      { key: 'additional-duties', requirement: 'Check for additional US duties or trade measures that apply to this product and origin', explanation: 'The general HTS rate may not be the full duty. Additional tariff programs change often, so check current sources before quoting prices.', kind: 'verify' },
      { key: 'origin-marking', requirement: 'Check country-of-origin marking on the product and packaging', explanation: 'Imported goods are usually required to be marked with their country of origin. Confirm what applies to your product.', kind: 'verify' },
      { key: 'incoterms-insurance', requirement: 'Agree Incoterms and arrange cargo insurance', explanation: 'Decide who pays freight, insurance and duties, and record it on the invoice.', kind: 'recommendation' },
    ].map((i) => ({ ...i, note })),
  },
};
export const corridorKey = (p) => `${p.originCountry}-${p.destinationCountry}`;
