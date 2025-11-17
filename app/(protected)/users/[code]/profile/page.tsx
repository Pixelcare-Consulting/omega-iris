import { getUserByCode, getUsers } from '@/actions/users'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ProfileContent from './_components/profile-content'
import { notFound } from 'next/navigation'

export default async function UserProfilePage({ params }: { params: { code: string } }) {
  const { code } = params

  const user = await getUserByCode(parseInt(code))

  if (!user) notFound()

  return (
    <ContentContainer>
      <ProfileContent user={user} />
    </ContentContainer>
  )
}
