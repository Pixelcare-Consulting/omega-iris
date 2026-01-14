import { getPis } from '@/actions/project-individual'
import ContentContainer from '../../_components/content-container'
import ProjectIndividualsTable from './_components/project-individual-table'
import { getCurrentUserAbility } from '@/actions/auth'

export default async function ProjectIndividualsPage() {
  const userInfo = await getCurrentUserAbility()
  const projectIndividuals = await getPis(userInfo)

  return (
    <ContentContainer>
      <ProjectIndividualsTable projectIndividuals={projectIndividuals} />
    </ContentContainer>
  )
}
