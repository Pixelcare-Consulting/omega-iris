import { getProjectIndividuals } from '@/actions/project-individual'
import ContentContainer from '../../_components/content-container'
import ProjectIndividualsTable from './_components/project-individual-table'

export default async function RolesPage() {
  const projectIndividuals = await getProjectIndividuals()

  return (
    <ContentContainer>
      <ProjectIndividualsTable projectIndividuals={projectIndividuals} />
    </ContentContainer>
  )
}
