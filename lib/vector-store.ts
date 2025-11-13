import { db } from '@/lib/db';
import { nseKnowledge } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

// This is the magic part: a local AI model loader
class EmbeddingSingleton {
  private extractor: any = null;
  static instance: EmbeddingSingleton;

  private constructor() {}

  static async getInstance() {
    if (!this.instance) {
      this.instance = new EmbeddingSingleton();
      // Dynamically import the library
      const { pipeline } = await import('@xenova/transformers');
      // Load the model. This will download it the first time.
      this.instance.extractor = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
    }
    return this.instance;
  }

  async getEmbedding(text: string) {
    if (!this.extractor) {
      throw new Error('Extractor not initialized');
    }
    const result = await this.extractor(text, {
      pooling: 'mean',
      normalize: true,
    });
    // Convert the result to a simple array
    return Array.from(result.data);
  }
}

/**
 * Searches the vector database for the most relevant context.
 */
export async function searchVectorStore(query: string, count = 3) {
  try {
    const embedder = await EmbeddingSingleton.getInstance();
    const queryEmbedding = await embedder.getEmbedding(query);

    const searchSql = sql`
      SELECT
        content,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}) as similarity
      FROM nse_knowledge
      ORDER BY similarity DESC
      LIMIT ${count}
    `;

    const results = await db.execute(searchSql);

    if (results.rows.length === 0) {
      return 'No relevant information found.';
    }

    return results.rows
      .map((row) => (row as { content: string }).content)
      .join('\n\n');

  } catch (error) {
    console.error('Error searching vector store:', error);
    return 'Error retrieving context.';
  }
}