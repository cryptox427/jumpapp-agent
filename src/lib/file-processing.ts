import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ProcessedFile {
  id: string
  name: string
  type: string
  content: string
  summary?: string
  extractedData?: any
}

export class FileProcessingService {
  async processFile(file: File): Promise<ProcessedFile> {
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      switch (file.type) {
        case 'text/plain':
          return await this.processTextFile(file, fileId)
        
        case 'application/pdf':
          return await this.processPDFFile(file, fileId)
        
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
        case 'image/webp':
          return await this.processImageFile(file, fileId)
        
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.processWordFile(file, fileId)
        
        default:
          return await this.processGenericFile(file, fileId)
      }
    } catch (error) {
      console.error('Error processing file:', error)
      throw new Error(`Failed to process file: ${file.name}`)
    }
  }

  private async processTextFile(file: File, fileId: string): Promise<ProcessedFile> {
    const content = await file.text()
    
    return {
      id: fileId,
      name: file.name,
      type: file.type,
      content,
      summary: await this.generateSummary(content),
    }
  }

  private async processPDFFile(file: File, fileId: string): Promise<ProcessedFile> {
    // For PDF processing, you would typically use a library like pdf-parse
    // For now, we'll return a placeholder
    const content = `PDF file: ${file.name}\n\n[PDF content would be extracted here using a PDF parsing library]`
    
    return {
      id: fileId,
      name: file.name,
      type: file.type,
      content,
      summary: 'PDF document - content extraction requires additional library',
    }
  }

  private async processImageFile(file: File, fileId: string): Promise<ProcessedFile> {
    // Convert image to base64 for OpenAI vision API
    const base64 = await this.fileToBase64(file)
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and provide a detailed description of its contents. If it contains text, extract all text. If it's a chart, graph, or diagram, describe the data and insights."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      })

      const content = response.choices[0]?.message?.content || 'Could not analyze image'
      
      return {
        id: fileId,
        name: file.name,
        type: file.type,
        content,
        summary: await this.generateSummary(content),
        extractedData: {
          base64,
          analysis: content,
        },
      }
    } catch (error) {
      console.error('Error processing image:', error)
      return {
        id: fileId,
        name: file.name,
        type: file.type,
        content: `Image file: ${file.name}\n\n[Image analysis failed]`,
        summary: 'Image file - analysis failed',
      }
    }
  }

  private async processWordFile(file: File, fileId: string): Promise<ProcessedFile> {
    // For Word document processing, you would typically use a library like mammoth
    // For now, we'll return a placeholder
    const content = `Word document: ${file.name}\n\n[Word document content would be extracted here using a document parsing library]`
    
    return {
      id: fileId,
      name: file.name,
      type: file.type,
      content,
      summary: 'Word document - content extraction requires additional library',
    }
  }

  private async processGenericFile(file: File, fileId: string): Promise<ProcessedFile> {
    const content = `File: ${file.name}\nType: ${file.type}\nSize: ${file.size} bytes\n\n[File content could not be processed]`
    
    return {
      id: fileId,
      name: file.name,
      type: file.type,
      content,
      summary: 'Unsupported file type',
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  private async generateSummary(content: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Provide a concise summary of the following content in 1-2 sentences:"
          },
          {
            role: "user",
            content: content.substring(0, 4000) // Limit content length
          }
        ],
        max_tokens: 150,
      })

      return response.choices[0]?.message?.content || 'Summary not available'
    } catch (error) {
      console.error('Error generating summary:', error)
      return 'Summary not available'
    }
  }

  async processMultipleFiles(files: File[]): Promise<ProcessedFile[]> {
    const results = await Promise.allSettled(
      files.map(file => this.processFile(file))
    )

    return results
      .filter((result): result is PromiseFulfilledResult<ProcessedFile> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
  }
}
