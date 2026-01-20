import { notFound } from 'next/navigation'

import { getPiByCode } from '@/actions/project-individual'
import ContentContainer from '@/app/(protected)/_components/content-container'
import ProjectIndividualForm from '../_components/project-individual-form'
import { getCurrentUserAbility } from '@/actions/auth'

export default async function IndividualPage({ params }: { params: { code: string } }) {
  const { code } = params

  const userInfo = await getCurrentUserAbility()
  const projectIndividual = await getPiByCode(parseInt(code), userInfo)

  const getPageMetadata = () => {
    if (!projectIndividual || !projectIndividual?.code || code == 'add')
      return { title: 'Add Project Individual', description: 'Fill in the form to create a new project individual.' }
    return { title: 'Edit Project Individual', description: "Edit the form to update this project individual's information." }
  }

  if (code !== 'add' && !projectIndividual) notFound()

  return (
    <ContentContainer>
      <ProjectIndividualForm pageMetaData={getPageMetadata()} projectIndividual={projectIndividual} />
    </ContentContainer>
  )
}
