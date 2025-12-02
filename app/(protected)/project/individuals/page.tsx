import { getPis } from '@/actions/project-individual'
import ContentContainer from '../../_components/content-container'
import ProjectIndividualsTable from './_components/project-individual-table'

export default async function ProjectIndividualsPage() {
  const projectIndividuals = await getPis()

  return (
    <ContentContainer>
      <ProjectIndividualsTable projectIndividuals={projectIndividuals} />
    </ContentContainer>
  )
}
