'use client'

import ScrollView from 'devextreme-react/scroll-view'
import { Button } from 'devextreme-react/button'
import { Item } from 'devextreme-react/toolbar'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useRouter } from 'nextjs-toploader/app'
import { useParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'

import PageHeader from '@/app/(protected)/_components/page-header'
import PageContentWrapper from '@/app/(protected)/_components/page-content-wrapper'
import { BUSINESS_PARTNER_MAP, type BusinessPartnerForm, businessPartnerFormSchema } from '@/schema/business-partner'
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

type CustomerFormProps = { pageMetaData: PageMetadata; bp: Awaited<ReturnType<typeof getBpByCardCode>> }

export default function CustomerForm({ pageMetaData, bp }: CustomerFormProps) {
  const router = useRouter()
  const { code } = useParams() as { code: string }

  const isCreate = code === 'add' || !bp

  const values = useMemo(() => {
    if (bp) return bp

    if (isCreate) {
      return {
        code: -1,
        isActive: true,
        syncStatus: 'pending',

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

  const bpGroups = useBpGroups()
  const currencies = useCurrencies()
  const paymentTerms = usePaymentTerms()
  const accountTypes = useAccountTypes()

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

      if (result?.data && result?.data?.businessPartner && 'id' in result?.data?.businessPartner) {
        router.refresh()

        setTimeout(() => {
          router.push(`/customers/${result.data.businessPartner.code}`)
        }, 1500)
      }
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

  return (
    <FormProvider {...form}>
      <form className='flex h-full w-full flex-col gap-5' onSubmit={form.handleSubmit(handleOnSubmit)}>
        <PageHeader title={pageMetaData.title} description={pageMetaData.description}>
          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <Button text='Back' stylingMode='outlined' type='default' onClick={() => router.push('/customers')} />
          </Item>

          <Item location='after' locateInMenu='auto' widget='dxButton'>
            <LoadingButton text='Save' type='default' stylingMode='contained' useSubmitBehavior icon='save' isLoading={isExecuting} />
          </Item>

          {bp && (
            <>
              <Item
                location='after'
                locateInMenu='always'
                widget='dxButton'
                options={{ text: 'Add', icon: 'add', onClick: () => router.push(`/customers/add`) }}
              />

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
            </>
          )}
        </PageHeader>

        <PageContentWrapper className='max-h-[calc(100%_-_92px)]'>
          <ScrollView>
            {/* <FormDebug form={form} /> */}

            <div className='grid h-full grid-cols-12 gap-5 px-6 py-8'>
              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  control={form.control}
                  name='CardCode'
                  label='Code'
                  description='If code is not provided, system will provide random temporary code'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='CardName' label='Name' isRequired />
              </div>

              <ReadOnlyField
                className='col-span-12 md:col-span-6 lg:col-span-3'
                title='Type'
                value={BUSINESS_PARTNER_MAP?.[cardType] || ''}
              />

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={bpGroups.data}
                  isLoading={bpGroups.isLoading}
                  control={form.control}
                  name='GroupCode'
                  label='Group'
                  valueExpr='Code'
                  displayExpr='Name'
                  searchExpr={['Name', 'Code']}
                  extendedProps={{
                    selectBoxOptions: {
                      itemRender: (params) => {
                        return commonItemRender({
                          title: params?.Name,
                          value: params?.Code,
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
                  valueExpr='U_OMEG_AcctType'
                  displayExpr='U_OMEG_AcctType'
                  searchExpr={['U_OMEG_AcctType']}
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

              <Separator className='col-span-12' />

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <NumberBoxField
                  control={form.control}
                  name='Balance'
                  label='Account Balance'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_CURRENCY_FORMAT } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <NumberBoxField
                  control={form.control}
                  name='ChecksBal'
                  label='Checks'
                  extendedProps={{ numberBoxOptions: { format: DEFAULT_CURRENCY_FORMAT } }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField control={form.control} name='Phone1' label='Phone 1' />
              </div>
            </div>
          </ScrollView>
        </PageContentWrapper>
      </form>
    </FormProvider>
  )
}
