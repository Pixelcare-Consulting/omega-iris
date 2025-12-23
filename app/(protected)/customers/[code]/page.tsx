import { notFound } from 'next/navigation'

import { getBpByCode } from '@/actions/business-partner'
import ContentContainer from '@/app/(protected)/_components/content-container'
import CustomerForm from '../_components/customer-form'

export default async function CustomerPage({ params }: { params: { code: string } }) {
  const { code } = params

  const bp = await getBpByCode(parseInt(code))

  const getPageMetadata = () => {
    if (!bp || !bp?.code || code == 'add') return { title: 'Add Customer', description: 'Fill in the form to create a new customer.' }
    return { title: 'Edit Customer', description: "Edit the form to update this customer's information." }
  }

  if (code !== 'add' && !bp) notFound()

  return (
    <ContentContainer>
      <CustomerForm pageMetaData={getPageMetadata()} bp={bp} />
    </ContentContainer>
  )
}
