const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { ChromaClient } = require("chromadb");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

// load data
const docsPath = path.join(__dirname, '..', 'data', 'rag_docs.json');
const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));

// init Chroma v2
const client = new ChromaClient({
  host: "localhost",
  port: 8000,
});
let collection;

async function embedText(text) {
  const res = await model.embedContent(text);
  return res.embedding.values;
}

async function checkEmbeddingDimensions() {
  try {
    console.log("\nChecking embedding dimensions...");
    const testEmbedding = await embedText("test");
    const dimensions = testEmbedding.length;
    console.log(`✓ text-embedding-004 produces vectors with ${dimensions} dimensions\n`);
    return dimensions;
  } catch (err) {
    console.error("Error checking dimensions:", err.message);
    return null;
  }
}

async function run() {
  console.log("Creating collection rag_products...");
  
  // Check embedding dimensions before indexing
  await checkEmbeddingDimensions();

  collection = await client.getOrCreateCollection({
    name: "rag_products",
    embeddingFunction: embedText,
  });

  let count = 0;
  for (const doc of docs) {
    count++;
    if (count % 50 === 0) console.log(`  Processed ${count}/${docs.length}...`);
    
    await collection.add({
      ids: [doc.id],
      embeddings: [await embedText(doc.text)],
      metadatas: [doc.metadata || {}],
      documents: [doc.text]
    });
  }

  console.log("Indexing completed! Total:", docs.length);
}

run().catch(err => console.error("Error:", err));
