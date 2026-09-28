import { notFound } from 'next/navigation'

import { getPiByCode } from '@/actions/project-individual'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewProjectIndividual from './_components/view-project-individual'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'

export default async function ProjectIndividualViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()
  const projectIndividual = dbCode ? await getPiByCode(dbCode, parseInt(code), userInfo) : null

  if (!projectIndividual) notFound()

  return (
    <ContentContainer>
      <ViewProjectIndividual projectIndividual={projectIndividual} />
    </ContentContainer>
  )
}
