import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const buf = Buffer.from(await req.arrayBuffer())
    if (buf.length === 0) {
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
    await fs.writeFile(uploadPath, buf)

    return NextResponse.json({
      id: fileId,
      filename: originalName,
      url: '/api/files/' + storedName,
      size: buf.length,
      type: mimetype,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
