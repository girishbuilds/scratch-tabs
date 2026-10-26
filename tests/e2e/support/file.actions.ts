import { Page } from '@playwright/test';

export class FileActions {
  constructor(private page: Page) {}

  /**
   * Opens a file through the Welcome screen's "Open File" button, answering the
   * native file chooser the app triggers.
   */
  async uploadFile(filename: string, content: string) {
    // A second copy of the button lives in the collapsed mobile section; getByRole skips hidden elements
    const openFileButton = this.page.getByRole('button', { name: /Open File/ });
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      openFileButton.click(),
    ]);

    await fileChooser.setFiles({
      name: filename,
      mimeType: 'text/plain',
      buffer: Buffer.from(content),
    });
  }

  async dragFileOntoPage(filename: string, content: string) {
    // Create a DataTransfer object with file data
    await this.page.evaluate((data) => {
      const { filename, content } = data;
      
      // Create a File object
      const file = new File([content], filename, { type: 'text/plain' });
      
      // Create a DataTransfer object
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Create drag events
      const dragenterEvent = new DragEvent('dragenter', {
        bubbles: true,
        dataTransfer: dataTransfer
      });
      
      const dragoverEvent = new DragEvent('dragover', {
        bubbles: true,
        dataTransfer: dataTransfer
      });
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        dataTransfer: dataTransfer
      });
      
      // Dispatch the events on the document body
      document.body.dispatchEvent(dragenterEvent);
      document.body.dispatchEvent(dragoverEvent);
      document.body.dispatchEvent(dropEvent);
    }, { filename, content });
  }

  async generateLargeJsonFile() {
    const largeJsonContent = this.generateLargeJsonObject();
    
    // Set the large JSON content to clipboard
    await this.page.evaluate(async (content) => {
      await navigator.clipboard.writeText(content);
      console.log(`Set ${(content.length / 1024 / 1024).toFixed(2)}MB JSON to clipboard`);
    }, largeJsonContent);
  }

  private generateLargeJsonObject(): string {
    const users = [];
    for (let i = 0; i < 10000; i++) {
      users.push({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        age: Math.floor(Math.random() * 80) + 18,
        active: Math.random() > 0.5,
        address: {
          street: `${Math.floor(Math.random() * 9999) + 1} Main St`,
          city: `City ${i % 100}`,
          state: `State ${i % 50}`,
          zip: `${Math.floor(Math.random() * 90000) + 10000}`
        },
        tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => `tag${j}`),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString(),
        metadata: {
          lastLogin: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
          loginCount: Math.floor(Math.random() * 1000),
          preferences: {
            theme: Math.random() > 0.5 ? 'dark' : 'light',
            notifications: Math.random() > 0.5,
            language: ['en', 'es', 'fr', 'de'][Math.floor(Math.random() * 4)]
          }
        }
      });
    }
    
    return JSON.stringify({ users, total: users.length, generated: new Date().toISOString() }, null, 2);
  }

  async expectFileToBeLoaded(filename: string) {
    // Check if file is loaded by looking for specific UI elements or text
    const fileIndicator = this.page.locator(`text="${filename}"`);
    await fileIndicator.waitFor({ state: 'visible' });
  }

  async expectFileContentToBeDisplayed(content: string) {
    // Check if file content is displayed in the editor or preview
    const contentElement = this.page.locator(`text="${content}"`);
    await contentElement.waitFor({ state: 'visible' });
  }

  async downloadFile(filename: string) {
    // Start waiting for download before clicking
    const downloadPromise = this.page.waitForEvent('download');
    
    // Trigger download (this would typically be a click on a download button)
    await this.page.getByRole('button', { name: 'Download' }).click();
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify filename matches expected
    if (download.suggestedFilename() !== filename) {
      throw new Error(`Expected to download "${filename}", but got "${download.suggestedFilename()}"`);
    }
    
    return download;
  }

  async expectDownloadToComplete(filename: string) {
    await this.downloadFile(filename);
  }
} 