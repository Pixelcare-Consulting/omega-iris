import { getPis } from '@/actions/project-individual'
import ContentContainer from '../../_components/content-container'
import ProjectIndividualsTable from './_components/project-individual-table'
import { getCurrentUserAbility } from '@/actions/auth'
import { getTenantDbCode } from '@/utils/tenant'

export default async function ProjectIndividualsPage() {
  const userInfo = await getCurrentUserAbility()
  const dbCode = await getTenantDbCode()
  const projectIndividuals = dbCode ? await getPis(dbCode, userInfo) : []

  return (
    <ContentContainer>
      <ProjectIndividualsTable projectIndividuals={projectIndividuals} />
    </ContentContainer>
  )
}
