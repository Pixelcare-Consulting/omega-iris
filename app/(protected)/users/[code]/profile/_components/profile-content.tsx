'use client'

import { getUserByCode } from '@/actions/users'
import PageHeader from '@/app/(protected)/_components/page-header'
import ProfileBasicInfoForm from './profile-basic-info-form'
import ProfileChangePasswordForm from './profile-change-password-form'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import ScrollView from 'devextreme-react/scroll-view'

type ProfileContentProps = {
  user: NonNullable<Awaited<ReturnType<typeof getUserByCode>>>
}

export default function ProfileContent({ user }: ProfileContentProps) {
  const fullName = `${user.fname} ${user.lname}`

  return (
    <div className='flex h-full w-full flex-col gap-5'>
      <PageHeader title={`${fullName}'s Profile`} description='View and edit your profile information' />

      <ScrollView className='flex max-h-[calc(100%_-_92px)]' useNative={false} scrollByContent scrollByThumb>
        <ProfileBasicInfoForm user={user} />
        <ProfileChangePasswordForm user={user} />
      </ScrollView>
    </div>
  )
}
