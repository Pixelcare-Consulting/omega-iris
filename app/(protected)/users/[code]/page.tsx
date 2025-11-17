import { getUserByCode } from '@/actions/users'
import ContentContainer from '../../_components/content-container'
import UserForm from '../_components/user-form'
import { notFound } from 'next/navigation'

export default async function UserPage({ params }: { params: { code: string } }) {
  const { code } = params

  const user = await getUserByCode(parseInt(code))

  const getPageMetadata = () => {
    if (!user || !user?.code || code == 'add') return { title: 'Add User', description: 'Fill in the form to create a new user.' }
    return { title: 'Edit User', description: "Edit the form to update this user's information." }
  }

  if (code !== 'add' && !user) notFound()

  return (
    <ContentContainer>
      <UserForm user={user} pageMetaData={getPageMetadata()} />
    </ContentContainer>
  )
}
