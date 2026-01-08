import { notFound } from 'next/navigation'

import { getRolesByCode } from '@/actions/roles'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewRole from './_components/view-role'

export default async function RoleViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const role = await getRolesByCode(parseInt(code))

  if (!role) notFound()

  return (
    <ContentContainer>
      <ViewRole role={role} />
    </ContentContainer>
  )
}
