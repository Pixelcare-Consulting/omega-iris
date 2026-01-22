'use client'

import { Control, Controller, FieldPath, FieldValues, get, useWatch } from 'react-hook-form'
import FileUploader, { FileUploaderRef, FileUploaderTypes } from 'devextreme-react/file-uploader'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'
import { cn, toBase64 } from '@/utils'
import '../../styles/file-uploader.css'
import { Icons } from '../icons'
import { useEffect, useRef } from 'react'

type ExtendedProps = FormExtendedProps & { uploaderContainerClassName?: string; fileUploaderOptions?: FormExtendedProps }

type FileUploaderFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>
  name: TName
  label?: string
  description?: string
  isRequired?: boolean
  isHideLabel?: boolean
  isMulti?: boolean
  allowedFileExtensions?: string[]
  isConvertToBase64?: boolean
  callback?: (...args: any[]) => void
  extendedProps?: ExtendedProps
}

export default function FileUploaderField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
  isHideLabel,
  isMulti,
  allowedFileExtensions = [],
  isConvertToBase64 = true,
  callback,
  extendedProps,
}: FileUploaderFieldProps<T>) {
  const uploaderRef = useRef<FileUploaderRef>(null)

  const fieldValue = useWatch({ control, name })

  //* reset uploader when field value is empty
  useEffect(() => {
    if ((isMulti && Array.isArray(fieldValue) && fieldValue.length === 0) || (!isMulti && fieldValue === '')) {
      uploaderRef.current?.instance().reset()
    }
  }, [JSON.stringify(fieldValue), isMulti])

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, formState: { errors } }) => {
        const fieldError = get(errors, name)
        const isValid = !fieldError
        const errorMessage = fieldError?.message as React.ReactNode

        return (
          <FormItem {...extendedProps?.formItem}>
            {!isHideLabel && label && (
              <FormLabel {...extendedProps?.formLabel} isRequired={isRequired} isValid={isValid}>
                {label}
              </FormLabel>
            )}

            <div className={cn('file-uploader-block', extendedProps?.uploaderContainerClassName, isValid ? '' : 'border border-primary')}>
              <FileUploader
                id='file-uploader'
                uploadMode='useButtons'
                dropZone='file-uploader-block'
                visible
                ref={uploaderRef}
                isValid={isValid}
                multiple={isMulti}
                showFileList={isMulti}
                allowedFileExtensions={allowedFileExtensions}
                {...extendedProps?.fileUploaderOptions}
                onValueChanged={async (e) => {
                  const value = e.value as File[]

                  if (isMulti) {
                    if (value.length < 1) {
                      field.onChange([])
                      return
                    }

                    try {
                      if (isConvertToBase64) {
                        const based64Strings = await Promise.all(value.map(async (file) => await toBase64(file)))
                        field.onChange(based64Strings)
                      } else field.onChange(value)
                    } catch (error) {
                      field.onChange([])
                    }
                  } else {
                    const file = value?.[0]

                    if (!file) {
                      field.onChange('')
                      return
                    }

                    try {
                      if (isConvertToBase64) {
                        const base64String = await toBase64(file)
                        field.onChange(base64String)
                      } else field.onChange(file)
                    } catch (error) {
                      field.onChange('')
                    }
                  }

                  if (callback) callback({ value })
                }}
              />
            </div>

            {description && <FormDescription {...extendedProps?.formDescription}>{description}</FormDescription>}

            {errorMessage && <FormMessage {...extendedProps?.formMessage}>{errorMessage}</FormMessage>}
          </FormItem>
        )
      }}
    />
  )
}
