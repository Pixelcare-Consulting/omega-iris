'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import Button from 'devextreme-react/button'
import Tooltip from 'devextreme-react/tooltip'

import { bpContactsFormSchema, BusinessPartnerForm } from '@/schema/business-partner'
import TextBoxField from '@/components/forms/text-box-field'
import { Badge } from '@/components/badge'
import AlertDialog from '@/components/alert-dialog'
import { toast } from 'sonner'
import { FormDebug } from '@/components/forms/form-debug'
import FormMessage from '@/components/forms/form-message'
import { useContacts } from '@/hooks/safe-actions/contacts'
import { Icons } from '@/components/icons'

type ContactFormProps = { bpContacts: Awaited<ReturnType<typeof useContacts>> }

export default function ContactForm({ bpContacts }: ContactFormProps) {
  const mainForm = useFormContext<BusinessPartnerForm>()
  const isLoaded = useRef(false)

  const cardCode = useWatch({ control: mainForm.control, name: 'CardCode' })

  const [contactIndex, setContactIndex] = useState(-1)
  const [showContactConfirmation, setShowContactConfirmation] = useState(false)

  const [selectedIndex, setSelectedIndex] = useState<{ index: number } | null>(null)

  const contactsFieldArray = useFieldArray({ control: mainForm.control, name: 'contacts' })

  const contacts = useMemo(() => {
    if (bpContacts.isLoading || bpContacts.data.length < 1) return []
    return bpContacts.data
  }, [JSON.stringify(bpContacts)])

  const contactsErrorMessage = useMemo(() => {
    const isValid = bpContactsFormSchema.safeParse(mainForm.getValues('contacts'))
    const issues = isValid?.error?.issues || []

    mainForm.trigger('contacts')

    const indexes = issues
      .map((is) => is?.path[0])
      .filter((index) => index !== undefined || index !== undefined)
      .map((index: any) => index + 1)

    const uniqueIndexes = [...new Set(indexes)]

    const message = `Before proceeding, please fix the following issues found in contacts: #${uniqueIndexes.join(', #')}`

    if (uniqueIndexes.length < 1) return null
    return message
  }, [JSON.stringify(mainForm.watch('contacts')), JSON.stringify(contactsFieldArray.fields), selectedIndex])

  const handleAddContact = () => {
    const baseContact = {
      id: 'add',
      ContactName: '',
      FirstName: '',
      LastName: '',
      Title: '',
      Position: '',
      Phone1: '',
      Phone2: '',
      MobilePhone: '',
      Email: '',
    }

    contactsFieldArray.append(baseContact)
  }

  const handleNextContact = () => {
    setContactIndex((prev) => prev + 1)
  }

  const handlePreviousContact = () => {
    setContactIndex((prev) => prev - 1)
  }

  const handleRemoveContact = (index: number) => {
    setShowContactConfirmation(true)
    setSelectedIndex({ index })
  }

  const handleConfirmRemoveContact = (index: number) => {
    if (index === -1) return

    const currentFields = mainForm.getValues('contacts')
    const newFields = currentFields.filter((_, i) => i !== index)

    mainForm.setValue('contacts', newFields)
    contactsFieldArray.replace(newFields) //* remove in useFieldArray

    setSelectedIndex(null)
    setShowContactConfirmation(false)

    if (index === 0) {
      setContactIndex(-1)
      setTimeout(() => setContactIndex(0), 100)
    } else setContactIndex(0)

    toast.success('Contact entry removed successfully!')
  }

  //* set contacts
  useEffect(() => {
    if (!cardCode) return

    if (contacts.length > 0) {
      contactsFieldArray.replace(contacts)
      setContactIndex(0)
    }
  }, [cardCode, JSON.stringify(bpContacts), JSON.stringify(contacts)])

  if (bpContacts.isLoading)
    return (
      <div className='relative flex h-[200px] w-full items-center justify-center gap-2'>
        <Icons.spinner className='size-5 animate-spin text-primary' /> <span>Loading contacts...</span>
      </div>
    )

  return (
    <>
      <div className='flex flex-col gap-2'>
        {contactsErrorMessage && (
          <div className='col-span-12 mb-4'>
            <FormMessage>{contactsErrorMessage}</FormMessage>
          </div>
        )}
      </div>

      <div className='grid h-full grid-cols-12 gap-5' key={contactIndex}>
        <div className='col-span-12 flex items-center justify-between'>
          {/* <div className='col-span-12'>
            <FormDebug form={mainForm} keys={['contacts']} />
          </div> */}

          <div className='flex items-center gap-2'>
            <h2 className='text-base font-bold'> {contactsFieldArray.fields.length > 0 ? `Contact #${contactIndex + 1}` : ''}</h2>
            {contactsFieldArray.fields.length > 0 ? contactIndex === 0 && <Badge variant='soft-blue'>Default</Badge> : null}
          </div>

          <div className='flex items-center gap-2'>
            <div className='pr-4'>
              <h2 className='text-base font-bold'>
                {contactsFieldArray.fields.length > 0 ? `${contactIndex + 1} / ${contactsFieldArray.fields.length}` : ''}
              </h2>
            </div>

            <div className='flex gap-1'>
              <div>
                <Tooltip
                  target='#contact-add-button'
                  contentRender={() => 'Add'}
                  showEvent='mouseenter'
                  hideEvent='mouseleave'
                  position='top'
                />
                <Button
                  id='contact-add-button'
                  icon='add'
                  stylingMode='outlined'
                  type='default'
                  onClick={() => {
                    if (contactsErrorMessage) {
                      toast.error(contactsErrorMessage)
                      return
                    }

                    handleAddContact()
                    setContactIndex(contactsFieldArray.fields.length)
                    toast.success('Added new contact entry. Please fill its respective fields.')
                  }}
                />
              </div>
              <div>
                <Tooltip
                  target='#contact-remove-button'
                  contentRender={() => 'Remove'}
                  showEvent='mouseenter'
                  hideEvent='mouseleave'
                  position='top'
                />
                <Button
                  id='contact-remove-button'
                  icon='trash'
                  stylingMode='outlined'
                  type='default'
                  disabled={contactsFieldArray.fields.length === 0 || contactIndex === -1}
                  onClick={() => handleRemoveContact(contactIndex)}
                />
              </div>
            </div>

            <div className='flex gap-1 border-l border-slate-200 pl-2'>
              <div>
                <Tooltip
                  target='#contact-previous-button'
                  contentRender={() => 'Previous'}
                  showEvent='mouseenter'
                  hideEvent='mouseleave'
                  position='top'
                />
                <Button
                  id='contact-previous-button'
                  icon='chevronprev'
                  stylingMode='contained'
                  type='default'
                  disabled={contactIndex === 0}
                  onClick={() => handlePreviousContact()}
                />
              </div>
              <div>
                <Tooltip
                  target='#contact-next-button'
                  contentRender={() => 'Next'}
                  showEvent='mouseenter'
                  hideEvent='mouseleave'
                  position='top'
                />
                <Button
                  id='contact-next-button'
                  icon='chevronnext'
                  stylingMode='contained'
                  type='default'
                  disabled={contactIndex === contactsFieldArray.fields.length - 1 || contactsFieldArray.fields.length < 1}
                  onClick={() => handleNextContact()}
                />
              </div>
            </div>
          </div>
        </div>

        {contactsFieldArray.fields.length > 0 ? (
          <>
            <div className='col-span-12 md:col-span-6 lg:col-span-3'>
              <TextBoxField
                key={contactIndex}
                control={mainForm.control}
                name={`contacts.${contactIndex}.ContactName`}
                label='Name'
                description='Contact unique name/identifier'
                isRequired
              />
            </div>

            <div className='col-span-12 md:col-span-6 lg:col-span-3'>
              <TextBoxField key={contactIndex} control={mainForm.control} name={`contacts.${contactIndex}.FirstName`} label='First Name' />
            </div>

            <div className='col-span-12 md:col-span-6 lg:col-span-3'>
              <TextBoxField key={contactIndex} control={mainForm.control} name={`contacts.${contactIndex}.LastName`} label='Last Name' />
            </div>

            <div className='col-span-12 md:col-span-6 lg:col-span-3'>
              <TextBoxField key={contactIndex} control={mainForm.control} name={`contacts.${contactIndex}.Email`} label='Email' />
            </div>

            <div className='col-span-12 md:col-span-6 lg:col-span-3'>
              <TextBoxField key={contactIndex} control={mainForm.control} name={`contacts.${contactIndex}.Title`} label='Title' />
            </div>

            <div className='col-span-12 md:col-span-6 lg:col-span-3'>
              <TextBoxField key={contactIndex} control={mainForm.control} name={`contacts.${contactIndex}.Position`} label='Position' />
            </div>

            <div className='col-span-12 md:col-span-6 lg:col-span-3'>
              <TextBoxField key={contactIndex} control={mainForm.control} name={`contacts.${contactIndex}.Phone1`} label='Tel 1' />
            </div>

            <div className='col-span-12 md:col-span-6 lg:col-span-3'>
              <TextBoxField key={contactIndex} control={mainForm.control} name={`contacts.${contactIndex}.Phone2`} label='Tel 2' />
            </div>

            <div className='col-span-12 md:col-span-6 lg:col-span-3'>
              <TextBoxField
                key={contactIndex}
                control={mainForm.control}
                name={`contacts.${contactIndex}.MobilePhone`}
                label='Mobile Phone'
              />
            </div>

            <AlertDialog
              isOpen={showContactConfirmation}
              title='Are you sure?'
              description={`Are you sure you want to remove the contact #${(selectedIndex?.index ?? -1) + 1} ?`}
              onConfirm={() => handleConfirmRemoveContact(selectedIndex?.index ?? -1)}
              onCancel={() => setShowContactConfirmation(false)}
            />
          </>
        ) : (
          <div className='col-span-12 flex h-[80px] items-center justify-center'>
            <h2 className='text-base font-bold'>No Contacts Found</h2>
          </div>
        )}
      </div>
    </>
  )
}
