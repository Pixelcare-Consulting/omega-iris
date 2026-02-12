'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch, useFormState } from 'react-hook-form'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'nextjs-toploader/app'
import { useSession } from 'next-auth/react'

import { getUserByCode, updateBasicInfo } from '@/actions/users'
import { getInitials } from '@/utils'
import { BasicInfoForm, basicInfoFormSchema } from '@/schema/user'
import TextBoxField from '@/components/forms/text-box-field'
import SelectBoxField from '@/components/forms/select-box-field'
import { useRoles } from '@/hooks/safe-actions/roles'
import SwitchField from '@/components/forms/switch-field'
import LoadingButton from '@/components/loading-button'
import Copy from '@/components/copy'
import { FormDebug } from '@/components/forms/form-debug'
import { useEffect, useMemo } from 'react'
import { isEmpty } from 'radash'

type ProfileBasicInfoFormProps = {
  user: NonNullable<Awaited<ReturnType<typeof getUserByCode>>>
}

export default function ProfileBasicInfoForm({ user }: ProfileBasicInfoFormProps) {
  const { data: session } = useSession()

  const router = useRouter()

  const userFullName = `${user?.fname} ${user?.lname}`

  const form = useForm({
    mode: 'onChange',
    values: {
      code: user.code,
      fname: user.fname,
      lname: user.lname,
      username: user.username,
      email: user.email,
      roleCode: user.role.code,
      roleKey: user.role.key,
      isActive: user.isActive,
    },
    resolver: zodResolver(basicInfoFormSchema),
  })

  const { executeAsync, isExecuting } = useAction(updateBasicInfo)
  const roles = useRoles()

  const formState = useFormState({ control: form.control })

  const isAdmin = useMemo(() => {
    if (!session) return false
    return session.user.roleKey === 'admin'
  }, [JSON.stringify(session)])

  const handleOnSubmit = async (formData: BasicInfoForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401 && result.paths && result.paths.length > 0) {
          result.paths.forEach((path) => {
            const field = path.field as keyof BasicInfoForm
            form.setError(field, { type: 'custom', message: path.message })
          })
        }

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.user && 'id' in result?.data?.user) {
        router.refresh()

        setTimeout(() => {
          router.push(`/users/${result.data.user.code}/profile`)
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  const handleCancel = () => {
    form.reset()
    setTimeout(() => form.clearErrors(), 100)
  }

  useEffect(() => {
    console.log({ formState })
  }, [formState])

  console.log(`DEL-${Date.now()}`)

  return (
    <FormProvider {...form}>
      <form className='rounded-md bg-white shadow-md' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <header className='flex items-center justify-between border-b px-4 py-3'>
          <h1 className='text-lg font-bold tracking-tight'>Basic Info</h1>

          <div className='col-span-12 flex items-center justify-end gap-2'>
            <LoadingButton
              text='Cancel'
              type='normal'
              stylingMode='contained'
              isLoading={isExecuting}
              disabled={isEmpty(formState.dirtyFields)}
              onClick={handleCancel}
            />

            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              useSubmitBehavior
              icon='save'
              isLoading={isExecuting}
              disabled={isEmpty(formState.dirtyFields)}
            />
          </div>
        </header>

        <div className='grid grid-cols-12 gap-5 px-6 py-8'>
          <div className='col-span-12 flex items-center gap-4'>
            <div className='flex size-14 items-center justify-center rounded-full bg-primary text-white'>
              <span className='text-xl font-bold'>{getInitials(userFullName).toUpperCase()}</span>
            </div>

            <div className='flex flex-col'>
              <div className='flex items-center'>
                <h2 className='text-base font-medium'>{userFullName}</h2>
              </div>

              <div className='flex items-center gap-x-1.5'>
                <div className='flex items-center gap-x-1.5 text-slate-400'>
                  <span className='text-xs'>ID:</span>
                  <span className='text-sm'>#{user.code}</span>
                  <Copy value={user.code} />
                </div>

                <div className='mx-1 h-[16px] w-[1px] bg-slate-400' />

                <div className='flex items-center gap-x-1.5 text-slate-400'>
                  <span className='text-xs'>USERNAME:</span>
                  <span className='text-sm'>@{user.username}</span>
                  <Copy value={user.username} />
                </div>
              </div>
            </div>
          </div>

          <div className='col-span-12 md:col-span-6 lg:col-span-3'>
            <TextBoxField control={form.control} name='fname' label='First Name' isRequired />
          </div>

          <div className='col-span-12 md:col-span-6 lg:col-span-3'>
            <TextBoxField control={form.control} name='lname' label='Last Name' isRequired />
          </div>

          <div className='col-span-12 md:col-span-6 lg:col-span-3'>
            <TextBoxField control={form.control} name='username' label='Username' isRequired />
          </div>

          <div className='col-span-12 md:col-span-6 lg:col-span-3'>
            <TextBoxField control={form.control} name='email' label='Email' isRequired />
          </div>

          {isAdmin && (
            <>
              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={roles.data}
                  isLoading={roles.isLoading}
                  control={form.control}
                  name='roleCode'
                  label='Role'
                  valueExpr='code'
                  displayExpr='name'
                  searchExpr={['name', 'description']}
                  isRequired
                  callback={(args) => form.setValue('roleKey', args.item?.key)}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField control={form.control} name='isActive' label='Active' description='Is this user active?' />
              </div>
            </>
          )}
        </div>
      </form>
    </FormProvider>
  )
}
