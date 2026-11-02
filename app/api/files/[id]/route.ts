import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { createReadStream } from 'fs'
import { Readable } from 'stream'

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
  '.mkv': 'video/x-matroska',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
}

function resolveFilePath(filename: string): string | null {
  if (!filename || filename.includes('..') || filename.startsWith('/')) return null
  const uploadDir = path.join(process.cwd(), 'uploads')
  return path.join(uploadDir, filename)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: filename } = await params
  const forceDownload = req.nextUrl.searchParams.has('download')
  const filePath = resolveFilePath(filename)
  if (!filePath) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })

  try {
    await fs.access(filePath)
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const stat = await fs.stat(filePath)
  const fileSize = stat.size
  const ext = path.extname(filename).toLowerCase()
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
  const isVideo = contentType.startsWith('video/')

  const rangeHeader = req.headers.get('range')

  if (rangeHeader) {
    // Parse "bytes=start-end" or "bytes=start-"
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
    if (!match) return NextResponse.json({ error: 'Invalid Range' }, { status: 416 })

    const start = parseInt(match[1], 10)
    const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1)

    if (start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}` },
      })
    }

    const chunkSize = end - start + 1
    const nodeStream = createReadStream(filePath, { start, end })
    const webStream = Readable.toWeb(nodeStream) as ReadableStream

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // No Range header
  const disposition = forceDownload ? 'attachment' : 'inline'
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': String(fileSize),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
    'Content-Disposition': `${disposition}; filename="${filename}"`,
  }

  // For images: read the whole file as a buffer — more reliable through reverse proxies
  if (contentType.startsWith('image/')) {
    const buffer = await fs.readFile(filePath)
    return new NextResponse(buffer, { headers })
  }

  // For videos and other large files: stream
  const nodeStream = createReadStream(filePath)
  const webStream = Readable.toWeb(nodeStream) as ReadableStream
  return new NextResponse(webStream, { headers })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: filename } = await params
  const filePath = resolveFilePath(filename)
  if (!filePath) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })

  try {
    await fs.unlink(filePath)
    return NextResponse.json({ message: 'Deleted' })
  } catch (err: any) {
    if (err.code === 'ENOENT') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
