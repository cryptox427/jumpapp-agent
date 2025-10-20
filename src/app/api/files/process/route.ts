import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FileProcessingService } from '@/lib/file-processing'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const fileProcessingService = new FileProcessingService()
    const processedFiles = await fileProcessingService.processMultipleFiles(files)

    return NextResponse.json({ 
      success: true, 
      files: processedFiles,
      processed: processedFiles.length,
      total: files.length
    })
  } catch (error) {
    console.error('File processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process files', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return supported file types and limits
    return NextResponse.json({
      success: true,
      supportedTypes: [
        'text/plain',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      limits: {
        maxFiles: 5,
        maxSize: 10, // MB
        maxTotalSize: 50 // MB
      }
    })
  } catch (error) {
    console.error('File processing info error:', error)
    return NextResponse.json(
      { error: 'Failed to get file processing info' },
      { status: 500 }
    )
  }
}
