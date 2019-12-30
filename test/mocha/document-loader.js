const {JsonLdDocumentLoader} = require('jsonld-document-loader');
const jsonLdDocumentLoader = new JsonLdDocumentLoader();

const contextModules = [
  'security-context',
  'web-ledger-context',
  'security-context'
];

for(const module of contextModules) {
  const {contexts, constants: contextConstants} = require(module);
  for(const c in contextConstants) {
    const contextUrl = contextConstants[c];
    jsonLdDocumentLoader.addStatic(contextUrl, contexts.get(contextUrl));
  }
}

exports.documentLoader = jsonLdDocumentLoader
  .documentLoader.bind(jsonLdDocumentLoader);
