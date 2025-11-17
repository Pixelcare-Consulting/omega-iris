import { notFound } from 'next/navigation'

import { getRolesByCode } from '@/actions/roles'
import ContentContainer from '@/app/(protected)/_components/content-container'
import RoleForm from '../_components/role-form'

export default async function RolePage({ params }: { params: { code: string } }) {
  const { code } = params

  const role = await getRolesByCode(parseInt(code))

  const getPageMetadata = () => {
    if (!role || !role?.code || code == 'add') return { title: 'Add Role', description: 'Fill in the form to create a new role.' }
    return { title: 'Edit Role', description: "Edit the form to update this role's information." }
  }

  if (code !== 'add' && !role) notFound()

  return (
    <ContentContainer>
      <RoleForm pageMetaData={getPageMetadata()} role={role} />
    </ContentContainer>
  )
}
