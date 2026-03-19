const natural = require('natural');
const { ChatOpenAI } = require('@langchain/openai');

// AI Utility Functions
class AIUtils {
  constructor() {
    this.chatModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
    });
    
    this.classifier = new natural.BayesClassifier();
    this.tfidf = new natural.TfIdf();
  }

  // Text classification using natural language processing
  classifyText(text, categories) {
    this.classifier.addDocument(text, categories[0]);
    this.classifier.train();
    return this.classifier.classify(text);
  }

  // TF-IDF analysis for document similarity
  analyzeDocumentSimilarity(documents) {
    documents.forEach((doc, index) => {
      this.tfidf.addDocument(doc, `doc${index}`);
    });
    
    return this.tfidf.listTerms(0).slice(0, 5); // Top 5 terms
  }

  // Language detection
  detectLanguage(text) {
    const language = natural.LanguageDetect.detect(text);
    return language;
  }

  // Text summarization using AI
  async summarizeText(text) {
    try {
      const prompt = `Summarize the following text in 2-3 sentences: ${text}`;
      const response = await this.chatModel.invoke([prompt]);
      return response.content;
    } catch (error) {
      console.error('Error in text summarization:', error);
      return 'Unable to summarize text at this time.';
    }
  }

  // Keyword extraction
  extractKeywords(text) {
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text);
    const stopWords = natural.stopwords;
    
    return tokens
      .filter(token => !stopWords.includes(token.toLowerCase()))
      .slice(0, 10);
  }
}

module.exports = AIUtils; 