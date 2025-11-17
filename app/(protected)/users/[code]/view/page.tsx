import { getUserByCode } from '@/actions/users'
import ContentContainer from '@/app/(protected)/_components/content-container'
import { notFound } from 'next/navigation'
import ViewUser from './_components/view-user'

export default async function UserViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const user = await getUserByCode(parseInt(code))

  if (!user) notFound()

  return (
    <ContentContainer>
      <ViewUser user={user} />
    </ContentContainer>
  )
}
