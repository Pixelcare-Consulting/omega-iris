'use server'

import z from 'zod'
import { Prisma } from '@prisma/client'

import { action, authenticationMiddleware } from '@/utils/safe-action'
import fs from 'fs/promises'
import path from 'path'
import { uploadFileAttachmentFormSchema } from '@/schema/file-attachment'
import { FileAttachmentErrorEntry } from '@/types/common'
import { db } from '@/utils/db'
import { paramsSchema } from '@/schema/common'
import { fileExists, sanitizeFilename } from '@/utils/fileAttachment'

const STORAGE_PATH = process.env.STORAGE_PATH || 'D:/omega-iris-storage'
const MAX_FILE_SIZE = 100 * 1024 * 1024 //* 100 MB Limit

const COMMON_FILE_ATTACHMENT_ORDER_BY = { code: 'asc' } satisfies Prisma.FileAttachmentOrderByWithRelationInput

export async function getFileAttachmentsByRefCode(modelName: string, refCode?: number | null) {
  if (!modelName) return []

  try {
    return db.fileAttachment.findMany({ where: { modelName, ...(refCode && { refCode }) }, orderBy: COMMON_FILE_ATTACHMENT_ORDER_BY })
  } catch (error) {
    console.error(error)
    return []
  }
}

export const getFileAttachmentsByRefCodeClient = action
  .use(authenticationMiddleware)
  .schema(z.object({ modelName: z.string(), refCode: z.coerce.number().nullish() }))
  .action(async ({ parsedInput }) => {
    return getFileAttachmentsByRefCode(parsedInput.modelName, parsedInput.refCode)
  })

export const uploadFileAttachment = action
  .use(authenticationMiddleware)
  .schema(uploadFileAttachmentFormSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { refCode, files, modelName, total, stats, isLast } = parsedInput
    const { userId } = ctx

    const uploaded: string[] = [] //* track written files for rollback

    //* create storage path if not exist
    await fs.mkdir(STORAGE_PATH, { recursive: true })

    try {
      if (!files || files?.length < 1) throw new Error('No file found!')

      const batch: Prisma.FileAttachmentCreateManyInput[] = []

      //? Note: File attchement with already existing name and with already existing modelName will be updated, using upsert and replace in file system

      for (let i = 0; i < files.length; i++) {
        const errors: FileAttachmentErrorEntry[] = []
        const formData = files[i].formData
        const file = formData.get('file') as File

        const safeFileName = sanitizeFilename(file.name) //* sanitize filename
        const filePath = path.join(STORAGE_PATH, modelName, refCode ? refCode.toString() : '', safeFileName)

        //* check if file exceed max file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push({ message: 'File size too large!' })
        }

        //* if errors array is empty, then upload file
        if (errors.length === 0) {
          //* create file path directory if not exist
          await fs.mkdir(path.dirname(filePath), { recursive: true })

          try {
            //* convert file to buffer
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            //* upload/write file to storage, overwrite file if already exist
            await fs.writeFile(filePath, buffer)

            //* add file path to uploaded array
            uploaded.push(filePath)
          } catch (error: any) {
            errors.push({ message: `Failed to upload file!${error?.message ? `: ${error.message}` : ''}` })
          }
        }

        //* if errors array is not empty, then update/push to stats.error
        if (errors.length > 0) {
          stats.errors.push({
            rowNumber: i + 1,
            fileName: file.name,
            entries: errors,
            row: { name: file.name, type: file.type, size: file.size, path: filePath },
          })
          continue
        }

        //* reshape data
        const toCreateOrUpdate: Prisma.FileAttachmentCreateManyInput = {
          refCode: refCode ?? null,
          modelName,
          name: safeFileName,
          type: file.type,
          size: file.size,
          path: filePath,
        }

        batch.push(toCreateOrUpdate)
      }

      //* commit batch
      await db.$transaction(async (tx) => {
        //* upsert file attachments
        await Promise.all(
          batch.map((b) =>
            tx.fileAttachment.upsert({
              where: {
                modelName_name: {
                  name: b.name,
                  modelName: b.modelName,
                },
              },
              create: {
                ...b,
                uploadedBy: userId,
                updatedBy: userId,
              },
              update: {
                ...b,
                updatedBy: userId,
              },
            })
          )
        )
      })

      const progress = ((stats.completed + batch.length) / total) * 100

      const updatedStats = {
        ...stats,
        completed: stats.completed + batch.length,
        progress,
        status: progress >= 100 || isLast ? 'completed' : 'processing',
      }

      return {
        status: 200,
        message: `${updatedStats.completed} file attachments uploaded successfully!`,
        action: 'UPLOAD_FILE_ATTACHMENT',
        stats: updatedStats,
      }
    } catch (error) {
      //* rollback uplaoded files
      await Promise.all(
        uploaded.map(async (filePath) => {
          if (await fileExists(filePath)) {
            await fs.unlink(filePath).catch(() => {})
          }
        })
      )

      console.error(error)

      const errors = (files?.map((fileEntry) => {
        const formData = fileEntry.formData
        const file = formData.get('file') as File

        return {
          fileName: file.name,
          entries: [{ message: 'Unexpected batch upload error' }],
          row: null,
        }
      }) || []) as any

      stats.errors.push(...errors)
      stats.status = 'error'

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'UPLOAD_FILE_ATTACHMENT',
        stats,
      }
    }
  })

export const deleteFileAttachment = action
  .use(authenticationMiddleware)
  .schema(paramsSchema)
  .action(async ({ parsedInput: data }) => {
    try {
      const fileAttachment = await db.fileAttachment.findUnique({ where: { code: data.code } })

      if (!fileAttachment) return { error: true, status: 404, message: 'File attachment not found!', action: 'DELETE_FILE_ATTACHMENT' }

      //* dlete file attachment and the actual file
      await db.$transaction(async (tx) => {
        //* delete file attachment
        await tx.fileAttachment.delete({ where: { code: data.code } })

        //* delete file
        if (await fileExists(fileAttachment.path)) {
          await fs.unlink(fileAttachment.path).catch(() => {})
        }
      })

      return { status: 200, message: 'File attachment deleted successfully!', action: 'DELETE_FILE_ATTACHMENT' }
    } catch (error) {
      console.error(error)

      return {
        error: true,
        status: 500,
        message: error instanceof Error ? error.message : 'Something went wrong!',
        action: 'DELETE_FILE_ATTACHMENT',
      }
    }
  })
