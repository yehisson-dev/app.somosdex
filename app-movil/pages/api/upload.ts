import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '200mb',
    },
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { file, filename: originalName, mimetype } = req.body

    if (!file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const ext = path.parse(originalName || 'file').ext
    const fileId = randomUUID()
    const storedName = fileId + ext
    const uploadDir = path.join(process.cwd(), 'uploads')
    const uploadPath = path.join(uploadDir, storedName)

    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(uploadPath, Buffer.from(file, 'base64'))

    return res.status(200).json({
      id: fileId,
      filename: originalName || storedName,
      url: '/api/files/' + storedName,
      size: Buffer.byteLength(file, 'base64'),
      type: mimetype || 'application/octet-stream',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Upload failed' })
  }
}
