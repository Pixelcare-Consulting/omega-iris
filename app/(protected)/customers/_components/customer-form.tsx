'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useContext, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import {
  BUSINESS_PARTNER_STD_API_GROUP_TYPE_MAP,
  BUSINESS_PARTNER_TYPE_MAP,
  type BusinessPartnerForm,
  businessPartnerFormSchema,
} from '@/schema/business-partner'
import TextBoxField from '@/components/forms/text-box-field'
import LoadingButton from '@/components/loading-button'
import { getBpByCardCode, upsertBp } from '@/actions/business-partner'
import { PageMetadata } from '@/types/common'
import SelectBoxField from '@/components/forms/select-box-field'
import SwitchField from '@/components/forms/switch-field'
import Separator from '@/components/separator'
import NumberBoxField from '@/components/forms/number-box-field'
import { DEFAULT_CURRENCY_FORMAT } from '@/constants/devextreme'
import { commonItemRender } from '@/utils/devextreme'
import ReadOnlyField from '@/components/read-only-field'
import { useBpGroups } from '@/hooks/safe-actions/businsess-partner-group'
import { useCurrencies } from '@/hooks/safe-actions/currency'
import { usePaymentTerms } from '@/hooks/safe-actions/payment-term'
import { FormDebug } from '@/components/forms/form-debug'
import { useAccountTypes } from '@/hooks/safe-actions/account-type'
import { useBusinessTypes } from '@/hooks/safe-actions/business-type'
import ReadOnlyFieldHeader from '@/components/read-only-field-header'
import AddressForm from '../../_components/address-form'
import ContactForm from '../../_components/contact-form'
import { useContacts } from '@/hooks/safe-actions/contacts'
import { useAddresses } from '@/hooks/safe-actions/address'
import CanView from '@/components/acl/can-view'
import TooltipWrapper from '@/components/tooltip-wrapper'
import { useLatestBp } from '@/hooks/safe-actions/business-partner'
import { MAX_CARD_CODE_DIGITS } from '@/constants/business-partner'
import { safeParseInt } from '@/utils'
import { NotificationContext } from '@/context/notification'

type CustomerFormProps = { pageMetaData: PageMetadata; bp: Awaited<ReturnType<typeof getBpByCardCode>> }

const CARD_TYPE = 'C'

