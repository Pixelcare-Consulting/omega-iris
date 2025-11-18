import { notFound } from 'next/navigation'

import { getProjectIndividualByCode } from '@/actions/project-individual'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ViewProjectIndividual from './_components/view-project-individual'

export default async function ProjectIndividualViewPage({ params }: { params: { code: string } }) {
  const { code } = params

  const projectIndividual = await getProjectIndividualByCode(parseInt(code))

  if (!projectIndividual) notFound()

  return (
    <ContentContainer>
      <ViewProjectIndividual projectIndividual={projectIndividual} />
    </ContentContainer>
  )
}
