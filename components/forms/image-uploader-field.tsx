'use client'

import { Control, Controller, FieldPath, FieldValues, get } from 'react-hook-form'
import FileUploader, { FileUploaderTypes } from 'devextreme-react/file-uploader'

import { FormExtendedProps } from '@/types/form'
import FormItem from './form-item'
import FormLabel from './form-label'
import FormDescription from './form-description'
import FormMessage from './form-message'
import { cn, toBase64 } from '@/utils'
import '../../styles/file-uploader.css'
import { Icons } from '../icons'

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
  callback?: (...args: any[]) => void
  extendedProps?: ExtendedProps
}

export default function ImageUploaderField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
  isHideLabel,
  isMulti,
  allowedFileExtensions = ['.jpg', '.jpeg', '.png'],
  callback,
  extendedProps,
}: FileUploaderFieldProps<T>) {
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
              {field.value && !isMulti && (
                <>
                  <img
                    className='absolute z-10 block h-full w-full rounded-2xl object-cover object-center'
                    src={field.value}
                    alt='thumbnail'
                  />

                  <div
                    className='absolute right-2 top-2 z-30 flex size-6 cursor-pointer items-center justify-center rounded-full bg-red-500'
                    onClick={() => field.onChange('')}
                  >
                    <Icons.x className='size-4 text-white' />
                  </div>
                </>
              )}

              <FileUploader
                id='file-uploader'
                uploadMode='useButtons'
                dropZone='file-uploader-block'
                visible
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
                      const based64Strings = await Promise.all(value.map(async (file) => await toBase64(file)))
                      field.onChange(based64Strings)
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
                      const base64String = await toBase64(value?.[0])
                      field.onChange(base64String)
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
