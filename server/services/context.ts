export class ContextManager {
  private apiKey: string;
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  // Update API key and reinitialize the client
  public updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }
}