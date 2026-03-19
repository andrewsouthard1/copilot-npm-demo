const { OpenAI } = require('openai');
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const natural = require('natural');

// AI Chat Application
class AIChatApp {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.chatModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
    });
    
    this.tokenizer = new natural.WordTokenizer();
  }

  async chatWithAI(userMessage) {
    try {
      const messages = [
        new SystemMessage('You are a helpful AI assistant.'),
        new HumanMessage(userMessage)
      ];
      
      const response = await this.chatModel.invoke(messages);
      return response.content;
    } catch (error) {
      console.error('Error in AI chat:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  analyzeText(text) {
    const tokens = this.tokenizer.tokenize(text);
    const wordCount = tokens.length;
    const sentiment = this.analyzeSentiment(text);
    
    return {
      wordCount,
      sentiment,
      tokens: tokens.slice(0, 10) // First 10 tokens
    };
  }

  analyzeSentiment(text) {
    const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
    return analyzer.getSentiment(text.split(' '));
  }
}

module.exports = AIChatApp; 