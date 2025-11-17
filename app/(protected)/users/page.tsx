import { getUsers } from '@/actions/users'
import ContentContainer from '../_components/content-container'
import UserTable from './_components/user-table'

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <ContentContainer>
      <UserTable users={users} />
    </ContentContainer>
  )
}
