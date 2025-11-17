import { getRoles } from '@/actions/roles'
import ContentContainer from '../../_components/content-container'
import RoleTable from './_components/role-table'

export default async function RolesPage() {
  const roles = await getRoles()

  return (
    <ContentContainer>
      <RoleTable roles={roles} />
    </ContentContainer>
  )
}
