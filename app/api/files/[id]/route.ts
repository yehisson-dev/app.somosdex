import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: filename } = await params

  if (!filename || filename.includes('..') || filename.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), 'uploads')
  const filePath = path.join(uploadDir, filename)

  try {
    await fs.access(filePath)
    const buf = await fs.readFile(filePath)
    const stat = await fs.stat(filePath)
    const ext = path.extname(filename).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: filename } = await params

  if (!filename || filename.includes('..') || filename.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), 'uploads')
  const filePath = path.join(uploadDir, filename)

  try {
    await fs.unlink(filePath)
    return NextResponse.json({ message: 'Deleted' })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
