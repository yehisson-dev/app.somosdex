import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { createWriteStream } from 'fs'
import { randomUUID } from 'crypto'
import { Writable } from 'stream'

// Stream body directly to disk to avoid any in-memory body size limits
async function streamBodyToFile(body: ReadableStream<Uint8Array>, filePath: string): Promise<number> {
  const writer = createWriteStream(filePath)
  const reader = body.getReader()
  let totalBytes = 0

  await new Promise<void>((resolve, reject) => {
    const writable = new Writable({
      write(chunk, _enc, cb) {
        writer.write(chunk, cb)
      },
      final(cb) {
        writer.end(cb)
      },
    })
    writable.on('finish', resolve)
    writable.on('error', reject)
    writer.on('error', reject)

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { writable.end(); break }
          totalBytes += value.byteLength
          if (!writable.write(value)) {
            await new Promise<void>(r => writable.once('drain', r))
          }
        }
      } catch (err) {
        writable.destroy(err as Error)
        reject(err)
      }
    }
    pump()
  })

  return totalBytes
}

export async function POST(req: NextRequest) {
  try {
    if (!req.body) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const originalName = req.nextUrl.searchParams.get('filename') || 'file'
    const mimetype = req.nextUrl.searchParams.get('mimetype') || 'application/octet-stream'
    const ext = path.parse(originalName).ext
    const fileId = randomUUID()
    const storedName = fileId + ext
    const uploadDir = path.join(process.cwd(), 'uploads')
    const uploadPath = path.join(uploadDir, storedName)

    await fs.mkdir(uploadDir, { recursive: true })

    const size = await streamBodyToFile(req.body, uploadPath)

    if (size === 0) {
      await fs.unlink(uploadPath).catch(() => {})
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    return NextResponse.json({
      id: fileId,
      filename: originalName,
      url: '/api/files/' + storedName,
      size,
      type: mimetype,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