export default function CustomerForm({ pageMetaData, bp }: CustomerFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  // const notificationContext = useContext(NotificationContext)

  const isCreate = code === 'add' || !bp

  const latestBpData = useLatestBp(CARD_TYPE)

  const values = useMemo(() => {
    if (bp) return { ...bp, contacts: [], billingAddresses: [], shippingAddresses: [] }

    if (isCreate) {
      return {
        code: -1,
        isActive: true,
        syncStatus: 'pending',
        contacts: [],
        billingAddresses: [],
        shippingAddresses: [],

        //* sap fields
        CardCode: null,
        CardName: '',
        CardType: 'L',
        CntctPrsn: null,
        CurrName: null,
        CurrCode: null,
        GroupCode: null,
        GroupName: null,
        GroupNum: null,
        PymntGroup: null,
        Phone1: null,
        ShipToDef: null,
        BillToDef: null,
        AcctType: null,
        CmpPrivate: null,
        Balance: 0,
        ChecksBal: 0,
      }
    }

    return undefined
  }, [isCreate, JSON.stringify(bp)])

  const form = useForm({
    mode: 'onChange',
    values,
    resolver: zodResolver(businessPartnerFormSchema),
  })

  const cardType = useWatch({ control: form.control, name: 'CardType' })
  const GroupCode = useWatch({ control: form.control, name: 'GroupCode' })
  const CurrCode = useWatch({ control: form.control, name: 'CurrCode' })
  const GroupNum = useWatch({ control: form.control, name: 'GroupNum' })

  const { executeAsync, isExecuting } = useAction(upsertBp)

  const addresses = useAddresses(bp?.CardCode ?? '')
  const contacts = useContacts(bp?.CardCode ?? '')

  const bpGroups = useBpGroups()
  const currencies = useCurrencies()
  const paymentTerms = usePaymentTerms()
  const accountTypes = useAccountTypes()
  const businessTypes = useBusinessTypes()

  const bpGroupsOptions = useMemo(() => {
    if (bpGroups.isLoading || !bpGroups.data || bpGroups.data.length < 1) return []

    const selectedBpGroupType = BUSINESS_PARTNER_STD_API_GROUP_TYPE_MAP[cardType] || 'bbpgt_CustomerGroup'

    //* filter group based by type which based on the selected card type
    return bpGroups.data
      .filter((bpg: any) => bpg.Type === selectedBpGroupType)
      .map((bpg: any) => ({
        label: bpg?.Name || '',
        value: bpg?.Code || '',
      }))
  }, [cardType, JSON.stringify(bpGroups)])

  const handleOnSubmit = async (formData: BusinessPartnerForm) => {
    try {
      const response = await executeAsync(formData)
      const result = response?.data

      if (result?.error) {
        if (result.status === 401) {
          form.setError('CardCode', { type: 'custom', message: result.message })
        }

        toast.error(result.message)
        return
      }

      toast.success(result?.message)

      if (result?.data && result?.data?.businessPartner && 'code' in result?.data?.businessPartner) {
        router.refresh()
        // notificationContext?.handleRefresh()

        setTimeout(() => {
          if (isCreate) router.push(`/customers`)
          else {
            router.push(`/customers/${result.data.businessPartner.code}`)
            addresses.execute({ cardCode: bp?.CardCode ?? '' })
            contacts.execute({ cardCode: bp?.CardCode ?? '' })
          }
        }, 1500)
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  const generateNextCardCode = (cardCode?: string) => {
    let newCardCode = ''

    //* if no card code will default to initial card code
    if (!cardCode) {
      newCardCode = `${CARD_TYPE}${String(1).padStart(MAX_CARD_CODE_DIGITS, '0')}`
      return newCardCode
    }

    const codeWithoutPrefix = String(cardCode)?.replaceAll(CARD_TYPE, '')
    const newCodeWithoutPrefix = safeParseInt(codeWithoutPrefix, 10) + 1
    newCardCode = `${CARD_TYPE}${String(newCodeWithoutPrefix).padStart(MAX_CARD_CODE_DIGITS, '0')}`

    return newCardCode
  }

  const handleGenerateCode = async () => {
    try {
      const response = await latestBpData.executeAsync({ cardType: CARD_TYPE })
      const result = response?.data
      const cardCode = result?.CardCode
      const newCardCode = generateNextCardCode(result?.CardCode)

      if (!cardCode) {
        toast.error(`The latest ${BUSINESS_PARTNER_TYPE_MAP[CARD_TYPE].toLowerCase()} was code not found! Therefore initial code will be assigned.`) // prettier-ignore
        form.setValue('CardCode', newCardCode)
        return
      }

      form.setValue('CardCode', newCardCode)
      toast.success('Code generated successfully!')
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong! Please try again later.')
    }
  }

  //* set GroupName when GroupCode is changed
  useEffect(() => {
    if (GroupCode && !bpGroups.isLoading && bpGroups.data?.length > 0) {
      const selectedItemGroup = bpGroups.data.find((bg: any) => bg.Code === GroupCode)
      if (selectedItemGroup) form.setValue('GroupName', selectedItemGroup.Name)
    }
  }, [GroupCode, JSON.stringify(bpGroups)])

  //* set CurrName when CurrCode is changed
  useEffect(() => {
    if (CurrCode && !currencies.isLoading && currencies.data?.length > 0) {
      const selectedCurrency = currencies.data.find((c: any) => c.CurrCode === CurrCode)
      if (selectedCurrency) form.setValue('CurrName', selectedCurrency.CurrName)
    }
  }, [CurrCode, JSON.stringify(currencies)])

  //* set PymntGroup when GroupNum is changed
  useEffect(() => {
    if (GroupNum && !paymentTerms.isLoading && paymentTerms.data?.length > 0) {
      const selectedPaymentTerm = paymentTerms.data.find((pt: any) => pt.GroupNum === GroupNum)
      if (selectedPaymentTerm) form.setValue('PymntGroup', selectedPaymentTerm.PymntGroup)
    }
  }, [GroupNum, JSON.stringify(paymentTerms)])

  //* causes error message to show up
  useEffect(() => {
    console.log({ errors: form.formState.errors })
  }, [JSON.stringify(form.formState.errors)])

  //* set CardCode based on latest bp master
  useEffect(() => {
    if (!isCreate) return

    if (!latestBpData.isLoading && latestBpData.data && 'CardCode' in latestBpData.data) {
      const cardCode = latestBpData.data?.CardCode
      const newCardCode = generateNextCardCode(cardCode)

      form.setValue('CardCode', newCardCode)
    } else {
      const newCardCode = generateNextCardCode()
      form.setValue('CardCode', newCardCode)
    }
  }, [isCreate, JSON.stringify(latestBpData)])

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-5' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' icon='arrowleft' stylingMode='outlined' type='default' onClick={() => router.push('/customers')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton
              text='Save'
              type='default'
              stylingMode='contained'
              useSubmitBehavior
              icon='save'
              isLoading={isExecuting}
              disabled={CanView({ isReturnBoolean: true, subject: 'p-customers', action: !bp ? ['create'] : ['edit'] }) ? false : true}
            />
          </Item>

          {bp && (
            <>
              <CanView subject='p-customers' action='create'>
                <Item
                  location='after'
                  locateInMenu='always'
                  widget='dxButton'
                  options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/customers/add`) }}
                />
              </CanView>

              <CanView subject='p-customers' action='view'>
                <Item
                  location='after'
                  locateInMenu='always'
                  widget='dxButton'
                  options={{
                    text: 'View',
                    icon: 'eyeopen',
                    onClick: () => router.push(`/customers/${bp.code}/view`),
                  }}
                />
              </CanView>
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 flex items-center gap-1 md:col-span-6 lg:col-span-3'>
                <div className='w-[90%]'>
                  <TextBoxField control={form.control} name='CardCode' label='Code' isLoading={latestBpData.isLoading} />
                </div>

                <div className='flex-1'>
                  <TooltipWrapper label='Generate Code' targetId='generate-next-card-code'>
                    <Button
                      className='mt-5'
                      icon='refresh'
                      stylingMode='contained'
                      type='default'
                      disabled={latestBpData.isLoading}
                      onClick={handleGenerateCode}
                    />
                  </TooltipWrapper>
                </div>
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='CardName' label='Name' isRequired />
              </div>

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Type'
                value={BUSINESS_PARTNER_TYPE_MAP?.[cardType] || ''}
              />

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={bpGroupsOptions}
                  isLoading={bpGroups.isLoading}
                  control={form.control}
                  name='GroupCode'
                  label='Group'
                  valueExpr='value'
                  displayExpr='label'
                  searchExpr={['label', 'value']}
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.label,
                          value: params?.value,
                          valuePrefix: '#',
                        })
                      },
                    },
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={accountTypes.data}
                  isLoading={accountTypes.isLoading}
                  control={form.control}
                  name='AcctType'
                  label='Account Type'
                  valueExpr='Code'
                  displayExpr='Name'
                  searchExpr={['Name', 'Code']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={businessTypes.data}
                  isLoading={businessTypes.isLoading}
                  control={form.control}
                  name='CmpPrivate'
                  label='Type of Business'
                  valueExpr='Code'
                  displayExpr='Name'
                  searchExpr={['Name', 'Code']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={currencies.data}
                  isLoading={currencies.isLoading}
                  control={form.control}
                  name='CurrCode'
                  label='Currency'
                  valueExpr='CurrCode'
                  displayExpr='CurrName'
                  searchExpr={['CurrName', 'CurrCode']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={paymentTerms.data}
                  isLoading={paymentTerms.isLoading}
                  control={form.control}
                  name='GroupNum'
                  label='Payment Term'
                  valueExpr='GroupNum'
                  displayExpr='PymntGroup'
                  searchExpr={['PymntGroup', 'GroupNum']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SwitchField
                  control={form.control}
                  name='isActive'
                  label='Active'
                  description='Is this customer active?'
                  extendedProps={{ switchOptions: { disabled: isCreate } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='Phone1' label='Phone 1' />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12' title='Contacts' description='Customer contact details' />

              <div className='col-span-12'>
                <ContactForm bpContacts={contacts} />
              </div>

              <Separator className='col-span-12' />
              <ReadOnlyFieldHeader className='col-span-12' title='Addresses' description='Customer billing & shipping address details' />

              <div className='col-span-12'>
                <AddressForm bpAddresses={addresses} />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
