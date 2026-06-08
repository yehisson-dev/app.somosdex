import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import { promises as fs } from 'fs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const filename = req.query.filename as string

  if (!filename || filename.includes('..') || filename.startsWith('/')) {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  const uploadDir = path.join(process.cwd(), 'uploads')
  const filePath = path.join(uploadDir, filename)

  if (req.method === 'GET') {
    try {
      await fs.access(filePath)
      const buf = await fs.readFile(filePath)
      const stat = await fs.stat(filePath)

      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Length', String(stat.size))
      res.setHeader('Content-Disposition', 'attachment; filename=  + filename +  ')

      return res.status(200).send(buf)
    } catch {
      return res.status(404).json({ error: 'File not found' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await fs.unlink(filePath)
      return res.status(200).json({ message: 'Deleted' })
    } catch (err: any) {
      if (err.code === 'ENOENT') return res.status(404).json({ error: 'Not found' })
      return res.status(500).json({ error: 'Delete failed' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
