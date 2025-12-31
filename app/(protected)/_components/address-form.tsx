'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import TabPanel, { Item as TabPanelITem } from 'devextreme-react/tab-panel'
import Button from 'devextreme-react/button'
import Tooltip from 'devextreme-react/tooltip'

import { bpAddressesFormSchema, BusinessPartnerForm, type AddressForm } from '@/schema/business-partner'
import TextBoxField from '@/components/forms/text-box-field'
import { Badge } from '@/components/badge'
import TextAreaField from '@/components/forms/text-area-field'
import { useStates } from '@/hooks/safe-actions/state'
import { useCountries } from '@/hooks/safe-actions/country'
import SelectBoxField from '@/components/forms/select-box-field'
import AlertDialog from '@/components/alert-dialog'
import { toast } from 'sonner'
import { FormDebug } from '@/components/forms/form-debug'
import FormMessage from '@/components/forms/form-message'
import { useAddresses } from '@/hooks/safe-actions/address'
import { Icons } from '@/components/icons'

type AddressFormProps = {
  bpAddresses: Awaited<ReturnType<typeof useAddresses>>
}

export default function AddressForm({ bpAddresses }: AddressFormProps) {
  const mainForm = useFormContext<BusinessPartnerForm>()

  const cardCode = useWatch({ control: mainForm.control, name: 'CardCode' })

  const [billingIndex, setBillingIndex] = useState(0)
  const [showBillingAddrConfirmation, setShowBillingAddrConfirmation] = useState(false)
  const [shippingIndex, setShippingIndex] = useState(0)
  const [showShippingAddrConfirmation, setShowShippingAddrConfirmation] = useState(false)

  const [selectedIndex, setSelectedIndex] = useState<{ type: string; index: number } | null>(null)

  const billingAddrsFieldArray = useFieldArray({ control: mainForm.control, name: 'billingAddresses' })
  const shippingAddrsFieldArray = useFieldArray({ control: mainForm.control, name: 'shippingAddresses' })

  const billingCountryCode = useWatch({ control: mainForm.control, name: `billingAddresses.${billingIndex}.CountryCode` })
  const shippingCountryCode = useWatch({ control: mainForm.control, name: `shippingAddresses.${shippingIndex}.CountryCode` })
  const billingStateCode = useWatch({ control: mainForm.control, name: `billingAddresses.${billingIndex}.StateCode` })
  const shippingStateCode = useWatch({ control: mainForm.control, name: `shippingAddresses.${shippingIndex}.StateCode` })

  const billingCountries = useCountries()
  const shippingCountries = useCountries()

  const billingStates = useStates(billingCountryCode ?? '')
  const shippingStates = useStates(shippingCountryCode ?? '')

  const billingAddresses = useMemo(() => {
    if (bpAddresses.isLoading || bpAddresses.data.length < 1) return []
    return bpAddresses.data.filter((a) => a.AddrType === 'B')
  }, [JSON.stringify(bpAddresses)])

  const shippingAddresses = useMemo(() => {
    if (bpAddresses.isLoading || bpAddresses.data.length < 1) return []
    return bpAddresses.data.filter((a) => a.AddrType === 'S')
  }, [JSON.stringify(bpAddresses)])

  const billingAddrsErrorMessage = useMemo(() => {
    const isValid = bpAddressesFormSchema.safeParse(mainForm.getValues('billingAddresses'))
    const issues = isValid?.error?.issues || []

    mainForm.trigger('billingAddresses')

    const indexes = issues
      .map((is) => is?.path[0])
      .filter((index) => index !== undefined || index !== undefined)
      .map((index: any) => index + 1)

    const uniqueIndexes = [...new Set(indexes)]

    const message = `Before proceeding, please fix the following issues found in billing addresses: #${uniqueIndexes.join(', #')}`

    if (uniqueIndexes.length < 1) return null
    return message
  }, [JSON.stringify(mainForm.watch('billingAddresses')), JSON.stringify(billingAddrsFieldArray.fields), selectedIndex])

  const shippingErrorMessage = useMemo(() => {
    const isValid = bpAddressesFormSchema.safeParse(mainForm.getValues('shippingAddresses'))
    const issues = isValid?.error?.issues || []

    mainForm.trigger('shippingAddresses')

    const indexes = issues
      .map((is) => is?.path[0])
      .filter((index) => index !== undefined || index !== undefined)
      .map((index: any) => index + 1)

    const uniqueIndexes = [...new Set(indexes)]

    const message = `Before proceeding, please fix the following issues found in shipping addresses: #${uniqueIndexes.join(', #')}`

    if (uniqueIndexes.length < 1) return null
    return message
  }, [JSON.stringify(mainForm.watch('shippingAddresses')), JSON.stringify(shippingAddrsFieldArray.fields), selectedIndex])

  const handleAddAddress = (type: string) => {
    const baseAddress = {
      id: 'add',
      CardCode: cardCode,
      AddressName: '',
      Street: '',
      Address2: '',
      Address3: '',
      StreetNo: '',
      BuildingFloorRoom: '',
      Block: '',
      City: '',
      ZipCode: '',
      County: '',
      CountryCode: '',
      CountryName: '',
      StateCode: '',
      StateName: '',
      GlobalLocationNumber: '',
    }

    switch (type) {
      case 'B': {
        billingAddrsFieldArray.append({
          ...baseAddress,
          AddrType: 'B',
        })
        break
      }

      case 'S': {
        shippingAddrsFieldArray.append({
          ...baseAddress,
          AddrType: 'S',
        })
        break
      }
    }
  }

  const handleNextAddress = (type: string) => {
    switch (type) {
      case 'B':
        setBillingIndex((prev) => prev + 1)
        break

      case 'S':
        setShippingIndex((prev) => prev + 1)
        break
    }
  }

  const handlePreviousAddress = (type: string) => {
    switch (type) {
      case 'B':
        setBillingIndex((prev) => prev - 1)
        break

      case 'S':
        setShippingIndex((prev) => prev - 1)
        break
    }
  }

  const handleRemoveAddress = (type: string, index: number) => {
    switch (type) {
      case 'B':
        setShowBillingAddrConfirmation(true)
        setSelectedIndex({ type, index })
        break
      case 'S':
        setShowShippingAddrConfirmation(true)
        setSelectedIndex({ type, index })
        break
    }
  }

  const handleConfirmRemoveAddress = (type: string, index: number) => {
    if (index === -1) return

    switch (type) {
      case 'B':
        {
          const currentFields = mainForm.getValues('billingAddresses')
          const newFields = currentFields.filter((_, i) => i !== index)

          mainForm.setValue('billingAddresses', newFields)
          billingAddrsFieldArray.replace(newFields) //* remove in useFieldArray

          setSelectedIndex(null)
          setShowBillingAddrConfirmation(false)

          if (index === 0) {
            setBillingIndex(-1)
            setTimeout(() => setBillingIndex(0), 100)
          } else setBillingIndex(0)

          toast.success('Billing address entry removed successfully!')
        }
        break

      case 'S':
        {
          const currentFields = mainForm.getValues('shippingAddresses')
          const newFields = currentFields.filter((_, i) => i !== index)

          mainForm.setValue('shippingAddresses', newFields)
          shippingAddrsFieldArray.replace(newFields) //* remove in useFieldArray

          setSelectedIndex(null)
          setShowShippingAddrConfirmation(false)

          if (index === 0) {
            setShippingIndex(-1)
            setTimeout(() => setShippingIndex(0), 100)
          } else setShippingIndex(0)

          toast.success('Shipping address entry removed successfully!')
        }

        break
    }
  }

  //* set  billing Addresses
  useEffect(() => {
    if (!cardCode || billingAddresses.length < 1) handleAddAddress('B')
    else billingAddrsFieldArray.replace(billingAddresses)
  }, [cardCode, JSON.stringify(billingAddresses)])

  //* set  shipping Addressses
  useEffect(() => {
    if (!cardCode || shippingAddresses.length < 1) handleAddAddress('S')
    else shippingAddrsFieldArray.replace(shippingAddresses)
  }, [cardCode, JSON.stringify(shippingAddresses)])

  //* set billing CountryName when billing CountryCode is changed
  useEffect(() => {
    if (billingCountryCode && !billingCountries.isLoading && billingCountries.data?.length > 0) {
      const selectedCountry = billingCountries.data.find((c: any) => c.Code === billingCountryCode)
      if (selectedCountry) mainForm.setValue(`billingAddresses.${billingIndex}.CountryName`, selectedCountry.Name)
    }
  }, [billingCountryCode, JSON.stringify(billingCountries), billingIndex])

  //* set shipping CountryName when shipping CountryCode is changed
  useEffect(() => {
    if (shippingCountryCode && !shippingCountries.isLoading && shippingCountries.data?.length > 0) {
      const selectedCountry = shippingCountries.data.find((c: any) => c.Code === shippingCountryCode)
      if (selectedCountry) mainForm.setValue(`shippingAddresses.${shippingIndex}.CountryName`, selectedCountry.Name)
    }
  }, [shippingCountryCode, JSON.stringify(shippingCountries), shippingIndex])

  //* set billing StateName when billing StateCode is changed
  useEffect(() => {
    if (billingStateCode && !billingStates.isLoading && billingStates.data?.length > 0) {
      const selectedState = billingStates.data.find((s: any) => s.Code === billingStateCode)
      if (selectedState) mainForm.setValue(`billingAddresses.${billingIndex}.StateName`, selectedState.Name)
    }
  }, [billingStateCode, JSON.stringify(billingStates), billingIndex])

  //* set shipping StateName when shipping StateCode is changed
  useEffect(() => {
    if (shippingStateCode && !shippingStates.isLoading && shippingStates.data?.length > 0) {
      const selectedState = shippingStates.data.find((s: any) => s.Code === shippingStateCode)
      if (selectedState) mainForm.setValue(`shippingAddresses.${shippingIndex}.StateName`, selectedState.Name)
    }
  }, [shippingStateCode, JSON.stringify(shippingStates), shippingIndex])

  if (bpAddresses.isLoading)
    return (
      <div className='relative flex h-[200px] w-full items-center justify-center gap-2'>
        <Icons.spinner className='size-5 animate-spin text-primary' /> <span>Loading address...</span>
      </div>
    )

  return (
    <>
      <div className='flex flex-col gap-2'>
        {billingAddrsErrorMessage && (
          <div className='col-span-12 mb-4'>
            <FormMessage>{billingAddrsErrorMessage}</FormMessage>
          </div>
        )}

        {shippingErrorMessage && (
          <div className='col-span-12 mb-4'>
            <FormMessage>{shippingErrorMessage}</FormMessage>
          </div>
        )}
      </div>

      <TabPanel width='100%' height='100%' animationEnabled tabsPosition='top' defaultSelectedIndex={0}>
        <TabPanelITem title='Billing'>
          {billingAddrsFieldArray.fields.length > 0 ? (
            <div className='grid h-full grid-cols-12 gap-5 py-8' key={billingIndex}>
              {/* <div className='col-span-12'>
                <FormDebug form={mainForm} keys={['billingAddresses']} />
              </div> */}

              <div className='col-span-12 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <h2 className='text-base font-bold'>Billing Address #{billingIndex + 1}</h2>
                  {billingIndex === 0 && <Badge variant='soft-blue'>Default</Badge>}
                </div>

                <div className='flex items-center gap-2'>
                  <div className='pr-4'>
                    <h2 className='text-base font-bold'>
                      {billingIndex + 1} / {billingAddrsFieldArray.fields.length}
                    </h2>
                  </div>

                  <div className='flex gap-1'>
                    <div>
                      <Tooltip
                        target='#address-add-button'
                        contentRender={() => 'Add'}
                        showEvent='mouseenter'
                        hideEvent='mouseleave'
                        position='top'
                      />
                      <Button
                        id='address-add-button'
                        icon='add'
                        stylingMode='outlined'
                        type='default'
                        onClick={() => {
                          if (billingAddrsErrorMessage) {
                            toast.error(billingAddrsErrorMessage)
                            return
                          }

                          handleAddAddress('B')
                          setBillingIndex(billingAddrsFieldArray.fields.length)
                          toast.success('Added new billing address entry. Please fill its respective fields.')
                        }}
                      />
                    </div>
                    <div>
                      <Tooltip
                        target='#address-remove-button'
                        contentRender={() => 'Remove'}
                        showEvent='mouseenter'
                        hideEvent='mouseleave'
                        position='top'
                      />
                      <Button
                        id='address-remove-button'
                        icon='trash'
                        stylingMode='outlined'
                        type='default'
                        disabled={billingAddrsFieldArray.fields.length < 2}
                        onClick={() => handleRemoveAddress('B', billingIndex)}
                      />
                    </div>
                  </div>

                  <div className='flex gap-1 border-l border-slate-200 pl-2'>
                    <div>
                      <Tooltip
                        target='#address-previous-button'
                        contentRender={() => 'Previous'}
                        showEvent='mouseenter'
                        hideEvent='mouseleave'
                        position='top'
                      />
                      <Button
                        id='address-previous-button'
                        icon='chevronprev'
                        stylingMode='contained'
                        type='default'
                        disabled={billingIndex === 0}
                        onClick={() => handlePreviousAddress('B')}
                      />
                    </div>
                    <div>
                      <Tooltip
                        target='#address-next-button'
                        contentRender={() => 'Next'}
                        showEvent='mouseenter'
                        hideEvent='mouseleave'
                        position='top'
                      />
                      <Button
                        id='address-next-button'
                        icon='chevronnext'
                        stylingMode='contained'
                        type='default'
                        disabled={billingIndex === billingAddrsFieldArray.fields.length - 1}
                        onClick={() => handleNextAddress('B')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={billingIndex}
                  control={mainForm.control}
                  name={`billingAddresses.${billingIndex}.AddressName`}
                  label='Name'
                  description='Address unique name'
                  isRequired
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={mainForm.control} name={`billingAddresses.${billingIndex}.Street`} label='Line 1' isAutoResize />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={mainForm.control} name={`billingAddresses.${billingIndex}.Address2`} label='Line 2' isAutoResize />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={mainForm.control} name={`billingAddresses.${billingIndex}.Address3`} label='Line 3' isAutoResize />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={billingIndex}
                  control={mainForm.control}
                  name={`billingAddresses.${billingIndex}.StreetNo`}
                  label='Street No.'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={billingIndex}
                  control={mainForm.control}
                  name={`billingAddresses.${billingIndex}.BuildingFloorRoom`}
                  label='Building/Floor/Room'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField key={billingIndex} control={mainForm.control} name={`billingAddresses.${billingIndex}.Block`} label='Block' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField key={billingIndex} control={mainForm.control} name={`billingAddresses.${billingIndex}.City`} label='City' />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={billingIndex}
                  control={mainForm.control}
                  name={`billingAddresses.${billingIndex}.ZipCode`}
                  label='Zip Code'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={billingIndex}
                  control={mainForm.control}
                  name={`billingAddresses.${billingIndex}.County`}
                  label='County'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={billingCountries.data}
                  isLoading={billingCountries.isLoading}
                  control={mainForm.control}
                  name={`billingAddresses.${billingIndex}.CountryCode`}
                  label='Country'
                  valueExpr='Code'
                  displayExpr='Name'
                  searchExpr={['Name', 'Code']}
                  callback={() => {
                    mainForm.setValue(`billingAddresses.${billingIndex}.StateCode`, null)
                    mainForm.setValue(`billingAddresses.${billingIndex}.StateName`, null)
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={billingStates.data}
                  isLoading={billingStates.isLoading}
                  control={mainForm.control}
                  name={`billingAddresses.${billingIndex}.StateCode`}
                  label='State'
                  valueExpr='Code'
                  displayExpr='Name'
                  searchExpr={['Name', 'Code']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={billingIndex}
                  control={mainForm.control}
                  name={`billingAddresses.${billingIndex}.GlobalLocationNumber`}
                  label='Glboal Location Number (GLN)'
                />
              </div>

              <AlertDialog
                isOpen={showBillingAddrConfirmation}
                title='Are you sure?'
                description={`Are you sure you want to remove the billing address #${(selectedIndex?.index ?? -1) + 1} ?`}
                onConfirm={() => handleConfirmRemoveAddress('B', selectedIndex?.index ?? -1)}
                onCancel={() => setShowBillingAddrConfirmation(false)}
              />
            </div>
          ) : null}
        </TabPanelITem>

        <TabPanelITem title='Shipping'>
          {shippingAddrsFieldArray.fields.length > 0 ? (
            <div className='grid h-full grid-cols-12 gap-5 py-8' key={shippingIndex}>
              {/* <div className='col-span-12'>
                <FormDebug form={mainForm} keys={['shippingAddresses']} />
              </div> */}

              <div className='col-span-12 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <h2 className='text-base font-bold'>Shipping Address {shippingIndex + 1}</h2>
                  {shippingIndex === 0 && <Badge variant='soft-blue'>Default</Badge>}
                </div>

                <div className='flex items-center gap-2'>
                  <div className='pr-4'>
                    <h2 className='text-base font-bold'>
                      {shippingIndex + 1} / {shippingAddrsFieldArray.fields.length}
                    </h2>
                  </div>

                  <div className='flex gap-1'>
                    <div>
                      <Tooltip
                        target='#address-add-button'
                        contentRender={() => 'Add'}
                        showEvent='mouseenter'
                        hideEvent='mouseleave'
                        position='top'
                      />
                      <Button
                        id='address-add-button'
                        icon='add'
                        stylingMode='outlined'
                        type='default'
                        onClick={() => {
                          if (shippingErrorMessage) {
                            toast.error(shippingErrorMessage)
                            return
                          }

                          handleAddAddress('S')
                          setShippingIndex(shippingAddrsFieldArray.fields.length)
                          toast.success('Added new shipping address entry. Please fill its respective fields.')
                        }}
                      />
                    </div>
                    <div>
                      <Tooltip
                        target='#address-remove-button'
                        contentRender={() => 'Remove'}
                        showEvent='mouseenter'
                        hideEvent='mouseleave'
                        position='top'
                      />
                      <Button
                        id='address-remove-button'
                        icon='trash'
                        stylingMode='outlined'
                        type='default'
                        disabled={shippingAddrsFieldArray.fields.length < 2}
                        onClick={() => handleRemoveAddress('S', shippingIndex)}
                      />
                    </div>
                  </div>

                  <div className='flex gap-1 border-l border-slate-200 pl-2'>
                    <div>
                      <Tooltip
                        target='#address-previous-button'
                        contentRender={() => 'Previous'}
                        showEvent='mouseenter'
                        hideEvent='mouseleave'
                        position='top'
                      />
                      <Button
                        id='address-previous-button'
                        icon='chevronprev'
                        stylingMode='contained'
                        type='default'
                        disabled={shippingIndex === 0}
                        onClick={() => handlePreviousAddress('S')}
                      />
                    </div>
                    <div>
                      <Tooltip
                        target='#address-next-button'
                        contentRender={() => 'Next'}
                        showEvent='mouseenter'
                        hideEvent='mouseleave'
                        position='top'
                      />
                      <Button
                        id='address-next-button'
                        icon='chevronnext'
                        stylingMode='contained'
                        type='default'
                        disabled={shippingIndex === shippingAddrsFieldArray.fields.length - 1}
                        onClick={() => handleNextAddress('S')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={shippingIndex}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.AddressName`}
                  label='Name'
                  description='Address unique name'
                  isRequired
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField control={mainForm.control} name={`shippingAddresses.${shippingIndex}.Street`} label='Line 1' isAutoResize />
              </div>

              <div className='col-span-12'>
                <TextAreaField
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.Address2`}
                  label='Line 2'
                  isAutoResize
                />
              </div>

              <div className='col-span-12'>
                <TextAreaField
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.Address3`}
                  label='Line 3'
                  isAutoResize
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={shippingIndex}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.StreetNo`}
                  label='Street No.'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={shippingIndex}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.BuildingFloorRoom`}
                  label='Building/Floor/Room'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={shippingIndex}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.Block`}
                  label='Block'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={shippingIndex}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.City`}
                  label='City'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={shippingIndex}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.ZipCode`}
                  label='Zip Code'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={shippingIndex}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.County`}
                  label='County'
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={shippingCountries.data}
                  isLoading={shippingCountries.isLoading}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.CountryCode`}
                  label='Country'
                  valueExpr='Code'
                  displayExpr='Name'
                  searchExpr={['Name', 'Code']}
                  callback={() => {
                    mainForm.setValue(`shippingAddresses.${billingIndex}.StateCode`, null)
                    mainForm.setValue(`shippingAddresses.${billingIndex}.StateName`, null)
                  }}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <SelectBoxField
                  data={shippingStates.data}
                  isLoading={shippingStates.isLoading}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.StateCode`}
                  label='State'
                  valueExpr='Code'
                  displayExpr='Name'
                  searchExpr={['Name', 'Code']}
                />
              </div>

              <div className='col-span-12 md:col-span-6 lg:col-span-3'>
                <TextBoxField
                  key={shippingIndex}
                  control={mainForm.control}
                  name={`shippingAddresses.${shippingIndex}.GlobalLocationNumber`}
                  label='Glboal Location Number (GLN)'
                />
              </div>

              <AlertDialog
                isOpen={showShippingAddrConfirmation}
                title='Are you sure?'
                description={`Are you sure you want to remove the shipping address #${(selectedIndex?.index ?? -1) + 1} ?`}
                onConfirm={() => handleConfirmRemoveAddress('S', selectedIndex?.index ?? -1)}
                onCancel={() => setShowShippingAddrConfirmation(false)}
              />
            </div>
          ) : (
            <div className='col-span-12 flex h-[80px] items-center justify-center'>
              <h2 className='text-base font-bold'>No Address Found</h2>
            </div>
          )}
        </TabPanelITem>
      </TabPanel>
    </>
  )
}
