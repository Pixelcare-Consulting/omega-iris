import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/utils/db'
import { safeParseInt } from '@/utils'
import { getTenantDbCode } from '@/utils/tenant'

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const fileAttachmentCode = safeParseInt(params.code)

    //* check code
    if (!fileAttachmentCode) return new NextResponse('Invalid file attachment code!', { status: 400 })

    const dbCode = await getTenantDbCode()

    if (!dbCode) return new NextResponse('Unauthorized!', { status: 401 })

    const existingFileAttachment = await db.fileAttachment.findFirst({ where: { code: fileAttachmentCode, dbCode } })

    //* check if file attachment exist
    if (!existingFileAttachment) return new NextResponse('File attachment not found!', { status: 404 })

    //* read file from storage
    const fileBuffer = await fs.readFile(existingFileAttachment.path)

    //* return file buffer
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': existingFileAttachment.type,
        'Content-Length': existingFileAttachment.size.toString(),
        'Content-Disposition': `inline; filename="${existingFileAttachment.name}"`,
      },
    })
  } catch (error) {
    return new NextResponse('Something went wrong!', { status: 500 })
  }
}